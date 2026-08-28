export interface OpenApiEndpoint {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  parameters?: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    required?: boolean;
    description?: string;
    schema?: any;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: any; example?: any }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: any }> }>;
}

export interface OpenApiSpec {
  title: string;
  version: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  endpoints: OpenApiEndpoint[];
  sourcePath?: string;
  rawJson?: string;
}
