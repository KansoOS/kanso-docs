/**
 * Test : la recherche filtrée sur un espace vide ne doit renvoyer aucun résultat.
 *
 * Prérequis : DOCMOST_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD dans l'environnement.
 * Lance via : node test/search-space-filter.mjs
 */

import { login } from '../dist/auth.js';
import { fetchSpaces, fetchSearch } from '../dist/client.js';

await login();

const spaces = await fetchSpaces();
const docSpace = spaces.items.find((s) => s.slug === 'doc');

if (!docSpace) {
  // L'espace "doc" n'existe pas — le test ne peut pas s'exécuter
  console.warn('SKIP : espace "doc" introuvable (slugs disponibles :', spaces.items.map((s) => s.slug).join(', ') + ')');
  process.exit(0);
}

// L'espace "doc" (Documentation KansOS) est vide — toute recherche doit renvoyer 0 résultats
const result = await fetchSearch('e', docSpace.id, 10);

if (result.items.length !== 0) {
  console.error(
    `FAIL : fetchSearch("e", spaceId="${docSpace.id}") a renvoyé ${result.items.length} résultat(s) au lieu de 0.`,
    JSON.stringify(result.items, null, 2),
  );
  process.exit(1);
}

console.log(`PASS : fetchSearch filtrée sur l'espace "${docSpace.slug}" (${docSpace.id}) → 0 résultats ✅`);
