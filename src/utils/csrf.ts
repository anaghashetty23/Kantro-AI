/**
 * Reads the kantro_csrf cookie and attaches X-CSRF-Token on state-changing
 * same-origin API requests via apiFetch without mutating window.fetch.
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const part of cookies) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isSameOriginApi =
    urlStr.startsWith('/api/') ||
    (typeof window !== 'undefined' && urlStr.startsWith(`${window.location.origin}/api/`));

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials ?? (isSameOriginApi ? 'same-origin' : undefined)
  };

  if (isSameOriginApi && isMutating) {
    const csrfToken = getCookieValue('kantro_csrf');
    if (csrfToken) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('X-CSRF-Token')) {
        headers.set('X-CSRF-Token', csrfToken);
      }
      return window.fetch(input, { ...requestInit, headers });
    }
  }

  return window.fetch(input, requestInit);
}

export async function safeReadJson<T = any>(res: Response): Promise<{ data: T | null; rawText: string }> {
  const rawText = await res.text();
  if (!rawText) {
    return { data: null, rawText: '' };
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json') && !rawText.trimStart().startsWith('{') && !rawText.trimStart().startsWith('[')) {
    return { data: null, rawText };
  }
  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { data: null, rawText };
  }
}
