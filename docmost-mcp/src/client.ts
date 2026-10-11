import { getToken, login, invalidateToken } from './auth.js';

const DEBUG = process.env.DOCMOST_DEBUG === '1';

function debugLog(method: string, url: string, status: number, rawBody: string) {
  if (!DEBUG) return;
  // Expurge tout token/cookie de l'URL avant de logger
  const safeUrl = url.replace(/authToken=[^&;]*/g, 'authToken=[REDACTED]');
  const preview = rawBody.slice(0, 500);
  process.stderr.write(
    `[docmost-mcp:debug] ${method} ${safeUrl} → ${status}\n  body: ${preview}\n`,
  );
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
  const url = `${process.env.DOCMOST_URL}/api${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `authToken=${token}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  debugLog('POST', url, res.status, rawText);

  if (res.status === 401) {
    invalidateToken();
    const freshToken = await login();
    const retry = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `authToken=${freshToken}`,
      },
      body: JSON.stringify(body),
    });

    const retryText = await retry.text();
    debugLog('POST(retry)', url, retry.status, retryText);

    if (!retry.ok) {
      throw new Error(
        `POST ${path} failed after token refresh [${retry.status}]: ${retryText.slice(0, 200)}`,
      );
    }
    return JSON.parse(retryText) as T;
  }

  if (!res.ok) {
    throw new Error(`POST ${path} [${res.status}]: ${rawText.slice(0, 200)}`);
  }

  return JSON.parse(rawText) as T;
}

// Toutes les réponses Docmost sont enveloppées : { data: T, success: boolean, status: number }
interface Envelope<T> { data: T; success: boolean; status: number }

async function apiPostUnwrapped<T>(path: string, body: unknown): Promise<T> {
  const envelope = await apiPost<Envelope<T>>(path, body);
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new Error(`POST ${path}: réponse inattendue (enveloppe 'data' manquante) : ${JSON.stringify(envelope).slice(0, 200)}`);
  }
  return envelope.data;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpaceItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  membership?: { role: string };
}

// Pagination curseur (pas totalItems)
export interface CursorMeta {
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta?: CursorMeta;
}

export interface PageItem {
  id: string;
  title?: string | null;
  slugId: string;
  spaceId: string;
  parentPageId?: string | null;
  hasChildren?: boolean;
  updatedAt?: string;
}

export interface PageDetail extends PageItem {
  content?: string | null;
  createdAt?: string;
  space?: { id: string; name: string; slug: string };
}

export interface SearchResultItem {
  id: string;
  title?: string | null;
  slugId: string;
  spaceId: string;
  excerpt?: string | null;
  space?: { name: string; slug: string };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function fetchSpaces(): Promise<PaginatedResponse<SpaceItem>> {
  return apiPostUnwrapped('/spaces/', { limit: 100 });
}

export function fetchSidebarPages(
  spaceId: string,
  limit = 100,
): Promise<PaginatedResponse<PageItem>> {
  return apiPostUnwrapped('/pages/sidebar-pages', { spaceId, limit });
}

export function fetchPageInfo(pageId: string): Promise<PageDetail> {
  return apiPostUnwrapped('/pages/info', { pageId, format: 'markdown' });
}

export function fetchSearch(
  query: string,
  spaceId?: string,
  limit = 10,
): Promise<PaginatedResponse<SearchResultItem>> {
  return apiPostUnwrapped('/search', { query, ...(spaceId ? { spaceId } : {}), limit, offset: 0 });
}
