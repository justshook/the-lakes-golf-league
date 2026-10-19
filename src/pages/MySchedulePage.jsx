import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, LoaderCircle, Settings2 } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { teeTimes } from '../constants';
import PlayerAccountGate from '../components/PlayerAccountGate';
import AttendanceControl from '../components/AttendanceControl';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const sameId = (a, b) => String(a) === String(b);
function MyScheduleContent() {
  const { weeks = [], weeklyGames = [], setSelectedWeek } = useLeague();
  const { playerId, rounds = {}, attendance = {}, availability = [], saveAvailability } = usePlayerSession();
  const [editing, setEditing] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const sortedWeeks = [...weeks].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sortedWeeks.filter(week => week.date >= today);
  const unavailable = upcoming.filter(week => attendance[String(week.id)]?.status === 'out');
  const availabilityLabel = availability.length === 0 ? 'No times selected' : availability.length === teeTimes.length ? 'Any league tee time' : `${availability.length} available tee times`;
  function openAvailability() { setSelectedTimes([...availability]); setError(''); setEditing(true); }
  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try { await saveAvailability(selectedTimes); setEditing(false); setSuccess('Your available tee times are saved for future schedules.'); } catch (e) { setError(e.message || 'We couldn’t save your availability. Please try again.'); } finally { setSaving(false); }
  }
  function roundCard(week) {
    const date = new Date(`${week.date}T12:00:00`);
    const game = weeklyGames.find(item => sameId(item.weekId, week.id));
    const roundStatus = week.status || rounds[String(week.id)]?.status;
    const published = ['published', 'finalized'].includes(roundStatus);
    const slot = published ? week.teeSheet?.find(item => item.players?.some(id => sameId(id, playerId))) : null;
    const isOut = attendance[String(week.id)]?.status === 'out';
    const cancelled = week.weatherCancelled || roundStatus === 'cancelled';
    return <Card key={week.id} className="content-card"><CardContent className="p-4 sm:p-5">
      <div className="flex items-start gap-4"><div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-cream-200 px-2 py-2.5"><span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-600">{date.toLocaleDateString('en-US', { month: 'short' })}</span><span className="mt-0.5 font-display text-2xl font-semibold leading-none text-forest-950">{date.getDate()}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-charcoal-600">{date.toLocaleDateString('en-US', { weekday: 'long' })} · {week.label || date.getFullYear()}</p><Badge variant="secondary" className="border-0 text-[10px]">{cancelled ? 'Cancelled' : isOut ? 'Unavailable' : slot ? slot.time : 'Tee time pending'}</Badge></div><h2 className="mt-1 text-base font-semibold leading-6">{game?.gameName || 'League round'}</h2><p className="mt-1 text-xs leading-5 text-charcoal-600">Arlington Lakes · {week.nineHoles === 'back' ? 'Back nine' : 'Front nine'}</p></div></div>
      {!cancelled && <div className="mt-4 border-t pt-4"><AttendanceControl week={week} compact /></div>}
      {published && !cancelled && <Button asChild variant="link" className="-ml-2 mt-1 px-2 text-xs"><Link to="/league" onClick={() => setSelectedWeek?.(week.id)}>See the full tee sheet<ArrowRight className="size-3.5" /></Link></Button>}
      {cancelled && <p className="mt-3 text-xs leading-5 text-charcoal-600">No play this week. Watch for an update from your commissioner.</p>}
    </CardContent></Card>;
  }
  return <div className="mx-auto max-w-5xl space-y-6"><header className="space-y-1.5"><p className="page-eyebrow">Make room for Monday</p><h1 className="page-heading">My schedule</h1><p className="text-sm leading-6 text-charcoal-600">See what’s next and let us know when you can’t play.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
      <Tabs defaultValue="upcoming" className="min-w-0"><TabsList className="mb-4 grid h-12 w-full grid-cols-2 rounded-xl bg-cream-200 p-1"><TabsTrigger value="upcoming" className="min-h-10 rounded-lg text-xs">Upcoming <span className="ml-2 text-charcoal-600">{upcoming.length}</span></TabsTrigger><TabsTrigger value="time-off" className="min-h-10 rounded-lg text-xs">My time off <span className="ml-2 text-charcoal-600">{unavailable.length}</span></TabsTrigger></TabsList>
        <TabsContent value="upcoming" className="space-y-3">{upcoming.length ? upcoming.map(roundCard) : <EmptySchedule title="You’re all caught up." description="Your next season’s rounds will appear here when the schedule is ready." />}</TabsContent>
        <TabsContent value="time-off" className="space-y-3">{unavailable.length ? unavailable.map(roundCard) : <EmptySchedule title="No time off planned." description="Mark an upcoming round as unavailable and it will appear here." />}</TabsContent>
      </Tabs>
      <div className="space-y-4"><Card className="content-card"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-cream-200 text-forest-900"><Clock3 className="size-5" strokeWidth={1.6} /></span><Button variant="ghost" size="sm" className="px-3 text-xs" onClick={openAvailability}><Settings2 className="size-3.5" />Edit</Button></div><h2 className="mt-4 text-base font-semibold">When can you tee off?</h2><p className="mt-1 text-sm text-forest-900">{availabilityLabel}</p><div className="mt-3 flex flex-wrap gap-1.5">{availability.map(time => <span key={time} className="rounded-md bg-cream-200 px-2 py-1 text-[11px] text-charcoal-600">{time}</span>)}</div><p className="mt-4 text-xs leading-5 text-charcoal-600">Choose every time you can make. The scheduler rotates your tee times within this window.</p>{success && <p role="status" className="mt-3 text-xs leading-5 text-forest-900">{success}</p>}</CardContent></Card><div className="px-1 text-xs leading-6 text-charcoal-600"><p className="font-semibold text-foreground">A change after the cutoff?</p><p>Contact your commissioner so they can adjust the group. Published tee times stay in place until an update is confirmed.</p></div></div>
    </div>
    <Dialog open={editing} onOpenChange={next => { if (!saving) setEditing(next); }}><DialogContent><DialogHeader className="pr-7 text-left"><DialogTitle>Your available tee times</DialogTitle><DialogDescription className="pt-2 leading-6">Choose the times you can reliably make. This updates future schedules; it won’t move a published tee time.</DialogDescription></DialogHeader><div className="grid grid-cols-3 gap-2">{teeTimes.map(time => <label key={time} className={`flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-medium ${selectedTimes.includes(time) ? 'border-forest-900 bg-forest-900/5 text-forest-950' : 'border-border text-charcoal-600'}`}><input className="sr-only peer" type="checkbox" value={time} checked={selectedTimes.includes(time)} onChange={e => setSelectedTimes(current => e.target.checked ? teeTimes.filter(t => current.includes(t) || t === time) : current.filter(t => t !== time))} disabled={saving} /><span className="flex items-center gap-1.5 rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-forest-900">{selectedTimes.includes(time) && <Check className="size-3" />}{time}</span></label>)}</div>{!selectedTimes.length && <p className="text-xs leading-5 text-charcoal-600">No selected times means the scheduler cannot assign you a tee time.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter className="gap-2"><Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Saving…</> : 'Save availability'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
function EmptySchedule({ title, description }) { return <Card className="content-card"><CardContent className="flex flex-col items-center p-8 text-center"><CalendarDays className="mb-4 size-7 text-forest-900" strokeWidth={1.5} /><h2 className="text-base font-semibold">{title}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-charcoal-600">{description}</p></CardContent></Card>; }
export default function MySchedulePage() { return <PlayerAccountGate><MyScheduleContent /></PlayerAccountGate>; }
