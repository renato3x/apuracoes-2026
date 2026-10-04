# APURAÇÃO 2026

Portal de resultados das Eleições Gerais de 2026. Next.js App Router, React, TypeScript, Tailwind CSS, Lucide, Recharts e Zod. Integração baseada na configuração e nos arquivos públicos atuais do TSE; não há votos, candidatos ou percentuais gerados pelo aplicativo.

## Executar

Requer Node.js 22.16 ou superior.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Sem arquivo de ambiente, o padrão é o **simulado público do TSE**, identificado permanentemente como **DADOS DE DEMONSTRAÇÃO**. Os exemplos de teste não são carregados pela aplicação. É necessário acesso à internet para consultar o TSE.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Com o servidor ativo, `npm run test:routes` verifica páginas, 404s, APIs, candidatos, municípios e busca. `TEST_URL` permite testar outra URL. Build e desenvolvimento usam Webpack para compatibilidade com ambientes em que o processo auxiliar do Turbopack não pode abrir portas. `.npmrc` evita um erro de resolução de peers opcionais do Vitest no npm 10; os peers necessários de produção estão declarados explicitamente.

## Produção / Vercel

Configure estas variáveis no projeto e faça o deploy com o preset Next.js:

```dotenv
TSE_DATA_MODE=production
RESULTS_REFRESH_INTERVAL=30000
SITE_URL=https://seu-dominio.com.br
UPSTASH_REDIS_REST_URL=https://seu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token
SNAPSHOTS_ENABLED=false
```

Os identificadores das eleições e diretórios vêm do EA11, não de endpoints presumidos. Trocar `TSE_DATA_MODE` altera a fonte e a validação de fase, sem mudanças no código. Reinicie o servidor após alterar variáveis; em hospedagem, faça novo deployment. Em produção, arquivos `f=s` são rejeitados.

**Para alto tráfego em múltiplas instâncias, configure Redis compartilhado.** Ele oferece cache, leases para impedir cargas simultâneas, cache anterior e limite global de 60 consultas por segundo. Sem Redis, o cache e a fila são locais a cada processo; o cache de fetch do Next também reduz consultas, mas o limite local não coordena diferentes instâncias. O limitador local agenda até aproximadamente seis requisições por segundo. Configure duração de funções suficiente para o primeiro carregamento do índice nacional (o catálogo usa concorrência limitada e pode levar dezenas de segundos a frio). Redis não foi provisionado por este projeto.

Arquivos 404 recebem uma pausa de dois minutos antes de nova consulta para reduzir solicitações a arquivos ainda não publicados. O intervalo do frontend é configurável e nunca inferior a 10 segundos. A consulta pausa em abas ocultas. Isso **não** representa a cadência de geração do TSE. Cache CDN das APIs e cache do servidor podem introduzir atraso adicional. Sempre são exibidas a hora da consulta e, quando fornecida, a data/hora de totalização do TSE, em Brasília (UTC−3).

Se houver falha de rede ou validação, o último resultado válido é preservado quando disponível e identificado como desatualizado. Não há fallback de produção para simulação. Configure observabilidade e teste de carga conforme a infraestrutura escolhida antes de receber tráfego em grande escala; o projeto não foi submetido a uma simulação de tráfego massivo.

## Integração e confiabilidade

- `lib/tse/endpoints.ts`: ambientes, descoberta da eleição/turno e diretórios fornecidos pelo TSE.
- `lib/tse/schemas.ts`: validação EA11, EA12 e EA20 com Zod.
- `lib/tse/parser.ts`: modelo interno, fases, recortes, valores ausentes, votos anulados/sub judice, federações, substituições e situações oficiais.
- `lib/tse/client.ts`: consultas de backend, municípios, catálogo e tratamento de falhas.
- `lib/tse/cache.ts`: deduplicação, cache, leases, concorrência e limites de requisição.
- `lib/tse/snapshots.ts`: histórico persistente opcional.

A conclusão depende de `and=f`. A situação eleitoral é reproduzida de `st`; `e=s` não é interpretado sozinho como eleito porque também pode indicar segundo turno. As vagas do Senado vêm de `carg.nv`. Lideranças visuais usam apenas candidatos com destinação `Válido`, votos positivos e liderança sem empate. Não são previsões nem declarações de eleição. Percentuais são os divulgados pelo TSE, sem recomputar denominadores; isso é especialmente importante para o Senado, votos anulados e resultados proporcionais.

