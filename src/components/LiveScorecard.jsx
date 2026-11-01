import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Flag, LockKeyhole, Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { summarizeCard, formatToPar } from '../lib/live-scoring';

export function ScorecardTable({ card, onEdit }) {
  const summary = summarizeCard(card);
  return <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm tabular-nums"><caption className="sr-only">Hole-by-hole scorecard</caption><thead className="bg-cream-200 text-xs"><tr>{['Hole', 'Par', 'Strokes', 'Gross', 'Net', ...(onEdit ? [''] : [])].map((label, i) => <th key={i} className="px-2 sm:px-3 py-3" scope="col">{label}</th>)}</tr></thead><tbody>{card.holes.map((hole, i) => <tr key={hole.number} className="border-t"><th className="px-2 sm:px-3 py-2" scope="row">{hole.number}</th><td className="px-2 sm:px-3 py-2">{hole.par}</td><td className="px-2 sm:px-3 py-2 text-forest-800">{summary.strokes[i] > 0 ? `+${summary.strokes[i]}` : summary.strokes[i]}</td><td className="px-2 sm:px-3 py-2 font-semibold">{card.gross_scores[i] ?? '—'}</td><td className="px-2 sm:px-3 py-2">{card.gross_scores[i] == null ? '—' : card.gross_scores[i] - summary.strokes[i]}</td>{onEdit && <td className="p-1"><Button variant="ghost" className="px-2 text-xs" aria-label={`Edit hole ${hole.number}`} onClick={() => onEdit(i)}>Edit</Button></td>}</tr>)}</tbody><tfoot className="border-t bg-cream-200 font-semibold"><tr><th className="px-2 sm:px-3 py-3" scope="row">Total</th><td className="px-2 sm:px-3 py-3">{card.holes.reduce((sum, hole) => sum + hole.par, 0)}</td><td className="px-2 sm:px-3 py-3">{card.handicap_used}</td><td className="px-2 sm:px-3 py-3">{summary.gross ?? '—'}</td><td className="px-2 sm:px-3 py-3">{summary.net ?? '—'}</td>{onEdit && <td />}</tr></tfoot></table></div>;
}

