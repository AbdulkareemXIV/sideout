import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type Client = ReturnType<typeof createClient<Database>>;
export type Role = Database["public"]["Enums"]["user_role"];

const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));

try {
  process.loadEnvFile(envFile);
} catch {
  // CI passes the same variables through the environment instead.
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Database tests need ${name}. Run \`npm run setup\` first.`);
  }

  return value;
}

const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = requiredEnv("SUPABASE_SECRET_KEY");

export type Account = {
  id: string;
  username: string;
  password: string;
  role: Role;
};

export type World = {
  admin: Client;
  academyId: string;
  director: Account;
  coachA: Account;
  coachB: Account;
  playerA: Account;
  squadA: { id: string; name: string };
  squadB: { id: string; name: string };
  playerInA: { id: string; full_name: string };
  playerInB: { id: string; full_name: string };
  membershipInA: string;
  as: (account: Account) => Promise<Client>;
  anonymous: Client;
};

const PASSWORD = "Test1234!";

export function adminClient(): Client {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonClient(): Client {
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createWorld(): Promise<World> {
  const admin = adminClient();
  const run = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toLowerCase();

  const createAccount = async (
    handle: string,
    role: Role,
    fullName: string,
  ): Promise<Account> => {
    const username = `${handle}.${run}`;
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@sideout.local`,
      password: PASSWORD,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw error ?? new Error(`Could not create ${username}`);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      role,
      username,
      full_name: fullName,
      must_change_password: false,
    });

    if (profileError) {
      throw profileError;
    }

    return { id: data.user.id, username, password: PASSWORD, role };
  };

  const director = await createAccount("director", "director", "Test Director");
  const coachA = await createAccount("coach.a", "coach", "Test Coach A");
  const coachB = await createAccount("coach.b", "coach", "Test Coach B");
  const playerA = await createAccount("player.a", "player", "Test Player A");

  const { data: squads, error: squadError } = await admin
    .from("squads")
    .insert([
      { name: `U16 ${run}`, age_group: "U16" },
      { name: `U18 ${run}`, age_group: "U18" },
    ])
    .select("id, name");

  if (squadError || !squads || squads.length !== 2) {
    throw squadError ?? new Error("Could not create squads");
  }

  const [squadA, squadB] = squads as [
    { id: string; name: string },
    { id: string; name: string },
  ];

  await admin.from("coach_assignments").insert([
    { coach_id: coachA.id, squad_id: squadA.id },
    { coach_id: coachB.id, squad_id: squadB.id },
  ]);

  const { data: players, error: playerError } = await admin
    .from("players")
    .insert([
      {
        user_id: playerA.id,
        full_name: "Test Player A",
        primary_position: "outside_hitter",
        jersey_number: 7,
      },
      {
        full_name: "Test Player B",
        primary_position: "setter",
        jersey_number: 3,
      },
    ])
    .select("id, full_name");

  if (playerError || !players || players.length !== 2) {
    throw playerError ?? new Error("Could not create players");
  }

  const playerInA = players.find((p) => p.full_name === "Test Player A");
  const playerInB = players.find((p) => p.full_name === "Test Player B");

  if (!playerInA || !playerInB) {
    throw new Error("Could not tell the test players apart");
  }

  const { data: memberships, error: membershipError } = await admin
    .from("squad_memberships")
    .insert([
      {
        player_id: playerInA.id,
        squad_id: squadA.id,
        start_date: "2026-01-01",
      },
      {
        player_id: playerInB.id,
        squad_id: squadB.id,
        start_date: "2026-01-01",
      },
    ])
    .select("id, player_id");

  if (membershipError || !memberships) {
    throw membershipError ?? new Error("Could not create memberships");
  }

  const membershipInA = memberships.find((m) => m.player_id === playerInA.id);

  if (!membershipInA) {
    throw new Error("Could not find the membership in squad A");
  }

  await admin.from("academy").delete().not("id", "is", null);

  const { data: academy, error: academyError } = await admin
    .from("academy")
    .insert({
      name: "Test Academy",
      season_start: "2026-09-01",
      season_end: "2027-06-30",
    })
    .select("id")
    .single();

  if (academyError || !academy) {
    throw academyError ?? new Error("Could not create the academy");
  }

  return {
    admin,
    academyId: academy.id,
    director,
    coachA,
    coachB,
    playerA,
    squadA,
    squadB,
    playerInA: { id: playerInA.id, full_name: playerInA.full_name },
    playerInB: { id: playerInB.id, full_name: playerInB.full_name },
    membershipInA: membershipInA.id,
    anonymous: anonClient(),
    as: async (account: Account) => {
      const client = anonClient();
      const { error } = await client.auth.signInWithPassword({
        email: `${account.username}@sideout.local`,
        password: account.password,
      });

      if (error) {
        throw error;
      }

      return client;
    },
  };
}

export async function destroyWorld(world: World): Promise<void> {
  const { admin } = world;
  const profileIds = [
    world.director.id,
    world.coachA.id,
    world.coachB.id,
    world.playerA.id,
  ];

  await admin
    .from("squad_memberships")
    .delete()
    .in("player_id", [world.playerInA.id, world.playerInB.id]);
  await admin
    .from("players")
    .delete()
    .in("id", [world.playerInA.id, world.playerInB.id]);
  await admin
    .from("coach_assignments")
    .delete()
    .in("squad_id", [world.squadA.id, world.squadB.id]);
  await admin
    .from("squads")
    .delete()
    .in("id", [world.squadA.id, world.squadB.id]);
  await admin.from("profiles").delete().in("id", profileIds);
  await admin.from("academy").delete().not("id", "is", null);

  for (const id of profileIds) {
    await admin.auth.admin.deleteUser(id);
  }
}
