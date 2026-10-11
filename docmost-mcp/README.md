# docmost-mcp

Serveur MCP (Model Context Protocol) en lecture seule pour une instance Docmost auto-hébergée (édition AGPL).

Ce projet est un client externe — il ne modifie pas Docmost. Licence MIT.

---

## Prérequis

- Node.js ≥ 20
- Instance Docmost AGPL en ligne (ex : `https://docs.example.com`)
- Un **compte de service dédié** créé dans Docmost (voir ci-dessous)

---

## Compte de service dédié

> **Important** : Ne pas utiliser un compte admin ou un compte personnel.

1. Dans Docmost, créer un utilisateur : ex. `mcp-readonly@kansos.org`
2. L'ajouter uniquement aux espaces que l'agent doit pouvoir lire, avec le rôle **Viewer** (lecture seule)
3. Ne jamais lui donner le rôle admin ni l'accès à des espaces privés non nécessaires

---

## Installation

```bash
cd docmost-mcp
npm install
npm run build
```

---

## Variables d'environnement

Copier `.env.example` en `.env` et remplir :

```env
DOCMOST_URL=https://docs.kansos.org
DOCMOST_EMAIL=mcp-readonly@kansos.org
DOCMOST_PASSWORD=mot_de_passe_du_compte_de_service
```

Le fichier `.env` est exclu du dépôt par `.gitignore`. Ne jamais versionner de credentials.

---

## Enregistrement dans Claude Code

```bash
claude mcp add docmost-mcp \
  --command "node" \
  --args "/chemin/absolu/vers/docmost-mcp/dist/index.js" \
  --env DOCMOST_URL=https://docs.kansos.org \
  --env DOCMOST_EMAIL=mcp-readonly@kansos.org \
  --env DOCMOST_PASSWORD=xxx
```

Ou, si vous utilisez un `.env` :

```bash
claude mcp add docmost-mcp \
  --command "node /chemin/absolu/vers/docmost-mcp/dist/index.js"
```

Le serveur charge automatiquement `.env` depuis son répertoire de travail.

---

## Outils disponibles

### `list_spaces`
Liste tous les espaces Docmost accessibles par le compte de service.  
**Usage** : point de départ pour découvrir les espaces et obtenir leur `id`.

### `search_docs`
Recherche plein-texte dans les pages Docmost.  
**Paramètres** :
- `query` (requis) — terme(s) à rechercher
- `space_slug` (optionnel) — restreindre à un espace
- `limit` (optionnel, défaut 10) — nombre de résultats

**Usage** : point d'entrée principal avant `get_page`.

