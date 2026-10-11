import { z } from 'zod';
import { fetchPageInfo, updateDocmostPage } from '../client.js';

export const updatePageSchema = z.object({
  page_id: z
    .string()
    .describe('UUID ou slugId de la page à modifier'),
  updated_at: z
    .string()
    .describe('Valeur updated_at retournée par get_page — refuse si la page a été modifiée entre-temps'),
  title: z
    .string()
    .optional()
    .describe('Nouveau titre (optionnel — conserve l\'ancien si absent)'),
  content: z
    .string()
    .optional()
    .describe('Nouveau contenu en Markdown (optionnel — conserve l\'ancien si absent)'),
  operation: z
    .enum(['replace', 'append', 'prepend'])
    .default('replace')
    .describe('replace : remplace tout le contenu (défaut) ; append : ajoute à la fin ; prepend : ajoute au début'),
});

export const updatePageDescription = `Met à jour le titre et/ou le contenu d'une page Docmost.
Nécessite DOCMOST_ALLOW_WRITE=true.
Requiert updated_at (obtenu via get_page) : refuse si la page a été modifiée depuis la lecture (verrouillage optimiste).
Passer uniquement les champs à modifier — les autres sont conservés.`;

export async function updatePage(args: z.infer<typeof updatePageSchema>) {
  // Verrouillage optimiste : lire l'état actuel avant d'écrire
  const current = await fetchPageInfo(args.page_id);

  if (current.updatedAt && current.updatedAt !== args.updated_at) {
    return {
      content: [{
        type: 'text' as const,
        text: `Conflit : la page a été modifiée depuis la lecture.\n` +
              `  lu à    : ${args.updated_at}\n` +
              `  actuel  : ${current.updatedAt}\n` +
              `Relire la page avec get_page avant de modifier.`,
      }],
      isError: true,
    };
  }

  const updated = await updateDocmostPage(args.page_id, args.operation, args.title, args.content);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        id: updated.id,
        slug_id: updated.slugId,
        title: updated.title ?? '(sans titre)',
        updated_at: updated.updatedAt ?? null,
      }, null, 2),
    }],
  };
}
