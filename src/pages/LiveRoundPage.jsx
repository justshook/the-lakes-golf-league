import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { useLiveWeek } from '../hooks/useLiveWeek';
import { chicagoToday } from '../lib/live-scoring';
import LiveScorecard from '../components/LiveScorecard';
import PlayerAccountGate from '../components/PlayerAccountGate';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function LiveRoundPage() { return <PlayerAccountGate><RoundContent /></PlayerAccountGate>; }
function RoundContent() {
  const { weekId } = useParams();
  const { weeks, weeklyGames, isLoading } = useLeague();
  const { playerId, isDemo, attendance } = usePlayerSession();
  const live = useLiveWeek(weekId);
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const week = weeks.find(w => String(w.id) === weekId);
  const game = weeklyGames.find(g => String(g.weekId) === weekId);
  const card = live.cards.find(c => c.member_ids.some(id => String(id) === String(playerId)));
  const participant = live.participants.find(p => String(p.player_id) === String(playerId));
  const recorded = live.scores.some(s => String(s.player_id) === String(playerId));
  const open = week?.status === 'published' && week.scoreSubmissionEnabled !== false && week.isScoringSupported && (isDemo || week.date <= chicagoToday()) && attendance[weekId]?.status !== 'out';
  const resultsUrl = `/results?week=${encodeURIComponent(weekId)}`;
  async function start() { if (pending) return; setPending(true); setError(''); try { await live.mutate({ action: 'start' }); } catch (e) { setError(e.message); } finally { setPending(false); } }
  return <div className="mx-auto max-w-xl space-y-5"><header><Link to="/my-week" className="inline-flex min-h-11 items-center text-sm text-forest-900">← My week</Link><p className="page-eyebrow">{week ? new Date(`${week.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'League round'} · Front nine</p><h1 className="page-heading mt-1">{card?.submitted_at ? 'Your scorecard' : 'Live scoring'}</h1><p className="mt-2 text-sm text-charcoal-600">{game?.gameName}</p></header>
    {(live.loading || isLoading) ? <p role="status">Loading your round…</p> : <>{live.error && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm"><p>Live scores couldn’t refresh. {live.updatedAt ? 'Showing the last saved update.' : 'Please retry before starting.'}</p><Button variant="outline" className="mt-3" onClick={live.refresh}>Retry connection</Button></div>}
    {card ? <LiveScorecard key={`${weekId}:${card.entry_key}`} card={card} mutate={live.mutate} refresh={live.refresh} resultsUrl={resultsUrl} /> : <Card className="content-card"><CardContent className="space-y-4 p-6"><h2 className="font-display text-2xl font-semibold">{recorded ? 'Your score is already recorded' : 'Ready to tee off?'}</h2><p className="text-sm leading-6 text-charcoal-600">{recorded ? 'This round is locked. You can view your final score in results.' : !participant ? 'You need a published tee-time assignment to score this round.' : !open ? 'Scoring opens on the day of your published round.' : game?.teamType ? 'Enter one gross score per hole for your team. Teammates share this card. Your team handicap and net score are calculated automatically.' : 'Enter your gross score on each hole. We’ll show where you get strokes and keep your net score up to date.'}</p>{open && participant && !recorded && <Button className="w-full" disabled={pending || Boolean(live.error)} onClick={start}>{pending ? 'Starting…' : 'Start round'}</Button>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button asChild variant="outline" className="w-full"><Link to={resultsUrl}>View weekly leaderboard</Link></Button></CardContent></Card>}</>}
  </div>;
}
