export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpRequestRecord {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string;
  authType: 'none' | 'bearer' | 'basic';
  bearerToken?: string;
  basicUser?: string;
  basicPass?: string;
  createdAt: number;
}

export interface HttpResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  durationMs: number;
  sizeBytes: number;
  error?: string;
  timestamp: number;
}

export interface HttpHistoryItem {
  id: string;
  request: HttpRequestRecord;
  response: HttpResponseData;
}
