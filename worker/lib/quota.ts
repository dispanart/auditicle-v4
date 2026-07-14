import { DurableObject } from "cloudflare:workers";

export interface QuotaRule {
  scope: string;
  limit: number;
  units?: number;
}

export interface QuotaSnapshot {
  scope: string;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  allowed: boolean;
}

function utcDay(): { day: string; resetsAt: string } {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { day: now.toISOString().slice(0, 10), resetsAt: next.toISOString() };
}

function safeLimit(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function safeUnits(value?: number): number {
  return Math.max(1, Math.floor(Number.isFinite(value) ? Number(value) : 1));
}

/**
 * One globally named Durable Object serializes application-wide budget updates.
 * It stores only aggregate counters, never URLs, report content, IP addresses, or API keys.
 */
export class AuditicleQuotaCoordinator extends DurableObject {
  async peek(scope: string, limit: number): Promise<QuotaSnapshot> {
    const { day, resetsAt } = utcDay();
    const normalizedLimit = safeLimit(limit);
    const key = `${day}:${scope}`;
    const used = Number(await this.ctx.storage.get<number>(key) || 0);
    return {
      scope,
      used,
      limit: normalizedLimit,
      remaining: Math.max(0, normalizedLimit - used),
      resetsAt,
      allowed: normalizedLimit > 0 && used < normalizedLimit
    };
  }

  async reserve(rules: QuotaRule[]): Promise<QuotaSnapshot[]> {
    const normalized = rules
      .filter((rule) => rule && typeof rule.scope === "string" && rule.scope.trim())
      .map((rule) => ({ scope: rule.scope.trim(), limit: safeLimit(rule.limit), units: safeUnits(rule.units) }));
    if (!normalized.length) return [];

    const { day, resetsAt } = utcDay();
    return this.ctx.storage.transaction(async (txn) => {
      const current = new Map<string, number>();
      for (const rule of normalized) {
        const key = `${day}:${rule.scope}`;
        current.set(rule.scope, Number(await txn.get<number>(key) || 0));
      }

      const blocked = normalized.find((rule) => {
        const used = current.get(rule.scope) || 0;
        return rule.limit <= 0 || used + rule.units > rule.limit;
      });

      if (blocked) {
        return normalized.map((rule) => {
          const used = current.get(rule.scope) || 0;
          return {
            scope: rule.scope,
            used,
            limit: rule.limit,
            remaining: Math.max(0, rule.limit - used),
            resetsAt,
            allowed: false
          };
        });
      }

      const results: QuotaSnapshot[] = [];
      for (const rule of normalized) {
        const key = `${day}:${rule.scope}`;
        const used = (current.get(rule.scope) || 0) + rule.units;
        await txn.put(key, used);
        results.push({
          scope: rule.scope,
          used,
          limit: rule.limit,
          remaining: Math.max(0, rule.limit - used),
          resetsAt,
          allowed: true
        });
      }
      return results;
    });
  }
}
