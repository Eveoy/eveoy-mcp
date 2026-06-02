import { z } from 'zod';

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MCP_CANONICAL_URL: z.string().url().default('https://mcp.eveoy.com/api/mcp'),
  MCP_CANONICAL_HOST: z.string().default('mcp.eveoy.com'),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  IP_HASH_SALT: z.string().min(16).optional(),

  MCP_DISABLE_TOOL: z.string().optional(),
  MCP_DISABLE_DCR: z.string().optional(),
  MCP_READONLY: z.string().optional(),
  MCP_CLASSIFIER_STRICT: z.string().optional(),

  SIEM_WEBHOOK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[env] invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}

export function disabledTools(): Set<string> {
  const v = env().MCP_DISABLE_TOOL;
  if (!v) return new Set();
  return new Set(v.split(',').map((s) => s.trim()).filter(Boolean));
}

export function isReadOnly(): boolean {
  return env().MCP_READONLY === '1';
}

export function classifierStrict(): boolean {
  return env().MCP_CLASSIFIER_STRICT === '1';
}
