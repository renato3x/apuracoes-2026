import { redis } from "./cache";
import type { ElectionResult, Snapshot } from "./types";
export async function snapshots(result: ElectionResult): Promise<Snapshot[]> {
  if (process.env.SNAPSHOTS_ENABLED !== "true" || !redis) return [];
  const key = `snapshots:${result.mode}:${result.election}:${result.office}:${result.territory}:${result.municipality ?? ""}`;
  const stamp = result.updatedAt ?? result.generatedAt;
  if (!stamp) return [];
  const point: Snapshot = {
    time: stamp,
    processedPercentage: result.processedPercentage,
    candidates: result.candidates.map((c) => ({
      id: c.id,
      name: c.ballotName,
      percentage: c.percentage,
      votes: c.votes,
    })),
  };
  await redis.zadd(key, {
    score: Date.parse(stamp),
    member: JSON.stringify(point),
  });
  await redis.expire(key, 60 * 60 * 24 * 60);
  return await redis.zrange<Snapshot[]>(key, -240, -1);
}
