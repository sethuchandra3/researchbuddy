// Renders Rodney's streamed text: paragraphs, **bold**, *italic* — nothing more.
export function formatRodney(text) {
  return (text || "")
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((para, i) => (
      <p key={i}>
        {para.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
            return <em key={j}>{part.slice(1, -1)}</em>;
          return part;
        })}
      </p>
    ));
}
