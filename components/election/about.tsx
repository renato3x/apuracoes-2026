import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
export default function About({
  interval,
  simulation,
}: {
  interval: number;
  simulation: boolean;
}) {
  return (
    <div className="about-grid">
      <article className="panel prose">
        <span className="eyebrow">TRANSPARÊNCIA</span>
        <h2>Informação pública. Leitura responsável.</h2>
        <p>
          O APURAÇÃO 2026 é um portal independente. Os resultados são obtidos
          dos arquivos públicos de divulgação do Tribunal Superior Eleitoral e
          apresentados sem projeções, recomendações ou interpretação jurídica.
        </p>
        <h3>Fonte e ambiente</h3>
        <p>
          Ambiente atual:{" "}
          <strong>
            {simulation
              ? "simulado público do TSE — dados de demonstração"
              : "produção — arquivos oficiais do TSE"}
          </strong>
          . O campo de fase de cada arquivo é validado. Arquivos de simulação
          são rejeitados em produção.
        </p>
        <a
          href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados"
          target="_blank"
          rel="noreferrer"
        >
          Documentação técnica de 2026 do TSE <ArrowUpRight size={14} />
        </a>
        <a
          href="https://dadosabertos.tse.jus.br/"
          target="_blank"
          rel="noreferrer"
        >
          Portal de Dados Abertos do TSE <ArrowUpRight size={14} />
        </a>
        <h3 id="metodologia">Como os dados chegam até você</h3>
        <p>
          O servidor consulta a configuração de eleições (EA11), os municípios
          (EA12) e os resultados unificados (EA20). Zod valida a estrutura. O
          parser verifica eleição, turno, cargo, território e fase, preservando
          os percentuais fornecidos pelo TSE.
        </p>
        <h3>Atualizações e cache</h3>
        <p>
          O portal consulta sua API interna a cada {interval / 1000} segundos
          enquanto a aba está visível. Esse intervalo não indica a frequência de
          publicação do TSE. Consultas são deduplicadas, limitadas e armazenadas
          no cache do servidor. O cache distribuído é utilizado quando
          configurado. Cada resultado informa a hora da consulta e a data e hora
          de totalização do TSE.
        </p>
        <h3>Resultados parciais e finalizados</h3>
        <p>
          A conclusão usa exclusivamente o andamento oficial do arquivo (
          <code>and=f</code>). Ter 100% de seções processadas ou mais votos não
          determina, por si só, a eleição. A situação de cada candidato é
          reproduzida do campo oficial <code>st</code>. Ausência de situação
          nunca é substituída por um vencedor calculado.
        </p>
        <h3>Eleições proporcionais e Senado</h3>
        <p>
          Deputados dependem da distribuição proporcional. Exibimos votos
          nominais, votos de legenda, quociente eleitoral e vagas dos
          agrupamentos quando publicados. Não calculamos eleitos pela posição na
          tabela. Para o Senado, o número de vagas vem do cargo no arquivo
          oficial; não é assumida uma única vaga.
        </p>
        <h3>Erros e campos ausentes</h3>
        <p>
          Campos ausentes aparecem como “Informação ainda não disponível” ou —.
          Falhas de rede ou validação exibem um aviso e preservam o último
          resultado válido quando disponível. Não completamos números nem
          candidaturas.
        </p>
        <h3>Histórico</h3>
        <p>
          O histórico é opcional e exige armazenamento persistente configurado.
          Cada ponto corresponde a um arquivo legitimamente recebido. A evolução
          representa os resultados parciais divulgados pelo TSE em cada horário
          e não constitui previsão.
        </p>
        <h3>Mapa e acessibilidade</h3>
        <p>
          A malha geográfica provém da API de malhas do IBGE. As cores servem
          somente à diferenciação. O mapa permite navegação por teclado e
          oferece alternativa textual.
        </p>
      </article>
      <aside className="panel about-aside">
        <ShieldCheck size={24} />
        <h3>Compromisso com os dados</h3>
        <p>Fonte pública e verificável</p>
        <p>Situações eleitorais oficiais</p>
        <p>Turnos separados</p>
        <p>Sem projeções eleitorais</p>
        <p>Sem votos inventados</p>
        <Link href="/">
          Acompanhar resultados <ArrowUpRight size={14} />
        </Link>
      </aside>
    </div>
  );
}
