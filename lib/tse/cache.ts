import { Redis } from "@upstash/redis";
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;
const pending = new Map<string, Promise<unknown>>();
const memory = new Map<string, { value: unknown; expires: number }>();
export async function cached<T>(
  key: string,
  seconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  const task = (async () => {
    let owns = false;
    const token = crypto.randomUUID();
    try {
      if (redis) {
        const v = await redis.get<T>(key);
        if (v !== null) return v;
        owns = !!(await redis.set(`${key}:lock`, token, { nx: true, ex: 30 }));
        if (!owns) {
          const stale = await redis.get<T>(`${key}:stale`);
          if (stale !== null) return stale;
          throw new Error("Atualização compartilhada em andamento");
        }
      }
      const value = await fn();
      memory.set(key, { value, expires: Date.now() + seconds * 1000 });
      if (memory.size > 400) memory.delete(memory.keys().next().value!);
      if (redis)
        await Promise.all([
          redis.set(key, value, { ex: seconds }),
          redis.set(`${key}:stale`, value, { ex: 3600 }),
        ]);
      return value;
    } finally {
      if (redis && owns)
        await redis.eval(
          "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
          [`${key}:lock`],
          [token],
        );
    }
  })();
  pending.set(key, task);
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}
// Um único limite por processo para todas as URLs, inclusive buscas e agregações.
let chain = Promise.resolve();
export async function throttle() {
  const scheduled = chain.then(
    () => new Promise<void>((r) => setTimeout(r, 160)),
  );
  chain = scheduled;
  await scheduled;
  if (redis) {
    for (;;) {
      const key = `tse:rate:${Math.floor(Date.now() / 1000)}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 3);
      if (n <= 60) break;
      await new Promise((r) => setTimeout(r, 1000 - (Date.now() % 1000)));
    }
  }
}
export async function mapLimited<T, R>(
  items: T[],
  fn: (v: T) => Promise<R>,
  limit = 4,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}
