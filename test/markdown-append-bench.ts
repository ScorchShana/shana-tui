import { performance } from 'node:perf_hooks';
import { Markdown } from '../src/components/markdown.ts';
import { Container } from '../src/tui.ts';
import { renderHistory } from '../src/render-history.ts';
import { defaultMarkdownTheme as theme } from './test-themes.ts';
const root=new Container(); for(let i=0;i<2500;i++) root.addChild(new Markdown('history '+i,0,0,theme));
const active=new Markdown('',0,0,theme); root.addChild(active); active.setStreaming(true);
let text='😀'.repeat(30000); active.setText(text); renderHistory(root,80);
const times:number[]=[]; global.gc?.(); const before=process.memoryUsage().heapUsed; let peak=before;
for(let i=0;i<220;i++) {text+='😀'.repeat(16);active.setText(text);const start=performance.now();renderHistory(root,80);if(i>=20)times.push(performance.now()-start);peak=Math.max(peak,process.memoryUsage().heapUsed);}
global.gc?.(); const retained=process.memoryUsage().heapUsed-before;
times.sort((a,b)=>a-b);
const current=active.render(80); const fresh=new Markdown(text,0,0,theme);fresh.setStreaming(true);
console.log(JSON.stringify({median:times[100],p95:times[190],retained,peak:peak-before,rows:current.length,coldRows:fresh.render(80).length}));
active.setStreaming(false);
