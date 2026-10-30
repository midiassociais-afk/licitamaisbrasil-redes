// Teste local da aba "Nova publicação" da Central, com o Claude e o banco simulados.
// Uso: node teste-nova.mjs <pasta-saida-screenshots>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { abrirNavegador } from './navegador.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || '.';
const html = readFileSync(path.join(dir, '..', 'pauta-diaria.html'), 'utf8');

const stub = `<script>
window.__gravados=[];window.__chamadas=0;
const docRef=(col,id)=>({get:async()=>({exists:false}),set:async d=>{window.__gravados.push({col,id,d})},update:async d=>{window.__gravados.push({col,id,d,update:true})}});
const vazio={docs:[]};
const colecao=col=>{const q={where:()=>q,orderBy:()=>q,limit:()=>q,onSnapshot:fn=>{setTimeout(()=>fn(col==='pautas'?{docs:[{id:'2026-10-30',data:()=>({id:'2026-10-30',titulo:'Pauta'})}]}:vazio));return()=>{}},doc:id=>docRef(col,id)};return q};
const sample=async()=>{};
sample.json=async prompt=>{window.__chamadas++;await new Promise(r=>setTimeout(r,200));
  if(window.__chamadas===1)return {perguntas:['O post é para órgãos públicos ou fornecedores?','Quer citar algum prazo específico?']};
  return {proposta:{titulo:'Cadastro de fornecedor em 4 passos',gancho:'Participe do seu primeiro pregão sem complicação.',linha:'novidade',baseLegal:'Lei 14.133/2021, art. 87',
    slides:['a','b','c','d'],telas:[{tipo:'capa',kicker:'Passo a passo',titulo:'Cadastro de fornecedor em 4 passos',sub:'Do cadastro ao primeiro lance'},
    {tipo:'texto',kicker:'Passo 1',titulo:'Crie sua conta',texto:'Acesse licitamaisbrasil.com.br e clique em Cadastre-se.',destaque:'É gratuito'},
    {tipo:'lista',kicker:'Documentos',titulo:'Tenha em mãos',itens:['CNPJ','Certidões','Contrato social']},
    {tipo:'cta',titulo:'Comece agora',texto:'Cadastre-se grátis.',url:'licitamaisbrasil.com.br'}],
    legenda:'Quer vender para o governo? Veja como começar. #licitacao #pregao',textoX:'Cadastro de fornecedor em 4 passos na Licita Mais Brasil.',conferir:['Conferir a lista de certidões exigidas'],resumo:'Passo a passo direto para fornecedores.'}}};
window.claude={use:async n=>n==='db'?{collection:colecao}:n==='user'?{id:async()=>'u1',can:async()=>true}:n==='sample'?sample:null};
try{localStorage.setItem('pauta-dia','nova');localStorage.removeItem('nova-pub')}catch(e){}
</script>`;

const browser = await abrirNavegador();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
page.on('pageerror', e => erros.push(e.message));
await page.setContent(stub + html, { waitUntil: 'load' });
await page.click('button.day:has-text("Nova publicação")');
await page.waitForSelector('#nova-ideia');
await page.screenshot({ path: path.join(out, 'nova-1-form.png'), fullPage: true });
await page.fill('#nova-ideia', 'Como o fornecedor se cadastra e participa do primeiro pregão');
await page.click('[data-act="nova-iniciar"]');
await page.waitForSelector('#nova-r0');
await page.fill('#nova-r0', 'Fornecedores');
await page.screenshot({ path: path.join(out, 'nova-2-perguntas.png'), fullPage: true });
await page.click('[data-act="nova-responder"]');
await page.waitForSelector('.tela');
await page.click('[data-act="net"][data-net="x"]');
await page.screenshot({ path: path.join(out, 'nova-3-previa.png'), fullPage: true });
await page.click('[data-act="nova-criar"]');
await page.waitForFunction(() => window.__gravados.some(g => g.col === 'itens'));
const g = await page.evaluate(() => window.__gravados);
console.log(JSON.stringify(g.map(x => ({ col: x.col, id: x.id, campos: Object.keys(x.d), status: x.d.status, artePendente: x.d.artePendente, formatos: x.d.formatos })), null, 1));
console.log('chamadas ao Claude:', await page.evaluate(() => window.__chamadas), '| erros:', erros.length ? erros : 'nenhum');
await browser.close();
