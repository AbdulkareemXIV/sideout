import { z } from "zod";

export const academySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    seasonStart: z.iso.date(),
    seasonEnd: z.iso.date(),
  })
  .refine((value) => value.seasonEnd > value.seasonStart, {
    path: ["seasonEnd"],
  });

export type AcademyInput = z.infer<typeof academySchema>;
