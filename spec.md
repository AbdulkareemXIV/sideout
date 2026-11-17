# Sideout — Project Specification

## Overview

Sideout is the website of Sideout Academy, a volleyball academy. It gives the director, coaches and players one shared system in place of notebooks, group chats and spreadsheets.

The platform covers the full coaching cycle in one place: organizing squads, planning practices, preparing lineups, running live matches, and tracking each player's development over seasons. Every module feeds the next, so data entered once (a rally logged in a match, a drill run in practice) shows up everywhere it matters.

For the demo, the academy is filled with fictional people and a season of history (squads, coaches, players, practices and matches), so the full workflow can be explored without real data.

### Acceptance criteria

- A coach can run a full match in match mode on a phone or tablet, with undo, and the stats appear on player profiles afterwards.
- Rotation faults and overlap errors are detected correctly, verified by automated tests.
- A coach cannot see or modify data from squads they are not assigned to, enforced at the database level.
- The application is publicly deployed with a working demo account for each role.

## Roles and permissions

Sideout has three roles. Each deployment serves one academy, and coach access is limited to the squads they are assigned to.

- **Academy director.** Runs the academy. Creates squads, creates coach accounts and assigns coaches, moves players between squads, defines the skill-rating rubric and sees the director dashboard across all squads.
- **Coach.** Manages the squads they are assigned to: roster and player accounts, lineups, practices, attendance, matches, ratings and notes. A coach can be assigned to more than one squad, and a squad can have more than one coach.
- **Player.** Every player has a read-only account. Players see their own profile, ratings and shared notes, plus their squad's schedule, announcements and saved rotations. They cannot change any data.

### Permission matrix

| Capability | Director | Coach (own squads) | Player |
| --- | --- | --- | --- |
| Create and edit squads | Yes | No | No |
| Create coach accounts and assign coaches | Yes | No | No |
| Create player accounts and manage the roster | Yes | Yes | No |
| Reset passwords | Coaches and players | Own squads' players | No |
| Move a player to another squad | Yes | No | No |
| Define skill-rating rubric | Yes | No | No |
| Rate players and write notes | Yes | Yes | No |
| View ratings and shared notes | Yes | Yes | Own only |
| View private coach notes | Yes | Yes | No |
| Create lineups and rotations | Yes | Yes | View only |
| Run match mode | Yes | Yes | No |
| Add drills to the library | Yes | Yes | No |
| Plan practices and take attendance | Yes | Yes | No |
| Schedule events and book courts | Yes | Yes | No |
| View schedule | Yes | Yes | Own squad |
| Post announcements | Academy-wide | Own squads | No |
| View director dashboard | Yes | No | No |

Coach notes come in two kinds: **shared notes**, visible to the player, and **private notes**, visible only to coaches and the director.

## Modules

Sideout is made of seven modules.

### 1. Academy and squad structure

The foundation every other module builds on.

- Each deployment serves one academy. The academy and its director account are created by the seed script; there is no academy sign-up.
- The academy has a name, logo and settings: current season dates, default match format and default points per set.
- Squads are grouped by age or level, for example U14, U16, U18 and Senior.
- Players have a profile record (name, date of birth, jersey number, primary and secondary positions, dominant hand, height) and belong to exactly one squad at a time.
- Every player has a read-only account linked to their profile (see Accounts below).
- Squad membership is stored as a history: when the director moves a player from U16 to U18, the old membership is closed with an end date and a new one starts. Nothing is lost.
- Only the director moves players between squads.

**Accounts.** Accounts are created inside Sideout; there is no sign-up and no email.

- The director creates coach accounts and can create player accounts for any squad. Coaches create player accounts only for squads they coach.
- An account has a username (for example `sara.u16`) and a temporary password, shown once to the person who created it.
- On first login, the user must set a new password.
- The director can reset any coach or player password; coaches can reset passwords for players in their squads.
- Supabase Auth expects an email address, so each username maps to an internal address (`username@sideout.local`). Users never see it, and no messages are ever sent to it.

### 2. Lineup and rotation planner

An interactive court for building and checking lineups.

