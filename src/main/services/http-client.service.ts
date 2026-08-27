export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponseResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  durationMs: number;
  sizeBytes: number;
  error?: string;
}

export class HttpClientService {
  async execute(options: HttpRequestOptions): Promise<HttpResponseResult> {
    const {
      method = 'GET',
      url,
      headers = {},
      queryParams,
      body,
      timeoutMs = 15000
    } = options;

    const startTime = Date.now();

    try {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `http://${finalUrl}`;
      }

      const parsedUrl = new URL(finalUrl);
      if (queryParams) {
        Object.entries(queryParams).forEach(([k, v]) => {
          if (k.trim()) parsedUrl.searchParams.append(k.trim(), v);
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const reqHeaders = new Headers();
      Object.entries(headers).forEach(([k, v]) => {
        if (k.trim() && v !== undefined) reqHeaders.set(k.trim(), v);
      });

      const fetchOptions: RequestInit = {
        method,
        headers: reqHeaders,
        signal: controller.signal,
        redirect: 'follow'
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body) {
        fetchOptions.body = body;
        if (!reqHeaders.has('Content-Type')) {
          try {
            JSON.parse(body);
            reqHeaders.set('Content-Type', 'application/json');
          } catch {
            reqHeaders.set('Content-Type', 'text/plain');
          }
        }
      }

      const response = await fetch(parsedUrl.toString(), fetchOptions);
      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;
      const responseText = await response.text();
      const sizeBytes = new Blob([responseText]).size;

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      let isJson = false;
      try {
        JSON.parse(responseText);
        isJson = true;
      } catch {}

      return {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
        body: responseText,
        isJson,
        durationMs,
        sizeBytes
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      let errMsg = err.message || 'Request failed';
      if (err.name === 'AbortError') {
        errMsg = `Request timed out after ${timeoutMs}ms`;
      } else if (err.cause?.code === 'ECONNREFUSED' || errMsg.includes('ECONNREFUSED')) {
        errMsg = 'Connection refused (ECONNREFUSED) - is the local service running on this port?';
      }

      return {
        status: 0,
        statusText: 'Client Error',
        headers: {},
        body: '',
        isJson: false,
        durationMs,
        sizeBytes: 0,
        error: errMsg
      };
    }
  }
}

export const httpClientService = new HttpClientService();
