import { z } from "zod";

export const squadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  ageGroup: z.string().trim().min(1).max(40),
});

export type SquadInput = z.infer<typeof squadSchema>;
