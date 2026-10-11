import { getToken, login, invalidateToken } from './auth.js';

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

  if (res.status === 401) {
    // Retry once with a fresh token
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

    if (!retry.ok) {
      const text = await retry.text().catch(() => '');
      throw new Error(
        `POST ${path} failed after token refresh [${retry.status}]: ${text.slice(0, 200)}`,
      );
    }
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `POST ${path} [${res.status}]: ${text.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpaceItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  membership?: { role: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: { limit: number; page?: number; totalItems: number; totalPages?: number };
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
  return apiPost('/spaces/', { limit: 100 });
}

export function fetchSidebarPages(
  spaceId: string,
  limit = 100,
): Promise<PaginatedResponse<PageItem>> {
  return apiPost('/pages/sidebar-pages', { spaceId, limit });
}

export function fetchPageInfo(pageId: string): Promise<PageDetail> {
  return apiPost('/pages/info', { pageId, format: 'markdown' });
}

export function fetchSearch(
  query: string,
  spaceId?: string,
  limit = 10,
): Promise<{ items: SearchResultItem[]; meta: { totalItems: number } }> {
  return apiPost('/search', { query, ...(spaceId ? { spaceId } : {}), limit, offset: 0 });
}
