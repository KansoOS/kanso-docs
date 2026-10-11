/**
 * Test d'intégration : create_page → update → get_page → comparaison → cleanup.
 *
 * Prérequis : DOCMOST_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD, DOCMOST_ALLOW_WRITE=true
 * Lance via : node test/write-roundtrip.mjs
 */

import { login } from '../dist/auth.js';
import { fetchSpaces, createDocmostPage, updateDocmostPage, fetchPageInfo } from '../dist/client.js';

if (process.env.DOCMOST_ALLOW_WRITE !== 'true') {
  console.error('SKIP : DOCMOST_ALLOW_WRITE doit être "true" pour ce test.');
  process.exit(0);
}

await login();

// Utiliser le premier espace disponible
const spaces = await fetchSpaces();
if (!spaces.items.length) { console.error('FAIL : aucun espace disponible.'); process.exit(1); }
const space = spaces.items[0];

const TITLE   = `[test-roundtrip] ${Date.now()}`;
const CONTENT = `# Titre test\n\nParagraphe **gras** et *italique*.\n\n\`\`\`js\nconsole.log('hello');\n\`\`\`\n`;

// ─── 1. Créer la page avec contenu ────────────────────────────────────────────

const created = await createDocmostPage(space.id, TITLE, CONTENT);
console.log(`STEP 1 ✅ page créée — id: ${created.id}, slugId: ${created.slugId}`);

// ─── 2. Relire la page ────────────────────────────────────────────────────────

const read = await fetchPageInfo(created.id);
if (!read.content) {
  // Cleanup
  const { apiPostRaw } = await import('../dist/client.js').catch(() => ({}));
  console.error('FAIL : contenu vide après création.');
  process.exit(1);
}
console.log(`STEP 2 ✅ page relue — contenu: ${read.content.length} caractères`);

// ─── 3. Vérifier que le contenu contient les marqueurs attendus ───────────────

const checks = ['Titre test', 'gras', 'italique', 'console.log'];
const missing = checks.filter((s) => !read.content.includes(s));
if (missing.length) {
  console.error(`FAIL : marqueurs absents du contenu relu : ${missing.join(', ')}`);
  console.error('Contenu reçu :', read.content.slice(0, 500));
  process.exit(1);
}
console.log(`STEP 3 ✅ marqueurs présents : ${checks.join(', ')}`);

// ─── 4. Mettre à jour (append) ────────────────────────────────────────────────

const APPEND = `\n\n## Section ajoutée\n\nContenu supplémentaire.`;
await updateDocmostPage(created.id, 'append', undefined, APPEND);
const read2 = await fetchPageInfo(created.id);
if (!read2.content?.includes('Section ajoutée')) {
  console.error('FAIL : le contenu appendé est absent.', read2.content?.slice(0, 500));
  process.exit(1);
}
console.log('STEP 4 ✅ append vérifié');

// ─── 5. Cleanup : supprimer la page de test ────────────────────────────────────

// On appelle directement la route delete via fetch pour le cleanup
const token = (await import('../dist/auth.js')).getToken ? await (await import('../dist/auth.js')).getToken() : null;
if (token) {
  const delRes = await fetch(`${process.env.DOCMOST_URL}/api/pages/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `authToken=${token}` },
    body: JSON.stringify({ pageId: created.id }),
  });
  console.log(`STEP 5 ✅ page supprimée (HTTP ${delRes.status})`);
} else {
  console.warn('STEP 5 ⚠ cleanup ignoré — impossible d\'obtenir le token');
}

console.log('\nTOUS LES TESTS PASSÉS ✅');
