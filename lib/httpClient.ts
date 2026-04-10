const ACCESS_KEY = '2une_access_token';
const REFRESH_KEY = '2une_refresh_token';

/** Backend origin or same-site path. Must not be the Next.js app URL unless you add a rewrite proxy. */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw?.replace(/\/$/, '') ?? '';
  const url = base.length > 0 ? base : 'http://localhost:3000';

  if (typeof window !== 'undefined' && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const apiOrigin = new URL(url).origin;
      if (apiOrigin === window.location.origin) {
        console.warn(
          '[2une_admin] NEXT_PUBLIC_API_BASE_URL matches this Next origin. Point it at the Express API (e.g. http://localhost:3000) or use a proxy.',
        );
      }
    } catch {
      /* ignore invalid URL */
    }
  }

  return url;
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base.startsWith('http://') || base.startsWith('https://') || base.startsWith('//')) {
    return `${base.replace(/\/$/, '')}${p}`;
  }
  // Relative base e.g. /api/proxy → resolve against current origin
  return new URL(
    `${base.replace(/\/$/, '')}${p}`,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  ).toString();
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

type ApiSuccess<T> = { success: true; data: T };
type ApiFail = { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        let json: ApiSuccess<{ accessToken: string; refreshToken: string }> | ApiFail;
        try {
          json = (await res.json()) as ApiSuccess<{ accessToken: string; refreshToken: string }> | ApiFail;
        } catch {
          clearTokens();
          return false;
        }
        if (!res.ok || !json.success) {
          clearTokens();
          return false;
        }
        setTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return await refreshInFlight;
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, body, headers: initHeaders, ...rest } = options;
  const url = buildUrl(path);

  const headers = new Headers(initHeaders);
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getStoredAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const doFetch = () =>
    fetch(url, {
      ...rest,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && auth) {
    const okRefresh = await tryRefresh();
    if (okRefresh) {
      const token = getStoredAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      res = await doFetch();
    }
  }

  const rawText = await res.text();
  let json: ApiSuccess<T> | ApiFail;
  try {
    json = JSON.parse(rawText) as ApiSuccess<T> | ApiFail;
  } catch {
    const hint =
      res.status === 404
        ? ' (HTTP 404 — often the API base URL points at Next instead of Express. Set NEXT_PUBLIC_API_BASE_URL to your API origin, e.g. http://localhost:3000.)'
        : '';
    const preview = rawText.slice(0, 120).replace(/\s+/g, ' ');
    throw new ApiRequestError(
      res.status,
      'INVALID_RESPONSE',
      `Expected JSON from API; got ${res.headers.get('content-type') || 'unknown content-type'}.${hint}${preview ? ` Body starts with: ${preview}` : ''}`,
    );
  }

  if (!json || typeof json !== 'object' || !('success' in json)) {
    throw new ApiRequestError(res.status, 'INVALID_RESPONSE', 'API response is not a { success, data } envelope');
  }

  if (!json.success) {
    throw new ApiRequestError(res.status, json.error.code, json.error.message, json.error.details);
  }

  return json.data;
}

