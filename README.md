# Licita Mais Brasil · Redes sociais

Identidade visual, renderizadores e artes das redes da Licita Mais Brasil.

- `marca/logos/` arquivos oficiais do logotipo
- `marca/render/` renderizadores (Node + Playwright)
  - `render-carrossel.mjs <pecas.json> <pasta-saida>`: carrosséis 1080 × 1350 por linha editorial
  - `render-story.mjs <item.json> <saida.png>`: story de oportunidade 1080 × 1920
  - `render-kit.mjs [pasta-saida]`: foto de perfil, capas e destaques das redes
- `marca/saida/` artes geradas; os links públicos destas imagens são usados no agendamento do Metricool
- `marca/manual-redes.html` manual de identidade · `marca/pauta-diaria.html` Central de publicações

Instalação: `cd marca/render && npm ci && npx playwright install --with-deps chromium`
