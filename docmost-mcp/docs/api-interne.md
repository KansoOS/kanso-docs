# API Interne Docmost — Routes relevées

> Version Docmost observée : **0.96.0** (tag du dépôt github.com/docmost/docmost, cloné le 2026-10-11)
> Instance vérifiée : https://docs.kansos.org
> Toutes les routes utilisent le préfixe `/api/`.
> Toutes les routes (sauf login) exigent un cookie `authToken` (JWT httpOnly).
> Docmost utilise largement `POST` même pour des lectures — aucun `GET` n'est utilisé dans cette API.

---

## Authentification

### `POST /api/auth/login`

**Source** : `apps/server/src/core/auth/auth.controller.ts` — méthode `login()`

**Corps de la requête** :
```json
{ "email": "user@example.com", "password": "secret" }
```

**Réponse succès** : HTTP 200, corps vide.
Le token est positionné dans un cookie httpOnly `authToken` (JWT, expiration selon `APP_SESSION_EXPIRY_IN`, défaut 30 jours).

**Réponse erreur** :
```json
{ "message": "Email or password does not match", "error": "Unauthorized", "statusCode": 401 }
```

**Vérifié sur instance réelle** : ✅ (reçoit 401 avec le bon message pour credentials invalides)

**En-têtes requis** : `Content-Type: application/json`
**En-têtes à conserver** : `Set-Cookie: authToken=<jwt>; HttpOnly; SameSite=Lax; Path=/`

---

## Espaces

### `POST /api/spaces/`

**Source** : `apps/server/src/core/space/space.controller.ts` — méthode `getWorkspaceSpaces()`

**Corps de la requête** :
```json
{ "limit": 50, "page": 1 }
```
(Les champs `limit`/`page` sont optionnels ; défaut `limit=20`)

**Réponse succès** : HTTP 200
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Nom de l'espace",
      "slug": "nom-de-lespace",
      "description": "...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "membership": { "userId": "uuid", "role": "admin" }
    }
  ],
  "meta": { "limit": 20, "page": 1, "totalItems": 3, "totalPages": 1 }
}
```

**Vérifié sur instance réelle** : ✅ (reçoit 401 sans token, confirme la route existe)

---

## Pages

### `POST /api/pages/info`

**Source** : `apps/server/src/core/page/page.controller.ts` — méthode `getPage()`

**Corps de la requête** :
```json
{ "pageId": "<uuid-ou-slugId>", "format": "markdown" }
```

- `pageId` accepte un UUID complet **ou** un `slugId` (identifiant court à 8 caractères visible dans les URLs Docmost)
- `format` : `"json"` | `"markdown"` | `"html"` — utiliser `"markdown"` pour récupérer le contenu converti directement par le backend

**Réponse succès** : HTTP 200
```json
{
  "id": "uuid",
  "title": "Titre de la page",
  "slugId": "abc12345",
  "content": "# Titre\n\nContenu en markdown...",
  "spaceId": "uuid",
  "parentPageId": "uuid-ou-null",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "space": { "id": "uuid", "name": "...", "slug": "..." },
  "permissions": { "canEdit": true, "hasRestriction": false }
}
```

**Comportement important** : Quand `format: "markdown"` est fourni, le serveur convertit lui-même le JSON ProseMirror en Markdown. Pas besoin de convertisseur côté client.

**Vérifié sur instance réelle** : ✅ (route active, 401 sans token)

---

### `POST /api/pages/sidebar-pages`

**Source** : `apps/server/src/core/page/page.controller.ts` — méthode `getSidebarPages()`

Retourne l'arborescence des pages d'un espace (pagination).

**Corps de la requête** :
```json
{ "spaceId": "<uuid>", "limit": 50 }
```

**Réponse succès** : HTTP 200
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Titre",
      "slugId": "abc12345",
      "spaceId": "uuid",
      "parentPageId": null,
      "hasChildren": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": { "limit": 50, "page": 1, "totalItems": 10, "totalPages": 1 }
}
```

**Note** : Pour récupérer les enfants d'une page, envoyer `{ "pageId": "<uuid>" }` à la place de `spaceId`.

**Vérifié sur instance réelle** : ✅ (route active, 401 sans token)

---

## Recherche

### `POST /api/search`

**Source** : `apps/server/src/core/search/search.controller.ts` — méthode `pageSearch()`

**Corps de la requête** :
```json
{
  "query": "terme de recherche",
  "spaceId": "<uuid-optionnel>",
  "limit": 10,
  "offset": 0
}
```

**Réponse succès** : HTTP 200
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Titre de la page",
      "slugId": "abc12345",
      "spaceId": "uuid",
      "excerpt": "...extrait du contenu...",
      "space": { "name": "Nom", "slug": "nom" }
    }
  ],
  "meta": { "limit": 10, "offset": 0, "totalItems": 5 }
}
```

**Note** : Si Typesense est configuré (Enterprise), cette route bascule sur Typesense. En AGPL, la recherche full-text est assurée par PostgreSQL.

**Vérifié sur instance réelle** : ✅ (route active, 401 sans token)

---

## Routes hors périmètre (non implémentées, documentées pour info)

| Route | Source | Usage potentiel |
|---|---|---|
| `POST /api/pages/export` | `integrations/export/export.controller.ts` | Export Markdown/HTML/ZIP (retourne binaire) |
| `POST /api/pages/create` | `core/page/page.controller.ts` | Création de page (V2) |
| `POST /api/pages/update` | `core/page/page.controller.ts` | Mise à jour de page (V2) |
| `POST /api/auth/logout` | `core/auth/auth.controller.ts` | Déconnexion |

---

## Mise en garde

> L'API interne n'est pas documentée publiquement et n'est soumise à aucun contrat de stabilité. Elle peut changer sans préavis lors des montées de version de Docmost. Toujours vérifier les routes après une mise à jour.
