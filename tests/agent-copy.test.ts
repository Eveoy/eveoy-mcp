import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

/**
 * Front-door agent copy must match the canonical KB: every verified visit returns photo
 * AND video proof, and the optional guaranteed-purchase add-on is discoverable. The site's
 * ACP / UCP / ai-plugin discovery files are mirrored onto the Worker.
 */
describe('agent copy — photo + video and the guaranteed-purchase add-on', () => {
  it('front-door surfaces mention video, not photos only', async () => {
    for (const f of ['src/index.ts', 'public/llms.txt', 'src/knowledge/public/for-agents.md']) {
      const raw = (await readFile(f, 'utf8')).toLowerCase();
      expect(raw, `${f} should mention video proof`).toMatch(/video/);
    }
  });

  it('the guaranteed-purchase add-on is discoverable (agent guide + KB)', async () => {
    for (const f of ['src/knowledge/public/for-agents.md', 'src/knowledge/public/product.md']) {
      const raw = (await readFile(f, 'utf8')).toLowerCase();
      expect(raw, `${f} should describe guaranteeing a purchase`).toMatch(
        /guarantee[^.]{0,20}purchase|purchase activity|specified sku/,
      );
    }
  });
});

describe('mirrored site discovery files', () => {
  it('serves ai-plugin.json, acp.json, and ucp as valid JSON', async () => {
    for (const f of ['ai-plugin.json', 'acp.json', 'ucp']) {
      const raw = await readFile(`public/.well-known/${f}`, 'utf8');
      expect(() => JSON.parse(raw), `${f} valid JSON`).not.toThrow();
    }
  });
});