- The coach picks an offensive system and drags six players onto positions 1 to 6. An optional libero is chosen separately.
- Supported systems: **5-1** (one setter in every rotation, the most common system), **6-2** (two setters who each set from the back row, keeping three hitters in the front row) and **4-2** (two setters who set from the front row, simpler and common with younger squads).
- The system decides who sets in each rotation and is shown on the court. Rotation and overlap rules are the same for every system.
- The planner steps through all six rotations, showing where each player stands at the moment of serve.
- For each rotation it shows both the **serve** and **receive** formations. Coaches can drag players into custom receive formations, and the overlap checker validates them live. Serve formations are shown for reference only, because the serving team is not checked (see Volleyball domain rules).
- Overlap violations are highlighted on the court with a plain explanation, for example "Position 3 must be right of position 4."
- Saved lineups are named ("Starting lineup vs Falcons U16") and can be selected as the starting rotation when a match begins.
- Players can open their squad's saved rotations in view-only mode as a learning aid.

### 3. Match mode

One screen that combines a digital scoresheet and a live stat tracker. Designed for a phone or tablet held courtside.

**Setup.** The coach selects the squad, the opponent (an outside team by name, or another squad in the academy for internal scrimmages, logged from one squad's side with the other treated as the opponent), match format (best of 3 or 5), points per set (25 by default, or shorter for youth matches), the starting lineup and which team serves first.

**Scoresheet functions.**

- Running score per set, set wins, and automatic set and match end (25 points by default, win by 2; deciding set to 15).
- Automatic rotation when the team wins back the serve (a sideout).
- Serving player shown at all times; serving out of order is blocked.
- Timeouts (2 per set per team) and substitutions (6 per set) with limits enforced.
- A substitution is validated: the substitute can only return for the player they replaced.

**Stat functions.**

- The six on-court players appear as large tap targets; the bench is hidden until needed. Block actions are offered only for the three front-row players.
- Logging a stat is two taps: player, then action. Actions include serve (ace, in, error), attack (kill, in play, error, blocked), block (solo, assist, error), dig, reception (rated 0 to 3), set (assist, error) and other faults.
- Point-ending actions update the score automatically: an ace or kill scores for the team; a serve or attack error scores for the opponent.
- Opponent points with no logged cause are entered with a single "Opponent point" button.
- **Undo** reverses the last action, including any score and rotation changes it caused. Undo works any number of steps back.

**After the match.** A match report shows the final score, per-set scores, team totals and a per-player stat table. Stats flow automatically into player profiles and the director dashboard.

### 4. Player development profiles

The central record of each player's growth across seasons and squads.

- **Rubric.** The director defines skill categories (for example serving, passing, setting, attacking, blocking, defense, court awareness and attitude) and a 1 to 10 scale with a written description for key levels, so a 7 means the same thing for every coach.
- **Ratings.** Coaches record a rating session per player (for example at the start, middle and end of each season). Each session stores scores for every category and the coach who rated.
- **Notes.** Shared and private coach notes, dated and signed.
- **Match stats.** Totals and averages pulled from match mode, with derived metrics such as hitting efficiency.
- **Progress charts.** Rating trends per category over time, stat trends across matches, and the player's squad history.

### 5. Drill library and practice planner

- **Library.** Drills have a name, description, skill focus, level (beginner, intermediate, advanced), duration, minimum players, equipment and an optional diagram image or video link.
- Coaches and the director add drills directly to the shared library. A drill can be edited or deleted by the person who added it or by the director. Search and filter by skill, level and duration.
- **Practice plans.** A coach builds a session for a squad by ordering drills into blocks (warm-up, technical, game play, cool-down). Total time is calculated automatically.
- **Attendance.** For each practice the coach records each player as present, late, absent (excused) or absent (unexcused).

### 6. Schedule and announcements

- An academy-wide calendar with month, week and list views, filterable by squad. Players see their own squad's events.
- Event types: practice (linked to a practice plan), match (opens in match mode), tournament and other.
- **Courts.** The academy defines its courts. Each home event books a court for a time range (away matches and tournaments have no court), and overlapping bookings on the same court are rejected with a clear message showing the conflicting event.
- **Announcements.** Posted academy-wide by the director or to specific squads by their coaches, with optional pinning.

### 7. Director dashboard

A read-only overview across all squads.

- Attendance rate per squad, with trend over the season.
- Match results per squad (won, lost, set ratio).
- Average rating change per squad and per skill category.
- Players flagged for review: low attendance or falling ratings.
- Coach activity: last practice logged, last ratings session, matches recorded.

## Core workflows

These journeys show how the modules connect. Each one should work end to end in the deployed demo.

### Setting up an academy

1. The seed script creates the academy and the director account.
2. The director sets the season dates, courts and the skill-rating rubric (a default rubric is provided).
3. The director creates squads, creates coach accounts and assigns each coach to one or more squads.
4. Coaches add players to their squads and create a read-only account for each, passing on the temporary password in person.

### Planning and running a practice

1. A coach schedules a practice for their squad, choosing a court and time. The system rejects it if the court is already booked.
2. The coach builds a practice plan from library drills and attaches it to the event.
3. Players see the practice on their schedule.
4. At practice, the coach opens the event and records attendance.
5. Attendance updates the player profiles and the director dashboard.

### Preparing and playing a match

1. A coach schedules a match against an opponent, or a scrimmage against another squad.
2. In the rotation planner, the coach builds a lineup, checks all six rotations for overlap faults, and saves it.
3. On match day, the coach opens the event in match mode and selects the saved lineup as the starting rotation.
4. During play, the coach logs each rally. Score, rotation and serving player update automatically; mistakes are fixed with undo.
5. At the end, the match report is generated and stats appear on each player's profile.

### Evaluating and moving a player

1. At the end of a period, a coach records a rating session for a player using the academy rubric.
2. The coach reviews the player's progress charts, match stats, attendance and notes.
3. If the player is ready for a higher squad, the coach tells the director.
4. The director moves the player to the new squad; their full history is kept.

## Volleyball domain rules

The rules engine follows standard indoor volleyball rules (FIVB-style), with a few deliberate simplifications. All rules live in one pure, framework-free module so they can be unit-tested in isolation.

### Court positions

Positions are numbered from the team's own perspective, facing the net:

| Position | Row | Location |
| --- | --- | --- |
| 4 | Front | Left |
| 3 | Front | Middle |
| 2 | Front | Right |
| 5 | Back | Left |
| 6 | Back | Middle |
| 1 | Back | Right (serving position) |

### Rotation

- When a team wins a rally while receiving, it gains the serve and rotates one position clockwise: 2 to 1, 1 to 6, 6 to 5, 5 to 4, 4 to 3, 3 to 2.
- The player in position 1 after rotating serves. A team that wins a rally while serving does not rotate, and the same player serves again.
- The rotation order fixed by the starting lineup must be kept for the whole set. Serving out of order is blocked in match mode.

### Overlap rule

Under the current FIVB rules (2025 to 2028), only the **receiving team** must be in correct rotational positions at the moment of serve. The serving team may stand anywhere, so it is never checked. Model each receiving player as a point with `x` (distance from the left sideline) and `y` (distance from the net). The rules are:

- **Front to back:** each back-row player must be further from the net than their front-row counterpart: y(5) > y(4), y(6) > y(3), y(1) > y(2).
- **Left to right, front row:** x(4) < x(3) < x(2).
- **Left to right, back row:** x(5) < x(6) < x(1).
- There is no diagonal overlap: only the pairs above are compared.
- After the serve is contacted, players may move anywhere, subject to the row restrictions below.

The checker returns a list of violations, each naming the two positions involved and the broken relation, so the interface can highlight them and explain the error in plain words.

### Front-row and back-row restrictions

Once the serve is made, a player's row comes from their rotational position, not where they stand. Serving-team players who stood out of position return to these restrictions as soon as the serve crosses the net.

- Only front-row players may complete a block. Match mode offers the block action only for the three front-row players.
- A back-row player may attack at any height from behind the attack line. From inside the front zone, a back-row player may attack only if part of the ball is below the top of the net. Match mode cannot know the ball's height, so back-row attacks are always allowed.

### Scoring and sets

- Rally scoring: every rally awards one point.
- Sets are played to 25 points and must be won by 2. The deciding set (set 3 in best of 3, set 5 in best of 5) is played to 15, won by 2.
- The match ends when a team wins the majority of sets.

### Substitutions and timeouts

- Each team has 6 substitutions and 2 timeouts per set.
- A starting player may leave the set once and may return once, only in place of the player who replaced them.
- A substitute may enter once per set and may only be replaced by the starter they replaced.

### Points per set

Sets are played to 25 points by default. Youth matches often use shorter sets, so the coach can set the points per set when starting a match (for example 21 or 15). The deciding set stays at 15. Substitution and timeout limits are fixed.

### Deliberate simplifications

- **Libero.** The libero appears in match mode as an extra tap target for stats only. It does not change the rotation, and libero replacements are not tracked.
- **Exceptional and injury substitutions, sanctions and protests** are out of scope.
- **Opponent stats** are not tracked individually; opponent points are recorded only as team totals.

## Data model

The database is relational (PostgreSQL). Each deployment holds one academy, so tables do not need an academy identifier. Matches are the exception to plain tables: their state is stored as an append-only log of events.

### Entities

| Entity | Module | Key fields |
| --- | --- | --- |
| academy | 1 | a single row: name, logo\_url, season\_start, season\_end, default\_best\_of, default\_set\_points |
| profiles | 1 | id (auth user id), role (director, coach, player), username, full\_name, must\_change\_password, preferred\_language |
| squads | 1 | name, age\_group |
| coach\_assignments | 1 | coach\_id, squad\_id |
| players | 1 | user\_id (the player's read-only account), full\_name, date\_of\_birth, jersey\_number, primary\_position, secondary\_position, dominant\_hand, height\_cm |
| squad\_memberships | 1 | player\_id, squad\_id, start\_date, end\_date (null while current) |
| lineups | 2 | squad\_id, name, system (5-1, 6-2, 4-2), positions (json: position number to player id), setter\_ids, libero\_id, receive\_formations (json) |
| matches | 3 | squad\_id, event\_id, opponent\_name or opponent\_squad\_id, best\_of (3 or 5), set\_points, starting\_lineup\_id, first\_serve, status |
| match\_events | 3 | id, match\_id, seq (unique per match), type, payload (json), created\_by, created\_at |
| match\_player\_totals | 3 | match\_id, player\_id, totals (json of stat counts), written when the match ends |
| rubric\_categories | 4 | name, description, level\_descriptions (json), sort\_order |
| rating\_sessions | 4 | player\_id, coach\_id, rated\_on |
| ratings | 4 | session\_id, category\_id, score (1 to 10) |
| notes | 4 | player\_id, author\_id, visibility (shared, private), body, created\_at |
| drills | 5 | name, description, skill\_focus, level, duration\_min, min\_players, equipment, media\_url, created\_by |
| practice\_plans | 5 | squad\_id, name, created\_by |
| practice\_plan\_items | 5 | plan\_id, drill\_id, block (warm-up, technical, game, cool-down), sort\_order, duration\_min |
| attendance | 5 | event\_id, player\_id, status (present, late, excused, unexcused) |
| courts | 6 | name |
| events | 6 | squad\_id, type (practice, match, tournament, other), court\_id, starts\_at, ends\_at, practice\_plan\_id |
| announcements | 6 | squad\_id (null for academy-wide), author\_id, body, pinned, created\_at |

Court conflicts are prevented in the database itself with an exclusion constraint on `events`: no two rows may share a `court_id` with overlapping `[starts_at, ends_at)` ranges.

### Match event log

A match's score, rotation, serving player, substitutions and stats are never stored directly. They are computed by replaying the match's events in `seq` order. Each event has this shape:

```json
{
  "id": "8f3c2a1e-...",
  "match_id": "c41d...",
  "seq": 57,
  "type": "stat",
  "payload": { "player_id": "p_07", "action": "attack", "result": "kill" },
  "created_by": "u_coach_12",
  "created_at": "2026-11-14T18:42:15Z"
}
```

Event types:

- `match_started`: match format, points per set, starting lineup, first serve.
- `stat`: a player action. Point-ending results (ace, kill, block point, serve error, attack error) also award the rally.
- `opponent_point`: a point to the opponent with no logged cause.
- `substitution`: player out, player in.
- `timeout`: which team called it.
- `undo`: the id of the event it cancels. Undo is itself an event, so the log stays append-only and fully auditable.

Set ends, rotations and match end are derived during replay, never stored.

When a match ends, per-player totals are written once to `match_player_totals`, so profiles, reports and the dashboard query stats directly instead of replaying every match.

## Architecture and stack

Sideout is a Next.js application hosted on Vercel, backed by Supabase for the database and authentication. Every request passes through the server, and the database itself enforces who can see and change what. Matches are stored as an append-only log of events that is replayed to rebuild the match state.

Management screens and match mode both talk to the Next.js server. The server validates every write and passes it to Supabase, where row-level security decides what each user may touch. The shared domain module holds the volleyball rules and analytics, so the browser and server always agree.

### Technology choices

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), React, TypeScript | One codebase for interface and server logic; strong typing across both |
| Styling and UI | Tailwind CSS, shadcn/ui, next-intl | Fast, consistent, accessible components; English and Arabic translations with right-to-left support |
| Court interactions | dnd-kit | Touch-friendly drag and drop for the rotation planner |
| Charts | Recharts | Progress and stat charts on profiles and the dashboard |
| Database and auth | Supabase (PostgreSQL, Auth, RLS) | Relational data, built-in auth and database-level access control |
| Validation | Zod | One schema validates input on client and server |
| Testing | Vitest | Fast tests for the domain logic and access rules |
| Hosting and CI/CD | Vercel, GitHub Actions | Automatic deploys from GitHub; tests run on every push |

### Match log and replay

- The current state of a match is never stored. It is the result of a pure function: `replay(events) → matchState`, where match state holds the score, set, rotation, serving player, substitutions, timeouts and stat totals.
- The rules engine is applied during replay: each event is validated against the state before it, and illegal events (a seventh substitution, serving out of order) are rejected before they are recorded.
- Undo appends an `undo` event; replay skips the cancelled event. This makes multi-step undo trivial and keeps a full audit trail.
- Because replay is deterministic, the same log always produces the same state on any device, which makes the logic easy to test.

### Match log constraints

- **Every event type must be defined precisely up front**, including exactly how it changes the match state. This is most of the work, and it is where the rules engine lives.
- **Stats across matches need a summary table.** Replaying every match to build a season profile is wasteful, so per-player totals are written to `match_player_totals` when a match ends. Correcting a finished match means recalculating its totals.
- **Changing an event's shape later is awkward.** Old events keep their old payloads, so replay must handle older shapes. Keep payloads small and settle them early.
- **Undo needs clear rules.** Undo cancels the most recent event that is not already cancelled. Undoing a substitution or a set-ending point restores the state before it, which replay handles automatically.
- **One scorer at a time.** Two devices appending at once would collide on `seq`; the unique constraint on (match\_id, seq) rejects the second write. A match has one active scorer, and another coach can take over.

### Data access pattern

- Pages read data on the server using the signed-in user's session, so row-level security applies to every query.
- Writes go through server actions that validate input with Zod before touching the database.
- Match events are appended through a server action that checks each one against the current match state before inserting it.
- The service-role (admin) key is used only by the seed script, migrations and the server-only account-management action. It never reaches the browser.

## Security and access control

Access rules are enforced in the database, not only in the interface. Hiding a button is a convenience; the database refusing the query is the guarantee.

### Row-level security basics

- Row-level security (RLS) is enabled on every table.
- Helper SQL functions keep policies readable, for example `app_role()` and `coaches_squad(squad_id)`.

### Role and squad scoping

- Directors can read and write everything.
- Coaches can write squad-scoped rows (players and their accounts, lineups, matches, practices, attendance, ratings, notes) only where `coaches_squad(squad_id)` is true.
- Players can read their own player record, ratings and shared notes, plus their squad's events, announcements and saved lineups. They have no write access.
- Private notes have a policy that excludes the player role entirely.
- `match_events` can only be inserted, never updated or deleted, by coaches of that squad. Undo is an inserted event.

### Authentication

- Username and password sign-in. The director creates coach and player accounts; coaches create player accounts for their own squads. No emails are sent. Public sign-ups and email confirmation are turned off in Supabase Auth.
- Users never choose their own role or squad; both are set by whoever creates the account. Account creation and password resets run in one server-only action that checks the caller's role first.

### Privacy for young players

- Player accounts are read-only: players can view their own data but never change anything.
- Collect the minimum data needed. No email addresses, photos, phone numbers or home addresses are required.
- Players never see other players' ratings or notes.
- The public demo uses only fictional data.

### Testing access rules

RLS policies are tested automatically: the test suite signs in as a director, a coach of squad A, a coach of squad B and a player, and asserts which queries succeed and which are refused.

## Analytics definitions

All metrics are computed from the match event log, attendance records and ratings. Metrics live in one tested module so profiles, reports and the dashboard always agree.

### Player match metrics

**Hitting efficiency**, the standard measure of attacking quality, where K is kills, E is attack errors (including being blocked) and TA is total attack attempts:

```latex
\text{Hitting efficiency} = \frac{K - E}{TA}
```

**Reception average**, using the 0 to 3 pass rating (3 is a perfect pass):

```latex
\text{Reception average} = \frac{\sum \text{pass ratings}}{\text{reception attempts}}
```

**Points scored**, counting a block assist as half a point:

```latex
\text{Points} = \text{kills} + \text{aces} + \text{solo blocks} + 0.5 \times \text{block assists}
```

| Metric | Definition |
| --- | --- |
| Kill percentage | kills ÷ attack attempts |
| Ace percentage | aces ÷ serve attempts |
| Serve error percentage | serve errors ÷ serve attempts |
| Perfect pass percentage | receptions rated 3 ÷ reception attempts |
| Per-set averages | any total ÷ sets played |

### Team metrics

| Metric | Definition |
| --- | --- |
| Sideout percentage | rallies won while receiving ÷ rallies received |
| Point-scoring percentage | rallies won while serving ÷ rallies served |
| Set ratio | sets won ÷ sets lost |
| Unforced error share | opponent points from own errors ÷ total opponent points |

### Development and attendance metrics

| Metric | Definition |
| --- | --- |
| Attendance rate | (present + late) ÷ scheduled practices |
| Rating change | latest rating minus first rating in the season, per category |
| Squad rating change | average of players' rating changes, per category |

A player with fewer than 10 attempts in a category shows the metric greyed out, to avoid misleading percentages from tiny samples.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Responsiveness | Logging a stat takes two taps and updates the score and rotation on screen straight away. |
| Devices | Match mode is designed for phones and tablets in portrait and landscape, with touch targets at least 48 px. Management screens work on desktop and mobile. Times are stored in UTC and shown in the Asia/Riyadh time zone. |
| Languages | The interface is built with an internationalization layer. English and Arabic are both supported from the start, with full right-to-left layout for Arabic. Arabic text is drafted with the AI and reviewed by a native speaker. Translations use next-intl. |
| Accessibility | Sufficient color contrast, keyboard navigation on desktop, and court diagrams that never rely on color alone (positions are also numbered). |
| Reliability | Every write is validated on the server. Replaying the same event log always produces the same result. |
| Performance | Main pages load in under 2 seconds on a typical 4G connection. Profiles and dashboards use precomputed or cached aggregates when data grows. |
| Auditability | Match events and ratings keep who made them and when. |

## Interface and user experience

Sideout should feel like a finished product, not a prototype. Simplicity applies to code and scope, never to how the site feels to use. These rules apply to every screen, including screens the modules do not describe in detail.

### Visual identity

- Colors: deep navy `#0d1726`, sand `#f2ede3` as the light background, and court orange `#f28a2e` as the accent for primary actions, plus neutral grays for borders and secondary text. Text and controls meet WCAG AA contrast.
- Fonts: Oswald for headings and scores, Public Sans for body text, and IBM Plex Sans Arabic for all Arabic text.
- Light theme only. Spacing, corners and shadows come from the shared shadcn/ui theme tokens, never one-off styles.
- A simple Sideout wordmark appears in the header and on the sign-in page.

### Layout and navigation

- Signed-in users get one app shell: a header with the academy name, the user's name and role, the language switch and sign-out, and a navigation menu listing only the sections their role can reach, with the current section highlighted. On phones the menu collapses behind a menu button.
- Every page has a clear title. Pages below the top level show breadcrumbs (for example Squads › U16 › Sara) and a back link to the parent page.
- After sign-in, each role lands on a sensible home page: the director on the academy overview (the squads list until the dashboard exists), a coach on their squads, a player on their own profile.
- Unknown or refused addresses show a friendly page with a link home, never a raw error.

### Feedback and states

- Every form field has a label; required fields are marked; validation messages appear next to the field in the user's language; the submit button is disabled and shows progress while saving.
- Successes and failures show a short toast, for example "Player added".
- Destructive or irreversible actions (deleting, moving a player, resetting a password) ask for confirmation in a dialog that says exactly what will happen.
- Empty lists explain what belongs there and offer the next action, for example "No players yet. Add the first player."
- Pages show loading skeletons instead of blank screens.
- Temporary passwords appear in a dialog with a copy button and a note that they will not be shown again.

### Lists and data

- Lists longer than one screen have search, plus filters where useful (for example by position). Tables become stacked cards on phones.
- Names link to their detail pages.
- Dates, times and numbers are formatted for the active language.

### Accessibility

- Everything works with a keyboard, focus is always visible, and dialogs trap focus and close with Escape.
- Touch targets are at least 44 px.

## Build order

Sideout is built in order of importance, so the most valuable parts exist first. This is a guide for priorities, not a schedule.

1. **Foundation:** sign-in, English and Arabic, squads and roster, account creation, moving players, access rules and tests, local setup, deployment.
2. **Match core:** rules engine with tests, rotation planner, match mode with undo, match reports.
3. **Development:** rubric and ratings, coach notes, analytics, progress charts.
4. **Operations:** drills and practice plans, attendance, schedule and courts, announcements, director dashboard.

Match mode and the rotation planner come early because much of the platform builds on them. Later steps can be reduced if time runs short.

## Testing, deployment and demo

Testing effort is concentrated where bugs would be most costly: the rules engine, the match replay, analytics and access control.

### Test layers

| Layer | Tool | What it covers |
| --- | --- | --- |
| Unit | Vitest | Rotation, receiving-team overlap checker, scoring, substitutions, replay, undo, analytics formulas, court conflict logic |
| Database | Vitest against a local Supabase instance | RLS policies for each role, the court exclusion constraint, and account permissions (a coach cannot create coach accounts or accounts for other squads) |

The rules engine should have test cases drawn from real situations: every legal and illegal overlap pair, a set reaching 24-24 then 26-24, a deciding set ending at 15, a substitute trying to replace the wrong player, and undoing a point that caused a rotation.

### Environments

- **Local:** Next.js dev server with a local Supabase instance via the Supabase CLI.
- **Preview:** every pull request deploys a preview on Vercel.
- **Production:** the main branch deploys automatically to the public URL, connected to a hosted Supabase project.

### CI/CD pipeline

On every push, GitHub Actions runs type checking, linting, and the unit and database tests. Database changes are managed as versioned SQL migrations.

### Demo data and accounts

A seed script creates Sideout Academy with fictional people and a season of history: four squads (U14, U16, U18 and Senior), four coaches, about 50 players, practices with attendance, rating sessions, and around ten completed matches with full event logs. It also creates four demo accounts:

| Account | What it shows |
| --- | --- |
| Director | The whole academy |
| Coach of U16 | A coach's view |
| Coach of U18 | That coaches cannot see each other's squads |
| A U16 player | The read-only player view |

Demo passwords are read from environment variables, never hard-coded. Locally, `.env.example` supplies simple defaults, which the README lists. The live site uses different passwords, set in Vercel and shared privately. Re-running the seed restores the original data.

### Demo tour

The README includes this tour, about 10 to 15 minutes:

1. **As the director:** open the dashboard; move a player from U16 to U18 and see their history carry over; create a player account and see the temporary password; post an academy-wide announcement.
2. **As the U16 coach:** confirm only U16 is visible and U18 data is refused; build a lineup, step through the rotations, and drag a receiving player out of position to see the overlap warning; try to book a court that is already booked; build a practice plan; play a match in match mode (score, rotation and server update automatically, undo fixes mistakes, a seventh substitution is blocked, sets end at 25 win by 2, a report appears at the end); rate a player and write one shared and one private note.
3. **As the U16 player:** see the new match stats and the shared note on their profile; confirm the private note is hidden and nothing can be edited.
4. **Anywhere:** switch to Arabic and see the layout flip to right-to-left.

### Local setup

Prerequisites are Node.js (LTS), Docker Desktop and Git. The Supabase CLI is a dev dependency, run through `npx supabase`. The Node version is pinned with `.nvmrc` and the `engines` field, and `package-lock.json` is committed.

`npm run setup` starts local Supabase, applies the migrations, runs the seed, and writes `.env.local` from the local Supabase details. Running the project is then:

```
git clone <repo>
cd sideout
npm install
npm run setup
npm run dev
```

The README follows this order: a two-sentence description of Sideout, a short feature list and the tech stack; live demo link; prerequisites; the commands above; local demo logins; how to run the tests (`npm test`); the demo tour; troubleshooting (Docker not running, ports 54321 to 54324 already in use, and `npx supabase stop` followed by setup again).

## Guide for the AI developer

This section is written for the AI model assisting with development. This document is the source of truth: when a request conflicts with it, point out the conflict before writing code.

### How to work

1. Work one module at a time, following the build order. Do not build ahead, and do not add features this document does not describe.
2. Before writing code for a module, restate its requirements from this document and list any open questions.
3. For domain logic (rules engine, replay, analytics), write the tests first, then the implementation.
4. Keep every change small enough to review, and explain what changed and why. Use one branch per module and merge it when the module works.
5. Never invent volleyball rules. If a rule is not covered in the Volleyball domain rules section, ask.
6. When a decision changes this specification, say so explicitly so the document can be updated.
7. Prefer the simplest solution that meets the requirement. Do not add libraries, abstractions or configuration this document does not call for. Simplicity applies to code, dependencies and scope, never to usability: every screen meets the Interface and user experience section, even where a module does not spell it out.

### Project structure

```
/app                 Next.js routes (App Router), grouped by role and module
/components          Shared UI components
/features            One folder per module: squads, lineups, match, profiles, practice, schedule, dashboard
/domain              Pure TypeScript: rules engine, match replay, analytics. No React, no database imports.
/lib                 Supabase clients, auth helpers, i18n
/supabase/migrations Versioned SQL migrations, including RLS policies
/supabase/seed       Demo academy seed script
/tests               Unit and database tests
```

### Conventions

- TypeScript in strict mode everywhere. No `any`.
- Code in `/domain` is pure: functions take data and return data, with no side effects, network or database access.
- Validate all inputs at the boundary with Zod schemas, shared between client and server.
- Database access only through typed Supabase clients generated from the schema.
- Every new table gets RLS enabled and policies in the same migration, plus a database test. Only the account-management server action may use the service-role key, and only on the server.
- **Never commit secrets.** Supabase keys live in `.env.local` (listed in `.gitignore`) and in Vercel's environment settings. Commit only a `.env.example` with empty values.
- **English and Arabic from the first commit.** All user-facing text goes through the i18n layer, never hard-coded. Layout uses logical CSS properties (start and end, not left and right) so right-to-left works on every screen.
- Use consistent names for volleyball terms in code and interface alike.

### Definition of done for a feature

- Requirements in this document are met.
- Unit tests cover the logic; database tests cover any new access rules.
- Type checking, linting and all tests pass in CI.
- The feature works on a phone-sized screen, in both English and Arabic, and meets the Interface and user experience section.
- The seed data exercises the feature so it can be demonstrated.
