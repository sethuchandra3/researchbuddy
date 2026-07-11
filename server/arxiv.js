import * as cheerio from "cheerio";

const UA = "RodneyResearchBuddy/1.0 (hackathon demo)";
const cache = new Map();

// Accepts a full arxiv.org/{abs,pdf,html} URL, an ar5iv URL, or a bare ID
// (new-style "2501.12948v2" or old-style "hep-th/9901001"). Returns the ID or null.
export function normalizeArxivId(input) {
  if (!input) return null;
  let s = String(input).trim();
  const urlMatch =
    s.match(/arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+)/i) ||
    s.match(/ar5iv(?:\.labs)?\.arxiv\.org\/html\/([^?#\s]+)/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/\.pdf$/i, "").replace(/\/+$/, "");
  const newStyle = s.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  if (newStyle) return newStyle[1] + (newStyle[2] || "");
  const oldStyle = s.match(/([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?/);
  if (oldStyle) return oldStyle[1] + (oldStyle[2] || "");
  return null;
}

async function get(url) {
  return fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
}

function clean(t) {
  return (t || "").replace(/\s+/g, " ").trim();
}

const AFFILIATION =
  /universit|institute|google|deepmind|research|laborator|\blab\b|department|college|school|center|centre|corporation|\binc\b|academy|faculty|brain|openai|microsoft|amazon|nvidia|of technology|astronomy|physics|observator/i;

function shortAuthors(list) {
  const seen = new Set();
  const names = [];
  for (const raw of list) {
    const name = clean(raw)
      .replace(/\S+@\S+/g, "") // emails
      .replace(/[\d∗†‡§¶#*]+/g, " ") // superscript affiliation markers
      .replace(/\s+/g, " ")
      .replace(/^[\s,;&.]+|[\s,;&]+$/g, "");
    if (!name || name.length < 4 || name.length > 40) continue;
    if (!name.includes(" ")) continue; // want "First Last", not fragments
    if (AFFILIATION.test(name)) continue;
    if (!/^[\p{L}][\p{L}.'’\- ]+$/u.test(name)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names.length > 4 ? [...names.slice(0, 4), "et al."] : names;
}

function parseLatexmlHtml(html, id, source) {
  const $ = cheerio.load(html);

  // Swap every math node for its LaTeX source so the reading view stays
  // selectable plain text ("select a formula → Rodney explains it").
  $("math").each((_, el) => {
    const alt = clean($(el).attr("alttext"));
    $(el).replaceWith(alt && alt.length <= 80 ? ` ${alt} ` : " [formula] ");
  });

  $(".ltx_note, .ltx_role_footnote, .ltx_pagination, .ltx_TOC, nav, .ltx_rule").remove();

  const titleEl = $("h1.ltx_title_document").first().clone();
  titleEl.find(".ltx_tag").remove();
  const title = clean(titleEl.text());
  if (!title) return null;

  const rawAuthors = [];
  $(".ltx_authors .ltx_personname").each((_, el) => {
    // A personname span can hold several names separated by breaks/commas/"and"
    $(el)
      .text()
      .split(/\n|,|\band\b|&/)
      .forEach((piece) => rawAuthors.push(piece));
  });
  const authors = shortAuthors(rawAuthors);

  const abstract = $("div.ltx_abstract p.ltx_p")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean)
    .join("\n\n");

  const skipScopes =
    ".ltx_bibliography, .ltx_appendix, .ltx_acknowledgements, table.ltx_tabular, .ltx_biography";

  function blocksWithin($scope) {
    const blocks = [];
    $scope
      .find(
        "h3.ltx_title_subsection, h4.ltx_title_subsubsection, .ltx_para > p.ltx_p, table.ltx_equation, figcaption.ltx_caption"
      )
      .each((_, el) => {
        const $el = $(el);
        if ($el.closest(skipScopes).length) return;
        if ($el.is("h3, h4")) {
          const h = $el.clone();
          h.find(".ltx_tag").remove();
          const text = clean(h.text());
          if (text) blocks.push({ type: "h3", text });
        } else if ($el.is("table.ltx_equation")) {
          const eq = $el.clone();
          eq.find(".ltx_tag").remove();
          const text = clean(eq.text());
          if (text && text.length <= 200 && text !== "[formula]")
            blocks.push({ type: "math", text });
        } else if ($el.is("figcaption")) {
          const text = clean($el.text());
          if (text) blocks.push({ type: "caption", text: text.slice(0, 500) });
        } else {
          const text = clean($el.text());
          if (text.length >= 20) blocks.push({ type: "p", text });
        }
      });
    return blocks.slice(0, 80);
  }

  const sections = [];
  $("section.ltx_section").each((i, sec) => {
    const $sec = $(sec);
    if ($sec.is(".ltx_bibliography, .ltx_appendix, .ltx_acknowledgements")) return;
    const headEl = $sec.find("h2.ltx_title_section").first().clone();
    headEl.find(".ltx_tag").remove();
    const heading = clean(headEl.text());
    const blocks = blocksWithin($sec);
    if (blocks.length) sections.push({ id: `s${i}`, heading, blocks });
  });

  // Some papers (e.g. PRL letters) have no numbered sections — take the
  // article body as one unnamed section.
  if (!sections.length) {
    const $article = $("article").first().length ? $("article").first() : $("body");
    const scoped = $article.clone();
    scoped.find("div.ltx_abstract, .ltx_bibliography, .ltx_appendix, .ltx_acknowledgements").remove();
    const blocks = blocksWithin(scoped);
    if (blocks.length) sections.push({ id: "s0", heading: "", blocks });
  }

  if (!sections.length && !abstract) return null;

  return {
    id,
    title,
    authors,
    abstract,
    sections: sections.slice(0, 30),
    source,
  };
}

async function fetchAbstractOnly(id) {
  const res = await get(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`
  );
  if (!res.ok) return null;
  const $ = cheerio.load(await res.text(), { xmlMode: true });
  const entry = $("entry").first();
  const title = clean(entry.find("title").first().text());
  const summary = clean(entry.find("summary").first().text());
  const authors = entry
    .find("author > name")
    .map((_, el) => $(el).text())
    .get();
  if (!title || !summary || title.toLowerCase() === "error") return null;
  return {
    id,
    title,
    authors: shortAuthors(authors),
    abstract: summary,
    sections: [],
    source: "abstract-only",
  };
}

export async function fetchArxivPaper(rawInput) {
  const id = normalizeArxivId(rawInput);
  if (!id) {
    throw Object.assign(
      new Error("Hmm, that doesn't look like an arXiv link or ID to Rodney."),
      { status: 400 }
    );
  }
  if (cache.has(id)) return cache.get(id);

  const bareId = id.replace(/v\d+$/, "");
  const candidates = [{ url: `https://arxiv.org/html/${id}`, source: "arxiv-html" }];
  if (id === bareId)
    candidates.push({ url: `https://arxiv.org/html/${id}v1`, source: "arxiv-html" });
  candidates.push({
    url: `https://ar5iv.labs.arxiv.org/html/${bareId}`,
    source: "ar5iv",
  });

  for (const { url, source } of candidates) {
    try {
      const res = await get(url);
      if (!res.ok) continue;
      // ar5iv redirects to the arxiv.org abstract page when it has no conversion
      if (source === "ar5iv" && !new URL(res.url).hostname.includes("ar5iv")) continue;
      const html = await res.text();
      if (!html.includes("ltx_title_document")) continue;
      const paper = parseLatexmlHtml(html, id, source);
      if (paper) {
        cache.set(id, paper);
        return paper;
      }
    } catch (err) {
      console.error(`[arxiv] ${url}: ${err.message}`);
    }
  }

  try {
    const paper = await fetchAbstractOnly(id);
    if (paper) {
      cache.set(id, paper);
      return paper;
    }
  } catch (err) {
    console.error(`[arxiv] abstract fallback: ${err.message}`);
  }

  throw Object.assign(
    new Error(
      "Rodney couldn't fetch that paper from arXiv. Double-check the link, or try another paper."
    ),
    { status: 404 }
  );
}
