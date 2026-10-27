// Gera o vídeo vertical (Reels / Shorts, 1080x1920, MP4) a partir das telas de cada peça.
// Uso: node render-reels.mjs <pecas.json> <pasta-saida>
// Para cada peça grava <pasta-saida>/<arquivo>/reels.mp4 e capa.jpg.
// Cada tela fica na tela pelo tempo de leitura do seu texto, com zoom suave e transição em fade.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [, , pecasPath, outDir = '../saida'] = process.argv;
const pecas = JSON.parse(readFileSync(pecasPath, 'utf8'));

async function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { const m = await import('ffmpeg-static'); if (m.default && existsSync(m.default)) return m.default; } catch {}
  return 'ffmpeg';
}
const FFMPEG = await ffmpegBin();
const FPS = 30, FADE = 0.6;

// Tempo de leitura: capa e encerramento curtos; demais telas 3,5 s + 1 s a cada 40 caracteres (máx. 8 s)
const texto = t => [t.titulo, t.sub, t.texto, t.destaque, ...(t.itens || []), t.objeto, t.orgao].filter(Boolean).join(' ');
const duracao = t => t.tipo === 'capa' || t.tipo === 'cta' ? 3.5 : Math.min(8, 3.5 + texto(t).length / 40);

// 1) Telas verticais com o mesmo visual dos carrosséis
const tmp = path.join(tmpdir(), `reels-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
execFileSync(process.execPath, [path.join(dir, 'render-carrossel.mjs'), path.resolve(pecasPath), tmp], { stdio: 'inherit', env: { ...process.env, FORMATO: 'reels' }, cwd: dir });

for (const peca of pecas) {
  const quadros = readdirSync(path.join(tmp, peca.arquivo)).filter(f => f.endsWith('.png')).sort().map(f => path.join(tmp, peca.arquivo, f));
  const durs = peca.slides.map(duracao).slice(0, quadros.length);
  const total = durs.reduce((a, b) => a + b, 0) - FADE * (durs.length - 1);
  const destino = path.resolve(outDir, peca.arquivo);
  mkdirSync(destino, { recursive: true });

  // 2) Zoom suave em cada tela e fade entre elas; trilha silenciosa para as redes aceitarem o vídeo
  const args = ['-y', '-loglevel', 'error'];
  quadros.forEach(q => args.push('-i', q));
  args.push('-f', 'lavfi', '-t', total.toFixed(2), '-i', 'anullsrc=r=44100:cl=stereo');
  const f = quadros.map((_, i) => `[${i}:v]scale=2160:3840,zoompan=z='min(zoom+0.0004,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(durs[i] * FPS)}:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p[v${i}]`);
  let ultimo = 'v0', offset = 0;
  for (let i = 1; i < quadros.length; i++) {
    offset += durs[i - 1] - FADE;
    f.push(`[${ultimo}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[x${i}]`);
    ultimo = `x${i}`;
  }
  args.push('-filter_complex', f.join(';'), '-map', `[${ultimo}]`, '-map', `${quadros.length}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', path.join(destino, 'reels.mp4'));
  execFileSync(FFMPEG, args, { stdio: 'inherit' });
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', quadros[0], '-q:v', '3', path.join(destino, 'capa.jpg')], { stdio: 'inherit' });
  console.log(`${peca.arquivo}: reels.mp4 (${total.toFixed(1)} s, ${quadros.length} telas) e capa.jpg`);
}
rmSync(tmp, { recursive: true, force: true });
