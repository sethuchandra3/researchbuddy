// DigitalOcean Gradient AI Platform async inference (image / TTS models).
// Used by scripts/generate-demo-assets.mjs at prep time — never during a
// live demo; Watch mode plays only pre-generated, locally cached assets.

const BASE = "https://inference.do-ai.run/v1";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.DIGITAL_OCEAN_MODEL_ACCESS_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function asyncInvoke(model_id, input, { timeoutMs = 180000 } = {}) {
  const createRes = await fetch(`${BASE}/async-invoke`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model_id, input }),
  });
  if (!createRes.ok) {
    throw new Error(`async-invoke create ${createRes.status}: ${await createRes.text()}`);
  }
  const { request_id } = await createRes.json();
  if (!request_id) throw new Error("async-invoke returned no request_id");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${BASE}/async-invoke/${request_id}/status`, {
      headers: authHeaders(),
    });
    if (!statusRes.ok) continue;
    const body = await statusRes.json();
    const status = (body.status || "").toUpperCase();
    if (status.startsWith("COMPLETE")) {
      if (body.output) return body.output;
      const finalRes = await fetch(`${BASE}/async-invoke/${request_id}`, {
        headers: authHeaders(),
      });
      return (await finalRes.json()).output;
    }
    if (status === "FAILED" || body.error) {
      throw new Error(`async-invoke failed: ${JSON.stringify(body.error || body)}`);
    }
  }
  throw new Error("async-invoke timed out");
}

// The output shapes differ per model (images[].url, audio.url, …) — walk the
// object and return the first URL that looks like a media file.
export function findMediaUrl(obj, exts) {
  const re = new RegExp(`^https?://\\S+\\.(${exts.join("|")})(\\?|$)`, "i");
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (typeof cur === "string") {
      if (re.test(cur)) return cur;
    } else if (cur && typeof cur === "object") {
      stack.push(...Object.values(cur));
    }
  }
  // fall back to any URL-valued "url" key
  const stack2 = [obj];
  while (stack2.length) {
    const cur = stack2.pop();
    if (cur && typeof cur === "object") {
      if (typeof cur.url === "string" && cur.url.startsWith("http")) return cur.url;
      stack2.push(...Object.values(cur));
    }
  }
  return null;
}
