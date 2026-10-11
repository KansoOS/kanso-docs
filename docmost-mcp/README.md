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

## Évolution V2 — Écriture (non implémentée)

Les opérations d'écriture (`create_page`, `update_page`, `create_comment`) ne sont pas dans le périmètre initial.  
Si elles sont ajoutées un jour :
- Utiliser un second compte distinct avec les droits nécessaires
- Activer explicitement via `DOCMOST_ALLOW_WRITE=true`
- Ne déployer qu'après que la V1 est stable et utilisée en production

---

## Résultats des vérifications (Étape 7)

| # | Vérification | Résultat |
|---|---|---|
| 1 | `list_spaces` retourne les espaces du compte de service | À vérifier après création du compte de service |
| 2 | `search_docs` sur un terme connu retourne la page attendue | À vérifier après configuration |
| 3 | `get_page` sur page avec tableau/code/liste imbriquée → Markdown correct | Le serveur Docmost fait la conversion (`format: 'markdown'`) |
| 4 | Mauvais mot de passe → message clair, aucun credential dans la sortie | ✅ (vérifié : message "credentials refused", pas de leak) |
| 5 | Instance arrêtée → échec propre au démarrage | ✅ (le startupCheck appelle `process.exit(1)` avec message lisible) |
| 6 | `grep` sur le dépôt : aucun credential/URL en dur | ✅ (`.env.example` sans valeurs, `.gitignore` inclut `.env`) |
| 7 | Enregistrement `claude mcp add` et appel des 4 outils | À faire par le porteur du projet |
