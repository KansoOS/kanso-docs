import { z } from 'zod';
import { fetchSpaces, createDocmostPage } from '../client.js';

export const createPageSchema = z.object({
  space_slug: z
    .string()
    .describe('Slug de l\'espace où créer la page (utiliser list_spaces pour les slugs)'),
  title: z
    .string()
    .min(1)
    .describe('Titre de la page'),
  content: z
    .string()
    .optional()
    .describe('Contenu de la page en Markdown (optionnel)'),
  parent_page_id: z
    .string()
    .optional()
    .describe('UUID de la page parente (optionnel — crée à la racine de l\'espace si absent)'),
});

export const createPageDescription = `Crée une nouvelle page dans un espace Docmost.
Nécessite DOCMOST_ALLOW_WRITE=true et un compte de service en écriture distinct.
Accepte le contenu en Markdown (titres, listes, blocs de code, gras/italique).
Retourne l'UUID et le slugId de la page créée.`;

export async function createPage(args: z.infer<typeof createPageSchema>) {
  const spaces = await fetchSpaces();
  const space = spaces.items.find((s) => s.slug === args.space_slug);
  if (!space) {
    const available = spaces.items.map((s) => s.slug).join(', ');
    return {
      content: [{ type: 'text' as const, text: `Espace "${args.space_slug}" introuvable. Disponibles : ${available}` }],
      isError: true,
    };
  }

  const page = await createDocmostPage(
    space.id,
    args.title,
    args.content ?? '',
    args.parent_page_id,
  );

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        id: page.id,
        slug_id: page.slugId,
        title: page.title ?? args.title,
        space_slug: args.space_slug,
        parent_page_id: page.parentPageId ?? null,
        created_at: page.createdAt ?? null,
        url: `${process.env.DOCMOST_URL}/${args.space_slug}/${page.slugId}`,
      }, null, 2),
    }],
  };
}
