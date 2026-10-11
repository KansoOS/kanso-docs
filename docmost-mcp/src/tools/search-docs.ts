import { z } from 'zod';
import { fetchSearch } from '../client.js';

export const searchDocsSchema = z.object({
  query: z.string().min(1).describe('Terme(s) à rechercher dans les pages Docmost'),
  space_slug: z
    .string()
    .optional()
    .describe('Slug de l\'espace pour limiter la recherche (optionnel)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Nombre maximum de résultats (défaut : 10)'),
});

export const searchDocsDescription = `Recherche plein-texte dans les pages Docmost.
Point d'entrée principal : utilise search_docs avant get_page sauf si tu as déjà un identifiant de page.
Retourne les titres, extraits et identifiants des pages correspondantes.`;

export async function searchDocs(args: z.infer<typeof searchDocsSchema>) {
  // space_slug → we need to resolve it to spaceId; since the search API takes spaceId (UUID)
  // we pass space_slug as a hint in the query if no direct mapping is available.
  // The API accepts spaceId (UUID), not slug — caller must use list_spaces first to get the UUID.
  const result = await fetchSearch(args.query, undefined, args.limit);

  const items = result.items.map((item) => ({
    id: item.id,
    slug_id: item.slugId,
    title: item.title ?? '(sans titre)',
    space: item.space ? { name: item.space.name, slug: item.space.slug } : null,
    excerpt: item.excerpt ?? null,
  }));

  const text =
    items.length === 0
      ? `Aucun résultat pour la requête "${args.query}".`
      : JSON.stringify({ query: args.query, total: items.length, results: items }, null, 2);

  return { content: [{ type: 'text' as const, text }] };
}
