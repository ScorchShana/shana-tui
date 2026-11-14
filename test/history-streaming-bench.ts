import { performance } from 'node:perf_hooks';
import { Markdown } from '../src/components/markdown.ts';
import { Container } from '../src/tui.ts';
import { renderHistory } from '../src/render-history.ts';
import { defaultMarkdownTheme as theme } from './test-themes.ts';
const root = new Container();
for (let i = 0; i < 2500; i++) root.addChild(new Markdown(`message ${i}\n\n**text** 中文 😀\n\n\`\`\`ts\nconst x = 1;\n\`\`\``, 0, 0, theme));
const active = new Markdown('', 0, 0, theme); root.addChild(active);
function measure(name: string, action: (frame: number) => void, frames = 200) {
 for (let i = 0; i < 10; i++) action(i);
 global.gc?.(); const retainedBefore = process.memoryUsage().heapUsed;
 let peak = retainedBefore; const times: number[] = [];
 for (let i = 0; i < frames; i++) { const start = performance.now(); action(i); times.push(performance.now() - start); peak = Math.max(peak, process.memoryUsage().heapUsed); }
 global.gc?.(); times.sort((a,b) => a-b);
 console.log(`${name}: median=${times[Math.floor(frames*.5)]!.toFixed(3)}ms p95=${times[Math.floor(frames*.95)]!.toFixed(3)}ms retainedDelta=${process.memoryUsage().heapUsed-retainedBefore} peakDelta=${peak-retainedBefore}`);
}
measure('direct-container', () => {root.render(80);});
measure('snapshot-static', () => {renderHistory(root, 80);});
for (const [name, content] of [['markdown', '**中文 😀**\n\n'.repeat(1000)], ['long-line', '😀'.repeat(30000)], ['code', '```ts\n' + 'const x = 1;\n'.repeat(2000)]]) {
 active.setStreaming(true);
 try { measure(`preview-${name}`, i => {active.setText(content + i); renderHistory(root, 80);}, 50); }
 finally {active.setStreaming(false);}
 const start=performance.now(); renderHistory(root,80); console.log(`final-${name}: ${(performance.now()-start).toFixed(3)}ms`);
}
measure('resize', i => {renderHistory(root, i%2 ? 79 : 80);}, 20);
