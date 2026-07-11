// Pre-generates Watch-mode assets for ONE featured paper using DigitalOcean's
// Gradient AI Platform (Flux image + ElevenLabs narration), then caches
// everything locally. Run BEFORE the demo, never during it:
//   npm run generate-demo-assets -- 1706.03762
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { complete } from "../server/llm.js";
import { asyncInvoke, findMediaUrl } from "../server/assets.js";

const id = process.argv[2] || "1706.03762";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "server", "assets");
await mkdir(assetsDir, { recursive: true });

const paper = JSON.parse(
  await readFile(path.join(root, "server", "papers", `${id.replace(/\//g, "_")}.json`), "utf8")
);
console.log(`Generating demo assets for: ${paper.title}`);

// 1. One LLM call plans everything: image prompt, narration, story cards
const planText = await complete(
  [
    {
      role: "system",
      content:
        "You script short explainer videos about research papers for a general audience. Respond with ONLY valid JSON, no code fences.",
    },
    {
      role: "user",
      content: `PAPER TITLE: ${paper.title}\nABSTRACT: ${paper.abstract}\n\nReturn JSON exactly like:\n{\n  "imagePrompt": "<a vivid visual scene representing the paper's core idea, described for an image generator; warm, friendly, no text in image>",\n  "narration": "<a ~140 word spoken narration with four beats: a hook, what the researchers set out to do, how they did it, and why it matters to a regular person. Warm, plain language, no jargon.>",\n  "cards": [\n    {"heading": "<3-6 words>", "text": "<one sentence, the paper's big idea>"},\n    {"heading": "<3-6 words>", "text": "<one sentence, what they actually did>"},\n    {"heading": "<3-6 words>", "text": "<one sentence, the key finding and why it matters>"}\n  ]\n}`,
    },
  ],
  { maxTokens: 700, temperature: 0.7 }
);
const plan = JSON.parse(planText.match(/\{[\s\S]*\}/)[0]);
console.log(`Narration (${plan.narration.split(/\s+/).length} words), ${plan.cards.length} cards`);

// 2. Image via Flux
console.log("Generating image (fal-ai/flux/schnell)…");
const imgOut = await asyncInvoke("fal-ai/flux/schnell", {
  prompt: `${plan.imagePrompt}, warm flat illustration style, orange and cream palette`,
});
const imgUrl = findMediaUrl(imgOut, ["jpg", "jpeg", "png", "webp"]);
if (!imgUrl) throw new Error("no image URL in output: " + JSON.stringify(imgOut).slice(0, 400));

// 3. Narration via ElevenLabs TTS
console.log("Generating narration audio (fal-ai/elevenlabs/tts/multilingual-v2)…");
const ttsOut = await asyncInvoke("fal-ai/elevenlabs/tts/multilingual-v2", {
  text: plan.narration,
});
const audioUrl = findMediaUrl(ttsOut, ["mp3", "wav", "m4a", "ogg"]);
if (!audioUrl) throw new Error("no audio URL in output: " + JSON.stringify(ttsOut).slice(0, 400));

// 4. Cache binaries locally so the demo never depends on remote CDN URLs
async function download(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${filename}: ${res.status}`);
  await writeFile(path.join(assetsDir, filename), Buffer.from(await res.arrayBuffer()));
  return `/assets/${filename}`;
}
const safe = id.replace(/\//g, "_");
const imageExt = (imgUrl.match(/\.(jpg|jpeg|png|webp)/i) || [, "jpg"])[1];
const audioExt = (audioUrl.match(/\.(mp3|wav|m4a|ogg)/i) || [, "mp3"])[1];
const image = await download(imgUrl, `demo-${safe}.${imageExt}`);
const audio = await download(audioUrl, `demo-${safe}.${audioExt}`);

const manifest = {
  paperId: id,
  title: paper.title,
  image,
  audio,
  narration: plan.narration,
  cards: plan.cards,
  generatedWith: "DigitalOcean Gradient AI Platform (Flux + ElevenLabs)",
  generatedAt: new Date().toISOString(),
};
await writeFile(
  path.join(root, "server", "demoAssets.json"),
  JSON.stringify(manifest, null, 2)
);
console.log(`✓ Wrote server/demoAssets.json (${image}, ${audio})`);
