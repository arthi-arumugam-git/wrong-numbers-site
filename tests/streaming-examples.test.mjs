import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

for (const slug of ['claude-bill-higher-than-dashboard', 'streaming-message-delta-erases-token-usage']) {
  test(`${slug}: documented output update preserves input and uses the cumulative total`, () => {
    const html = readFileSync(new URL(`../articles/${slug}/index.html`, import.meta.url), 'utf8');
    const statement = html.match(/usage\.output_tokens\s*(?:\+=|=)\s*event\.usage\.output_tokens/)?.[0];
    assert.ok(statement, 'article must include an executable output-token update');
    const usage = { input_tokens: 25, cache_read_input_tokens: 75, output_tokens: 1 };
    for (const output_tokens of [200, 412]) {
      runInNewContext(statement, { usage, event: { usage: { output_tokens } } });
    }
    assert.deepEqual(usage, { input_tokens: 25, cache_read_input_tokens: 75, output_tokens: 412 });
  });
}
