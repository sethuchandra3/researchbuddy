const cap = (s, n) => {
  s = (s || "").toString().trim();
  return s.length > n ? s.slice(0, n) + " …" : s;
};

export const RODNEY_SYSTEM = `You are Rodney, a warm and slightly nerdy owl who helps everyday people read real research papers. The reader is smart but has no background in this field — they chose to read the actual paper instead of settling for an AI summary, so never talk down to them and never say things like "simply put" or "don't worry".

Voice: friendly, concrete, a little delighted by the ideas.

Rules:
- Lead with the big idea in one plain sentence.
- Use one everyday analogy where it genuinely helps.
- When you use a technical term from the paper, gloss it in a few words in passing.
- Keep it to 2-3 short paragraphs (roughly 120-220 words).
- No headers, no bullet lists, no code blocks. You may **bold** one or two key terms.
- Do not end with a question or an offer to help more.`;

const FAMILIARITY = {
  new: "new to reading research papers",
  some: "somewhat experienced with research papers",
  expert: "very comfortable reading research papers",
};
const INTEREST = {
  science: "science & health",
  tech: "technology",
  society: "society & policy",
};

// Appends the reader's stored preferences (from the client's localStorage)
// to Rodney's persona so depth and framing match the person reading.
function systemWith(prefs) {
  const fam = FAMILIARITY[prefs?.familiarity];
  const int = INTEREST[prefs?.interest];
  if (!fam && !int) return RODNEY_SYSTEM;
  let line = "\n\nAbout this reader:";
  if (fam) line += ` they describe themselves as ${fam}`;
  if (int) line += `${fam ? " and are" : " they are"} especially interested in ${int}`;
  line +=
    ". Tailor your explanation's depth and framing accordingly — a beginner needs more foundational context, an expert needs less hand-holding." +
    (int
      ? " Where natural, connect the paper's content to their stated interest area."
      : "");
  return RODNEY_SYSTEM + line;
}

function contextBlock({ paper = {}, sectionHeading, before, after, selection }) {
  const lines = [
    `PAPER: ${cap(paper.title, 300)}${
      paper.authors?.length ? " — " + paper.authors.join(", ") : ""
    }`,
    `ABSTRACT: ${cap(paper.abstract, 2500)}`,
  ];
  if (sectionHeading) lines.push(`CURRENT SECTION: ${cap(sectionHeading, 200)}`);
  if (before) lines.push(`TEXT JUST BEFORE THE SELECTION: ${cap(before, 1500)}`);
  if (after) lines.push(`TEXT JUST AFTER THE SELECTION: ${cap(after, 1500)}`);
  if (selection)
    lines.push(`THE READER SELECTED THIS PASSAGE:\n"""${cap(selection, 4000)}"""`);
  return lines.join("\n");
}

const EXPLAIN_ASK =
  "Explain what this passage is saying and why it matters in this paper.";

export function buildExplainMessages(body = {}) {
  const { mode = "explain", paper = {} } = body;
  const system = systemWith(body.prefs);

  if (mode === "overview") {
    const headings = (paper.sectionHeadings || []).slice(0, 30).join("; ");
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: `${contextBlock({ paper })}${
          headings ? `\nSECTIONS IN THE PAPER: ${headings}` : ""
        }\n\nIn three short paragraphs: what question were the researchers asking, what did they actually do, and why might a regular person care?`,
      },
    ];
  }

  if (mode === "simpler") {
    return [
      { role: "system", content: system },
      { role: "user", content: `${contextBlock(body)}\n\n${EXPLAIN_ASK}` },
      { role: "assistant", content: cap(body.previous, 2000) || "(previous explanation)" },
      {
        role: "user",
        content:
          "That was still a bit dense for me. Explain the same passage again for a curious 12-year-old: shorter, one vivid analogy, zero jargon.",
      },
    ];
  }

  return [
    { role: "system", content: system },
    { role: "user", content: `${contextBlock(body)}\n\n${EXPLAIN_ASK}` },
  ];
}

export function buildSuggestMessages({ title, abstract } = {}) {
  return [
    {
      role: "system",
      content:
        "You generate suggested questions for a research-paper reading app. Respond with ONLY a JSON array of strings — no prose, no code fences.",
    },
    {
      role: "user",
      content: `PAPER TITLE: ${cap(title, 300)}\nABSTRACT: ${cap(abstract, 2500)}\n\nGenerate 4 short, specific, and genuinely curious questions a smart non-expert reader might want to ask about THIS paper — not generic questions like "what's the main finding" but ones that reference actual content, ideas, or implications from this specific abstract. Make at least one creative/unexpected (e.g. connecting it to everyday life, a surprising implication, or a "what if" question). Return as a JSON array of short strings, each under 12 words, no other text.`,
    },
  ];
}

export function buildMindmapMessages({ title, abstract } = {}) {
  return [
    {
      role: "system",
      content:
        "You generate concept maps for a research-paper reading app. Respond with ONLY valid JSON — no prose, no code fences.",
    },
    {
      role: "user",
      content: `PAPER TITLE: ${cap(title, 300)}\nABSTRACT: ${cap(abstract, 2500)}\n\nBased on this paper's title and abstract, generate a concept map as JSON with this exact shape:\n{\n  "central": "<paper's core idea in 4-6 words>",\n  "nodes": [\n    { "id": "1", "label": "<concept, 3-5 words>", "connects_to": "central" }\n  ]\n}\nInclude 4-6 nodes total, each connecting to "central" or to another node's id. Labels must be plain-language, not jargon. Return ONLY the JSON, no other text.`,
    },
  ];
}

export function buildChatMessages(body = {}) {
  const { history = [], question } = body;
  const trimmed = history.slice(-8).map((m) => ({
    role: m.role === "rodney" ? "assistant" : "user",
    content: cap(m.content, 2000),
  }));
  return [
    {
      role: "system",
      content:
        systemWith(body.prefs) +
        "\n\nYou are mid-conversation with the reader about the passage below; answer follow-up questions in under 150 words unless they ask for more.",
    },
    { role: "user", content: contextBlock(body) },
    {
      role: "assistant",
      content: "Got it — I have the passage right here in front of me.",
    },
    ...trimmed,
    { role: "user", content: cap(question, 2000) || "Can you say more?" },
  ];
}
