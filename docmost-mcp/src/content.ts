// The /api/pages/info endpoint with format:'markdown' returns Markdown directly
// from the server (Docmost's own jsonToMarkdown conversion). No client-side
// ProseMirror conversion needed.

const MAX_CHARS = 50_000;

export function truncateMarkdown(content: string): string {
  if (content.length <= MAX_CHARS) return content;
  return (
    content.slice(0, MAX_CHARS) +
    `\n\n<!-- [TRONQUÉ : contenu dépassant ${MAX_CHARS} caractères, ${content.length - MAX_CHARS} caractères omis] -->`
  );
}
