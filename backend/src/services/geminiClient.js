const { GoogleGenerativeAI } = require("@google/generative-ai");
const dns = require("node:dns");

// Optimize DNS resolution on Node.js / Windows to prevent IPv6 headers timeout stalls
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

let genAIInstance = null;

/**
 * Get or initialize the GoogleGenerativeAI client
 */
function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment variables.");
    }
    genAIInstance = new GoogleGenerativeAI(apiKey || "dummy_key");
  }
  return genAIInstance;
}

/**
 * Known working flash models for CMS tasks, ordered by priority.
 * Flash-Lite models are prioritized first because they offer the highest free-tier rate limits,
 * lowest latency (<1s), full tool/function-calling support, and immunity to high-demand 503 throttling.
 */
const DEFAULT_FALLBACK_CASCADE = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
];

/**
 * Build ordered list of model candidates to try
 */
function getCandidateModels(preferredModel) {
  const primary = preferredModel || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const list = [primary, ...DEFAULT_FALLBACK_CASCADE];
  return Array.from(new Set(list.filter(Boolean)));
}

/**
 * Check if an error from Gemini is temporary / retryable
 */
function isTransientError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  if ([503, 429, 500, 502, 504].includes(status)) return true;

  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("service unavailable") ||
    msg.includes("spikes in demand") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("abort") ||
    msg.includes("internal error")
  );
}

/**
 * Check if an error is due to high demand, queue saturation, rate limits, or timeouts.
 * When other fallback models exist, we fail-over immediately rather than repeatedly retrying the congested model.
 */
function isCongestedOrQuotaError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  if (status === 503 || status === 429) return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("service unavailable") ||
    msg.includes("spikes in demand") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("abort")
  );
}

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Safely parse JSON from LLM output, handling markdown fences and stray text
 */
function cleanAndParseJson(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("No text returned from AI model");
  }

  let text = rawText.trim();

  // Strip code block markers
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (directErr) {
    // Attempt to extract JSON object or array bounds
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      if (firstBracket !== -1 && firstBracket < firstBrace && lastBracket > lastBrace) {
        start = firstBracket;
        end = lastBracket;
      } else {
        start = firstBrace;
        end = lastBrace;
      }
    } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      start = firstBracket;
      end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
      const extracted = text.substring(start, end + 1);
      return JSON.parse(extracted);
    }

    throw directErr;
  }
}

/**
 * Generate content using Gemini with automatic retries and fallback cascade
 *
 * @param {Object} options
 * @param {Array|Object|string} options.contents - The prompt / parts / contents to pass to generateContent
 * @param {Object} [options.generationConfig] - Generation config e.g. { responseMimeType: "application/json" }
 * @param {Object} [options.systemInstruction] - System instruction object or string
 * @param {Array} [options.tools] - Tools array
 * @param {string} [options.preferredModel] - Override model name
 * @param {number} [options.maxRetriesPerModel=2] - Max retries per model before moving to next fallback
 * @param {number} [options.baseDelayMs=1000] - Base retry delay
 */
async function generateContentWithRetry({
  contents,
  generationConfig,
  systemInstruction,
  tools,
  preferredModel,
  maxRetriesPerModel = 2,
  baseDelayMs = 800,
}) {
  const genAI = getGenAI();
  const models = getCandidateModels(preferredModel);

  let lastError = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const modelName = models[mIdx];
    const isLastModel = mIdx === models.length - 1;

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const modelOptions = { model: modelName };
        if (generationConfig) modelOptions.generationConfig = generationConfig;
        if (systemInstruction) {
          modelOptions.systemInstruction =
            typeof systemInstruction === "string"
              ? { role: "system", parts: [{ text: systemInstruction }] }
              : systemInstruction;
        }
        if (tools) modelOptions.tools = tools;

        // Set 15s timeout to prevent free-tier stalls on congested models from hanging indefinitely
        const model = genAI.getGenerativeModel(modelOptions, { timeout: 15000 });

        // Standardize generateContent input for @google/generative-ai SDK:
        // Ensures multi-turn conversation arrays (Content[]) and single-turn parts (Part[])
        // are formatted with valid JSON structure so Google API never receives nested roles in parts.
        let requestPayload;
        if (typeof contents === "string") {
          requestPayload = { contents: [{ role: "user", parts: [{ text: contents }] }] };
        } else if (contents && contents.contents) {
          requestPayload = contents;
        } else if (Array.isArray(contents)) {
          if (contents.length > 0 && contents[0] && typeof contents[0] === "object" && contents[0].role) {
            // Already array of Content objects: [{ role, parts }, ...]
            requestPayload = { contents };
          } else {
            // Array of parts for a single turn: [string | Part, ...]
            const normalizedParts = contents.map((p) => (typeof p === "string" ? { text: p } : p));
            requestPayload = { contents: [{ role: "user", parts: normalizedParts }] };
          }
        } else {
          requestPayload = { contents: [contents] };
        }

        const result = await model.generateContent(requestPayload);
        const response = await result.response;
        const text = response.text ? response.text() : "";

        return {
          result,
          response,
          text,
          modelUsed: modelName,
        };
      } catch (err) {
        lastError = err;
        const transient = isTransientError(err);
        const isNotFound = err.status === 404 || String(err.message).includes("404");
        const isCongested = isCongestedOrQuotaError(err);

        console.warn(
          `⚠️ [Gemini AI] Call failed on model "${modelName}" (attempt ${attempt}/${maxRetriesPerModel}): ${err.message}`
        );

        if (isNotFound) {
          // Model does not exist or deprecated, skip retries and immediately try next fallback
          break;
        }

        // On Free Tier, if a model is congested (503), rate-limited (429), or stalled/aborted,
        // do not burn multiple retry delays waiting on the same saturated model.
        // Immediately cascade to the next available fallback model.
        if (!isLastModel && isCongested) {
          console.warn(`⚡ [Gemini AI] Model "${modelName}" is congested or throttled. Fast-falling back to next model...`);
          break;
        }

        if (transient && attempt < maxRetriesPerModel) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400);
          console.log(`⏳ [Gemini AI] Retrying "${modelName}" in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // If not transient or reached maxRetriesPerModel, break to try next fallback model
        break;
      }
    }

    if (!isLastModel) {
      const nextModel = models[mIdx + 1];
      console.warn(`🔄 [Gemini AI] Falling back from "${modelName}" to "${nextModel}"...`);
    }
  }

  const customMessage = isTransientError(lastError)
    ? "The AI service is currently experiencing high demand. Please wait a few moments and try again."
    : lastError?.message || "Failed to generate AI response";

  const enhancedError = new Error(customMessage);
  enhancedError.originalError = lastError;
  enhancedError.status = lastError?.status || 503;
  throw enhancedError;
}

module.exports = {
  getGenAI,
  DEFAULT_FALLBACK_CASCADE,
  getCandidateModels,
  isTransientError,
  isCongestedOrQuotaError,
  cleanAndParseJson,
  generateContentWithRetry,
};
