import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Flag, MapPin, UsersRound, Trophy, ChevronRight, LoaderCircle, PencilLine, CheckCircle2 } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import PlayerAccountGate from '../components/PlayerAccountGate';
import AttendanceControl from '../components/AttendanceControl';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getPlayerTeam } from '../lib/teams';
import { summarizePlayerResults, summarizePlayerAwards } from '../lib/player-summary';

const sameId = (a, b) => String(a) === String(b);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
function MyWeekContent() {
  const { players = [], weeks = [], weeklyGames = [], playerScores = [], setSelectedWeek, submitScore } = useLeague();
  const { playerId, profile, attendance = {}, rounds = {} } = usePlayerSession();
  const player = players.find(item => sameId(item.id, playerId));
  const name = player?.name || profile?.name || profile?.display_name || 'Player';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const week = [...weeks].sort((a, b) => a.date.localeCompare(b.date)).find(item => item.date >= today && !item.weatherCancelled && item.status !== 'finalized');
  const game = weeklyGames.find(item => sameId(item.weekId, week?.id));
  const published = ['published', 'finalized'].includes(week?.status || rounds[String(week?.id)]?.status);
  const assignment = week && published ? getPlayerTeam({ playerId, weekId: week.id, teeSheet: week.teeSheet || [], game }) : null;
  const slot = published ? week?.teeSheet?.find(item => item.players?.some(id => sameId(id, playerId))) : null;
  const isOut = attendance[String(week?.id)]?.status === 'out';
  const teammates = (assignment?.teammates || []).map(id => players.find(item => sameId(item.id, id))).filter(Boolean);
  const group = (slot?.players || []).map(id => players.find(item => sameId(item.id, id))).filter(Boolean);
  const results = summarizePlayerResults({ playerId, scores: playerScores, weeks, games: weeklyGames });
  const awards = summarizePlayerAwards(player, weeks);
  const date = week ? new Date(`${week.date}T12:00:00`) : null;
  const dateLabel = date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const scoreRecorded = playerScores.some(score => sameId(score.player_id, playerId) && sameId(score.week_id, week?.id));
  const scoringWeek = [...weeks].sort((a, b) => b.date.localeCompare(a.date)).find(candidate =>
    candidate.date <= today && (candidate.status || rounds[String(candidate.id)]?.status) === 'published'
    && !candidate.weatherCancelled && candidate.scoreSubmissionEnabled !== false && candidate.isScoringSupported === true
    && attendance[String(candidate.id)]?.status !== 'out'
    && candidate.teeSheet?.some(group => group.players?.some(id => sameId(id, playerId)))
    && !playerScores.some(score => sameId(score.player_id, playerId) && sameId(score.week_id, candidate.id))
  );
  const scoringGame = weeklyGames.find(item => sameId(item.weekId, scoringWeek?.id));
  const openRound = () => { if (week && setSelectedWeek) setSelectedWeek(week.id); };

  return <div className="mx-auto max-w-5xl space-y-6 sm:space-y-7">
    <header className="flex items-end justify-between gap-3"><div className="space-y-1.5"><p className="page-eyebrow">Your league at a glance</p><h1 className="page-heading">Hey, {name.split(' ')[0]}.</h1><p className="text-sm text-charcoal-600">{week ? 'Here’s what’s coming up on the course.' : 'Your next chapter starts next season.'}</p></div><span aria-hidden="true" className="hidden size-12 items-center justify-center rounded-full border border-border text-forest-900 sm:flex"><Flag className="size-5" strokeWidth={1.5} /></span></header>
    <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
      <div className="space-y-5">
        <Card className="overflow-hidden rounded-[20px] border-0 bg-forest-950 text-cream-100 shadow-none"><CardContent className="p-0">
          <div className="relative overflow-hidden p-6 sm:p-7"><div aria-hidden="true" className="pointer-events-none absolute -right-12 top-16 size-56 rounded-full border border-white/[0.07]" /><div aria-hidden="true" className="pointer-events-none absolute -right-6 top-24 size-44 rounded-full border border-white/[0.07]" />
            <div className="relative space-y-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-300">{week ? `Next round · ${week.label || new Date(`${week.date}T12:00:00`).getFullYear()}` : 'The season'}</span><Flag className="size-5 text-gold-400" strokeWidth={1.5} /></div>
              <div><p className="text-sm text-cream-200/80">{dateLabel || 'No upcoming round'}</p><h2 className="mt-1.5 font-display text-[clamp(2.2rem,10vw,3rem)] font-semibold leading-tight tracking-tight sm:text-6xl">{isOut ? 'Taking a week off.' : slot?.time || (week ? 'Monday awaits.' : 'Thanks for playing.')}</h2><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-cream-200/80"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />Arlington Lakes</span>{week && <span>{week.nineHoles === 'back' ? 'Back nine · Holes 10–18' : 'Front nine · Holes 1–9'}</span>}</div></div>
              {week && <div className="border-t border-white/15 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-300">This week’s game</p><p className="mt-1 text-lg font-semibold">{game?.gameName || 'Game to be announced'}</p>{!isOut && !slot && <p className="mt-2 text-xs leading-5 text-cream-200/70">Your tee time will appear once the schedule is published.</p>}</div>}
            </div>
          </div>
          {week && <div className="bg-cream-100 p-5 text-foreground sm:px-7"><AttendanceControl week={week} /></div>}
        </CardContent></Card>
        {scoringWeek && submitScore && <ScoreEntry week={scoringWeek} game={scoringGame} submitScore={submitScore} />}
        {week && scoreRecorded && <div className="flex items-center gap-2 rounded-xl bg-forest-900/5 p-4 text-sm text-forest-900"><CheckCircle2 className="size-4" />Your score is recorded. <Link to="/results" className="ml-auto text-xs font-semibold underline">View</Link></div>}
        {week && !isOut && slot && <Card className="content-card"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Your group</h2><UsersRound className="size-4 text-charcoal-600" /></div>
          <div className="divide-y divide-border">{group.map(member => { const self = sameId(member.id, playerId); const partner = teammates.some(person => sameId(person.id, member.id)); return <div key={member.id} className="flex min-h-[62px] items-center gap-3 py-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-[11px] font-semibold text-forest-950">{member.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.name}{self && <span className="ml-1 text-charcoal-600">(you)</span>}</p><p className="text-xs text-charcoal-600">{partner ? 'Your teammate' : self ? 'Ready for Monday' : 'In your foursome'}</p></div>{partner && <Badge variant="secondary" className="border-0 bg-forest-900/10 text-[10px] text-forest-900">Partner</Badge>}</div>; })}</div>
          {assignment?.isIncomplete && <p className="mt-3 text-xs leading-5 text-charcoal-600">Your commissioner is filling the remaining place on your team.</p>}
          <Button asChild variant="outline" className="mt-4 w-full"><Link to="/league" onClick={openRound}>View tee sheet <ArrowRight className="size-4" /></Link></Button>
        </CardContent></Card>}
      </div>
      <div className="space-y-5">
        <section aria-labelledby="season-summary-heading"><div className="mb-3 flex items-center justify-between"><h2 id="season-summary-heading" className="text-base font-semibold">Your playing history</h2><Link to="/results" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-forest-900">View results<ChevronRight className="size-3.5" /></Link></div><div className="grid grid-cols-2 gap-3"><Card className="content-card"><CardContent className="p-4 sm:p-5"><Trophy className="mb-3 size-4 text-gold-600" /><p className="text-xs text-charcoal-600">Recorded winnings</p><p className="mt-1 font-display text-3xl font-semibold text-forest-950">{awards.totalCents == null ? '—' : money(awards.totalCents / 100)}</p><Link to="/money" className="mt-1 inline-flex min-h-11 items-center text-[11px] text-charcoal-600">View money details <ChevronRight className="ml-1 size-3" /></Link></CardContent></Card><Card className="content-card"><CardContent className="p-4 sm:p-5"><CalendarDays className="mb-3 size-4 text-forest-900" /><p className="text-xs text-charcoal-600">Rounds recorded</p><p className="mt-1 font-display text-3xl font-semibold text-forest-950">{results.roundCount}</p><p className="mt-4 text-[11px] leading-5 text-charcoal-600">Individual + team rounds</p></CardContent></Card></div></section>
        {week && game && <Card className="content-card"><CardContent className="space-y-3 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">The game plan</h2>{game.teamType && <Badge variant="secondary" className="border-0 text-[10px]">{game.teamType}</Badge>}</div><p className="whitespace-pre-line text-sm leading-6 text-charcoal-600">{game.gameDescription || 'Your commissioner will share the rules before the round.'}</p>{game.sideGame && <div className="border-t pt-3"><p className="text-xs font-semibold text-forest-900">Side game · {game.sideGame}</p>{game.sideGameDescription && <p className="mt-1 text-xs leading-5 text-charcoal-600">{game.sideGameDescription}</p>}</div>}</CardContent></Card>}
        <Card className="content-card bg-cream-200/50"><CardContent className="p-5"><div className="flex items-start gap-3"><CalendarDays className="mt-1 size-5 shrink-0 text-forest-900" /><div className="flex-1"><h2 className="text-sm font-semibold">A Monday you can’t make?</h2><p className="mt-1 text-xs leading-5 text-charcoal-600">Mark time off in advance and keep your tee-time availability up to date.</p><Button asChild variant="link" className="-ml-3 mt-1 px-3 text-xs"><Link to="/schedule">Manage my schedule<ArrowRight className="size-3.5" /></Link></Button></div></div></CardContent></Card>
      </div>
    </div>
  </div>;
}
function ScoreEntry({ week, game, submitScore }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try { await submitScore({ weekId: week.id, grossScore: Number(score), birdieHoles: [], eagleHoles: [] }); setOpen(false); } catch (e) { setError(e.message || 'Your score was not saved. Please try again.'); } finally { setPending(false); }
  }
  return <><div className="rounded-2xl border border-gold-300 bg-cream-200/60 p-4"><p className="mb-1 text-sm font-semibold text-forest-950">Finish your round</p><p className="mb-3 text-xs text-charcoal-600">{new Date(`${week.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {game?.gameName || 'League round'}</p><Button onClick={() => { setError(''); setOpen(true); }} className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400"><PencilLine className="size-4" />{game?.teamType ? 'Enter your team score' : 'Enter your score'}</Button></div><Dialog open={open} onOpenChange={next => { if (!pending) setOpen(next); }}><DialogContent><DialogHeader className="pr-6 text-left"><DialogTitle>{game?.teamType ? 'Record your team score' : 'Record your score'}</DialogTitle><DialogDescription className="pt-2 leading-6">{game?.teamType ? 'Enter the shared team total after completing all nine holes. This score is recorded for each member of your team.' : 'Enter your gross total after completing all nine holes. Your round’s handicap is applied automatically.'}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-2"><label htmlFor="gross-score" className="text-sm font-semibold">Gross score · 9 holes</label><Input id="gross-score" type="number" inputMode="numeric" min="9" max="180" step="1" required value={score} onChange={event => setScore(event.target.value)} disabled={pending} placeholder="e.g. 42" /></div><p className="text-xs leading-5 text-charcoal-600">Check the total with your group before saving. Contact the commissioner if a submitted score needs a correction.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={pending} className="w-full">{pending ? <><LoaderCircle className="size-4 animate-spin" />Saving score…</> : 'Confirm and save score'}</Button></form></DialogContent></Dialog></>;
}
export default function MyWeekPage() { return <PlayerAccountGate><MyWeekContent /></PlayerAccountGate>; }
