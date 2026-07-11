export async function getLibrary() {
  const res = await fetch("/api/papers");
  if (!res.ok) throw new Error("Couldn't load Rodney's library.");
  return res.json();
}

export async function getPaper(id) {
  const res = await fetch(`/api/papers/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Couldn't open that paper.");
  return res.json();
}

export async function fetchArxiv(input) {
  const res = await fetch(`/api/arxiv?id=${encodeURIComponent(input)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Rodney couldn't fetch that paper.");
  return data;
}

// Content-specific suggested questions; throws if unavailable so the
// caller can fall back to static chips.
export async function getSuggestions(paper) {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: paper.title, abstract: paper.abstract }),
  });
  if (!res.ok) throw new Error("no suggestions");
  const data = await res.json();
  if (!Array.isArray(data.questions) || !data.questions.length)
    throw new Error("no suggestions");
  return data.questions;
}

// POSTs to a streaming endpoint and feeds tokens to onToken as they arrive.
// SSE frames over fetch: data: {"t":...} | data: {"e":...} | data: [DONE]
export async function streamLLM(path, body, { onToken, signal }) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error("Rodney couldn't reach his bookshelf — try again?");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop();
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;
      let obj;
      try {
        obj = JSON.parse(payload);
      } catch {
        continue;
      }
      if (obj.t) onToken(obj.t);
      if (obj.e) throw new Error(obj.e);
    }
  }
}
