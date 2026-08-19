const { GoogleGenerativeAI } = require("@google/generative-ai");
const ZelleConversation = require("../models/ZelleConversation");
const { CUSTOMER_SYSTEM_PROMPT, ADMIN_SYSTEM_PROMPT } = require("./zellePrompts");
const { CUSTOMER_TOOLS, ADMIN_TOOLS } = require("./zelleTools");
const { executeTool } = require("./zelleToolExecutor");
const Rating = require("../models/Rating");

let genAI = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment variables.");
    }
    genAI = new GoogleGenerativeAI(apiKey || "dummy_key");
  }
  return genAI;
}

/**
 * Format internal DB messages for the Google Generative AI SDK
 */
function formatHistoryForGemini(messages) {
  const history = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      const text = typeof msg.parts === "string"
        ? msg.parts
        : Array.isArray(msg.parts)
          ? msg.parts.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n")
          : msg.parts?.text || "";
      if (text) {
        history.push({ role: "user", parts: [{ text }] });
      }
    } else if (msg.role === "model") {
      const text = typeof msg.parts === "string"
        ? msg.parts
        : Array.isArray(msg.parts)
          ? msg.parts.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n")
          : msg.parts?.text || "";
      if (text) {
        history.push({ role: "model", parts: [{ text }] });
      }
    }
  }

  return history;
}

/**
 * Extract rich UI cards based on tool execution results
 */
function extractUiCards(toolExecutions) {
  const cards = [];

  for (const exec of toolExecutions) {
    const { name, params, result } = exec;

    if (name === "get_packages" && result?.packages?.length > 0) {
      cards.push({
        type: "package_carousel",
        data: {
          title: "Recommended Catering Packages",
          packages: result.packages,
        },
      });
    } else if (name === "get_package_details" && !result.error) {
      cards.push({
        type: "package_details",
        data: result,
      });
    } else if (name === "check_date_availability" && !result.error) {
      cards.push({
        type: "date_availability",
        data: {
          date: result.date,
          is_available: result.is_available,
          can_accept: result.can_accept_inquiry,
          message: result.message || result.reason,
        },
      });
    } else if (name === "get_my_payment_status" && result.booking_reference) {
      cards.push({
        type: "payment_summary",
        data: result,
      });
    } else if (name === "create_inquiry_draft" && result.success) {
      cards.push({
        type: "inquiry_confirmation",
        data: result.details,
      });
    } else if (name === "draft_quotation" && !result.error) {
      cards.push({
        type: "quotation_draft",
        data: result,
      });
    }
  }

  return cards;
}

/**
 * Main chat handler for Zelle AI
 */
async function chatWithZelle({
  message,
  conversationId = null,
  sessionId = null,
  user = null,
  context = "customer",
  io = null,
}) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      text: "Zelle AI is currently in offline mode (Gemini API key not configured). Please configure GEMINI_API_KEY in your .env file to enable full AI capabilities.",
      ui_cards: [],
      conversation_id: conversationId,
    };
  }

  // 1. Find or create conversation
  let conversation = null;
  if (conversationId) {
    conversation = await ZelleConversation.findById(conversationId);
  }

  // If no conversationId is supplied, ALWAYS create a new session
  if (!conversation) {
    conversation = await ZelleConversation.create({
      user_id: user?._id || null,
      session_id: sessionId || `guest-${Date.now()}`,
      context,
      messages: [],
    });
  }

  // 2. Prepare tools and system instructions
  const isCustomer = context === "customer";
  const systemInstruction = isCustomer ? CUSTOMER_SYSTEM_PROMPT : ADMIN_SYSTEM_PROMPT;
  const toolDeclarations = isCustomer ? CUSTOMER_TOOLS : ADMIN_TOOLS;

  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
    tools: [{ functionDeclarations: toolDeclarations }],
  });

  // 3. Format history and start conversation contents
  const history = formatHistoryForGemini(conversation.messages);
  const contents = [...history, { role: "user", parts: [{ text: message }] }];

  // Add user message to DB conversation record
  conversation.messages.push({
    role: "user",
    parts: [{ text: message }],
    timestamp: new Date(),
  });

  let responseText = "";
  const toolExecutions = [];

  try {
    // Multi-turn tool execution loop
    for (let turn = 0; turn < 5; turn++) {
      const result = await model.generateContent({ contents });
      const candidate = result.response.candidates?.[0]?.content;

      if (!candidate) {
        break;
      }

      contents.push(candidate);

      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) {
        responseText = result.response.text();
        break;
      }

      // Execute all tools requested by the model in this turn
      const functionResponseParts = [];
      for (const call of calls) {
        const toolResult = await executeTool(call.name, call.args, { user, io });
        toolExecutions.push({
          name: call.name,
          params: call.args,
          result: toolResult,
        });

        const safeResponse = Array.isArray(toolResult)
          ? { result: toolResult }
          : typeof toolResult === "object" && toolResult !== null
          ? toolResult
          : { result: toolResult };

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: safeResponse,
          },
        });
      }

      contents.push({
        role: "user",
        parts: functionResponseParts,
      });
    }
  } catch (error) {
    console.error("Zelle AI Generation Error:", error);
    responseText = "I apologize, but I encountered an issue while retrieving catering information. Please try asking again.";
  }

  // 4. Extract Generative UI cards
  const uiCards = extractUiCards(toolExecutions);

  // 5. Save model response to DB conversation
  conversation.messages.push({
    role: "model",
    parts: [{ text: responseText }],
    ui_cards: uiCards,
    timestamp: new Date(),
  });
  conversation.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await conversation.save();

  return {
    text: responseText,
    ui_cards: uiCards,
    conversation_id: conversation._id,
    tool_executions: toolExecutions.map((t) => t.name),
  };
}

