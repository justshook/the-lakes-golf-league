# Scheduling and weekly teams

`src/lib/scheduler.js` and `src/lib/teams.js` contain pure functions. They do not
write to Supabase, send notifications, reserve course times, or change scores.
Commissioner UI should generate a preview, show warnings, and save the reviewed
tee sheet through the protected persistence layer.

## Generate a preview

```js
import { generateWeekSchedule } from '../lib/scheduler.js';
import { SCHEDULE_FIXED_PARTNER, teeTimes } from '../constants.js';

const result = generateWeekSchedule({
  weekId: selectedWeek.id,
  players,
  weeks,
  weeklyGames,
  teeTimes,
  game: weeklyGames.find(game => game.weekId === selectedWeek.id),
  attendance: attendanceRows,
  fixedPartnerRule: SCHEDULE_FIXED_PARTNER,
  seed: `${selectedWeek.id}:draft-1`,
  lockedSlots: [],
});
```

Returns:

- `teeSheet`: all course-block slots, including empty slots, retaining the legacy
  `{ time, players: [playerIds] }` shape and adding a `teams` array.
- `teams`: the flattened team records for that round.
- `unscheduled`: `{ playerId, name, reason }` for eligible players who cannot fit.
  Reasons are `no_available_tee_time`, `fixed_partner_conflict`, or
  `capacity_or_group_constraint`.
- `warnings`: readable attendance/capacity and incomplete-team notices.
- `diagnostics`: eligible/scheduled counts, nominal capacity, candidate count,
  optimization cost, and seed.

Attendance may be `{ [playerId]: status }` or rows with
`{ player_id, week_id, status }` (camelCase is also accepted). Absent values are
`false`, `absent`, `out`, `unavailable`, `not_playing`, and `declined`. Full-time
members default to participating. Substitutes participate only after an explicit
`true`, `present`, `in`, `available`, `playing`, or `confirmed` value. Date/weekly
cutoffs and authorization belong in the database, not this client-side function.

`availability` is an exact list of permissible course-block times. An empty list
means no permissible time; it does **not** mean unrestricted availability.

## Hard constraints and preferences

Hard constraints:

- Each player is assigned at most once, with at most four players per slot.
- Only available, participating players are assigned.
- Only course-block times are used. An absent player is excluded entirely.
- The existing fixed-partner setting is explicitly passed by the caller. The
  anchor must share a group with at least one allowed player, and all other
  members of the anchor's foursome must be allowed. If this is impossible, the
  anchor remains unscheduled and the conflict is reported.
- Locked slots preserve the full group and their existing team identities.
  Invalid locked slots raise an error before generation.

Soft preferences favor new foursomes, new actual teammates, and less-used tee
times for each individual. Two-person teams consider handicap-sum balance within
each foursome. This is a scheduling preference, not a scoring handicap method.
The chosen groupings are a deterministic heuristic, not a promise of a globally
optimal season. Changing the seed produces another valid candidate.

Capacity-constrained augmenting-path matching prevents flexible players from
blocking otherwise feasible assignments for restricted players. The fixed
anchor's available group combinations are evaluated separately. Candidate
schedules are ranked first by number of assigned players, then by complete-team
formation, and only then by social and time-rotation preference cost. An
availability-valid transfer pass combines partial groups where possible before
teams receive identities. Transfer paths may exchange players through other
unlocked groups while respecting every player's availability. Locked groups are
never changed by this pass; it runs only on generated previews and does not write
published schedules.
The app never relocates a threesome to a different time just to make a sheet look
tidy.

`buildPairingHistory(weeks, weeklyGames, excludedWeekIds)` returns separate
`foursomes`, `teammates`, and `times` maps. Cancelled weeks and explicitly excluded
weeks are omitted. For a multiweek generation batch, append each accepted draft
to the weeks supplied to the next call; that makes the next round consider all
new pairings. Do not also add the same draft to a manual pairing-count map.

## Explicit weekly teams

```js
{
  time: '4:10 PM',
  players: [12, 22, 23, 38],
  teams: [
    { teamId: 'week:4:2-person:12|22', memberIds: [12, 22], teamType: '2-person', status: 'complete' },
    { teamId: 'week:4:2-person:23|38', memberIds: [23, 38], teamType: '2-person', status: 'complete' },
  ],
}
```

Identity depends on the round, team type, and members, not tee time or member
display order. Existing persisted IDs are retained during a withdrawal. A team
left with fewer members becomes `incomplete`, retains its identity, and needs a
commissioner decision. The scheduler never invents a ghost score, solo-player
allowance, or replacement-player payout rule.

`getPlayerTeam({ playerId, weekId, teeSheet, game })` returns
`{ team, teamId, teammates, teamType, slot, isSolo, isThreesome, isIncomplete }`.
It is compatible with the existing `getTeammatesForWeek` consumer shape. New
scoring and payout code should use `teamId` and `memberIds` as their authority.

Old sheets with no `teams` field retain the original positional grouping: first
two and last two for a two-person format, the entire slot for a four-person
format. Exactly two players correctly form a two-person team. Once explicit
teams exist, reordering `players` does not change partners. An unmatched player
in an explicitly assigned slot is flagged as an incomplete individual team,
instead of being silently added to another team.

`attachTeams(...)` assigns teams for new sheets and preserves explicit teams by
default. Deliberate regeneration can set `preserveExisting: false`. Manual edits
must retain each intact team's metadata when moving an entire group. Reject a
move that splits a team between tee times, or use a deliberate team-reassignment
workflow before scores are entered. Format and handicap snapshots for scored
rounds are a persistence/scoring concern; these modules do not retroactively
recalculate existing results.

## Validate manual edits and repair withdrawals

```js
const validation = validateTeeSheet({
  weekId, teeSheet, players, teeTimes, attendance, fixedPartnerRule, game,
});
// { valid, errors: [{ code, message, ...context }], warnings: [string] }

const repair = repairWeekSchedule({
  weekId, teeSheet, players, game,
  absentPlayerIds: [withdrawingPlayerId],
  attendance,
  fixedPartnerRule,
});
```

Manual validation checks unknown/duplicate players, unknown/duplicate times,
capacity, availability, absences, the fixed-partner rule, duplicate team members,
and split teams. Blocking validation errors should prevent saving. Incomplete
teams are warnings so an odd field can still be reviewed; prevent team-score
submission until the commissioner resolves the applicable rules.

Repair removes withdrawing players, preserves every other tee time, and leaves
unaffected groups equivalent to their inputs. It does not automatically recruit
a substitute or reassign another published player. Remaining fixed-partner or
team-size conflicts are returned as warnings. `diagnostics` includes
`affectedTimes`, `movedPlayers: 0`, and `requiresReview`.

## Verification

Run `node --test tests/scheduler.test.mjs`. Tests cover deterministic generation,
hard availability, overcapacity, constrained assignment, attendance, substitutes,
fixed partners, partner-vs-foursome history, team balance, odd fields, stable
identity, minimal withdrawal repair, locked groups, legacy sheets, and manual
validation. The existing roster rehearsal schedules all 45 full-time members
within their listed availability and the configured fixed-partner restriction;
the odd field produces an explicit incomplete-team warning.
