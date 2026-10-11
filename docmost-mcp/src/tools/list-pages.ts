import { z } from 'zod';
import { fetchSidebarPages } from '../client.js';

export const listPagesSchema = z.object({
  space_id: z
    .string()
    .describe('UUID de l\'espace dont on veut lister les pages (utiliser list_spaces pour l\'obtenir)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe('Nombre maximum de pages à retourner (défaut : 50)'),
});

export const listPagesDescription = `Liste les pages d'un espace Docmost avec leur arborescence.
Utilise list_spaces d'abord pour obtenir l'UUID de l'espace.
Retourne les titres, identifiants et structure parent/enfant des pages.`;

export async function listPages(args: z.infer<typeof listPagesSchema>) {
  const result = await fetchSidebarPages(args.space_id, args.limit);

  const pages = result.items.map((p) => ({
    id: p.id,
    slug_id: p.slugId,
    title: p.title ?? '(sans titre)',
    parent_page_id: p.parentPageId ?? null,
    has_children: p.hasChildren ?? false,
    updated_at: p.updatedAt ?? null,
  }));

  const text = JSON.stringify(
    { space_id: args.space_id, total: result.meta.totalItems, pages },
    null,
    2,
  );

  return { content: [{ type: 'text' as const, text }] };
}
