const ACTION_KEYS: Record<string, string> = {
  serve: "serve",
  attack: "attack",
  block: "block",
  dig: "dig",
  reception: "reception",
  set: "set",
  other: "other",
};

const RESULT_KEYS: Record<string, string> = {
  ace: "ace",
  kill: "kill",
  in: "inPlay",
  inPlay: "inPlay",
  error: "error",
  blocked: "blocked",
  solo: "solo",
  assist: "assist",
  rated: "rated",
  rated0: "rated0",
  rated1: "rated1",
  rated2: "rated2",
  rated3: "rated3",
};

/** Turns a stored "action.result" stat key into a readable label. */
export function statLabel(
  key: string,
  t: (messageKey: string) => string,
): string {
  const [action, result] = key.split(".");
  const actionKey = ACTION_KEYS[action ?? ""];
  const resultKey = RESULT_KEYS[result ?? ""];

  if (!actionKey || !resultKey) return key;
  return `${t(actionKey)} · ${t(resultKey)}`;
}
