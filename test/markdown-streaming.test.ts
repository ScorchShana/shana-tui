import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Markdown } from '../src/components/markdown.ts';
import { defaultMarkdownTheme as theme } from './test-themes.ts';

test('stream completion is exact and isolated, including repeated state and text updates', () => {
 const history = Array.from({length: 100}, (_, i) => new Markdown(`**history ${i}**`, 0, 0, theme));
 const saved = history.map(m => m.render(60));
 const m = new Markdown('', 0, 0, theme);
 const source = '[link][ref]\n\n```ts\nconst x = "😀中文";\n```\n\n<!-- hidden -->\n\n[ref]: https://example.com\n';
 m.setStreaming(true);
 for (let i = 1; i <= source.length; i++) { m.setText(source.slice(0, i)); m.render(60); }
 m.setStreaming(false);
 const exact = m.render(60);
 assert.deepEqual(exact, new Markdown(source, 0, 0, theme).render(60));
 m.setStreaming(false); m.setText(source);
 assert.equal(m.render(60), exact);
 history.forEach((h, i) => { h.setText(`**history ${i}**`); assert.equal(h.render(60), saved[i]); });
});

test('preview bounds lexer input and hides comments across its window', () => {
 const m = new Markdown('', 0, 0, theme);
 m.setStreaming(true);
 m.setText('visible\n<!--' + 'secret\n'.repeat(300) + '-->\n' + 'x'.repeat(20000) + '😀');
 const lines = m.render(60).join('\n');
 assert.ok(!lines.includes('secret'));
 assert.ok(lines.includes('visible'));
 assert.ok(lines.includes('😀'));
 m.setStreaming(false);
 assert.deepEqual(m.render(60), new Markdown('visible\n<!--' + 'secret\n'.repeat(300) + '-->\n' + 'x'.repeat(20000) + '😀', 0, 0, theme).render(60));
});
import { renderHistory } from '../src/render-history.ts';
import { Container } from '../src/tui.ts';
import { Text } from '../src/components/text.ts';

test('history snapshots reuse roots and detect edits, reorders and mutable custom arrays', () => {
 const root = new Container(); const nested = new Container();
 const a = new Text('a', 0, 0); const b = new Text('b', 0, 0);
 nested.children = [a, b]; root.children = [nested];
 const first = renderHistory(root, 20);
 assert.equal(renderHistory(root, 20), first);
 nested.children.reverse(); assert.notDeepEqual(renderHistory(root, 20), first);
 a.setText('changed'); assert.ok(renderHistory(root, 20).join('').includes('changed'));
 const mutable = ['one']; root.children = [{render: () => mutable, invalidate() {}}];
 assert.deepEqual(renderHistory(root, 20), ['one']); mutable[0] = 'two';
 assert.deepEqual(renderHistory(root, 20), ['two']);
});
import { Marked } from 'marked';

test('lexer budget, final reparse and unchanged history survive token collection', () => {
 const original = Marked.prototype.lexer;
 const inputs: string[] = [];
 Marked.prototype.lexer = function(source, options) { inputs.push(source); return original.call(this, source, options); };
 try {
  const history = new Markdown('historical **message**', 0, 0, theme); history.render(40);
  const m = new Markdown('', 0, 0, theme); m.setStreaming(true);
  const source = ('row\t😀\n').repeat(4000);
  inputs.length = 0; m.setText(source); m.render(40);
  assert.ok(inputs.every(input => input.length <= 16384 && input.split('\n').length <= 32));
  inputs.length = 0; m.setStreaming(false); m.render(40);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0], source.replace(/\t/g, '   '));
  inputs.length = 0;
  (history as unknown as {cachedTokens?: unknown}).cachedTokens = undefined;
  history.render(40); m.render(40); assert.equal(inputs.length, 0);
  history.setText('new content'); history.render(40); assert.equal(inputs.length, 1);
  m.setStreaming(true); m.render(20); m.invalidate(); m.render(20); m.setStreaming(false);
  assert.deepEqual(m.render(20), new Markdown(source, 0, 0, theme).render(20));
 } finally { Marked.prototype.lexer = original; }
});

test('transform always receives full source, including streaming and exceptional completion', () => {
 const source = '**text**\n'.repeat(200);
 const seen: string[] = [];
 const m = new Markdown(source, 0, 0, theme, undefined, {transform(text) {seen.push(text); return text;}});
 try { m.setStreaming(true); m.render(30); throw Error('cancel'); }
 catch {} finally { m.setStreaming(false); }
 assert.deepEqual(m.render(30), new Markdown(source, 0, 0, theme).render(30));
 assert.ok(seen.every(text => text === source));
});
test('CR separators obey the preview logical-line budget', () => {
 const original = Marked.prototype.lexer;
 let maxLines = 0;
 Marked.prototype.lexer = function(source, options) { maxLines = Math.max(maxLines, source.replace(/\r\n?/g, '\n').split('\n').length); return original.call(this, source, options); };
 try { const m = new Markdown(('row\r').repeat(1000), 0, 0, theme); m.setStreaming(true); m.render(40); assert.ok(maxLines <= 32); }
 finally {Marked.prototype.lexer = original;}
});
test('replacement, resize, theme invalidation and reopening retain exact final syntax', () => {
 const source = '# 标题 😀\n\n- one\n  - two\n\n| a | b |\n|---|---|\n| 中 | 😀 |\n\n$$x^2$$\n\n<!-- hide -->\n\n[link][r]\n\n```ts\n' + 'long'.repeat(500) + '\n```\n\n[r]: https://example.com\n';
 for (const stride of [1, 7, 127]) {
  const m = new Markdown('', 1, 1, theme); m.setStreaming(true);
  for (let i = stride; i < source.length; i += stride) { m.setText(source.slice(0,i)); m.render(40); }
  m.setText(source); m.render(60); m.invalidate(); m.render(60); m.setStreaming(false);
  assert.deepEqual(m.render(60), new Markdown(source, 1, 1, theme).render(60));
  m.setStreaming(true); m.setText('replacement 😀'); m.render(20); m.setStreaming(false);
  assert.deepEqual(m.render(20), new Markdown('replacement 😀', 1, 1, theme).render(20));
 }
});
