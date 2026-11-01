import React, { useState } from 'react';
import { Check, CalendarX2, LoaderCircle, LockKeyhole } from 'lucide-react';
import { attendanceIsOpen } from '../lib/player-service';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export default function AttendanceControl({ week, compact = false }) {
  const { attendance = {}, rounds = {}, saveAttendance, configured, isDemo } = usePlayerSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const record = attendance[String(week.id)];
  const savedRound = rounds[String(week.id)];
  const round = savedRound ? { ...savedRound, status: week.status || savedRound.status } : null;
  const isOut = record?.status === 'out';
  const cutoff = round?.attendance_deadline;
  const locked = week.weatherCancelled || !attendanceIsOpen(round) || (!configured && !isDemo);
  const cutoffText = cutoff ? new Date(cutoff).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' }) : null;
  async function save() {
    if (pending) return;
    setPending(true); setError(''); setSuccess('');
    try {
      await saveAttendance({ weekId: week.id, status: isOut ? 'in' : 'out' });
      setSuccess(isOut ? 'You’re back in. Your tee time will appear when your place is confirmed.' : 'Your absence is saved. Your commissioner will update the tee sheet.');
      setOpen(false);
    } catch (e) { setError(e.message || 'Your attendance wasn’t saved. Please try again.'); } finally { setPending(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1.5"><Badge variant="secondary" className={isOut ? 'border-0 bg-cream-200 text-charcoal-600' : 'border-0 bg-forest-900/[0.08] text-forest-900'}>{isOut ? <CalendarX2 className="mr-1.5 size-3" /> : <Check className="mr-1.5 size-3" />}{week.weatherCancelled ? 'Round cancelled' : isOut ? 'Not playing' : 'Playing this week'}</Badge>{!compact && <p className="text-xs text-charcoal-600">{locked ? (cutoff ? 'Attendance is locked. Contact your commissioner for changes.' : 'Attendance opens when the round is ready.') : `Changes close ${cutoffText}`}</p>}</div>
      <Button variant="outline" size="sm" disabled={locked || pending} onClick={() => { setError(''); setOpen(true); }} className="shrink-0 text-xs">{locked ? <><LockKeyhole className="size-3" />Locked</> : isOut ? 'I can play' : 'Can’t make it'}</Button>
    </div>
    {success && <p role="status" className="text-xs leading-5 text-forest-900">{success}</p>}
    {error && !open && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={next => { if (!pending) setOpen(next); }}><DialogContent className="gap-5 p-6"><DialogHeader className="pr-6 text-left"><DialogTitle>{isOut ? 'Back in for this round?' : 'Taking this week off?'}</DialogTitle><DialogDescription className="pt-2 leading-6">{isOut ? 'We’ll update your availability for this round. Your commissioner may need to confirm a tee time.' : 'We’ll mark you as not playing and let your commissioner know. You can change this before the attendance cutoff.'}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Keep current status</Button><Button onClick={save} disabled={pending}>{pending ? <><LoaderCircle className="size-4 animate-spin" />Saving…</> : isOut ? 'Confirm I’m playing' : 'Confirm absence'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
