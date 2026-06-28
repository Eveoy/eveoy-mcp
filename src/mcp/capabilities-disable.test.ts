import { describe, it, expect, afterEach } from 'vitest';
import { __setConfigForTest } from '@/config';
import { enabledCapabilities, capabilitiesMarkdown, capabilitiesHint } from '@/mcp/capabilities';
import { buildInfo } from '@/info';

describe('capability hiding via disabledTools', () => {
  afterEach(() => __setConfigForTest({ disabledTools: new Set() }));

  it('excludes disabled tools from every manifest derivation', () => {
    __setConfigForTest({ disabledTools: new Set(['search_directory', 'get_business']) });
    const names = enabledCapabilities().map((c) => c.name);
    expect(names).not.toContain('search_directory');
    expect(names).not.toContain('get_business');
    expect(buildInfo().tools.map((t) => t.name)).not.toContain('search_directory');
    expect(capabilitiesMarkdown()).not.toContain('search_directory');
    expect(capabilitiesHint()).not.toContain('search_directory');
  });
});
