// Seeds the demo academy. Safe to run again: it clears the demo data first and
// rebuilds it, so the academy always comes back to the same starting point.
//
// Run with: npm run db:seed   (reads .env.local)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Run `npm run setup` first.",
  );
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const demoPasswords = {
  director: process.env.DEMO_DIRECTOR_PASSWORD ?? "Demo1234!",
  coachU16: process.env.DEMO_COACH_U16_PASSWORD ?? "Demo1234!",
  coachU18: process.env.DEMO_COACH_U18_PASSWORD ?? "Demo1234!",
  player: process.env.DEMO_PLAYER_PASSWORD ?? "Demo1234!",
};

const INTERNAL_DOMAIN = "sideout.local";

type SquadSeed = {
  name: string;
  ageGroup: string;
  coach: { username: string; fullName: string };
  birthYear: number;
  players: string[];
};

const squads: SquadSeed[] = [
  {
    name: "U14",
    ageGroup: "U14",
    coach: { username: "sara.u14", fullName: "Sara Khalil" },
    birthYear: 2013,
    players: [
      "Mariam Al-Amri",
      "Yousef Rahman",
      "Hala Fahmy",
      "Zaid Odeh",
      "Rana Habib",
      "Ali Safar",
      "Dana Aziz",
      "Faris Nabil",
      "Salma Idris",
      "Tareq Yassin",
      "Lina Barakat",
      "Bilal Marwan",
    ],
  },
  {
    name: "U16",
    ageGroup: "U16",
    coach: { username: "omar.u16", fullName: "Omar Haddad" },
    birthYear: 2011,
    players: [
      "Noura Salem",
      "Kareem Fadel",
      "Aisha Nasser",
      "Hamza Khalid",
      "Jana Rami",
      "Sami Mansour",
      "Layla Ziad",
      "Adam Shaker",
      "Rima Adel",
      "Yara Faisal",
      "Malik Hussein",
      "Tia Karim",
      "Ola Mahmoud",
      "Zain Abbas",
    ],
  },
  {
    name: "U18",
    ageGroup: "U18",
    coach: { username: "layla.u18", fullName: "Layla Mansour" },
    birthYear: 2009,
    players: [
      "Farah Saleh",
      "Nadim Ayoub",
      "Sara Wahid",
      "Bassel Hatem",
      "Dima Nabil",
      "Rakan Adel",
      "Hiba Samir",
      "Mazen Fouad",
      "Lama Jaber",
      "Issa Nader",
      "Reem Tariq",
      "Fadi Zuhair",
    ],
  },
  {
    name: "Senior",
    ageGroup: "Senior",
    coach: { username: "hassan.senior", fullName: "Hassan Nasser" },
    birthYear: 2005,
    players: [
      "Karim Saleh",
      "Amal Rashid",
      "Yazan Kamal",
      "Noor Hamdan",
      "Rami Nabil",
      "Sana Qasim",
      "Firas Adel",
      "Maya Nasser",
      "Tamer Khalil",
      "Layan Fares",
      "Adel Mansour",
      "Huda Sami",
    ],
  },
];

// The two newest U16 players start without an account, so the demo can show the
// director and the coach creating one.
const playersWithoutAccount = new Set(["Ola Mahmoud", "Zain Abbas"]);

const positions = [
  "outside_hitter",
  "middle_blocker",
  "setter",
  "opposite",
  "libero",
  "defensive_specialist",
];

const hands = ["right", "right", "right", "left"];

const demoPlayerName = "Noura Salem";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function birthDate(birthYear: number, index: number): string {
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String(((index * 3) % 27) + 1).padStart(2, "0");

  return `${birthYear}-${month}-${day}`;
}

async function clearDemoData() {
  const tables = [
    "squad_memberships",
    "coach_assignments",
    "players",
    "squads",
    "academy",
  ] as const;

  for (const table of tables) {
    const { error } = await admin
      .from(table)
      .delete()
      .not("created_at", "is", null);

    if (error) {
      throw new Error(`Could not clear ${table}: ${error.message}`);
    }
  }

  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Could not list the demo accounts: ${error.message}`);
    }

    const demoUsers = data.users.filter((user) =>
      user.email?.endsWith(`@${INTERNAL_DOMAIN}`),
    );

    for (const user of demoUsers) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        throw new Error(
          `Could not delete demo account ${user.email}: ${deleteError.message}`,
        );
      }
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }
}

async function createAccount(input: {
  username: string;
  fullName: string;
  role: "director" | "coach" | "player";
  password: string;
  mustChangePassword: boolean;
}): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${input.username}@${INTERNAL_DOMAIN}`,
    password: input.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(
      `Could not create ${input.username}: ${error?.message ?? "no user"}`,
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role: input.role,
    username: input.username,
    full_name: input.fullName,
    must_change_password: input.mustChangePassword,
  });

  if (profileError) {
    throw new Error(
      `Could not create the profile for ${input.username}: ${profileError.message}`,
    );
  }

  return data.user.id;
}

