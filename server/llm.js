import OpenAI from "openai";

// Two possible brains, each OpenAI-compatible:
//   • DO Agent (primary when configured): AGENT_ENDPOINT + AGENT_API_KEY
//   • DO Inference (fallback):            DIGITAL_OCEAN_MODEL_ACCESS_KEY
// Each client is built ONLY when its credentials are present, so a missing
// set never crashes the server at boot — it just drops that rung of the
// ladder. (The OpenAI SDK throws "Missing credentials" if constructed with
// an undefined apiKey, which is what took down the deploy before.)
const inferenceClient = process.env.DIGITAL_OCEAN_MODEL_ACCESS_KEY
  ? new OpenAI({
      apiKey: process.env.DIGITAL_OCEAN_MODEL_ACCESS_KEY,
      baseURL: "https://inference.do-ai.run/v1/",
    })
  : null;

const agentBase = (process.env.AGENT_ENDPOINT || "")
  .trim()
  .replace(/\/api\/v1\/chat\/completions\/?$/, "")
  .replace(/\/+$/, "");
const agentClient =
  agentBase && process.env.AGENT_API_KEY
    ? new OpenAI({
        apiKey: process.env.AGENT_API_KEY,
        baseURL: `${agentBase}/api/v1`,
      })
    : null;

if (!inferenceClient && !agentClient) {
  console.error(
    "[llm] No model credentials set. Add DIGITAL_OCEAN_MODEL_ACCESS_KEY " +
      "(recommended) and/or AGENT_ENDPOINT + AGENT_API_KEY. Rodney will " +
      "return a friendly error until one is present."
  );
} else {
  console.log(
    `[llm] brains ready → ${[
      agentClient && "DO Agent (primary)",
      inferenceClient && "DO Inference (fallback)",
    ]
      .filter(Boolean)
      .join(", ")}`
  );
}

// The DO Agent has extended thinking enabled, so max_completion_tokens must
// exceed its thinking budget (observed 1024) or the request 400s. Give agent
// calls generous headroom; thinking tokens don't appear in the streamed text.
const AGENT_MIN_TOKENS = 2048;

function attempts() {
  const list = [];
  if (agentClient)
    list.push({ client: agentClient, model: "agent", label: "do-agent", isAgent: true });
  if (inferenceClient) {
    list.push({
      client: inferenceClient,
      model: process.env.RODNEY_MODEL || "anthropic-claude-4.6-sonnet",
      label: "inference-primary",
    });
    list.push({
      client: inferenceClient,
      model: process.env.RODNEY_FALLBACK_MODEL || "anthropic-claude-haiku-4.5",
      label: "inference-fallback",
    });
  }
  return list;
}

// The DO Agent forbids client-supplied system/developer messages — its
// instructions live in the agent's own configuration. Fold any system
// message into the first user turn so the persona still reaches the model.
function prepareMessages(messages, isAgent) {
  if (!isAgent) return messages;
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  if (!systemText) return rest;
  const firstUser = rest.findIndex((m) => m.role === "user");
  if (firstUser === -1) return [{ role: "user", content: systemText }, ...rest];
  const merged = rest.slice();
  merged[firstUser] = {
    ...merged[firstUser],
    content: `${systemText}\n\n---\n\n${merged[firstUser].content}`,
  };
  return merged;
}

const FRIENDLY_ERROR = "Rodney lost his train of thought — mind trying that again?";

// Streams a chat completion to the response as SSE frames:
//   data: {"t":"token"}  |  data: {"e":"error message"}  |  data: [DONE]
// Walks the attempt ladder; only falls through if nothing was sent yet.
export async function streamToResponse(res, messages) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  for (const { client, model, label, isAgent } of attempts()) {
    let sentAny = false;
    try {
      const stream = await client.chat.completions.create({
        model,
        messages: prepareMessages(messages, isAgent),
        stream: true,
        max_completion_tokens: isAgent ? AGENT_MIN_TOKENS : 1024,
        // Extended thinking (on for the agent) requires temperature 1
        temperature: isAgent ? 1 : 0.7,
      });
      res.on("close", () => stream.controller.abort());
      for await (const chunk of stream) {
        const t = chunk.choices?.[0]?.delta?.content;
        if (t) {
          sentAny = true;
          res.write(`data: ${JSON.stringify({ t })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (err) {
      if (res.writableEnded) return;
      console.error(`[llm] ${label} failed:`, err.message);
      // Mid-stream failure: don't restart with another model (would duplicate text)
      if (sentAny) break;
    }
  }

  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ e: FRIENDLY_ERROR })}\n\n`);
    res.end();
  }
}

// Non-streaming completion for small utility calls (e.g. suggested questions).
export async function complete(messages, { maxTokens = 400, temperature = 0.8 } = {}) {
  for (const { client, model, label, isAgent } of attempts()) {
    try {
      const r = await client.chat.completions.create({
        model,
        messages: prepareMessages(messages, isAgent),
        max_completion_tokens: isAgent ? Math.max(maxTokens, AGENT_MIN_TOKENS) : maxTokens,
        temperature: isAgent ? 1 : temperature,
      });
      const text = r.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      console.error(`[llm] ${label} (complete) failed:`, err.message);
    }
  }
  throw new Error("All model attempts failed");
}
