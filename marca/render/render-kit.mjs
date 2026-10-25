// Gera o kit de perfil das redes: capas, foto de perfil e capas de destaques do Instagram.
// Uso: node render-kit.mjs [pasta-saida]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || '../saida/kit-redes');
mkdirSync(outDir, { recursive: true });

const b64 = p => readFileSync(path.join(dir, p)).toString('base64');
const img = nome => `data:image/png;base64,${b64(`../logos/${nome}.png`)}`;
const font = (fam, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${b64(`node_modules/@fontsource/${fam.toLowerCase()}/files/${fam.toLowerCase()}-latin-${w}-normal.woff2`)}) format('woff2')}`;
const BASE = `${font('Poppins', 800)}${font('Inter', 500)}*{margin:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{position:relative;overflow:hidden;font-family:Inter,sans-serif;color:#fff}
.dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.09) 3px,transparent 3px);background-size:44px 44px}
.bar{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(90deg,#21B24D 0 40%,#03A2E4 40% 60%,#FFC718 60% 100%)}
.plus{position:absolute;background:linear-gradient(#FFC718,#FFC718) center/100% 34% no-repeat,linear-gradient(#FFC718,#FFC718) center/34% 100% no-repeat}
h1{font-family:Poppins;font-weight:800;letter-spacing:-.015em;line-height:1.1}`;
const FRASE = 'Licitações eletrônicas simples,<br>seguras e transparentes';

// Capas: medidas oficiais de cada rede; o conteúdo fica dentro da área que aparece em todos os aparelhos
const capas = [
  { arq: 'YouTube_Banner_2560x1440', w: 2560, h: 1440, html: `<body style="background:#21B24D"><div class="dots"></div>
    <div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;justify-content:space-between;gap:60px">
      <img src="${img('horizontal_transparente_amarelo_cruz_azul')}" style="height:170px;flex:none">
      <div style="text-align:right;flex:1"><h1 style="font-size:48px">${FRASE}</h1><p style="font-size:36px;opacity:.92;margin-top:14px">Tutoriais, jurisprudência e novidades toda semana</p></div>
    </div><div class="bar" style="height:40px"></div></body>` },
  { arq: 'Facebook_Capa_1640x624', w: 1640, h: 624, html: `<body style="background:#21B24D"><div class="dots"></div>
    <div style="position:absolute;left:240px;right:240px;top:110px;display:flex;flex-direction:column;gap:30px">
      <img src="${img('horizontal_transparente_amarelo_cruz_azul')}" style="height:110px;width:auto;align-self:flex-start;margin-left:-40px">
      <h1 style="font-size:62px">${FRASE}</h1></div><div class="bar" style="height:22px"></div></body>` },
  { arq: 'LinkedIn_Capa_1128x191', w: 1128, h: 191, scale: 2, html: `<body style="background:#0F6B34"><div class="dots"></div>
    <div style="position:absolute;inset:0 40px 12px 360px;display:flex;align-items:center;justify-content:flex-end;text-align:right"><h1 style="font-size:32px">${FRASE}</h1></div>
    <div class="bar" style="height:12px"></div></body>` },
  { arq: 'X_Capa_1500x500', w: 1500, h: 500, html: `<body style="background:#28323B"><div class="dots"></div>
    <div class="plus" style="width:260px;height:260px;left:120px;top:90px"></div>
    <div style="position:absolute;left:520px;right:80px;top:0;bottom:22px;display:flex;flex-direction:column;justify-content:center;gap:18px">
      <img src="${img('horizontal_branco')}" style="height:84px;width:auto;align-self:flex-start;margin-left:-30px">
      <h1 style="font-size:50px">${FRASE}</h1><p style="font-size:28px;opacity:.85">Jurisprudência, oportunidades e novidades todos os dias</p></div>
    <div class="bar" style="height:16px"></div></body>` }
];

// Ícones de linha (traço uniforme, cantos arredondados), desenhados num quadro de 512
const ICONES = {
  balanca: '<path d="M256 96V416M176 416H336M96 140H416"/><path d="M136 140L96 280M136 140L176 280M80 280Q136 344 192 280Z"/><path d="M376 140L336 280M376 140L416 280M320 280Q376 344 432 280Z"/>',
  livro: '<path d="M256 140C200 110 130 110 80 130V400C130 380 200 380 256 410C312 380 382 380 432 400V130C382 110 312 110 256 140Z"/><path d="M256 140V410"/>',
  ajustes: '<path d="M96 150H416M96 256H416M96 362H416"/><circle cx="180" cy="150" r="36" class="f"/><circle cx="330" cy="256" r="36" class="f"/><circle cx="230" cy="362" r="36" class="f"/>',
  pergunta: '<circle cx="256" cy="256" r="176"/><path d="M200 212C200 172 228 150 258 150C292 150 316 174 316 206C316 250 258 252 258 304"/><circle cx="258" cy="364" r="8" class="d"/>',
  edital: '<rect x="140" y="96" width="232" height="320" rx="28"/><path d="M256 196V316M196 256H316"/>'
};
const destaques = [
  { arq: 'Destaque_Jurisprudencia', bg: '#28323B', cor: '#FFC718', icone: 'balanca' },
  { arq: 'Destaque_Legislacao', bg: '#FFFFFF', cor: '#157A35', icone: 'livro' },
  { arq: 'Destaque_Ferramentas', bg: '#0270A6', cor: '#FFFFFF', icone: 'ajustes' },
  { arq: 'Destaque_Plataforma', bg: '#FFFFFF', simbolo: true },
  { arq: 'Destaque_Perguntas', bg: '#0F6B34', cor: '#FFFFFF', icone: 'pergunta' },
  { arq: 'Destaque_Oportunidades', bg: '#21B24D', cor: '#FFFFFF', icone: 'edital' }
].map(d => ({
  arq: d.arq, w: 1080, h: 1920, html: `<body style="background:${d.bg}">
  <div style="position:absolute;left:0;right:0;top:420px;height:1080px;display:grid;place-items:center">
  ${d.simbolo ? `<img src="${img('simbolo_colorido')}" style="width:760px;height:760px">`
    : `<svg viewBox="0 0 512 512" width="520" height="520" fill="none" stroke="${d.cor}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:${d.bg}}.d{fill:${d.cor}}</style>${ICONES[d.icone]}</svg>`}
  </div></body>`
}));

const browser = await chromium.launch();
for (const p of [...capas, ...destaques]) {
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.scale || 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head>${p.html}</html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `${p.arq}.png`) });
  await page.close();
  console.log('ok', p.arq);
}
await browser.close();
// Foto de perfil: o arquivo oficial do símbolo colorido, igual em todas as redes
copyFileSync(path.join(dir, '../logos/simbolo_colorido.png'), path.join(outDir, 'Perfil_Todas_as_Redes_1080x1080.png'));
console.log('ok Perfil_Todas_as_Redes_1080x1080');
