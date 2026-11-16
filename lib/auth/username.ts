export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

const INTERNAL_DOMAIN = "sideout.local";

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_DOMAIN}`;
}
