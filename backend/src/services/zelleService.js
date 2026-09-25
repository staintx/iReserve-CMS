const { getGenAI, getCandidateModels, isTransientError } = require("./geminiClient");
const ZelleConversation = require("../models/ZelleConversation");
const { CUSTOMER_SYSTEM_PROMPT, ADMIN_SYSTEM_PROMPT } = require("./zellePrompts");
const { CUSTOMER_TOOLS, ADMIN_TOOLS } = require("./zelleTools");
const { executeTool } = require("./zelleToolExecutor");
const Rating = require("../models/Rating");

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
    } else if (name === "prepare_inquiry_form_data" && result?.success) {
      cards.push({
        type: "prepare_inquiry_form",
        data: result.prefill_data,
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
      text: "Zelle AI is currently offline for maintenance. Please check back shortly or reach out to our team directly.",
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

  const candidateModels = getCandidateModels();
  const ai = getGenAI();

  const callChatTurn = async (chatContents) => {
    let lastErr = null;
    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const modelName = candidateModels[mIdx];
      try {
        const m = ai.getGenerativeModel({
          model: modelName,
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          tools: [{ functionDeclarations: toolDeclarations }],
        });
        return await m.generateContent({ contents: chatContents });
      } catch (err) {
        lastErr = err;
        if (isTransientError(err) && mIdx < candidateModels.length - 1) {
          console.warn(`[Zelle AI] Model "${modelName}" busy (${err.message}). Trying "${candidateModels[mIdx + 1]}"...`);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

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
      const result = await callChatTurn(contents);
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
    responseText = "I apologize, but I'm having trouble processing that request right now. Please give me a moment and try asking again.";
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

module.exports = {
  chatWithZelle,
};

