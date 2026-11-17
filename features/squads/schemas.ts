import { z } from "zod";

export const squadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  ageGroup: z.string().trim().min(1).max(40),
});

export const playerSchema = z.object({
  squadId: z.uuid(),
  fullName: z.string().trim().min(1).max(120),
  jerseyNumber: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(0).max(99).nullable()),
  position: z.enum([
    "outside_hitter",
    "opposite",
    "setter",
    "middle_blocker",
    "libero",
    "defensive_specialist",
  ]),
  dominantHand: z.enum(["right", "left", "both"]),
  dateOfBirth: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.iso.date().nullable()),
  heightCm: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(100).max(230).nullable()),
});

export const coachAssignmentSchema = z.object({
  squadId: z.uuid(),
  coachId: z.uuid(),
});

export const movePlayerSchema = z.object({
  playerId: z.uuid(),
  squadId: z.uuid(),
});

export type SquadInput = z.infer<typeof squadSchema>;
export type PlayerInput = z.infer<typeof playerSchema>;
export type CoachAssignmentInput = z.infer<typeof coachAssignmentSchema>;
export type MovePlayerInput = z.infer<typeof movePlayerSchema>;