export default function LiveScorecard({ card, mutate, refresh, resultsUrl }) {
  const draftKey = `lakes:score-draft:v1:${card.week_id}:${card.entry_key}`;
  const clearDraft = () => { try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be unavailable. */ } };
  const [recovered] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey));
      return !card.submitted_at && saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < 9 && Number.isInteger(saved.revision) ? saved : null;
    } catch { return null; }
  });
  const [index, setIndex] = useState(() => recovered?.index ?? Math.max(0, card.gross_scores.findIndex(score => score == null)));
  const [draft, setDraft] = useState(recovered?.value ?? null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const draftRevision = useRef(recovered?.revision ?? null);
  const updateDraft = value => { if (draftRevision.current == null) draftRevision.current = card.revision; setDraft(value); try { sessionStorage.setItem(draftKey, JSON.stringify({ index, value, revision: draftRevision.current })); } catch { /* Saved server scores remain available if local storage is full. */ } };
  const [error, setError] = useState('');
  const [reviewRevision, setReviewRevision] = useState(null);
  const summary = summarizeCard(card), hole = card.holes[index];
  const value = draft ?? card.gross_scores[index] ?? hole.par;
  const dirty = draft != null && draft !== card.gross_scores[index];
  const reviewing = reviewRevision != null;
  const locked = Boolean(card.submitted_at);
  useEffect(() => {
    const warn = event => { if (dirty || pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);
  async function act(action, nextIndex = index) {
    if (pendingRef.current) return;
    pendingRef.current = true; setPending(true); setError('');
    try {
      const saved = await mutate({ action, hole: index + 1, gross: Number(value), revision: action === 'submit' ? reviewRevision : draftRevision.current ?? card.revision });
      setDraft(null); draftRevision.current = null; clearDraft(); setIndex(nextIndex);
      if (action === 'save' && saved.gross_scores.every(s => s != null)) setReviewRevision(saved.revision);
    } catch (e) { setError(e.message); }
    finally { pendingRef.current = false; setPending(false); }
  }
  const choose = next => { if (!dirty && !pending) { setIndex(next); setDraft(null); draftRevision.current = null; setReviewRevision(null); setError(''); } };
  return <div className="space-y-5">
    <Card className="overflow-hidden rounded-2xl border-0 bg-forest-950 text-cream-100"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-widest text-gold-300">{card.team_id ? 'Your team’s round' : 'Your round'}</p>{locked ? <LockKeyhole className="size-4" /> : <Flag className="size-4" />}</div><div className="mt-5 grid grid-cols-3 gap-3">{[['Net to par', formatToPar(summary.toPar)], ['Gross', summary.gross ?? '—'], ['Holes', `${summary.thru} / 9`]].map(([label, number]) => <div key={label}><p className="text-xs text-cream-200">{label}</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{number}</p></div>)}</div><p className="mt-4 text-xs text-cream-200">Playing handicap: {card.handicap_used}. Strokes are applied automatically.</p></CardContent></Card>
    {locked ? <div className="rounded-xl bg-forest-900/10 p-4"><p className="flex items-center gap-2 font-semibold text-forest-900"><CheckCircle2 className="size-5" />Score submitted</p><p className="mt-2 text-sm text-charcoal-600">Your weekly score is recorded. This card is locked and can no longer be edited.</p></div> : reviewing ? <div><h2 className="font-display text-2xl font-semibold">Review your scorecard</h2><p className="mt-2 text-sm text-charcoal-600">Check every hole below. You can still edit your card. Once you submit, your score is final.</p>{reviewRevision !== card.revision && <p role="alert" className="mt-3 text-sm text-destructive">Your card changed on another device. Review the updated scores, then confirm your review.</p>}</div> : <Card className="content-card"><CardContent className="space-y-5 p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="page-eyebrow">Hole {hole.number} of 9</p><h2 className="mt-1 font-display text-3xl font-semibold">Par {hole.par}</h2></div><div className="text-right text-sm"><p>{hole.yards} yards</p><p className="mt-1 text-charcoal-600">Stroke index {hole.handicapIndex}</p></div></div><div className="rounded-xl bg-forest-900/5 px-4 py-3 text-sm font-medium text-forest-900">{summary.strokes[index] > 0 ? `You get ${summary.strokes[index]} ${summary.strokes[index] === 1 ? 'stroke' : 'strokes'} on this hole.` : summary.strokes[index] < 0 ? `You give back ${Math.abs(summary.strokes[index])} ${summary.strokes[index] === -1 ? 'stroke' : 'strokes'} on this hole.` : 'No handicap strokes on this hole.'}</div><fieldset disabled={pending} className="space-y-3"><legend className="mb-3 text-sm font-semibold">Gross score</legend><div className="flex items-center justify-between gap-4"><Button type="button" variant="outline" className="size-14 rounded-full" aria-label="Subtract one stroke" disabled={value <= 1} onClick={() => updateDraft(Math.max(1, Number(value) - 1))}><Minus /></Button><input aria-label={`Gross score for hole ${hole.number}`} type="number" inputMode="numeric" min="1" max="20" step="1" value={value} onChange={event => updateDraft(event.target.value === '' ? '' : Number(event.target.value))} className="min-h-20 w-24 rounded-xl border bg-background text-center font-display text-5xl font-semibold tabular-nums" /><Button type="button" variant="outline" className="size-14 rounded-full" aria-label="Add one stroke" disabled={value >= 20} onClick={() => updateDraft(Math.min(20, Number(value) + 1))}><Plus /></Button></div><p className="text-center text-sm text-charcoal-600">Net on this hole: {value === '' ? '—' : Number(value) - summary.strokes[index]}</p><Button className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400" disabled={!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 20} onClick={() => act('save', Math.min(8, index + 1))}>{pending ? 'Saving…' : index === 8 ? 'Save hole & review' : 'Save & next hole'}</Button></fieldset><p role="status" className="text-center text-xs text-charcoal-600">{dirty ? 'Unsaved change — save this hole before leaving.' : card.gross_scores[index] == null ? 'This hole has not been saved yet.' : 'Saved to your live scorecard.'}</p><nav aria-label="Scorecard holes" className="grid grid-cols-9 gap-1">{card.holes.map((h, i) => <button key={h.number} disabled={pending || dirty} aria-label={`Go to hole ${h.number}`} aria-current={i === index ? 'step' : undefined} onClick={() => choose(i)} className={`min-h-12 rounded-lg border text-xs ${i === index ? 'border-forest-900 bg-forest-900 text-white' : 'bg-cream-100'}`}><span className="block">{h.number}</span><strong>{card.gross_scores[i] ?? '·'}</strong></button>)}</nav>{summary.complete && <Button variant="outline" className="w-full" disabled={pending || dirty} onClick={() => setReviewRevision(card.revision)}>Review scorecard</Button>}</CardContent></Card>}
    {(reviewing || locked) && <ScorecardTable card={card} onEdit={locked || pending ? null : choose} />}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm"><p className="text-destructive">{error}</p><p className="mt-2">Your entry is still here. Retry saving, or reload the latest card to resolve a conflicting edit.</p><Button variant="outline" disabled={pending} className="mt-3" onClick={async () => { if (!await refresh()) return; setDraft(null); draftRevision.current = null; clearDraft(); setReviewRevision(null); setError(''); }}>Reload latest card</Button></div>}
    {reviewing && !locked && <div className="space-y-3">{reviewRevision !== card.revision && <Button variant="outline" className="w-full" onClick={() => setReviewRevision(card.revision)}>I’ve reviewed the updated card</Button>}<Button className="w-full" disabled={pending || !summary.complete || reviewRevision !== card.revision} onClick={() => act('submit')}>{pending ? 'Submitting…' : 'Submit score & lock card'}</Button><p className="text-center text-xs text-charcoal-600">{card.team_id ? 'Submits this shared score for every player on your team.' : 'Uploads your final score for this week.'} You cannot edit after submitting.</p></div>}
    {!dirty && !pending && <Button asChild variant="outline" className="w-full"><Link to={resultsUrl}>View live leaderboard</Link></Button>}
  </div>;
}
