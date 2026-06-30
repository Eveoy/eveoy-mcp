import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAll } from '../src/mcp/register';
import { registerStartCheckout, type AuthAgent } from '../src/mcp/tools/start-checkout';
import { registerCaptureProfile } from '../src/mcp/tools/capture-profile';
import { registerBookDemo } from '../src/mcp/tools/book-demo';
import { registerRequestHuman } from '../src/mcp/tools/request-human';

/**
 * Integration test: register every tool/resource/prompt onto a real
 * McpServer and assert the metadata clients will see is correct.
 *
 * This is the closest we can get to a full handshake without spinning
 * a transport — it catches all the things that break only at register
 * time (Zod-shape errors, missing handlers, annotation typos, etc.).
 */
describe('MCP register — end-to-end metadata sanity', () => {
  const server = new McpServer({ name: 'eveoy', version: '1.0.0' });
  registerAll(server, { getSessionId: () => 'test-session' });
  // start_checkout is registered with the agent instance in production (init());
  // register it here with a mock agent so the full surface is asserted.
  const mockAgent: AuthAgent = { state: {}, getSessionId: () => 'test-session', setState: () => {} };
  registerStartCheckout(server, mockAgent);
  registerCaptureProfile(server, { setProfile: () => {}, getSessionId: () => 'test-session' });
  registerBookDemo(server, { getSessionId: () => 'test-session', state: {} });
  registerRequestHuman(server, { getSessionId: () => 'test-session', state: {} });

  const internal = server as unknown as {
    _registeredTools: Record<string, { description?: string; inputSchema?: unknown }>;
    _registeredPrompts: Record<string, unknown>;
    _registeredResources?: Record<string, unknown>;
    _registeredResourceTemplates?: Record<string, unknown>;
  };
  const toolMap = internal._registeredTools ?? {};
  const promptMap = internal._registeredPrompts ?? {};
  const toolNames = Object.keys(toolMap);
  const promptNames = Object.keys(promptMap);

  it('registers the full tool set (Phase 1 + edge-backed)', () => {
    expect(toolNames.sort()).toEqual([
      'ask_eveoy',
      'book_demo',
      'capture_profile',
      'check_order_status',
      'claim_business',
      'get_app_link',
      'get_business',
      'get_case_studies',
      'get_pricing',
      'list_industries',
      'list_metros',
      'request_human',
      'search_directory',
      'start_checkout',
      'subscribe_newsletter',
    ]);
  });

  it('registers the named prompts', () => {
    expect(promptNames.sort()).toEqual([
      'eveoy_objection_handle',
      'eveoy_price_quote',
      'pilot_scope_intake',
      'pitch_for_role',
      'recommend_pilot',
    ]);
  });

  it('every tool description follows the canonical template', () => {
    for (const name of toolNames) {
      const tool = toolMap[name]!;
      const desc = String(tool.description ?? '');
      expect(desc, `${name} missing "Use this when"`).toMatch(/Use this when/);
      expect(desc, `${name} missing "Trigger phrases"`).toMatch(/Trigger phrases/);
      expect(desc, `${name} missing "Returns"`).toMatch(/Returns:/);
      expect(desc, `${name} missing "Do NOT use this for"`).toMatch(/Do NOT use this for/);
      expect(desc, `${name} missing Cost line`).toMatch(/Cost:/);
    }
  });

  it('no Glama anti-slop token leaks into any tool description', () => {
    const banlist = [
      /\bexcited\b/i, /\bgame[- ]changer\b/i, /\bunlock\b/i, /\bempower\b/i,
      /\bAI[- ]powered\b/i, /\bseamless/i, /\bleverage\b/i, /[🚀✨⚡]/, /#mcp\b/i,
    ];
    for (const name of toolNames) {
      const desc = String(toolMap[name]?.description ?? '');
      for (const pat of banlist) {
        expect(pat.test(desc), `${name} contains banned token /${pat.source}/`).toBe(false);
      }
    }
  });

  it('every tool advertises an inputSchema (Zod via mcp-handler converts to JSON Schema)', () => {
    for (const name of toolNames) {
      expect(toolMap[name]?.inputSchema, `${name} missing inputSchema`).toBeDefined();
    }
  });
});

describe('server.json and dxt manifest — discovery metadata cap checks', () => {
  it('mcp/server.json description fits the registry 100-char cap', async () => {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile('mcp/server.json', 'utf8');
    const parsed = JSON.parse(raw) as { description: string; name: string };
    expect(parsed.description.length).toBeLessThanOrEqual(100);
    expect(parsed.name).toMatch(/^[a-z0-9.-]+\/[a-z0-9._-]+$/);
  });

  it('dxt/manifest.json description fits the same cap (consistency with server.json)', async () => {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile('dxt/manifest.json', 'utf8');
    const parsed = JSON.parse(raw) as { description: string };
    expect(parsed.description.length).toBeLessThanOrEqual(100);
  });
});
