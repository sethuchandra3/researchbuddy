import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { streamToResponse, complete } from "./llm.js";
import {
  buildExplainMessages,
  buildChatMessages,
  buildSuggestMessages,
} from "./prompts.js";
import { fetchArxivPaper } from "./arxiv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const papersDir = path.join(__dirname, "papers");
const distDir = path.join(__dirname, "..", "dist");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/papers", async (req, res) => {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(papersDir, "index.json"), "utf8")
    );
    res.json(manifest);
  } catch {
    res.json([]);
  }
});

app.get("/api/papers/:id", async (req, res) => {
  try {
    const safe = req.params.id.replace(/[^a-zA-Z0-9._-]/g, "");
    const paper = JSON.parse(
      await readFile(path.join(papersDir, `${safe}.json`), "utf8")
    );
    res.json(paper);
  } catch {
    res.status(404).json({ error: "Rodney couldn't find that paper on his shelf." });
  }
});

app.get("/api/arxiv", async (req, res) => {
  try {
    res.json(await fetchArxivPaper(String(req.query.id || "")));
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// Content-specific suggested questions from the paper's title + abstract.
// The client falls back to static chips if this errors.
app.post("/api/suggest", async (req, res) => {
  try {
    const text = await complete(buildSuggestMessages(req.body || {}), {
      maxTokens: 300,
      temperature: 0.8,
    });
    const match = text.match(/\[[\s\S]*\]/);
    const questions = JSON.parse(match ? match[0] : text)
      .filter((q) => typeof q === "string" && q.trim())
      .slice(0, 4);
    if (!questions.length) throw new Error("empty suggestions");
    res.json({ questions });
  } catch (err) {
    console.error("[suggest]", err.message);
    res.status(502).json({ error: "no suggestions" });
  }
});

app.post("/api/explain", (req, res) =>
  streamToResponse(res, buildExplainMessages(req.body || {}))
);
app.post("/api/chat", (req, res) =>
  streamToResponse(res, buildChatMessages(req.body || {}))
);

app.use(express.static(distDir));

// SPA fallback — plain middleware, not app.get('*') (which throws in Express 5)
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err && !res.headersSent) {
      res
        .status(200)
        .send("Rodney's server is up. Build the frontend with `npm run build`.");
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Rodney is perched and listening on :${port}`);
});
