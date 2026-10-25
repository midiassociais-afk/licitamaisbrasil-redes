// Abre o Chromium do Playwright. Na nuvem do Claude Code já existe um Chromium em
// /opt/pw-browsers (versão diferente da do pacote e sem download liberado), então
// usamos esse executável quando ele existe. CHROME_PATH força outro executável.
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

function chromeLocal() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const pastas = readdirSync(base).filter(p => /^chromium-\d+$/.test(p)).sort().reverse();
  for (const p of pastas) {
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const exe = path.join(base, p, sub);
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

export const abrirNavegador = () => {
  const executablePath = chromeLocal();
  return chromium.launch(executablePath ? { executablePath } : {});
};
