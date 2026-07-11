// Lightweight, single-device personalization + reading history via
// localStorage — a deliberate stand-in for a real accounts + database
// setup, which would be the natural next step post-hackathon.

const PREFS_KEY = "rodney_preferences";
const READ_KEY = "rodney_read_articles";

export const FAMILIARITY_OPTIONS = [
  { value: "new", label: "New to this" },
  { value: "some", label: "Some experience" },
  { value: "expert", label: "Very comfortable" },
];

export const INTEREST_OPTIONS = [
  { value: "science", label: "Science & health" },
  { value: "tech", label: "Technology" },
  { value: "society", label: "Society & policy" },
  { value: "none", label: "Just curious" },
];

export function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY));
  } catch {
    return null;
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode etc. — personalization just stays off */
  }
}

export function getReadArticles() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY)) || [];
  } catch {
    return [];
  }
}

export function recordReadArticle(paper) {
  try {
    const summary =
      (paper.abstract || "").replace(/\s+/g, " ").trim().slice(0, 140) +
      ((paper.abstract || "").length > 140 ? "…" : "");
    const entry = {
      id: paper.id,
      title: paper.title,
      arxivUrl: `https://arxiv.org/abs/${paper.id}`,
      dateRead: new Date().toISOString(),
      oneLineSummary: summary,
    };
    const rest = getReadArticles().filter((a) => a.id !== paper.id);
    localStorage.setItem(READ_KEY, JSON.stringify([entry, ...rest].slice(0, 50)));
  } catch {
    /* storage unavailable — history just stays off */
  }
}
