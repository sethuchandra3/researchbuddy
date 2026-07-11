import OpenAI from "openai";

// Primary: a DigitalOcean Agent endpoint when configured (AGENT_ENDPOINT +
// AGENT_API_KEY). Fallback: the DO Inference Engine directly. Both are
// OpenAI-compatible, so each attempt is just a client + model pair.
const inferenceClient = new OpenAI({
  apiKey: process.env.DIGITAL_OCEAN_MODEL_ACCESS_KEY,
  baseURL: "https://inference.do-ai.run/v1/",
});

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

function attempts() {
  const list = [];
  if (agentClient) list.push({ client: agentClient, model: "agent", label: "do-agent" });
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
  return list;
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

  for (const { client, model, label } of attempts()) {
    let sentAny = false;
    try {
      const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
        max_completion_tokens: 1024,
        temperature: 0.7,
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
  for (const { client, model, label } of attempts()) {
    try {
      const r = await client.chat.completions.create({
        model,
        messages,
        max_completion_tokens: maxTokens,
        temperature,
      });
      const text = r.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      console.error(`[llm] ${label} (complete) failed:`, err.message);
    }
  }
  throw new Error("All model attempts failed");
}
