// Renderiza o story de oportunidade (1080x1920) a partir de um item da pauta.
// Uso: node render-story.mjs <item.json> <saida.png>
import { abrirNavegador } from './navegador.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [, , itemPath, outPath = 'story.png'] = process.argv;
const item = JSON.parse(readFileSync(itemPath, 'utf8'));

const b64 = p => readFileSync(path.join(dir, p)).toString('base64');
const font = (fam, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${b64(`node_modules/@fontsource/${fam.toLowerCase()}/files/${fam.toLowerCase()}-latin-${w}-normal.woff2`)}) format('woff2')}`;
const logo = `data:image/png;base64,${b64('../logos/horizontal_transparente_amarelo_cruz_azul.png')}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "Chave: valor" por linha no primeiro slide
const campos = Object.fromEntries((item.slides?.[0] || '').split('\n')
  .map(l => l.split(/:\s(.+)/)).filter(p => p[1]).map(([k, v]) => [k.trim(), v.trim()]));
// Nomes de órgão chegam em CAIXA ALTA: passa para iniciais maiúsculas, mantendo
// a sigla de abertura ("CISMETRO - ...") e o trecho "– Cidade/UF" que vem depois
const PEQ = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'na', 'no', 'em']);
const iniciais = s => s.toLowerCase().replace(/\p{L}+/gu, (w, i) => PEQ.has(w) && i > 0 ? w : w[0].toUpperCase() + w.slice(1));
if (campos['Órgão']) {
  const [nome, ...resto] = campos['Órgão'].split(' – ');
  if (nome === nome.toUpperCase()) {
    const m = nome.match(/^([A-Z]{3,12})\s-\s(.*)$/);
    campos['Órgão'] = [m ? m[1] + ' – ' + iniciais(m[2]) : iniciais(nome), ...resto].join(' – ');
  }
}
const linhas = [['Órgão', campos['Órgão']], ['Abertura', campos['Abertura']], ['Processo', campos['Processo']]].filter(l => l[1]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${font('Poppins', 600)}${font('Poppins', 800)}${font('Inter', 500)}${font('Inter', 700)}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;background:#21B24D;font-family:Inter,sans-serif;color:#28323B;position:relative;overflow:hidden}
.dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.09) 3px,transparent 3px);background-size:44px 44px}
.wrap{position:absolute;left:80px;right:80px;top:270px;display:flex;flex-direction:column;gap:40px}
.logo{height:96px;width:auto;align-self:flex-start;margin-left:-34px}
.tag{align-self:flex-start;font:600 32px Poppins;letter-spacing:.1em;text-transform:uppercase;background:#FFC718;color:#28323B;padding:12px 28px;border-radius:999px}
.card{background:#fff;border-radius:36px;padding:56px;display:flex;flex-direction:column;gap:30px;box-shadow:0 20px 50px rgba(0,0,0,.18)}
.mod{font:600 30px Poppins;color:#0270A6;letter-spacing:.06em;text-transform:uppercase}
h1{font:800 64px/1.1 Poppins;letter-spacing:-.015em;text-wrap:balance}
.hr{height:2px;background:#E4E9ED}
.grid{display:grid;grid-template-columns:auto 1fr;gap:20px 30px;font-size:34px;line-height:1.3}
.grid span{color:#55636E;font-weight:500}.grid b{font-weight:700}
.cta{color:#fff;text-align:center;display:flex;flex-direction:column;gap:14px}
.cta b{font:800 46px Poppins}.cta span{font:500 32px Inter;opacity:.95}
.bar{position:absolute;left:0;right:0;bottom:0;height:26px;background:linear-gradient(90deg,#21B24D 0 40%,#03A2E4 40% 60%,#FFC718 60% 100%)}
</style></head><body><div class="dots"></div>
<div class="wrap">
  <img class="logo" src="${logo}">
  <span class="tag">Nova oportunidade</span>
  <div class="card">
    <div class="mod">${esc(campos['Modalidade'] || 'Licitação')}</div>
    <h1>${esc(item.titulo)}</h1>
    <div class="hr"></div>
    <div class="grid">${linhas.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join('')}</div>
  </div>
  <div class="cta"><b>Participe pela Licita Mais Brasil</b><span>${esc(campos['Acesse'] || 'licitamaisbrasil.com.br')}</span></div>
</div><div class="bar"></div></body></html>`;

const browser = await abrirNavegador();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// Encolhe o título se o cartão invadir a área segura de 250 px da base
await page.evaluate(() => {
  const h1 = document.querySelector('h1'), wrap = document.querySelector('.wrap');
  let s = 64; while (wrap.getBoundingClientRect().bottom > 1920 - 250 && s > 40) { s -= 2; h1.style.fontSize = s + 'px'; }
});
await page.screenshot({ path: outPath });
await browser.close();
console.log('ok', outPath);
