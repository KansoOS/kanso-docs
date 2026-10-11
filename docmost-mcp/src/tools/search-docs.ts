import { z } from 'zod';
import { fetchSearch, fetchSpaces } from '../client.js';

export const searchDocsSchema = z.object({
  query: z.string().min(1).describe('Terme(s) à rechercher dans les pages Docmost'),
  space_slug: z
    .string()
    .optional()
    .describe('Slug de l\'espace pour limiter la recherche (ex: "doc", "epitech"). Utiliser list_spaces pour connaître les slugs disponibles.'),
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
Accepte un space_slug optionnel pour filtrer la recherche à un seul espace (utilise list_spaces pour les slugs).
Retourne les titres, extraits et identifiants des pages correspondantes.`;

export async function searchDocs(args: z.infer<typeof searchDocsSchema>) {
  let spaceId: string | undefined;

  if (args.space_slug) {
    const spaces = await fetchSpaces();
    const match = spaces.items.find((s) => s.slug === args.space_slug);
    if (!match) {
      const available = spaces.items.map((s) => s.slug).join(', ');
      return {
        content: [{
          type: 'text' as const,
          text: `Espace "${args.space_slug}" introuvable. Espaces disponibles : ${available}`,
        }],
        isError: true,
      };
    }
    spaceId = match.id;
  }

  const result = await fetchSearch(args.query, spaceId, args.limit);

  const items = result.items.map((item) => ({
    id: item.id,
    slug_id: item.slugId,
    title: item.title ?? '(sans titre)',
    space: item.space ? { name: item.space.name, slug: item.space.slug } : null,
    excerpt: item.highlight ?? null,
  }));

  const text =
    items.length === 0
      ? `Aucun résultat pour la requête "${args.query}"${args.space_slug ? ` dans l'espace "${args.space_slug}"` : ''}.`
      : JSON.stringify({ query: args.query, space_slug: args.space_slug ?? null, total: items.length, results: items }, null, 2);

  return { content: [{ type: 'text' as const, text }] };
}