async function main() {
  console.log("Clearing the previous demo data…");
  await clearDemoData();

  console.log("Creating the academy…");
  const { error: academyError } = await admin.from("academy").insert({
    name: "Sideout Academy",
    season_start: "2026-09-01",
    season_end: "2027-06-30",
    default_best_of: 5,
    default_set_points: 25,
  });

  if (academyError) {
    throw new Error(`Could not create the academy: ${academyError.message}`);
  }

  console.log("Creating the director account…");
  await createAccount({
    username: "director",
    fullName: "Reem Al-Harbi",
    role: "director",
    password: demoPasswords.director,
    mustChangePassword: false,
  });

  const usedUsernames = new Set(["director"]);

  for (const squad of squads) {
    const { data: createdSquad, error: squadError } = await admin
      .from("squads")
      .insert({ name: squad.name, age_group: squad.ageGroup })
      .select("id")
      .single();

    if (squadError || !createdSquad) {
      throw new Error(
        `Could not create squad ${squad.name}: ${squadError?.message ?? ""}`,
      );
    }

    const isDemoCoach =
      squad.coach.username === "omar.u16" || squad.coach.username === "layla.u18";
    const coachPassword =
      squad.coach.username === "omar.u16"
        ? demoPasswords.coachU16
        : squad.coach.username === "layla.u18"
          ? demoPasswords.coachU18
          : demoPasswords.player;

    const coachId = await createAccount({
      username: squad.coach.username,
      fullName: squad.coach.fullName,
      role: "coach",
      password: coachPassword,
      mustChangePassword: !isDemoCoach,
    });

    usedUsernames.add(squad.coach.username);

    const { error: assignmentError } = await admin
      .from("coach_assignments")
      .insert({ coach_id: coachId, squad_id: createdSquad.id });

    if (assignmentError) {
      throw new Error(
        `Could not assign the coach of ${squad.name}: ${assignmentError.message}`,
      );
    }

    for (const [index, playerName] of squad.players.entries()) {
      const { data: player, error: playerError } = await admin
        .from("players")
        .insert({
          full_name: playerName,
          jersey_number: index + 1,
          primary_position: positions[index % positions.length],
          dominant_hand: hands[index % hands.length],
          date_of_birth: birthDate(squad.birthYear, index),
          height_cm: 158 + ((index * 3) % 34),
        })
        .select("id")
        .single();

      if (playerError || !player) {
        throw new Error(
          `Could not create ${playerName}: ${playerError?.message ?? ""}`,
        );
      }

      const { error: membershipError } = await admin
        .from("squad_memberships")
        .insert({
          player_id: player.id,
          squad_id: createdSquad.id,
          start_date: "2026-09-01",
        });

      if (membershipError) {
        throw new Error(
          `Could not add ${playerName} to ${squad.name}: ${membershipError.message}`,
        );
      }

      if (playersWithoutAccount.has(playerName)) {
        continue;
      }

      const base = `${slug(playerName).split(".")[0]}.${squad.name.toLowerCase()}`;
      let username = base;
      let suffix = 2;

      while (usedUsernames.has(username)) {
        username = `${base}${suffix}`;
        suffix += 1;
      }

      usedUsernames.add(username);

      const playerId = await createAccount({
        username,
        fullName: playerName,
        role: "player",
        password: demoPasswords.player,
        mustChangePassword: playerName !== demoPlayerName,
      });

      const { error: linkError } = await admin
        .from("players")
        .update({ user_id: playerId })
        .eq("id", player.id);

      if (linkError) {
        throw new Error(
          `Could not link the account of ${playerName}: ${linkError.message}`,
        );
      }
    }
  }

  const playerCount = squads.reduce(
    (total, squad) => total + squad.players.length,
    0,
  );

  console.log(
    `Seeded ${squads.length} squads, ${playerCount} players and the demo accounts.`,
  );
  console.log("Demo logins: director, omar.u16, layla.u18, noura.u16");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
