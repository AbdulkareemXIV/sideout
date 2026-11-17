/**
 * The opponent as the screens name it: another squad's lineup in the academy,
 * or a team outside it that was named by hand.
 */
export function opponentLabel(input: {
  squadName?: string | null;
  lineupName?: string | null;
  name?: string | null;
}): string | null {
  const fromLineup = [input.squadName, input.lineupName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  if (fromLineup) return fromLineup;

  const named = input.name?.trim();

  return named ? named : null;
}
