const LOGIN_URL = () => `${process.env.DOCMOST_URL}/api/auth/login`;

async function doLogin(email: string, password: string, hint: string): Promise<string> {
  const res = await fetch(LOGIN_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(
      `Login failed [${res.status}]: credentials refused — check ${hint}`,
    );
  }

  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/authToken=([^;]+)/);
  if (!match) throw new Error('Login succeeded but no authToken cookie in response');
  return match[1];
}

// ─── Read account (DOCMOST_EMAIL / DOCMOST_PASSWORD) ─────────────────────────

let cachedToken: string | null = null;

export async function login(): Promise<string> {
  const email = process.env.DOCMOST_EMAIL;
  const password = process.env.DOCMOST_PASSWORD;
  if (!email || !password || !process.env.DOCMOST_URL) {
    throw new Error('Missing required env vars: DOCMOST_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD');
  }
  cachedToken = await doLogin(email, password, 'DOCMOST_EMAIL and DOCMOST_PASSWORD');
  return cachedToken;
}

export async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  return login();
}

export function invalidateToken(): void {
  cachedToken = null;
}

// ─── Write account (DOCMOST_WRITE_EMAIL / DOCMOST_WRITE_PASSWORD) ────────────

let cachedWriteToken: string | null = null;

export async function loginWrite(): Promise<string> {
  const email = process.env.DOCMOST_WRITE_EMAIL;
  const password = process.env.DOCMOST_WRITE_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing required env vars: DOCMOST_WRITE_EMAIL, DOCMOST_WRITE_PASSWORD');
  }
  cachedWriteToken = await doLogin(email, password, 'DOCMOST_WRITE_EMAIL and DOCMOST_WRITE_PASSWORD');
  return cachedWriteToken;
}

export async function getWriteToken(): Promise<string> {
  if (cachedWriteToken) return cachedWriteToken;
  return loginWrite();
}

export function invalidateWriteToken(): void {
  cachedWriteToken = null;
}
