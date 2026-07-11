export default function PaperCard({ paper, onOpen, opening }) {
  return (
    <button
      onClick={onOpen}
      className="paper-card group flex h-full cursor-pointer flex-col rounded-2xl border border-line bg-paper p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-rodney/40 hover:shadow-lift"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-rodney">
        {paper.tag}
        <span className="ml-2 font-normal normal-case tracking-normal text-ink-faint">
          · {paper.minutes} min read
        </span>
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold leading-snug">{paper.title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft">{paper.authors}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-ink-soft">{paper.blurb}</p>
      <div className="mt-4 text-sm font-semibold text-rodney transition-colors group-hover:text-rodney-deep">
        {opening ? "Opening…" : "Read with Rodney →"}
      </div>
    </button>
  );
}
