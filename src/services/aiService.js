import axios from "axios";

// ==================================================
// CONFIGURATION
// ==================================================
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-3.5-turbo";
const AI_TIMEOUT_MS = 20000;

let _abortCtrl = null;

// ==================================================
// API SERVICE
// ==================================================
export const fetchAiResponse = async (conversationMessages, context, signal) => {
  // Cancel previous in-flight requests to prevent duplicates
  if (_abortCtrl) {
    _abortCtrl.abort();
  }
  _abortCtrl = new AbortController();

  // Load key from localStorage ONLY
  const apiKey = localStorage.getItem("openrouter_api_key");

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Missing OpenRouter API key");
  }

  const latitude = context.iss?.latitude ?? "Unknown";
  const longitude = context.iss?.longitude ?? "Unknown";
  const velocity = context.iss?.velocity_km_per_h ?? "Unknown";
  const altitude = context.iss?.altitude_km ?? "Unknown";
  const astronautNames = context.astronauts_on_iss || [];
  const articles = context.top_news_headlines || [];

  const dashboardContext = `
CURRENT DASHBOARD DATA

ISS Telemetry:

* Latitude: ${latitude}
* Longitude: ${longitude}
* Velocity: ${velocity}
* Altitude: ${altitude}

Astronauts In Space:
${astronautNames.join(", ") || "None"}

Top News Headlines:
${articles.slice(0,5).map((a,i)=>`${i+1}. ${a.title}`).join("\n") || "None available."}

You are the OrbitDash AI assistant.
You MUST answer ONLY using dashboard data.
If the user asks for a summary, summarize the news shown above.
`;

  const requestBody = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: "system",
        content: dashboardContext,
      },
      ...conversationMessages
    ],
    temperature: 0.3,
    max_tokens: 250,
  };

  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": window.location.origin,
    "X-Title": "OrbitDash",
  };

  try {
    const response = await axios.post(OPENROUTER_ENDPOINT, requestBody, {
      headers,
      timeout: AI_TIMEOUT_MS,
      signal: signal || _abortCtrl.signal,
    });

    console.log("OpenRouter raw:", response.data);

    const reply = response.data?.choices?.[0]?.message?.content || "No response generated.";
    
    console.log("AI reply:", reply);

    return reply.trim();
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error; // Let the caller handle cancellation silently
    }

    console.log("OpenRouter error:", error.response?.data);

    const status = error.response?.status;

    if (status === 401) {
      throw new Error("Invalid OpenRouter API key (401). Please check Settings.");
    }
    if (status === 404) {
      throw new Error(`Model '${OPENROUTER_MODEL}' not found or unavailable (404).`);
    }
    if (status === 429) {
      throw new Error("OpenRouter rate limit exceeded (429). Please wait a moment.");
    }
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error("AI request timed out. Please try again.");
    }

    throw new Error(`AI request failed: ${error.message}`);
  } finally {
    _abortCtrl = null;
  }
};
