import { z } from "zod";
// Strings numéricas oficiais: NÃO coagir texto inválido, null ou vazio para zero.
export const integer = z
  .string()
  .regex(/^\d+$/)
  .refine(
    (v) => Number.isSafeInteger(Number(v)),
    "Inteiro fora da faixa segura",
  );
export const decimal = z.string().regex(/^\d+(?:[,.]\d+)?$/);
const metrics = z.record(z.string(), z.string());
export const candidateSchema = z
  .object({
    n: integer,
    sqcand: integer,
    nm: z.string().min(1),
    nmu: z.string().min(1),
    vap: integer.optional(),
    pvap: decimal.optional(),
    pvapn: decimal.optional(),
    st: z.string().optional(),
    dvt: z.string().optional(),
    e: z.enum(["s", "n"]).optional(),
    subs: z
      .array(
        z
          .object({ nm: z.string(), nmu: z.string(), sgp: z.string() })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
const party = z
  .object({
    n: integer,
    sg: z.string().min(1),
    nm: z.string(),
    nfed: z.string().optional(),
    tvtn: integer.optional(),
    tvtl: integer.optional(),
    cand: z.array(candidateSchema),
  })
  .passthrough();
const group = z
  .object({
    n: integer,
    nm: z.string(),
    tp: z.string(),
    com: z.string().optional(),
    vag: integer.optional(),
    par: z.array(party),
  })
  .passthrough();
export const resultSchema = z
  .object({
    ele: integer,
    t: z.enum(["1", "2"]),
    f: z.enum(["s", "o"]),
    tpabr: z.enum(["br", "uf", "mu", "z", "zz"]),
    cdabr: z.string().min(2),
    dg: z.string().optional(),
    hg: z.string().optional(),
    dt: z.string().optional(),
    ht: z.string().optional(),
    idg: integer,
    and: z.enum(["p", "f", "n"]).optional(),
    carg: z
      .array(
        z
          .object({
            cd: integer,
            nv: integer.optional(),
            qe: decimal.optional(),
            fed: z
              .array(
                z
                  .object({ n: integer, nm: z.string(), sg: z.string() })
                  .passthrough(),
              )
              .optional(),
            agr: z.array(group),
          })
          .passthrough(),
      )
      .min(1),
    s: metrics.optional(),
    e: metrics.optional(),
    v: metrics.optional(),
  })
  .passthrough();
export const configSchema = z
  .object({
    f: z.enum(["s", "o"]),
    arq: z.array(z.object({ tp: z.string(), dir: z.string() })),
    pl: z.array(
      z
        .object({
          cd: integer,
          c: z.string(),
          dt: z.string(),
          e: z.array(
            z
              .object({
                cd: integer,
                cdt2: z.string().optional(),
                t: z.enum(["1", "2"]),
                abr: z.array(
                  z
                    .object({
                      cd: z.string(),
                      cp: z.array(
                        z.object({
                          cd: integer,
                          ds: z.string(),
                          tp: z.string(),
                        }),
                      ),
                    })
                    .passthrough(),
                ),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export const municipalitySchema = z
  .object({
    f: z.enum(["s", "o"]),
    abr: z.array(
      z
        .object({
          cd: z.string(),
          ds: z.string(),
          mu: z.array(
            z
              .object({
                cd: integer,
                cdi: z.union([integer, z.literal("")]),
                nm: z.string(),
                c: z.enum(["s", "n"]),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export type TseConfig = z.infer<typeof configSchema>;
