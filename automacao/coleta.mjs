// Coletores da pauta diária. Funciona no Windows e na nuvem (Node 18+, sem dependências).
//   node automacao/coleta.mjs oportunidades [horas]   → JSON das oportunidades publicadas nas últimas N horas (padrão 30; 72 às segundas)
//   node automacao/coleta.mjs noticias                → JSON das 5 notícias mais recentes da plataforma
//   node automacao/coleta.mjs boletim <link-word> <saida.txt> → texto do Boletim de Jurisprudência do TCU (.docx)
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const API = 'https://api.licitamaisbrasil.com.br';
const ORIGIN = { Origin: 'https://licitamaisbrasil.com.br', 'Content-Type': 'application/json; charset=utf-8' };
const post = async (rota, corpo) => {
  const r = await fetch(API + rota, { method: 'POST', headers: ORIGIN, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${rota}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

const MODALIDADES = {
  NEW_ELECTRONIC_REVERSED_AUCTION: 'Pregão eletrônico', ELECTRONIC_AUCTION: 'Pregão eletrônico',
  ELECTRONIC_COMPETITION: 'Concorrência eletrônica', COMPETITION_IN_PERSON: 'Concorrência presencial',
  DIRECT_ACCREDITATION: 'Credenciamento', DIRECT_PRE_QUALIFICATION: 'Pré-qualificação',
  ELECTRONIC_DISPENSER: 'Dispensa eletrônica', DIRECT_WAIVER_FORMALIZATION: 'Dispensa', WAIVER_FORMALIZATION: 'Dispensa',
  NONENFORCEMENT: 'Inexigibilidade', NEW_PRICES_SUBMISSION: 'Pesquisa de preços', PRICES_SUBMISSION: 'Pesquisa de preços'
};
const PEQ = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'na', 'no', 'em']);
const iniciais = s => !s || s !== s.toUpperCase() ? s : s.toLowerCase().replace(/\p{L}+/gu, (w, i) => PEQ.has(w) && i > 0 ? w : w[0].toUpperCase() + w.slice(1));
const brasilia = iso => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ');

async function oportunidades(horas) {
  const agora = Date.now(), lista = [];
  for (let pg = 1; pg <= 15; pg++) {
    const r = await post('/public/auction/list', { page: pg });
    lista.push(...r.auctionNotices);
    const menor = Math.min(...r.auctionNotices.filter(a => a.startDateTime).map(a => Date.parse(a.startDateTime)));
    if (!r.auctionNotices.length || menor < agora) break;
  }
  return lista.filter(a => a.publishDate && a.startDateTime && a.status !== 'CANCELLED'
      && Date.parse(a.publishDate) > agora - horas * 3600e3 && Date.parse(a.startDateTime) > agora)
    .map(a => {
      const sigla = (a.buyer?.corporateName || '').match(/^([A-Z]{3,12})\s-\s/);
      return {
        id: a.id, chave: `auc-${a.id}`, publicado: a.publishDate,
        modalidade: MODALIDADES[a.modality] || 'Licitação', processo: a.noticeNumber,
        objeto: a.objectOfInterest,
        orgao: sigla ? sigla[1] : iniciais(a.buyer?.corporateName || ''),
        cidade: a.buyer?.address?.city, uf: a.buyer?.address?.state,
        abertura: brasilia(a.startDateTime),
        link: `licitamaisbrasil.com.br/detalhes/${a.id}`
      };
    });
}

async function noticias() {
  const r = await post('/app/news/list', {});
  return (r.news || []).slice(0, 5).map(n => ({ id: n.id, chave: `news-${n.id}`, criada: n.createdDate, titulo: n.title, subtitulo: n.subtitle, texto: String(n.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
}

// Lê um arquivo de dentro de um .docx (zip) pelo diretório central
function lerZip(buf, nome) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('arquivo não é um .docx válido');
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = buf.readUInt16LE(eocd + 10); n > 0; n--) {
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20);
    const lenNome = buf.readUInt16LE(p + 28), lenExtra = buf.readUInt16LE(p + 30), lenCom = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42), atual = buf.toString('utf8', p + 46, p + 46 + lenNome);
    if (atual === nome) {
      const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const dados = buf.subarray(ini, ini + tam);
      return (metodo === 8 ? inflateRawSync(dados) : dados).toString('utf8');
    }
    p += 46 + lenNome + lenExtra + lenCom;
  }
  throw new Error(`${nome} não encontrado no .docx`);
}

async function boletim(link, saida) {
  const r = await fetch(link);
  if (!r.ok) throw new Error(`boletim: HTTP ${r.status}`);
  const xml = lerZip(Buffer.from(await r.arrayBuffer()), 'word/document.xml');
  const texto = xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  writeFileSync(saida, texto, 'utf8');
  return { arquivo: saida, caracteres: texto.length, enunciados: (texto.match(/^Acórdão \d+\/\d{4}/gm) || []).length };
}

const [cmd, a1, a2] = process.argv.slice(2);
const horasPadrao = new Date().toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }) === 'Mon' ? 72 : 30;
try {
  const saida = cmd === 'oportunidades' ? await oportunidades(Number(a1) || horasPadrao)
    : cmd === 'noticias' ? await noticias()
    : cmd === 'boletim' ? await boletim(a1, a2 || 'boletim.txt')
    : (() => { throw new Error('use: oportunidades [horas] | noticias | boletim <link> <saida.txt>'); })();
  console.log(JSON.stringify(saida, null, 2));
} catch (e) { console.error('ERRO:', e.message); process.exit(1); }
