import { z } from 'zod';

/**
 * Runtime validation for IGDB payloads. Every field Savepoint consumes is
 * validated here; everything else is stripped. Expanded sub-objects are
 * validated as objects; unexpanded numeric references are tolerated where
 * IGDB may return either shape.
 */

const igdbNamedSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

const igdbImageSchema = z.object({
  id: z.number(),
  url: z.string(),
});

const igdbInvolvedCompanySchema = z.object({
  company: z.union([igdbNamedSchema, z.number()]),
  developer: z.boolean().optional(),
  publisher: z.boolean().optional(),
});

const igdbReleaseDateSchema = z.object({
  id: z.number(),
  date: z.number().nullable().optional(),
  human: z.string().nullable().optional(),
  m: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  platform: z.union([igdbNamedSchema, z.number()]).nullable().optional(),
});

const igdbGameBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  summary: z.string().nullable().optional(),
  cover: z.union([igdbImageSchema, z.number()]).nullable().optional(),
  genres: z.array(z.union([igdbNamedSchema, z.number()])).optional(),
  platforms: z.array(z.union([igdbNamedSchema, z.number()])).optional(),
  release_dates: z.array(igdbReleaseDateSchema).optional(),
  first_release_date: z.number().nullable().optional(),
  updated_at: z.number().optional(),
});

const igdbGameDetailSchema = igdbGameBaseSchema.extend({
  involved_companies: z.array(igdbInvolvedCompanySchema).optional(),
  screenshots: z.array(z.union([igdbImageSchema, z.number()])).optional(),
});

const igdbTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type IgdbGameListItem = z.infer<typeof igdbGameBaseSchema>;
export type IgdbGameDetail = z.infer<typeof igdbGameDetailSchema>;
export type IgdbNamed = z.infer<typeof igdbNamedSchema>;

export function parseIgdbGames(data: unknown): IgdbGameListItem[] {
  return z.array(igdbGameBaseSchema).parse(data);
}

export function parseIgdbGameDetail(data: unknown): IgdbGameDetail {
  return igdbGameDetailSchema.parse(data);
}

export function parseIgdbNamedList(data: unknown): IgdbNamed[] {
  return z.array(igdbNamedSchema).parse(data);
}

export function parseIgdbToken(data: unknown): { access_token: string; expires_in: number } {
  const parsed = igdbTokenSchema.parse(data);
  return { access_token: parsed.access_token, expires_in: parsed.expires_in };
}