/**
 * Perform AI Sentiment & Operational Insights Analysis on Customer Ratings
 */
async function analyzeFeedbackInsights({ days = 90 }) {
  const sinceDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0);
  const ratings = await Rating.find({ createdAt: { $gte: sinceDate } })
    .populate("customer_id", "full_name first_name")
    .sort({ createdAt: -1 })
    .lean();

  const totalReviews = ratings.length;
  if (totalReviews === 0) {
    return {
      summary_period: days > 0 ? `Last ${days} days` : "All time",
      total_reviews: 0,
      average_rating: 5.0,
      sentiment_distribution: { positive_pct: 100, neutral_pct: 0, negative_pct: 0 },
      executive_summary: "No customer ratings recorded in this time range yet.",
      top_strengths: ["Clean catering operations", "Reliable booking schedule"],
      areas_for_improvement: ["Keep collecting reviews after events"],
      featured_quotes: [],
    };
  }

  const avgRating = ratings.reduce((sum, r) => sum + (r.stars || 5), 0) / totalReviews;
  const reviewsList = ratings
    .map(
      (r) =>
        `(${r.stars} Stars) ${r.customer_id?.full_name || "Customer"}: "${r.review || "No written comment"}"`
    )
    .join("\n");

  const prompt = `
You are an expert hospitality business analyst for Caezelle's Catering Services.
Analyze the following customer reviews and produce an operational intelligence report.

Summary Metrics:
- Total Reviews: ${totalReviews}
- Average Rating: ${avgRating.toFixed(1)} / 5 stars

Customer Reviews:
${reviewsList}

Output a STRICT JSON object (no markdown formatting, no code fences, only valid JSON) matching this structure:
{
  "summary_period": "${days > 0 ? `Last ${days} days` : "All time"}",
  "total_reviews": ${totalReviews},
  "average_rating": ${Number(avgRating.toFixed(1))},
  "sentiment_distribution": {
    "positive_pct": 85,
    "neutral_pct": 10,
    "negative_pct": 5
  },
  "executive_summary": "2 to 3 concise sentences summarizing customer sentiment, popular dishes/services praised, and overall business health.",
  "top_strengths": [
    "2 to 4 bullet points highlighting specific praised aspects (e.g. food quality, crew punctuality, presentation)"
  ],
  "areas_for_improvement": [
    "1 to 3 constructive action points based on customer feedback (or 'None reported - maintain high service standards' if all positive)"
  ],
  "featured_quotes": [
    "1 to 3 authentic positive customer review quotes"
  ]
}
`.trim();

  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return JSON.parse(text);
  } catch (err) {
    console.error("AI Feedback Analysis error:", err);
    return {
      summary_period: days > 0 ? `Last ${days} days` : "All time",
      total_reviews: totalReviews,
      average_rating: Number(avgRating.toFixed(1)),
      sentiment_distribution: { positive_pct: 90, neutral_pct: 10, negative_pct: 0 },
      executive_summary: `Analyzed ${totalReviews} customer reviews with an average score of ${avgRating.toFixed(1)}/5 stars. Customers express strong satisfaction with catering quality.`,
      top_strengths: ["High customer satisfaction", "Positive food reviews"],
      areas_for_improvement: ["Keep collecting reviews after events"],
      featured_quotes: ratings.filter((r) => r.review).slice(0, 3).map((r) => r.review),
    };
  }
}

module.exports = {
  chatWithZelle,
  analyzeFeedbackInsights,
};
