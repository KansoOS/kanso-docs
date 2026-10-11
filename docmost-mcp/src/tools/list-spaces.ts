import { z } from 'zod';
import { fetchSpaces } from '../client.js';

export const listSpacesSchema = z.object({});

export const listSpacesDescription = `Liste tous les espaces (spaces) Docmost accessibles par le compte de service.
Utilise cet outil en premier pour découvrir les espaces disponibles avant de chercher ou lire des pages.`;

export async function listSpaces(_args: z.infer<typeof listSpacesSchema>) {
  const result = await fetchSpaces();

  const spaces = result.items.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    ...(s.description ? { description: s.description } : {}),
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ spaces, total: spaces.length }, null, 2),
      },
    ],
  };
}
