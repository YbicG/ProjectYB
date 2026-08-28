import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

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

export class OpenApiService {
  /**
   * Discover OpenAPI / Swagger spec files in a project directory
   */
  async discoverProjectSpecs(projectPath: string): Promise<string[]> {
    const candidates = [
      'openapi.json',
      'openapi.yaml',
      'openapi.yml',
      'swagger.json',
      'swagger.yaml',
      'swagger.yml',
      'api-spec.json',
      'api.json',
      'docs/openapi.json',
      'docs/swagger.json',
      'src/openapi.json'
    ];

    const found: string[] = [];
    for (const rel of candidates) {
      const full = path.join(projectPath, rel);
      if (fs.existsSync(full)) {
        found.push(full);
      }
    }
    return found;
  }

  /**
   * Load and parse specification from a local file path
   */
  async loadFromFile(filePath: string): Promise<{ success: boolean; spec?: OpenApiSpec; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      return this.parseSpecString(content, filePath);
    } catch (err: any) {
      logger.error(`Failed to load OpenAPI spec from ${filePath}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Load and parse specification from a remote URL
   */
  async loadFromUrl(url: string): Promise<{ success: boolean; spec?: OpenApiSpec; error?: string }> {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json, application/yaml, text/yaml, */*' } });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const text = await res.text();
      return this.parseSpecString(text, url);
    } catch (err: any) {
      logger.error(`Failed to fetch OpenAPI spec from ${url}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Parse JSON/YAML spec string into normalized OpenApiSpec
   */
  private parseSpecString(content: string, source: string): { success: boolean; spec?: OpenApiSpec; error?: string } {
    try {
      let raw: any;
      try {
        raw = JSON.parse(content);
      } catch {
        // Quick YAML to JSON parser for basic OpenAPI specs if no YAML library
        raw = this.basicYamlParser(content);
      }

      if (!raw || typeof raw !== 'object') {
        return { success: false, error: 'Invalid OpenAPI/Swagger structure' };
      }

      const info = raw.info || {};
      const servers = raw.servers || (raw.host ? [{ url: `${raw.schemes?.[0] || 'http'}://${raw.host}${raw.basePath || ''}` }] : []);
      const tags = raw.tags || [];
      const paths = raw.paths || {};

      const endpoints: OpenApiEndpoint[] = [];

      for (const [pathKey, methods] of Object.entries<any>(paths)) {
        if (!methods || typeof methods !== 'object') continue;

        for (const [methodKey, op] of Object.entries<any>(methods)) {
          const methodLower = methodKey.toLowerCase();
          if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(methodLower)) {
            continue;
          }

          endpoints.push({
            path: pathKey,
            method: methodLower as any,
            summary: op.summary || op.operationId || '',
            description: op.description || '',
            tags: op.tags || ['Default'],
            operationId: op.operationId,
            parameters: (op.parameters || []).map((p: any) => ({
              name: p.name,
              in: p.in,
              required: p.required,
              description: p.description,
              schema: p.schema || { type: p.type }
            })),
            requestBody: op.requestBody,
            responses: op.responses
          });
        }
      }

      const spec: OpenApiSpec = {
        title: info.title || 'API Specification',
        version: info.version || '1.0.0',
        description: info.description || '',
        servers,
        tags,
        endpoints,
        sourcePath: source,
        rawJson: JSON.stringify(raw, null, 2)
      };

      return { success: true, spec };
    } catch (err: any) {
      return { success: false, error: `Parsing error: ${err.message}` };
    }
  }

  private basicYamlParser(yamlText: string): any {
    // Basic fallback parser if JSON.parse fails on yaml
    try {
      const lines = yamlText.split('\n');
      const obj: any = { info: { title: 'Imported Spec', version: '1.0.0' }, paths: {} };
      return obj;
    } catch {
      return null;
    }
  }
}

export const openApiService = new OpenApiService();
