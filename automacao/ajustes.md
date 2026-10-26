# Ajustes rápidos · Licita Mais Brasil (tarefa na nuvem, de hora em hora)

Você atende os ajustes pedidos na Central de publicações sem esperar a pauta do dia seguinte. **Não publique nem agende nada nas redes** e não use o conector do Metricool.

Central: https://claude.ai/artifact/4uYf84gjq1fJuMrFzqt7W3. Carregue as ferramentas com ToolSearch `select:ArtifactData,Artifact`.

## Passo 0 — Há algo a fazer?
ArtifactData `query` em `itens` com where status == "ajustar" e, em outra consulta, where artePendente == true.
Se as duas vierem vazias (ou só com itens de status "ajustar" cujo `comentario` começa com "Não foi possível atender"), responda "Nada a ajustar" e **termine imediatamente**, sem rodar mais nada.

## Passo 1 — Pedidos de ajuste (status "ajustar")
Para cada item com `comentario` preenchido (exceto os que começam com "Não foi possível atender"):
1. Reescreva o que o pedido pede, e só isso: `titulo`, `slides` (texto corrido, um por tela), `telas` (estrutura das imagens, ver abaixo), `legenda` e `textoX`, conforme o caso. Não invente fatos, números ou artigos; mantenha as fontes reais. Se o pedido exigir uma informação nova, confirme numa fonte oficial com WebFetch antes de usar.
2. Se o item não tiver `telas`, monte-as a partir de `slides` (uma tela por slide).
3. Faça update com if_version: campos reescritos, `status: "pendente"`, `comentarioAtendido` = comentário original, `comentario: ""`, `ajustadoEm` = agora e, se algum texto das telas mudou e o item tem `imagens`, `artePendente: true`.
4. Se não der para atender, mantenha "ajustar" e escreva em `comentario`: "Não foi possível atender: <motivo>".

Formato das telas:
- `{"tipo":"capa","kicker":"…","titulo":"… (até 70)","sub":"… (até 90)"}`, sempre a primeira
- `{"tipo":"texto","kicker":"…","titulo":"… (até 50)","texto":"… (até 220)","destaque":"opcional"}`
- `{"tipo":"lista","kicker":"…","titulo":"… (até 50)","itens":["2 a 4, até 70 cada"],"destaque":"opcional"}`
- `{"tipo":"oport","modalidade":"…","objeto":"… (até 60)","orgao":"…","abertura":"…","processo":"…","link":"…"}`
- `{"tipo":"cta","titulo":"…","texto":"…","url":"licitamaisbrasil.com.br"}`, sempre a última de um carrossel

## Passo 2 — Refazer as artes (artePendente == true)
Releia os itens com `artePendente == true` (inclui os do Passo 1). Para cada um:
1. Tema = `linha` do item. Pasta atual = a parte de `imagens[0]` antes de `/01.png` (ex.: `reedicoes/01_PNCP_Atas_Contratos` ou `pautas/2026-10-26/2026-10-26-dica-x`). Nova pasta = pasta atual sem um sufixo `-aj<números>` que já exista, mais `-aj<AAAAMMDDHHmm>` (hora de Brasília). A pasta nova evita que navegadores e o Metricool mostrem a imagem antiga guardada em cache.
2. Monte /tmp/lmb/ajuste.json com `[{"id":"<doc_id>","tema":"<linha>","arquivo":"<nome da nova pasta, só o último trecho>","slides":<telas do item>}]` e renderize, com `<pai>` = a parte da pasta antes do último `/` (ex.: `reedicoes`):
   `mkdir -p /tmp/lmb && cd marca/render && npm ci --no-audit --no-fund && node render-carrossel.mjs /tmp/lmb/ajuste.json ../saida/<pai> && cd ../..`
   Se a saída disser "ATENÇÃO, ainda não cabe", encurte a tela, atualize `telas`/`slides` do item e renderize de novo.
3. Envie ao GitHub: `git add marca/saida && git commit -m "Arte ajustada: <doc_id>" && (git push origin HEAD:main || (git pull --rebase origin main && git push origin HEAD:main))`.
4. Publique as imagens na Central: Artifact `action:"read"` com a url da Central e depois `action:"publish"` com a mesma `url`, `file_path` = `marca/pauta-diaria.html` (sem alterar o arquivo), `root` = `marca/saida` e `files` = `[{"path":"<pai>/<nova pasta>/01.png"}, …]`. Não passe `capabilities` nem `icon`.
5. ArtifactData `update` (if_version) no item: `imagens` = novos caminhos, `imagensPublicas` = `https://raw.githubusercontent.com/midiassociais-afk/licitamaisbrasil-redes/main/marca/saida/<caminho>` de cada imagem, `artePendente` = `{"__delete__": true}`, `arteAtualizadaEm` = agora. Se o item tinha `metricool` (já enviado), adicione ao campo `comentarioAtendido` a frase " (Atenção: reenvie ao Metricool; o post antigo usa a arte anterior.)".

## Fim
Responda em até 3 linhas: quantos pedidos atendidos, quantas artes refeitas e o que falhou.
