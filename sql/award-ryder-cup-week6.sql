-- Award Ryder Cup winnings (Week 6)
-- Splits $1,035 across 23 winning-team players = $45 each
-- Run this in the Supabase SQL Editor.

-- STEP 1 (recommended): Verify every name matches a row in `players`.
-- This should return 23 rows. If fewer, the missing players need to be added
-- (or the names below need to be adjusted to match the DB).
SELECT id, name
FROM players
WHERE name IN (
  'Justin Shook',
  'Chris Gronow',
  'Andy DeTolve',
  'Mike Helms',
  'Bobby Helms',
  'Len Laughland',
  'Cliff Kubek',
  'Steve Oleary',
  'Mike Krause',
  'James Dance',
  'Rob Kinney',
  'Giuseppe Infusino',
  'Gaeton Minella',
  'Christopher Winnie',
  'Troy Holler',
  'Wil Tustin',
  'Jim Fischer',
  'Harry McDonough',
  'Brendan McDermott',
  'Jack Linden',
  'Rob Conley',
  'Donald Burger',
  'Larry Henderson'
)
ORDER BY name;

-- STEP 2: Insert $45 per player into player_money for Week 6, category '1st'
-- (Ryder Cup "Winning Team Split"). If a row already exists for
-- (player_id, week_id, category) it is overwritten with $45.
INSERT INTO player_money (player_id, week_id, category, amount)
SELECT id, 6, '1st', 45
FROM players
WHERE name IN (
  'Justin Shook',
  'Chris Gronow',
  'Andy DeTolve',
  'Mike Helms',
  'Bobby Helms',
  'Len Laughland',
  'Cliff Kubek',
  'Steve Oleary',
  'Mike Krause',
  'James Dance',
  'Rob Kinney',
  'Giuseppe Infusino',
  'Gaeton Minella',
  'Christopher Winnie',
  'Troy Holler',
  'Wil Tustin',
  'Jim Fischer',
  'Harry McDonough',
  'Brendan McDermott',
  'Jack Linden',
  'Rob Conley',
  'Donald Burger',
  'Larry Henderson'
)
ON CONFLICT (player_id, week_id, category) DO UPDATE
SET amount = EXCLUDED.amount;

-- STEP 3: Sanity check — should return 23 rows totaling $1,035.
SELECT p.name, pm.amount
FROM player_money pm
JOIN players p ON p.id = pm.player_id
WHERE pm.week_id = 6 AND pm.category = '1st'
ORDER BY p.name;

SELECT SUM(amount) AS total_awarded
FROM player_money
WHERE week_id = 6 AND category = '1st';
