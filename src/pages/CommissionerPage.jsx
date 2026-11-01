import CommissionerLedger from '../components/CommissionerLedger';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CalendarDays, CheckCircle2, CloudRain, Flag, LoaderCircle, Plus, RefreshCw, Send, Shuffle } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { getTeamsForSlot } from '../lib/teams';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/ui/dialog';

const sameId = (a, b) => String(a) === String(b);
const reasonLabels = {
  no_available_tee_time: 'No tee time matches their availability.',
  capacity_or_group_constraint: 'No space fits the available times and grouping rules.',
  fixed_partner_constraint: 'The required partner is not available.',
};

function AccessCard({ title, children, signIn = false }) {
  return <Card className="mx-auto max-w-lg rounded-2xl shadow-none">
    <CardHeader><CardTitle className="font-serif text-3xl">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <p>{children}</p>
      <Button asChild><Link to={signIn ? '/login' : '/league'}>{signIn ? 'Sign in' : 'View the league'}</Link></Button>
    </CardContent>
  </Card>;
}

export default function CommissionerPage() {
  const { user, isAdmin, loading, configured, isDemo } = usePlayerSession();
  const {
    players = [], weeks = [], playerScores = [], selectedWeek, setSelectedWeek,
    getGameForWeek, isLoading, dataError, generateDraft, publishDraft, cancelRound, createRound, refreshData,
    formatDate, formatShortDate, attendanceRows = [],
  } = useLeague();
  const [draftState, setDraftState] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoundDate, setNewRoundDate] = useState('');
  const [newRoundDeadline, setNewRoundDeadline] = useState('');
  const [newRoundTeamType, setNewRoundTeamType] = useState('individual');
  const week = weeks.find(row => sameId(row.id, selectedWeek)) || weeks[0];
  const weekKey = week ? String(week.id) : '';
  const draft = draftState?.weekId === weekKey ? draftState.value : null;
  const game = week ? getGameForWeek?.(week.id) || {} : {};
  const teeSheet = draft?.teeSheet || week?.teeSheet || [];
  const playerMap = useMemo(() => new Map(players.map(player => [String(player.id), player])), [players]);
  const playerName = id => playerMap.get(String(id))?.name || 'Unknown player';
  const assignedIds = [...new Set(teeSheet.flatMap(slot => slot.players || []).map(String))];
  const roundScores = playerScores.filter(score => sameId(score.week_id ?? score.weekId, week?.id));
  const scoredIds = new Set(roundScores.map(score => String(score.player_id ?? score.playerId)));
  const missingScoreIds = assignedIds.filter(id => !scoredIds.has(id));
  const absentIds = [...new Set(attendanceRows
    .filter(row => sameId(row.week_id ?? row.weekId, week?.id) && row.status === 'out')
    .map(row => String(row.player_id ?? row.playerId)))];
  const cancelled = week?.weatherCancelled || week?.status === 'cancelled';
  const finalized = week?.status === 'finalized' || week?.status === 'completed';
  const readOnly = Boolean(week?.legacy || finalized || cancelled);
  const status = cancelled ? 'Cancelled' : finalized ? 'Finalized' : week?.legacy ? 'Archived' : week?.status === 'published' ? 'Published' : 'Draft';
  const incompleteTeams = draft?.teeSheet?.flatMap(slot => getTeamsForSlot({ weekId: week?.id, slot, game }))
    .filter(team => team.status === 'incomplete') || [];
  const hasUnresolvedDraft = Boolean(draft?.unscheduled?.length || incompleteTeams.length);
  const controlsDisabled = Boolean(busy || isLoading || dataError || readOnly || roundScores.length);
  const shortDate = date => formatShortDate?.(date) || date;

  useEffect(() => {
    setError('');
    setNotice('');
    setCancelOpen(false);
  }, [weekKey]);

  function handleGenerate() {
    setError('');
    setNotice('');
    try {
      const result = generateDraft(week.id);
      if (!result || !Array.isArray(result.teeSheet)) throw new Error('The tee sheet could not be generated. Please try again.');
      setDraftState({ weekId: weekKey, value: result });
      setNotice('Draft generated. Review the groups below before publishing.');
    } catch (err) {
      setError(err?.message || 'The tee sheet could not be generated. Please try again.');
    }
  }

  async function handlePublish() {
    if (!draft || controlsDisabled || hasUnresolvedDraft) return;
    setBusy('publish');
    setError('');
    setNotice('');
    try {
      await publishDraft(week.id, draft);
      setDraftState(null);
      setNotice(isDemo ? 'Sample tee sheet published in this preview.' : 'Tee sheet published. Players can see their assignments in My Week.');
    } catch (err) {
      setError(err?.message || 'Publishing failed. Your draft is still here; please try again.');
    } finally {
      setBusy('');
    }
  }

  async function handleCancel() {
    setBusy('cancel');
    setError('');
    setNotice('');
    try {
      await cancelRound(week.id);
      setDraftState(null);
      setCancelOpen(false);
      setNotice(isDemo ? 'Sample round cancelled in this preview.' : 'Round cancelled. Players will see the cancellation in their schedule.');
    } catch (err) {
      setError(err?.message || 'The round could not be cancelled. Please try again.');
    } finally {
      setBusy('');
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const deadline = new Date(newRoundDeadline);
    if (!newRoundDate || Number.isNaN(deadline.getTime())) {
      setError('Choose a round date and a valid attendance deadline.');
      return;
    }
    if (deadline >= new Date(`${newRoundDate}T23:59:59`)) {
      setError('The attendance deadline must be before the end of the round date.');
      return;
    }
    setBusy('create');
    setError('');
    setNotice('');
    try {
      const created = await createRound({ date: newRoundDate, attendanceDeadline: deadline.toISOString(), teamType: newRoundTeamType });
      if (created?.id != null) setSelectedWeek(created.id);
      setCreateOpen(false);
      setNewRoundDate('');
      setNewRoundDeadline('');
      setNotice(isDemo ? 'Sample round added in this preview.' : 'Round added. Players can now update their attendance.');
    } catch (err) {
      setError(err?.message || 'The round could not be added. Please try again.');
    } finally {
      setBusy('');
    }
  }

  if (loading || isLoading) return <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Loading commissioner tools…</div>;
  if (!configured && !isDemo) return <AccessCard title="League setup needed">The league connection must be configured before commissioner tools are available.</AccessCard>;
  if (!user) return <AccessCard title="Your league, in order." signIn>Sign in with your commissioner account to manage attendance and publish the week’s tee sheet.</AccessCard>;
  if (!isAdmin) return <AccessCard title="Commissioner access">This page is available to league commissioners. Your personal schedule, results, and winnings are in My Week.</AccessCard>;

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Commissioner desk</p><h1 className="font-serif text-4xl text-forest-950 sm:text-5xl">A smoother Monday.</h1><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Check who’s playing, build balanced groups, and publish the week.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={Boolean(busy || isLoading)} onClick={async () => { setDraftState(null); setNotice(''); setError(''); await refreshData?.(); }}><RefreshCw aria-hidden="true" />Refresh</Button><Button asChild variant="outline" size="sm"><Link to="/league">League view<ArrowUpRight aria-hidden="true" /></Link></Button>{createRound && <Button size="sm" disabled={Boolean(busy || dataError)} onClick={() => { setError(''); setCreateOpen(true); }}><Plus aria-hidden="true" />Add round</Button>}</div>
    </header>

    {dataError && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>League data needs attention</AlertTitle><AlertDescription>{typeof dataError === 'string' ? dataError : dataError.message || 'The latest league data could not be loaded. Reload before making changes.'}</AlertDescription></Alert>}
    {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Action could not be completed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {notice && <div role="status" className="flex items-start gap-3 rounded-xl border border-forest-900/15 bg-forest-900/5 px-4 py-3 text-sm text-forest-950"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{notice}</p></div>}

    <Dialog open={createOpen} onOpenChange={open => { if (!busy) setCreateOpen(open); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a league round</DialogTitle><DialogDescription className="pt-2 leading-relaxed">Create the date and game, then generate its tee sheet when attendance is ready.</DialogDescription></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label htmlFor="new-round-date" className="mb-2 block text-sm font-medium">Round date</label><Input id="new-round-date" type="date" required value={newRoundDate} onChange={event => setNewRoundDate(event.target.value)} disabled={Boolean(busy)} className="min-h-11" /></div>
          <div><label htmlFor="new-round-deadline" className="mb-2 block text-sm font-medium">Attendance deadline</label><Input id="new-round-deadline" type="datetime-local" required value={newRoundDeadline} onChange={event => setNewRoundDeadline(event.target.value)} disabled={Boolean(busy)} aria-describedby="deadline-timezone" className="min-h-11" /><p id="deadline-timezone" className="mt-2 text-xs text-muted-foreground">Shown in your device’s time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p></div>
          <div><label htmlFor="new-round-game" className="mb-2 block text-sm font-medium">Game</label><select id="new-round-game" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newRoundTeamType} onChange={event => setNewRoundTeamType(event.target.value)} disabled={Boolean(busy)}><option value="individual">Individual stroke play</option><option value="2-person">2-person scramble</option><option value="4-person">4-person scramble</option></select></div>
          <p className="rounded-lg bg-cream-200/60 p-3 text-xs leading-relaxed text-muted-foreground">Front nine course settings · Automated scoring currently uses the verified front-nine handicap settings.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2"><DialogClose asChild><Button type="button" variant="outline" disabled={Boolean(busy)}>Go back</Button></DialogClose><Button type="submit" disabled={Boolean(busy)}>{busy === 'create' && <LoaderCircle className="animate-spin" aria-hidden="true" />}{busy === 'create' ? 'Adding…' : 'Add round'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {!week ? <Card className="rounded-2xl shadow-none"><CardContent className="space-y-3 p-6"><CalendarDays className="size-7 text-muted-foreground" /><h2 className="font-serif text-2xl">No rounds yet</h2><p className="text-sm text-muted-foreground">Add the next season’s rounds during league setup to start building tee sheets.</p></CardContent></Card> : <>
      <section aria-labelledby="round-heading" className="rounded-2xl bg-forest-950 p-5 text-cream-100 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cream-200/65">The round</p><h2 id="round-heading" className="mt-2 font-serif text-3xl">{shortDate(week.date)}</h2><p className="mt-2 text-sm text-cream-200/80">{game.gameName || game.name || 'League round'} · {week.nineHoles === 'back' ? 'Back nine' : 'Front nine'}</p></div>
          <Badge variant="outline" className="rounded-full border-cream-200/25 px-3 py-1 text-cream-100">{status}</Badge>
        </div>
        <div className="mt-5 border-t border-white/15 pt-4"><label htmlFor="commissioner-round" className="mb-2 block text-xs font-medium text-cream-200/80">Choose a round</label><select id="commissioner-round" className="min-h-11 w-full rounded-lg border border-white/25 bg-forest-900 px-3 py-2 text-sm text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400" value={weekKey} disabled={Boolean(busy)} onChange={event => {
          const next = weeks.find(row => sameId(row.id, event.target.value));
          if (next) { setDraftState(null); setSelectedWeek(next.id); }
        }}>{weeks.map(row => <option key={row.id} value={String(row.id)}>{formatDate?.(row.date) || row.date}{row.legacy ? ' · Archive' : row.status === 'cancelled' || row.weatherCancelled ? ' · Cancelled' : ''}</option>)}</select></div>
      </section>

      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {[['Scheduled', assignedIds.length], ['Sitting out', absentIds.length], ['Scores missing', cancelled ? '—' : missingScoreIds.length]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-card p-3 sm:p-5"><dt className="text-[10px] font-medium text-muted-foreground sm:text-xs">{label}</dt><dd className="mt-2 font-serif text-3xl text-forest-950 sm:text-4xl">{value}</dd></div>)}
      </dl>

      {readOnly ? <div className="rounded-xl border bg-cream-200/60 px-4 py-4 text-sm leading-relaxed text-muted-foreground">{cancelled ? 'This round is cancelled. Its tee sheet is shown for reference.' : finalized ? 'This round is finalized. Assignments are locked to preserve the results.' : 'This archived round is read-only. Its existing schedule and results are preserved.'}</div> : <Card className="rounded-2xl shadow-none">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3"><CardTitle className="flex items-center gap-2 text-base"><Shuffle className="size-4" aria-hidden="true" />Build the tee sheet</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">Use player availability and attendance to mix groups and reduce repeat partners. Review the draft, then make it visible to players.</p>
          {roundScores.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Scores have been submitted. Scheduling is locked so the results stay attached to the correct teams.</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant={draft ? 'outline' : 'default'} className="w-full sm:w-auto" onClick={handleGenerate} disabled={controlsDisabled || !players.length}><Shuffle aria-hidden="true" />{draft ? 'Regenerate draft' : 'Generate draft'}</Button>
            {draft && <Button className="w-full sm:w-auto" onClick={handlePublish} disabled={controlsDisabled || hasUnresolvedDraft || !assignedIds.length}>{busy === 'publish' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}{busy === 'publish' ? 'Publishing…' : 'Publish tee sheet'}</Button>}
          </div>
          {draft && <p className="text-xs leading-relaxed text-muted-foreground">{hasUnresolvedDraft ? 'Resolve unscheduled players and incomplete teams before publishing. Check the roster’s availability and the number of players, then regenerate.' : 'This draft is only visible here until you publish it.'}</p>}
        </CardContent>
      </Card>}

      {draft?.unscheduled?.length > 0 && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>{draft.unscheduled.length} player{draft.unscheduled.length === 1 ? '' : 's'} need attention</AlertTitle><AlertDescription><ul className="mt-3 space-y-2">{draft.unscheduled.map(row => <li key={row.playerId}><span className="font-semibold">{row.name || playerName(row.playerId)}:</span> {reasonLabels[row.reason] || row.reason?.replaceAll('_', ' ') || 'No eligible assignment was found.'}</li>)}</ul></AlertDescription></Alert>}
      {draft?.warnings?.length > 0 && <Alert className="border-amber-200 bg-amber-50 text-amber-950"><AlertCircle className="size-4" /><AlertTitle>Review before publishing</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-2 pl-4">{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></AlertDescription></Alert>}

      <section aria-labelledby="tee-sheet-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 id="tee-sheet-heading" className="font-serif text-2xl text-forest-950">{draft ? 'Draft tee sheet' : 'Tee sheet'}</h2><span className="text-xs text-muted-foreground">{teeSheet.filter(slot => slot.players?.length).length} groups</span></div>
        {!assignedIds.length ? <div className="rounded-xl border border-dashed p-7 text-center"><Flag className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">{cancelled ? 'No assignments for this cancelled round.' : 'Your tee sheet will appear here.'}</p></div> : <div className="grid gap-3 sm:grid-cols-2">{teeSheet.filter(slot => slot.players?.length).map((slot, slotIndex) => {
          const teams = getTeamsForSlot({ weekId: week.id, slot, game });
          const groups = teams.length ? teams : [{ teamId: `group-${slotIndex}`, memberIds: slot.players }];
          return <Card key={`${slot.time}-${slotIndex}`} className="overflow-hidden rounded-xl shadow-none"><CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-cream-200/35 px-4 py-3"><CardTitle className="text-sm">{slot.time}</CardTitle><span className="text-xs text-muted-foreground">{slot.players.length} players</span></CardHeader><CardContent className="space-y-3 p-4">{groups.map((team, teamIndex) => <div key={team.teamId} className={teams.length ? 'rounded-lg bg-cream-200/45 p-3' : ''}>{teams.length > 0 && <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Team {teamIndex + 1}</p>{team.status === 'incomplete' && <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-800">Needs partner</Badge>}</div>}<ul className="space-y-1">{team.memberIds.map(id => <li key={id} className="text-sm"><Link to={`/players/${id}`} className="block min-h-11 rounded-md py-3 font-medium text-forest-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{playerName(id)}</Link></li>)}</ul></div>)}</CardContent></Card>;
        })}</div>}
      </section>

      {(absentIds.length > 0 || (week.status === 'published' && missingScoreIds.length > 0)) && <Card className="rounded-xl shadow-none"><CardContent className="divide-y px-5 py-1">
        {absentIds.length > 0 && <details className="py-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Sitting out · {absentIds.length}</summary><ul className="space-y-2 pb-3 pt-2 text-sm text-muted-foreground">{absentIds.map(id => <li key={id}>{playerName(id)}</li>)}</ul></details>}
        {week.status === 'published' && missingScoreIds.length > 0 && <details className="py-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Waiting for scores · {missingScoreIds.length}</summary><ul className="space-y-2 pb-3 pt-2 text-sm text-muted-foreground">{missingScoreIds.map(id => <li key={id}>{playerName(id)}</li>)}</ul></details>}
      </CardContent></Card>}

      {!readOnly && cancelRound && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-xs text-muted-foreground">Weather or course closure?</p><Button variant="ghost" className="text-muted-foreground" disabled={controlsDisabled} onClick={() => setCancelOpen(true)}><CloudRain aria-hidden="true" />Cancel this round</Button></div>}
      <Dialog open={cancelOpen} onOpenChange={open => { if (!busy) setCancelOpen(open); }}>
        <DialogContent><DialogHeader><DialogTitle>Cancel the {shortDate(week.date)} round?</DialogTitle><DialogDescription className="pt-2 leading-relaxed">Players will see this round marked cancelled. This action does not issue refunds or send messages.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter className="gap-2"><DialogClose asChild><Button variant="outline" disabled={Boolean(busy)}>Keep round</Button></DialogClose><Button variant="destructive" disabled={Boolean(busy)} onClick={handleCancel}>{busy === 'cancel' && <LoaderCircle className="animate-spin" aria-hidden="true" />}{busy === 'cancel' ? 'Cancelling…' : 'Cancel round'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </>}
    <CommissionerLedger />
  </div>;
}
