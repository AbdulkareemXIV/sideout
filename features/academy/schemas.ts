import { z } from "zod";

export const academySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    seasonStart: z.iso.date(),
    seasonEnd: z.iso.date(),
    defaultBestOf: z.coerce.number().pipe(z.union([z.literal(3), z.literal(5)])),
    defaultSetPoints: z.coerce
      .number()
      .pipe(z.union([z.literal(15), z.literal(21), z.literal(25)])),
  })
  .refine((value) => value.seasonEnd > value.seasonStart, {
    path: ["seasonEnd"],
  });

export type AcademyInput = z.infer<typeof academySchema>;
