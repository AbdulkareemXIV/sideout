import type { CourtPoint, Position, System } from "./engine";

export type PlayerOption = {
  id: string;
  fullName: string;
  jerseyNumber: number | null;
  primaryPosition: string;
};

export type SavedLineup = {
  id: string;
  name: string;
  system: System;
  positions: Partial<Record<Position, string>>;
  setterIds: string[];
  liberoId: string | null;
  receiveFormations: Record<string, Record<string, CourtPoint>>;
};

type LineupRow = {
  id: string;
  name: string;
  system: System;
  positions: unknown;
  setter_ids: string[];
  libero_id: string | null;
  receive_formations: unknown;
};

export function toSavedLineup(row: LineupRow): SavedLineup {
  return {
    id: row.id,
    name: row.name,
    system: row.system,
    positions: (row.positions ?? {}) as SavedLineup["positions"],
    setterIds: row.setter_ids,
    liberoId: row.libero_id,
    receiveFormations: (row.receive_formations ??
      {}) as SavedLineup["receiveFormations"],
  };
}