Deputados exibem votos nominais, legenda, QE, vagas dos agrupamentos e situações oficiais. Não calculamos eleitos pela ordem da votação. Quociente partidário não disponível no modelo observado aparece como indisponível. Agregação de partidos usa somente situações oficiais de eleição e identifica cobertura/contagens parciais. Campos ausentes são `null` e aparecem como —. Mudanças incompatíveis de formato falham na validação.

## Rotas

- `/`, `/presidente`, `/estados`, `/governadores`, `/senado`, `/camara`, `/assembleias`
- `/estado/[uf]`, `/estado/[uf]/governador`, `/estado/[uf]/senado`
- `/estado/[uf]/deputado-federal`, `/estado/[uf]/deputado-estadual`
- `/estado/df/deputado-distrital`
- `/estado/[uf]/municipios`, `/estado/[uf]/municipio/[slug]`
- `/partidos`, `/partido/[sigla]`, `/candidato/[id]`, `/sobre-os-dados`

Todas as consultas eleitorais aceitam `?turno=1` ou `?turno=2`. O segundo turno só é consultado para cargos elegíveis e configurados pelo TSE. O Distrito Federal não usa o cargo de deputado estadual.

APIs internas: `/api/results/president`, `/api/results/[office]/[uf]`, `/api/results/[office]/[uf]/[codigoMunicipal]`, `/api/results/municipality/[uf]/[codigoMunicipal]`, `/api/results/states/[office]`, `/api/candidate/[id]`, `/api/catalog`, `/api/catalog?type=municipalities`, `/api/search?q=`. Cargos: `president`, `governor`, `senate`, `federal-deputy`, `state-deputy`, `district-deputy`. São endpoints deste projeto, não do TSE. `state-deputy` em consultas agregadas usa `district-deputy` para DF.

## Snapshots

Defina `SNAPSHOTS_ENABLED=true` junto às credenciais Redis. Cada arquivo recebido gera um ponto com horário oficial e votação. Um sorted set por ambiente, eleição, cargo e recorte guarda o histórico com retenção de 60 dias; a API retorna até 240 pontos. IDs e turnos permanecem separados. A série surge após pelo menos dois pontos. O histórico é coletado somente quando o resultado é consultado; não é um coletor autônomo e não inventa períodos ausentes. Sem Redis, o recurso fica inativo.

## Diferença de votos

`LeaderAdvantage` acompanha as atualizações dos resultados de Presidente (Brasil, UF e município) e Governador. Compara votos classificados como `Válido`, recalcula a ordem a cada resultado e mostra a diferença de votos, pontos percentuais (`p.p.`) e seções totalizadas. Empates são identificados sem desempate legal; todos os empatados na posição comparada são mostrados. Dados incompletos não são convertidos em zero, e a ausência de votação não gera uma liderança artificial.

No Senado, o corte numérico usa `carg.nv` do TSE: a última posição do corte e a seguinte. O componente não atribui vagas nem declara eleitos. Os cargos proporcionais não recebem esse indicador.

Com snapshots suficientes, a evolução da diferença compara uma dupla fixa com sinal: valores positivos indicam a primeira referência à frente e negativos, a outra. A referência permanece estável quando essas candidaturas trocam de liderança. A legenda identifica a dupla, e uma tabela oferece alternativa textual. Pontos sem contagens permanecem ausentes; não há estimativa ou projeção. Empates múltiplos não geram uma dupla arbitrária para o gráfico.

## Fontes e fixtures

Veja [docs/tse/SOURCES.md](docs/tse/SOURCES.md) para os endereços, campos observados e a procedência das fixtures. Os testes cobrem resultados majoritários, proporcionais, Senado, municípios, substituições, fases, turnos, recortes, ausência de campos, formatos inválidos, situações oficiais, identidades e cache. Alterações sintéticas de fixtures são restritas aos testes, nunca ao runtime.

O mapa SVG é gerado da malha simplificada do IBGE e inclui as 27 UFs. O GeoJSON original está em `scripts/brazil.geojson`; `npm run map:generate` reconstrói os caminhos locais. A UI oferece navegação por teclado, alternativa textual do mapa, contraste, estados de foco e redução de movimento. Tabelas preservam todos os campos e permitem rolagem horizontal no celular. Metadata, OpenGraph, sitemap e robots estão incluídos; simulação é bloqueada para indexação.
