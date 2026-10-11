// Convertit du Markdown en document ProseMirror (format Docmost/Tiptap).
// Gère : titres, blocs de code, paragraphes, listes, blockquotes, hr,
// et les marks inline bold/italic/code/strike.

type Mark = { type: string; attrs?: Record<string, unknown> };
type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: Mark[];
  text?: string;
};

export type PMDoc = { type: 'doc'; content: PMNode[] };

export function markdownToProseMirror(md: string): PMDoc {
  const lines = md.split('\n');
  const blocks: PMNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) codeLines.push(lines[i++]);
      blocks.push({ type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: codeLines.join('\n') }] });
      i++; // closing ```
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) {
      blocks.push({ type: 'heading', attrs: { level: hm[1].length }, content: parseInline(hm[2]) });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/) && line.trim().replace(/[-*_ ]/g, '') === '') {
      blocks.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) qLines.push(lines[i++].slice(2));
      blocks.push({ type: 'blockquote', content: [{ type: 'paragraph', content: parseInline(qLines.join('\n')) }] });
      continue;
    }

    // Bullet list
    if (line.match(/^[-*+]\s+/)) {
      const items: PMNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(lines[i++].replace(/^[-*+]\s+/, '')) }] });
      }
      blocks.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: PMNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(lines[i++].replace(/^\d+\.\s+/, '')) }] });
      }
      blocks.push({ type: 'orderedList', content: items });
      continue;
    }

    // Empty line — paragraph break
    if (line.trim() === '') { i++; continue; }

    // Paragraph — accumulate until blank line or block-level marker
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === '' || l.match(/^#{1,6}\s/) || l.startsWith('```') ||
          l.match(/^[-*+]\s+/) || l.match(/^\d+\.\s+/) || l.startsWith('> ') ||
          (l.match(/^[-*_]{3,}$/) && l.replace(/[-*_ ]/g, '') === '')) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) blocks.push({ type: 'paragraph', content: parseInline(paraLines.join('\n')) });
  }

  if (blocks.length === 0) blocks.push({ type: 'paragraph' });
  return { type: 'doc', content: blocks };
}

function parseInline(text: string): PMNode[] {
  if (!text) return [];
  const nodes: PMNode[] = [];
  // Order matters: ~~strike~~ before *italic*, **bold** before *italic*
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*|_(.+?)_|`([^`]+)`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) nodes.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[0].startsWith('***'))      nodes.push({ type: 'text', text: m[2], marks: [{ type: 'bold' }, { type: 'italic' }] });
    else if (m[0].startsWith('**'))  nodes.push({ type: 'text', text: m[3], marks: [{ type: 'bold' }] });
    else if (m[0].startsWith('~~'))  nodes.push({ type: 'text', text: m[4], marks: [{ type: 'strike' }] });
    else if (m[0].startsWith('*') || m[0].startsWith('_')) nodes.push({ type: 'text', text: m[5] ?? m[6], marks: [{ type: 'italic' }] });
    else /* backtick */              nodes.push({ type: 'text', text: m[7], marks: [{ type: 'code' }] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes.length ? nodes : [{ type: 'text', text }];
}
