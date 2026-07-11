// Dev-time helper: fetch + parse an arXiv paper and save it as a preloaded
// demo paper. Usage: npm run fetch-paper -- <arxiv id or url>
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchArxivPaper } from "../server/arxiv.js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm run fetch-paper -- <arxiv id or url>");
  process.exit(1);
}

const paper = await fetchArxivPaper(input);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "papers");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `${paper.id.replace(/\//g, "_")}.json`);
await writeFile(file, JSON.stringify(paper, null, 2));

const blockCount = paper.sections.reduce((n, s) => n + s.blocks.length, 0);
const words = paper.sections
  .flatMap((s) => s.blocks.map((b) => b.text))
  .join(" ")
  .split(/\s+/).length;
console.log(`Wrote ${file}`);
console.log(
  `  "${paper.title}" — ${paper.authors.join(", ")}\n  source: ${paper.source}, ${paper.sections.length} sections, ${blockCount} blocks, ~${Math.max(1, Math.round(words / 220))} min read`
);
