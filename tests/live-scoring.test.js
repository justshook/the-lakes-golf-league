import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateStrokes, summarizeCard, weeklyLeaderboard, currentResultsWeek, chicagoToday } from '../src/lib/live-scoring.js';
import { courseHoles } from '../src/constants.js';
const holes = courseHoles.slice(0, 9);
const card = (scores, handicap = 4) => ({ week_id: '1', entry_key: 'player:1', member_ids: [1], holes, gross_scores: scores, handicap_used: handicap });
test('frozen strokes distribute hardest first and preserve full allowance', () => {
 assert.deepEqual(allocateStrokes(4, holes), [1,1,0,1,0,1,0,0,0]);
 assert.deepEqual(allocateStrokes(13, holes), [2,2,1,2,1,2,1,1,1]);
 assert.deepEqual(allocateStrokes(-2, holes), [0,0,-1,0,0,0,0,-1,0]);
 for (let h = -20; h <= 60; h++) assert.equal(allocateStrokes(h, holes).reduce((a,b) => a+b,0), h);
});
test('net to par subtracts only strokes on holes actually played', () => {
 assert.deepEqual(summarizeCard(card([5,null,null,null,null,null,null,null,null])), { gross: 5, net: 4, toPar: 0, thru: 1, strokes: [1,1,0,1,0,1,0,0,0], complete: false });
 assert.equal(summarizeCard(card(holes.map(h => h.par))).toPar, -4);
 assert.equal(summarizeCard(card(Array(9).fill(null))).toPar, null);
});
test('live ranking includes nonstarters, preserves ties and prefers official scores', () => {
 const rows = weeklyLeaderboard({ week: { id:'1', nineHoles:'front' }, players: [1,2,3,4].map(id => ({ id, name:`Player ${id}` })), participants: [1,2,3,4].map(player_id => ({ player_id, week_id:'1' })), cards: [card([5,null,null,null,null,null,null,null,null]), { ...card([4,5,3,4,3,4,4,3,4]), member_ids:[2], handicap_used:0 }], scores: [{ player_id:3, week_id:1, gross_score:38, net_score:33 }] });
 assert.deepEqual(rows.map(r => [r.playerId,r.rank,r.toPar]), [['3','1',-1],['2','T2',0],['1','T2',0],['4','—',null]]);
 assert.equal(rows[0].status,'Submitted');
});
test('current league week stays on Monday’s round through Sunday, in Chicago', () => {
 const weeks = ['2026-10-26','2026-11-02','2026-11-09'].map(date => ({id:date,date,status:'published'}));
 assert.equal(currentResultsWeek(weeks, '2026-11-01').id,'2026-10-26');
 assert.equal(currentResultsWeek(weeks, '2026-11-02').id,'2026-11-02');
 assert.equal(currentResultsWeek(weeks, '2026-10-01').id,'2026-10-26');
 assert.equal(currentResultsWeek(weeks, '2026-12-01').id,'2026-11-09');
 assert.equal(chicagoToday(new Date('2026-11-02T02:00:00Z')), '2026-11-01');
});