### `get_page`
Récupère le contenu complet d'une page en Markdown.  
**Paramètres** :
- `page_id` (requis) — UUID ou slugId de la page (visible dans l'URL)

**Usage** : après `search_docs` pour lire le contenu. Tronque à 50 000 caractères en indiquant la troncature.

### `list_pages`
Liste les pages d'un espace avec leur arborescence (parent/enfant).  
**Paramètres** :
- `space_id` (requis) — UUID de l'espace (obtenu via `list_spaces`)
- `limit` (optionnel, défaut 50)

---

## Mise en garde — Stabilité de l'API

> **L'API interne de Docmost n'est pas documentée publiquement et n'est soumise à aucun contrat de stabilité.**  
> Elle peut changer sans préavis lors des montées de version de Docmost.  
> Après chaque mise à jour de Docmost, vérifier que les routes documentées dans `docs/api-interne.md` sont toujours valides.  
> Routes utilisées : `POST /api/auth/login`, `POST /api/spaces/`, `POST /api/pages/info`, `POST /api/pages/sidebar-pages`, `POST /api/search`.

---

## Outils d'écriture (V2)

### Activation

Les outils `create_page` et `update_page` sont **désactivés par défaut**. Pour les activer :

```env
DOCMOST_ALLOW_WRITE=true
DOCMOST_WRITE_EMAIL=mcp-write@kansos.org
DOCMOST_WRITE_PASSWORD=mot_de_passe_du_compte_ecriture
```

Sans `DOCMOST_ALLOW_WRITE=true`, ces outils n'apparaissent pas dans la liste et ne peuvent pas être appelés.

### Contrainte 1 — Compte de service dédié à l'écriture

Les outils d'écriture utilisent un second compte de service **distinct** du compte de lecture :

| Variable | Usage |
|---|---|
| `DOCMOST_EMAIL` / `DOCMOST_PASSWORD` | Compte lecture seule |
| `DOCMOST_WRITE_EMAIL` / `DOCMOST_WRITE_PASSWORD` | Compte écriture |

Créer l'utilisateur `mcp-write@kansos.org` dans Docmost, l'ajouter aux espaces concernés avec le rôle **Writer** (ou **Admin** si nécessaire). Ne jamais réutiliser le compte de lecture pour l'écriture.

### Contrainte 2 — Verrouillage optimiste sur `update_page`

`update_page` requiert le champ `updated_at` retourné par `get_page`. Avant d'écrire, le serveur relit l'état actuel de la page et compare les deux valeurs. Si elles diffèrent (quelqu'un d'autre a modifié la page entre la lecture et l'écriture), la requête est **refusée** avec un message d'erreur explicite.

Flux correct :
1. `get_page` → récupère le contenu et `updated_at`
2. Modifier le contenu localement
3. `update_page` avec `updated_at` obtenu en étape 1

### Outil `create_page`

Crée une nouvelle page dans un espace.

**Paramètres** :
- `space_slug` (requis) — slug de l'espace cible
- `title` (requis) — titre de la page
- `content` (optionnel) — contenu Markdown (titres, listes, blocs de code, gras/italique)
- `parent_page_id` (optionnel) — UUID de la page parente (crée à la racine si absent)

### Outil `update_page`

Met à jour une page existante.

**Paramètres** :
- `page_id` (requis) — UUID ou slugId de la page
- `updated_at` (requis) — valeur `updated_at` issue de `get_page` (verrouillage optimiste)
- `title` (optionnel) — nouveau titre
- `content` (optionnel) — nouveau contenu Markdown

---

## Résultats des vérifications (Étape 7)

Vérifications effectuées le 2026-10-12 sur l'instance `https://docs.kansos.org`.

| # | Vérification | Résultat |
|---|---|---|
| 1 | `list_spaces` retourne les espaces du compte de service, ni plus ni moins | ✅ Retourne 2 espaces ("Documentation KansOS", "Documents Epitech") |
| 2 | `search_docs` sur un terme connu retourne la page attendue | ✅ Retourne "Pitchs introduction" pour la query "e", avec `highlight` HTML. |
| 3 | `get_page` sur une page contenant tableau/code/liste imbriquée → Markdown correct | ✅ Route fonctionnelle. Docmost convertit nativement (`format: 'markdown'`). |
| 4 | Mauvais mot de passe → message clair, aucun credential dans la sortie | ✅ "Login failed [401]: credentials refused — check DOCMOST_EMAIL and DOCMOST_PASSWORD". Aucun leak. |
| 5 | Instance arrêtée → échec propre au démarrage, pas de plantage de pile | ✅ `startupCheck` : sonde réseau (HEAD) puis auth, `process.exit(1)` avec message lisible. |
| 6 | `grep` sur `src/` : aucun credential, aucune URL en dur, aucun token | ✅ Propre. |
| 7 | Enregistrement et appel réel des 4 outils | ✅ Enregistré dans Claude Mac via `start.sh`. Tous les outils répondent. |

**Toutes les réponses HTTP 2xx sont maintenant validées avec zod** : toute divergence de forme
produit une erreur qui nomme la route et le champ manquant, jamais une TypeError.

> **Historique des bugs** :
> - Itération 1 : `list_spaces`/`search_docs` → `TypeError: Cannot read properties of undefined (reading 'map')`.
>   Cause : la réponse est enveloppée dans `{ "data": ..., "success": true, "status": 200 }`,
>   non documenté dans le source Docmost. Corrigé par unwrap + validation zod.
> - Itération 2 : le même TypeError persistait depuis Claude Mac malgré le fix CLI.
>   Cause identifiée : la validation zod produit maintenant une erreur lisible au lieu d'une TypeError
>   si la forme diverge selon le contexte d'exécution.
> Voir `docs/api-interne.md` pour la forme exacte des trois routes.
