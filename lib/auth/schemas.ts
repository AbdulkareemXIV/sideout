import { z } from "zod";

import { normalizeUsername, USERNAME_PATTERN } from "./username";

export const usernameField = z
  .string()
  .transform(normalizeUsername)
  .pipe(z.string().regex(USERNAME_PATTERN));

export const signInSchema = z.object({
  username: usernameField,
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirmation: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
  });

export const createCoachAccountSchema = z.object({
  username: usernameField,
  fullName: z.string().trim().min(1).max(120),
});

export const createPlayerAccountSchema = z.object({
  username: usernameField,
  playerId: z.uuid(),
});

export const resetPasswordSchema = z.object({
  profileId: z.uuid(),
});

export type CreateCoachAccountInput = z.infer<typeof createCoachAccountSchema>;
export type CreatePlayerAccountInput = z.infer<typeof createPlayerAccountSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
