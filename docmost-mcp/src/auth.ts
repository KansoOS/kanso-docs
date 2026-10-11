const LOGIN_URL = () => `${process.env.DOCMOST_URL}/api/auth/login`;

let cachedToken: string | null = null;

export async function login(): Promise<string> {
  const email = process.env.DOCMOST_EMAIL;
  const password = process.env.DOCMOST_PASSWORD;
  const url = process.env.DOCMOST_URL;

  if (!email || !password || !url) {
    throw new Error(
      'Missing required env vars: DOCMOST_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD',
    );
  }

  const res = await fetch(LOGIN_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Login failed [${res.status}]: credentials refused — check DOCMOST_EMAIL and DOCMOST_PASSWORD`,
    );
  }

  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/authToken=([^;]+)/);
  if (!match) {
    throw new Error('Login succeeded but no authToken cookie in response');
  }

  cachedToken = match[1];
  return cachedToken;
}

export async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  return login();
}

export function invalidateToken(): void {
  cachedToken = null;
}
