import { z } from 'zod';
import { getToken, login, invalidateToken, getWriteToken, loginWrite, invalidateWriteToken } from './auth.js';
import { markdownToProseMirror } from './prosemirror.js';

const DEBUG = process.env.DOCMOST_DEBUG === '1';

function debugLog(method: string, url: string, status: number, rawBody: string) {
  if (!DEBUG) return;
  const safeUrl = url.replace(/authToken=[^&;]*/g, 'authToken=[REDACTED]');
  process.stderr.write(
    `[docmost-mcp:debug] ${method} ${safeUrl} → ${status}\n  body: ${rawBody.slice(0, 500)}\n`,
  );
}

// ─── Transport ────────────────────────────────────────────────────────────────

async function apiPostRaw(path: string, body: unknown): Promise<{ status: number; text: string }> {
  const token = await getToken();
  const url = `${process.env.DOCMOST_URL}/api${path}`;

  const doFetch = (tok: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `authToken=${tok}` },
      body: JSON.stringify(body),
    });

  let res = await doFetch(token);
  let rawText = await res.text();
  debugLog('POST', url, res.status, rawText);

  if (res.status === 401) {
    invalidateToken();
    const fresh = await login();
    res = await doFetch(fresh);
    rawText = await res.text();
    debugLog('POST(retry)', url, res.status, rawText);
  }

  if (!res.ok) {
    throw new Error(`POST ${path} [${res.status}]: ${rawText.slice(0, 200)}`);
  }

  return { status: res.status, text: rawText };
}

// ─── Zod schemas (forme réelle observée le 2026-10-12) ───────────────────────

const zCursorMeta = z.object({
  limit: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable(),
}).optional();

const zSpaceItem = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  membership: z.object({ role: z.string() }).optional(),
});

const zSpacesData = z.object({
  items: z.array(zSpaceItem),
  meta: zCursorMeta,
});

const zPageItem = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  slugId: z.string(),
  spaceId: z.string(),
  parentPageId: z.string().nullable().optional(),
  hasChildren: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

const zPagesData = z.object({
  items: z.array(zPageItem),
  meta: zCursorMeta,
});

const zSearchItem = z.object({
  id: z.string(),
  slugId: z.string(),
  title: z.string().nullable().optional(),
  // spaceId absent de la réponse search — l'id d'espace est dans space.id
  highlight: z.string().nullable().optional(),
  rank: z.number().optional(),
  space: z.object({ id: z.string().optional(), name: z.string(), slug: z.string() }).optional(),
  wholeWord: z.boolean().optional(),
  matchedText: z.array(z.string()).optional(),
});

const zSearchData = z.object({
  items: z.array(zSearchItem),
  meta: zCursorMeta,
});

const zPageDetail = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  slugId: z.string(),
  spaceId: z.string(),
  parentPageId: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  space: z.object({ id: z.string(), name: z.string(), slug: z.string() }).optional(),
});

// L'enveloppe universelle : { data: T, success: boolean, status: number }
function zEnvelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ data: dataSchema, success: z.boolean().optional(), status: z.number().optional() });
}

// Parse + erreur lisible qui nomme la route et le champ manquant
function parseOrThrow<T>(schema: z.ZodType<T>, raw: string, path: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`POST ${path}: réponse non-JSON : ${raw.slice(0, 200)}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`POST ${path}: forme de réponse inattendue — ${issues} — brut: ${raw.slice(0, 200)}`);
  }
  return result.data;
}

// ─── Types exportés ───────────────────────────────────────────────────────────

export type SpaceItem = z.infer<typeof zSpaceItem>;
export type PageItem = z.infer<typeof zPageItem>;
export type PageDetail = z.infer<typeof zPageDetail>;
export type SearchResultItem = z.infer<typeof zSearchItem>;

export interface PaginatedResponse<T> {
  items: T[];
  meta?: z.infer<typeof zCursorMeta>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchSpaces(): Promise<PaginatedResponse<SpaceItem>> {
  const { text } = await apiPostRaw('/spaces/', { limit: 100 });
  return parseOrThrow(zEnvelope(zSpacesData), text, '/spaces/').data;
}

export async function fetchSidebarPages(
  spaceId: string,
  limit = 100,
): Promise<PaginatedResponse<PageItem>> {
  const { text } = await apiPostRaw('/pages/sidebar-pages', { spaceId, limit });
  return parseOrThrow(zEnvelope(zPagesData), text, '/pages/sidebar-pages').data;
}

export async function fetchPageInfo(pageId: string): Promise<PageDetail> {
  const { text } = await apiPostRaw('/pages/info', { pageId, format: 'markdown' });
  return parseOrThrow(zEnvelope(zPageDetail), text, '/pages/info').data;
}

export async function fetchSearch(
  query: string,
  spaceId?: string,
  limit = 10,
): Promise<PaginatedResponse<SearchResultItem>> {
  const { text } = await apiPostRaw('/search', { query, ...(spaceId ? { spaceId } : {}), limit, offset: 0 });
  return parseOrThrow(zEnvelope(zSearchData), text, '/search').data;
}

// ─── Write API (compte séparé DOCMOST_WRITE_EMAIL) ───────────────────────────

async function apiPostWrite(path: string, body: unknown): Promise<{ status: number; text: string }> {
  const url = `${process.env.DOCMOST_URL}/api${path}`;

  const doFetch = (tok: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `authToken=${tok}` },
      body: JSON.stringify(body),
    });

  let tok = await getWriteToken();
  let res = await doFetch(tok);
  let rawText = await res.text();
  debugLog('POST(write)', url, res.status, rawText);

  if (res.status === 401) {
    invalidateWriteToken();
    tok = await loginWrite();
    res = await doFetch(tok);
    rawText = await res.text();
    debugLog('POST(write-retry)', url, res.status, rawText);
  }

  if (!res.ok) throw new Error(`POST ${path} [${res.status}]: ${rawText.slice(0, 200)}`);
  return { status: res.status, text: rawText };
}

const zCreatedPage = z.object({
  id: z.string(),
  slugId: z.string(),
  title: z.string().nullable().optional(),
  spaceId: z.string(),
  parentPageId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CreatedPage = z.infer<typeof zCreatedPage>;

export async function createDocmostPage(
  spaceId: string,
  title: string,
  markdown: string,
  parentPageId?: string,
): Promise<CreatedPage> {
  // 1. Créer la page (titre + espace)
  const { text: createText } = await apiPostWrite('/pages/create', {
    spaceId,
    title,
    ...(parentPageId ? { parentPageId } : {}),
  });
  const page = parseOrThrow(zEnvelope(zCreatedPage), createText, '/pages/create').data;

  // 2. Injecter le contenu si fourni
  if (markdown.trim()) {
    const content = markdownToProseMirror(markdown);
    await apiPostWrite('/pages/update', { pageId: page.id, title, content });
  }

  return page;
}

export async function updateDocmostPage(
  pageId: string,
  title?: string,
  markdown?: string,
): Promise<CreatedPage> {
  const body: Record<string, unknown> = { pageId };
  if (title !== undefined) body.title = title;
  if (markdown !== undefined) body.content = markdownToProseMirror(markdown);

  const { text } = await apiPostWrite('/pages/update', body);
  return parseOrThrow(zEnvelope(zCreatedPage), text, '/pages/update').data;
}
