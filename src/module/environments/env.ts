import { z } from 'zod';

function refineServiceUrl(service: string) {
  return z
    .string()
    .url()
    .transform((value) => ({ [service]: value }));
}

export const envSchema = z
  .object({
    // Application
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    APP_PORT: z.number({ coerce: true }).default(8081),

    // Services
    SERVICE_DOG: refineServiceUrl('dog'),
    SERVICE_ANIME: refineServiceUrl('anime'),
  })
  .transform((values) => {
    const servicesSchema = z.record(z.string(), z.string());
    const SERVICES: Record<string, string> = {};

    for (const envKey of Object.keys(values)) {
      if (String(envKey).startsWith('SERVICE_')) {
        Object.assign(SERVICES, values[envKey]);
      }
    }

    return {
      ...values,
      ALL_SERVICES: servicesSchema.parse(SERVICES),
    };
  });

export type Env = z.infer<typeof envSchema>;
