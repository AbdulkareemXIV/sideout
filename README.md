# Sideout

The website of Sideout Academy, a volleyball academy. Directors, coaches and
players each sign in to their own view: squads and rosters, player accounts,
lineups and rotations, practices and court bookings, match scoring and player
development.

## Features

- Accounts for three roles — director, coach, player — with password changes on
  first sign-in and password resets by the director or a coach.
- Squads with rosters, coach assignments, and player moves that keep their
  history.
- Player records: position, dominant hand, height, jersey number.
- English and Arabic, with the layout flipping to right-to-left.

## Tech stack

Next.js (App Router) with TypeScript, Supabase (Postgres, Auth and row-level
security), Tailwind CSS and shadcn/ui, next-intl, Zod, Vitest, deployed on
Vercel.

## Live demo

Not deployed yet. The link is added here when the site goes live.

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- Docker Desktop, running
- Git

## Running it locally

```
git clone <repo>
cd sideout
npm install
npm run setup
npm run dev
```

`npm run setup` starts local Supabase, applies the migrations, writes
`.env.local` from the local stack and seeds the demo academy. Then open
<http://localhost:3000>.

## Demo logins

| Username | Password | What it shows |
| --- | --- | --- |
| `director` | `Demo1234!` | The whole academy |
| `omar.u16` | `Demo1234!` | A coach's view |
| `layla.u18` | `Demo1234!` | That coaches cannot see each other's squads |
| `noura.u16` | `Demo1234!` | The read-only player view |

The four demo accounts sign in directly. The other seeded players start on
`Demo1234!` too and are asked to choose a new password on their first sign-in.

Passwords come from `DEMO_*_PASSWORD` in `.env.local`; `.env.example` holds the
local defaults. The live site uses different values, set in Vercel.

## Tests

```
npm test
```

The database tests run against local Supabase, so run `npm run setup` once first.
`npm run typecheck`, `npm run lint` and `npm run build` are the other gates.

## Demo tour

As the director (`director`):

1. Open **Squads** and pick U16.
2. Move a player to U18 — the player leaves the U16 roster and appears in U18.
3. Add a player, then create an account for **Ola Mahmoud** or **Zain Abbas**
   (the two U16 players seeded without one) and note the temporary password.

As the U16 coach (`omar.u16`):

1. Only U16 is listed; U18 does not appear anywhere.
2. Add a player and create an account for one of your players.

As the U16 player (`noura.u16`):

1. The squad and roster are visible and read-only.

Anywhere:

1. Switch the language to Arabic and the layout flips to right-to-left.

## Useful commands

- `npm run db:seed` — restore the demo academy to its starting state.
- `npm run db:types` — regenerate `lib/database.types.ts` after a migration.
- `npx supabase status` — the local URLs, keys and Studio address.

## Troubleshooting

**Docker is not running.** Start Docker Desktop, wait for it to finish starting,
then run `npm run setup` again.

**Ports 54321 to 54324 are already in use.** Another Supabase project is running.
Stop it with `npx supabase stop` in that project, or stop this one and start it
again.

**The data looks wrong or half-seeded.** Run `npx supabase stop`, then
`npm run setup` again: it resets the database and reseeds from scratch.
