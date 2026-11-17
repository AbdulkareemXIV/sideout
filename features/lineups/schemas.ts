import { z } from "zod";

const position = z.enum(["1", "2", "3", "4", "5", "6"]);

const point = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const lineupSchema = z.object({
  lineupId: z.uuid().nullable(),
  squadId: z.uuid(),
  name: z.string().trim().min(1).max(60),
  system: z.enum(["5-1", "6-2", "4-2"]),
  positions: z.record(position, z.uuid()),
  setterIds: z.array(z.uuid()).min(1).max(2),
  liberoId: z.uuid().nullable(),
  receiveFormations: z.record(z.string(), z.record(position, point)),
});

export type LineupInput = z.infer<typeof lineupSchema>;
