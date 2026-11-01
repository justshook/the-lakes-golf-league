import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { useLiveWeek } from '../hooks/useLiveWeek';
import { currentResultsWeek, weeklyLeaderboard, formatToPar } from '../lib/live-scoring';
import PlayerAccountGate from '../components/PlayerAccountGate';
import { ScorecardTable } from '../components/LiveScorecard';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function WeeklyResultsPage() { const [params] = useSearchParams(); if (params.has('year')) return <Navigate to={`/results/history?${params}`} replace />; return <PlayerAccountGate><WeeklyResults /></PlayerAccountGate>; }
function WeeklyResults() {
  const { weeks, players, isLoading, dataError } = useLeague();
  const { playerId } = usePlayerSession();
  const [params, setParams] = useSearchParams();
  const options = weeks.filter(w => !w.weatherCancelled && ['published', 'finalized'].includes(w.status)).sort((a, b) => b.date.localeCompare(a.date));
  const week = options.find(w => String(w.id) === params.get('week')) || currentResultsWeek(weeks);
  const live = useLiveWeek(week?.id);
  const rows = weeklyLeaderboard({ week, players, ...live });
  const [expanded, setExpanded] = useState(null);
  const ownCard = live.cards.find(c => c.member_ids.some(id => String(id) === String(playerId)));
  const assigned = live.participants.some(p => String(p.player_id) === String(playerId));
  return <div className="mx-auto max-w-5xl space-y-6"><header className="flex items-start justify-between gap-3"><div><p className="page-eyebrow">Across the league</p><h1 className="page-heading mt-1">Weekly results</h1><p className="mt-2 text-sm text-charcoal-600">Follow every round, one hole at a time.</p></div><Button asChild variant="outline" className="rounded-full px-3 text-xs"><Link to="/results/history">My history</Link></Button></header>
    {isLoading ? <p role="status">Loading league weeks…</p> : dataError ? <p role="alert">League results could not load. Please reload the page.</p> : !week ? <Card><CardContent className="p-6">No published rounds yet. Results will appear when your commissioner publishes the first week.</CardContent></Card> : <>
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="results-week" className="mb-2 block text-xs font-semibold">League week</label><select id="results-week" value={String(week.id)} onChange={event => { setParams({ week: event.target.value }); setExpanded(null); }} className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm">{options.map(w => <option key={w.id} value={String(w.id)}>{new Date(`${w.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}{w.label ? ` · ${w.label}` : ''}</option>)}</select></div><Button variant="outline" aria-label="Refresh leaderboard" onClick={live.refresh}><RefreshCw className="size-4" /></Button></div>
    {(assigned || ownCard) && <Button asChild className="w-full sm:w-auto"><Link to={`/round/${week.id}`}>{ownCard?.submitted_at ? 'View my submitted card' : ownCard ? 'Continue my round' : 'Open my round'}</Link></Button>}
    <section className="overflow-hidden rounded-2xl border bg-white" aria-labelledby="weekly-leaderboard-title"><div className="border-b p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="weekly-leaderboard-title" className="font-display text-xl font-semibold">Live leaderboard</h2><span className={`rounded-full px-3 py-1 text-xs ${live.error ? 'bg-amber-100 text-amber-900' : 'bg-forest-900/10 text-forest-900'}`}>{live.loading ? 'Loading…' : live.error ? 'Connection interrupted' : 'Updates every 10 seconds'}</span></div><p className="mt-2 text-xs leading-5 text-charcoal-600">Ranked by net score to par on completed holes. E means even par. {rows.some(r => r.team) && 'Team members share their scramble score.'}</p>{live.updatedAt && <p className="mt-1 text-xs text-charcoal-600">Last updated {live.updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>}</div>
    {live.error && <p role="alert" className="border-b bg-amber-50 p-4 text-sm">Couldn’t refresh scores. {live.updatedAt ? 'These are the last saved results; they may be out of date.' : 'Retry to load the leaderboard.'}</p>}
    {live.loading ? <p role="status" className="p-6 text-sm">Loading live scores…</p> : rows.length === 0 ? <div className="p-8 text-center"><p className="font-semibold">No scores yet</p><p className="mt-2 text-sm text-charcoal-600">Players appear here when the tee sheet is published or their scores are recorded.</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Weekly leaderboard ranked by net score to par</caption><thead className="bg-cream-100 text-left text-[11px] uppercase tracking-wide text-charcoal-600"><tr><th scope="col" className="px-3 py-3">Pos</th><th scope="col" className="px-2 py-3">Player</th><th scope="col" className="px-2 py-3 text-right">Net ±</th><th scope="col" className="px-3 py-3 text-right">Thru</th></tr></thead><tbody>{rows.map(row => <React.Fragment key={row.playerId}><tr className={`border-t ${String(playerId) === row.playerId ? 'bg-forest-900/5' : ''}`}><td className="px-3 py-3 text-xs font-semibold tabular-nums">{row.rank}</td><td className="px-2 py-3"><p className="font-semibold">{row.name}{String(playerId) === row.playerId ? ' (you)' : ''}</p><p className="mt-1 text-[11px] text-charcoal-600">{row.status}{row.team ? ' · Team' : ''}</p><p className="mt-1 text-[11px] text-charcoal-600">Gross {row.gross ?? '—'} · Net {row.net ?? '—'}</p>{row.card && <button className="min-h-11 text-xs font-medium text-forest-900 underline" aria-expanded={expanded === row.playerId} onClick={() => setExpanded(expanded === row.playerId ? null : row.playerId)}>{expanded === row.playerId ? 'Hide card' : 'View card'}</button>}</td><td className="px-2 py-3 text-right text-xl font-semibold tabular-nums text-forest-950">{formatToPar(row.toPar)}</td><td className="px-3 py-3 text-right tabular-nums">{row.status === 'Submitted' ? 'F' : row.thru || '—'}</td></tr>{expanded === row.playerId && row.card && <tr><td colSpan="4" className="border-t p-3"><ScorecardTable card={row.card} /></td></tr>}</React.Fragment>)}</tbody></table></div>}
    </section><p className="text-xs text-charcoal-600">Live scores remain provisional until submitted. F means the round is finished and submitted.</p></>}
  </div>;
}
