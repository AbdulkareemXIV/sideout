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

export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
