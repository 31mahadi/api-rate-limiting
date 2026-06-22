import { z } from 'zod';

/**
 * Environment schema — validated once at boot (12-factor config).
 * A bad/missing var fails fast with a readable message instead of a runtime surprise.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  REDIS_URL: z.string().min(1),
  /** Comma-separated allowlist of browser origins for CORS. */
  CORS_ORIGIN: z.string().default(''),
  RATE_LIMIT_CAPACITY: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_REFILL_PER_SEC: z.coerce.number().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
