import { z } from 'zod';
import { fetchPageInfo } from '../client.js';
import { truncateMarkdown } from '../content.js';

export const getPageSchema = z
  .object({
    page_id: z
      .string()
      .optional()
      .describe('UUID ou slugId de la page (visible dans l\'URL Docmost)'),
  })
  .refine((d) => d.page_id, {
    message: 'page_id est requis',
  });

export const getPageDescription = `Récupère le contenu complet d'une page Docmost en Markdown.
Utilise cet outil après search_docs pour obtenir le contenu d'une page à partir de son identifiant.
page_id accepte un UUID complet ou un slugId court (ex: "abc12345" visible dans l'URL).`;

export async function getPage(args: z.infer<typeof getPageSchema>) {
  const pageId = args.page_id!;
  const page = await fetchPageInfo(pageId);

  const markdown = page.content ? truncateMarkdown(page.content) : '*(page sans contenu)*';

  const meta = {
    id: page.id,
    slug_id: page.slugId,
    title: page.title ?? '(sans titre)',
    space: page.space ? { name: page.space.name, slug: page.space.slug } : null,
    updated_at: page.updatedAt ?? null,
    created_at: page.createdAt ?? null,
    parent_page_id: page.parentPageId ?? null,
  };

  const text = `# ${meta.title}\n\n**Espace** : ${meta.space?.name ?? '—'}  \n**Modifié** : ${meta.updated_at ?? '—'}  \n**ID** : ${meta.id}  \n\n---\n\n${markdown}`;

  return { content: [{ type: 'text' as const, text }] };
}
