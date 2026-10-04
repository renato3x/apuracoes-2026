# Fontes consultadas — 4 de outubro de 2026

Fonte principal: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

Portal de dados abertos: https://dadosabertos.tse.jus.br/

Instruções de download 2026: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026

EA11: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes

EA12: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea12-arquivo-de-configuracao-de-municipios

EA20: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado

O PDF EA20 retornou HTTP 403 às tentativas de download neste ambiente. O parser foi verificado contra os JSON públicos atuais, as instruções de download e o FAQ 2026; não foi possível conferir o dicionário completo desse PDF. Novos campos incompatíveis ou estruturas distintas são rejeitados e precisam de revisão, sem completar dados por suposição.

## JSON efetivamente baixados, com conteúdo preservado

Diretório `tests/fixtures/` (a indentação foi padronizada, preservando o conteúdo):

- `config-production.json`: https://resultados.tse.jus.br/oficial/comum/config/ele-c.json — geração 02/10/2026, fase oficial. Pleito 3220, federal 6257 / 6258, estadual 6259 / 6260, ciclo ele2026. Runtime sempre consulta configuração atual, não esta fixture.
- `president-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json
- `deputy-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac-c0006-e021272-u.json
- `senate-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac-c0005-e021272-u.json
- `governor-substitution-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ma/ma-c0003-e021272-u.json
- `municipality-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac01120-c0005-e021272-u.json

Configuração de simulação inspecionada: https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json

## Campos observados

- EA11: `pl[].c`, `pl[].e[].cd`, `t`, `cdt2`, `abr[].cp[].cd`, `arq[].tp/dir`.
- EA12: `abr[].cd/ds`, `mu[].cd/cdi/nm/c`. Código TSE municipal com cinco dígitos, distinto do IBGE.
- EA20: `ele`, `t`, `f`, `tpabr`, `cdabr`, `idg`, `dt/ht`, `dg/hg`, `and`.
- Seções: `s.ts/st/snt/pst/pstn`. Comparecimento: `e.te/c/pc/pcn/a/pa/pan`.
- Votos: `v.vv/vb/tvn/van/vansj/vnom/vl`. `tvn` é preservado separadamente de `vn` para incluir o total de nulos, inclusive técnicos.
- Cargos: `carg[].cd/nv/qe/fed/agr`; agrupamentos: `agr[].vag/par`; partidos: `par[].sg/nfed/tvtn/tvtl/cand`.
- Candidatos: `sqcand/n/nm/nmu/vap/pvap/pvapn/st/dvt/e/subs`. `subs` contém nomes/partidos das candidaturas substituídas, sem inventar motivos jurídicos.
- Percentuais: preferir as versões de maior precisão (`pvapn`, `pstn`, `pcn`, `pan`), usando o percentual de apresentação quando a versão de precisão está ausente.
- Fotos: `[sqcand].jpeg`, dentro do diretório `ft` fornecido pelo EA11, conforme as instruções oficiais. Usam o otimizador de imagens do Next, com fallback visual.

## Mapa

Documentação: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3

GeoJSON baixado: https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&intrarregiao=UF&qualidade=minima

Arquivo de produção adicional efetivamente baixado e testado:

- `president-production.json`: https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json — geração 03/10/2026, fase `o`, andamento `n`, totalização não iniciada. Confirma horários de totalização vazios, situação vazia e votos zero publicados pelo próprio TSE. Esses zeros são dados publicados, não preenchimento de campos ausentes.

- `municipalities-simulation.json`: https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/config/mun-e021270-cm.json — configuração EA12 completa, incluindo localidades do exterior (`zz`), cujo código IBGE é vazio. Esse caso é aceito como ausência de informação, sem impedir a leitura dos municípios brasileiros. A aplicação oferece navegação municipal nas 27 UFs solicitadas.
