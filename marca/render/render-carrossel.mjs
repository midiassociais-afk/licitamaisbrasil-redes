// Renderiza carrosséis 1080x1350 a partir de um JSON de peças (ver reedicoes.json).
// Uso: node render-carrossel.mjs <pecas.json> <pasta-saida> [id-opcional]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [, , pecasPath, outDir = '../saida', soId] = process.argv;
const pecas = JSON.parse(readFileSync(pecasPath, 'utf8')).filter(p => !soId || p.id === soId);

const b64 = p => readFileSync(path.join(dir, p)).toString('base64');
const img = nome => `data:image/png;base64,${b64(`../logos/${nome}.png`)}`;
const font = (fam, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${b64(`node_modules/@fontsource/${fam.toLowerCase()}/files/${fam.toLowerCase()}-latin-${w}-normal.woff2`)}) format('woff2')}`;
const FONTES = font('Poppins', 600) + font('Poppins', 800) + font('Inter', 400) + font('Inter', 600);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Uma cor de fundo por linha editorial (manual, seção 05)
const TEMAS = {
  jurisprudencia: { bg: '#28323B', fg: '#FFFFFF', sub: 'rgba(255,255,255,.82)', kick: '#FFC718', plus: '#FFC718', logo: 'horizontal_branco', simbolo: 'simbolo_transparente_L_branco_cruz_verde', dots: 'rgba(255,255,255,.07)' },
  legislacao: { bg: '#FFFFFF', fg: '#28323B', sub: '#55636E', kick: '#0270A6', plus: '#21B24D', logo: 'horizontal_colorido', simbolo: 'simbolo_colorido', dots: 'rgba(40,50,59,.06)' },
  novidade: { bg: '#0270A6', fg: '#FFFFFF', sub: 'rgba(255,255,255,.88)', kick: '#FFC718', plus: '#FFC718', logo: 'horizontal_transparente_amarelo_cruz_verde', simbolo: 'simbolo_transparente_L_branco_cruz_verde', dots: 'rgba(255,255,255,.08)' },
  institucional: { bg: '#0F6B34', fg: '#FFFFFF', sub: 'rgba(255,255,255,.88)', kick: '#FFC718', plus: '#FFC718', logo: 'horizontal_transparente_amarelo_cruz_azul', simbolo: 'simbolo_transparente_L_branco_cruz_azul', dots: 'rgba(255,255,255,.08)' },
  oportunidade: { bg: '#21B24D', fg: '#FFFFFF', sub: 'rgba(255,255,255,.92)', kick: '#FFC718', plus: '#FFC718', logo: 'horizontal_transparente_amarelo_cruz_azul', simbolo: 'simbolo_transparente_L_branco_cruz_azul', dots: 'rgba(255,255,255,.09)', urlBg: '#FFFFFF', urlFg: '#157A35' }
};
TEMAS.noticia = TEMAS.legislacao; // notícias usam o layout claro de Legislação e dicas

function tela(s, i, total, t) {
  const rodape = `<div class="foot"><span>@licitamaisbrasil</span><span>${s.tipo === 'capa' ? 'Arraste para o lado →' : `${i + 1}/${total}`}</span></div><div class="bar"></div>`;
  const destaque = s.destaque ? `<div class="hl">${esc(s.destaque)}</div>` : '';
  let corpo;
  if (s.tipo === 'capa') corpo = `
    <img class="logo" src="${img(t.logo)}">
    <div class="plusbig"></div>
    <div class="box capa"><span class="kick">${esc(s.kicker)}</span><h1>${esc(s.titulo)}</h1>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}</div>`;
  else if (s.tipo === 'oport') corpo = `
    <img class="simb" src="${img(t.simbolo)}">
    <div class="box"><span class="kick">${esc(s.modalidade || 'Licitação')}</span>
    <div class="card"><h2>${esc(s.objeto)}</h2><div class="hr"></div>
    <dl>${[['Órgão', s.orgao], ['Abertura', s.abertura], ['Processo', s.processo]].filter(l => l[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
    ${s.link ? `<div class="link">${esc(s.link)}</div>` : ''}</div>`;
  else if (s.tipo === 'cta') corpo = `
    <div class="box cta"><img class="logo-cta" src="${img(t.logo)}"><h2>${esc(s.titulo)}</h2><p class="sub">${esc(s.texto)}</p><span class="url">${esc(s.url)}</span></div>`;
  else corpo = `
    <img class="simb" src="${img(t.simbolo)}">
    <div class="box"><span class="kick">${esc(s.kicker)}</span><h2>${esc(s.titulo)}</h2>
    ${s.tipo === 'lista' ? `<ul>${s.itens.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="txt">${esc(s.texto)}</p>`}
    ${destaque}</div>`;
  return `<section class="tela ${s.tipo}">${corpo}${rodape}</section>`;
}

function html(peca) {
  const t = TEMAS[peca.tema];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTES}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#888}
.tela{width:1080px;height:1350px;position:relative;overflow:hidden;background:${t.bg};color:${t.fg};font-family:Inter,sans-serif;--k:1}
.tela::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,${t.dots} 3px,transparent 3px);background-size:44px 44px}
.logo{position:absolute;left:56px;top:70px;height:92px;width:auto}
.simb{position:absolute;left:40px;top:40px;width:190px;height:190px;object-fit:contain}
.box{position:absolute;left:90px;right:90px;top:230px;bottom:170px;display:flex;flex-direction:column;justify-content:center;gap:calc(34px*var(--k))}
.box.capa{top:250px;justify-content:center}
.kick{font:600 calc(30px*var(--k)) Poppins;letter-spacing:.1em;text-transform:uppercase;color:${t.kick}}
h1{font:800 calc(98px*var(--k))/1.06 Poppins;letter-spacing:-.02em;text-wrap:balance}
h2{font:800 calc(72px*var(--k))/1.1 Poppins;letter-spacing:-.015em;text-wrap:balance}
.sub{font:400 calc(40px*var(--k))/1.4 Inter;color:${t.sub};max-width:860px}
.txt{font:400 calc(42px*var(--k))/1.45 Inter;color:${t.fg};max-width:880px}
ul{list-style:none;display:flex;flex-direction:column;gap:calc(26px*var(--k))}
li{font:400 calc(40px*var(--k))/1.35 Inter;padding-left:62px;position:relative}
li::before{content:"";position:absolute;left:0;top:calc(10px*var(--k));width:34px;height:34px;background:
 linear-gradient(${t.plus},${t.plus}) center/100% 34% no-repeat,linear-gradient(${t.plus},${t.plus}) center/34% 100% no-repeat}
.hl{align-self:flex-start;background:#FFC718;color:#28323B;font:600 calc(32px*var(--k))/1.3 Inter;padding:18px 28px;border-radius:18px;max-width:900px}
.plusbig{position:absolute;right:-90px;top:120px;width:380px;height:380px;opacity:.95;background:
 linear-gradient(${t.plus},${t.plus}) center/100% 34% no-repeat,linear-gradient(${t.plus},${t.plus}) center/34% 100% no-repeat}
.cta{align-items:center;text-align:center;top:150px}
.logo-cta{height:120px;width:auto;margin-bottom:20px}
.cta h2{font-size:calc(76px*var(--k))}
.url{margin-top:16px;background:${t.urlBg || '#21B24D'};color:${t.urlFg || '#FFFFFF'};font:700 calc(38px*var(--k)) Poppins;padding:22px 44px;border-radius:999px}
.card{background:#FFFFFF;color:#28323B;border-radius:32px;padding:calc(48px*var(--k));display:flex;flex-direction:column;gap:calc(24px*var(--k));box-shadow:0 20px 50px rgba(0,0,0,.18)}
.card h2{font-size:calc(56px*var(--k))}
.hr{height:2px;background:#E4E9ED}
dl{display:grid;grid-template-columns:auto 1fr;gap:calc(16px*var(--k)) 28px;font-size:calc(32px*var(--k));line-height:1.3}
dt{color:#55636E}dd{margin:0;font-weight:600}
.link{font:600 calc(32px*var(--k)) Inter;text-align:center;overflow-wrap:anywhere}
.foot{position:absolute;left:90px;right:90px;bottom:58px;display:flex;justify-content:space-between;font:600 28px Poppins;color:${t.sub}}
.bar{position:absolute;left:0;right:0;bottom:0;height:22px;background:linear-gradient(90deg,#21B24D 0 40%,#03A2E4 40% 60%,#FFC718 60% 100%)}
</style></head><body>${peca.slides.map((s, i) => tela(s, i, peca.slides.length, t)).join('')}</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const peca of pecas) {
  const pasta = path.resolve(outDir, peca.arquivo);
  mkdirSync(pasta, { recursive: true });
  await page.setContent(html(peca), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Encolhe o texto de cada tela até caber na área útil (mínimo 72%)
  const apertadas = await page.evaluate(() => [...document.querySelectorAll('.tela')].map((tela, i) => {
    const box = tela.querySelector('.box'); let k = 1;
    const estoura = () => box.scrollHeight > box.clientHeight + 1 || [...box.children].some(c => c.getBoundingClientRect().right > tela.getBoundingClientRect().right - 80);
    while (estoura() && k > 0.72) { k -= 0.02; tela.style.setProperty('--k', k.toFixed(2)); }
    return estoura() ? i + 1 : (k < 1 ? -(i + 1) : 0);
  }));
  const telas = await page.$$('.tela');
  for (let i = 0; i < telas.length; i++) await telas[i].screenshot({ path: path.join(pasta, `${String(i + 1).padStart(2, '0')}.png`) });
  const cortadas = apertadas.filter(n => n > 0), reduzidas = apertadas.filter(n => n < 0).map(n => -n);
  console.log(`${peca.arquivo}: ${telas.length} telas${reduzidas.length ? ` · texto reduzido em ${reduzidas.join(',')}` : ''}${cortadas.length ? ` · ATENÇÃO, ainda não cabe em ${cortadas.join(',')}` : ''}`);
}
await browser.close();
