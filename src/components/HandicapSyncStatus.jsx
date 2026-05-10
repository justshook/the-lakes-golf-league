import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const STATUS_STYLES = {
  success: 'bg-forest-800 text-cream-200',
  partial: 'bg-gold-500/20 text-gold-700',
  failed:  'bg-red-600 text-white',
  running: 'bg-cream-300 text-charcoal-800'
};

const fmtRunDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
};

export default function HandicapSyncStatus() {
  const [run, setRun]       = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('handicap_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      setRun(data);
      setLoad(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
        <div className="bg-cream-300 px-4 py-3">
          <h3 className="font-display font-semibold text-charcoal-950">⛳ Handicap Sync</h3>
        </div>
        <div className="p-4 text-charcoal-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
        <div className="bg-cream-300 px-4 py-3">
          <h3 className="font-display font-semibold text-charcoal-950">⛳ Handicap Sync</h3>
        </div>
        <div className="p-4 text-red-600 text-sm">
          Could not load sync status: {error}
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
        <div className="bg-cream-300 px-4 py-3">
          <h3 className="font-display font-semibold text-charcoal-950">⛳ Handicap Sync</h3>
        </div>
        <div className="p-4 text-charcoal-400 text-sm">
          No sync has run yet. The job runs automatically every Sunday at 5:00 PM Central.
        </div>
      </div>
    );
  }

  const summary  = run.summary || {};
  const changes  = summary.changes  || [];
  const skipped  = summary.skipped  || [];
  const errors   = summary.errors   || [];
  const statusClass = STATUS_STYLES[run.status] || STATUS_STYLES.running;

  return (
    <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
      <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
        <h3 className="font-display font-semibold text-charcoal-950">⛳ Handicap Sync</h3>
        <span className={`text-xs px-2.5 py-0.5 rounded-pill font-medium ${statusClass}`}>
          {run.status}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-sm text-charcoal-600">
          Last run: <span className="font-medium text-charcoal-950">{fmtRunDate(run.started_at)}</span>
          {summary.dryRun && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-pill bg-cream-300 text-charcoal-800">dry run</span>
          )}
          {typeof summary.totalProcessed === 'number' && (
            <span className="ml-2 text-charcoal-400">
              ({summary.totalProcessed} player{summary.totalProcessed === 1 ? '' : 's'} processed)
            </span>
          )}
        </div>

        {run.error_message && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-input px-3 py-2">
            {run.error_message}
          </div>
        )}

        <div>
          <h4 className="font-semibold text-charcoal-950 text-sm mb-1">
            Changed ({changes.length})
          </h4>
          {changes.length === 0 ? (
            <p className="text-sm text-charcoal-400">No handicap changes this week.</p>
          ) : (
            <ul className="text-sm divide-y divide-charcoal-800/10 border border-charcoal-800/10 rounded-input bg-cream-100">
              {changes.map(c => (
                <li key={c.playerId} className="px-3 py-2 flex items-center justify-between">
                  <span className="text-charcoal-950">{c.name}</span>
                  <span className="text-charcoal-600">
                    <span className="line-through text-charcoal-400 mr-2">{c.previous}</span>
                    <span className="font-semibold">{c.new}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {skipped.length > 0 && (
          <div>
            <h4 className="font-semibold text-charcoal-950 text-sm mb-1">
              Skipped — no CDGA ID ({skipped.length})
            </h4>
            <ul className="text-sm border border-charcoal-800/10 rounded-input bg-cream-100 px-3 py-2 space-y-0.5">
              {skipped.map(s => (
                <li key={s.playerId} className="text-charcoal-600">{s.name}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 text-sm mb-1">
              Errors ({errors.length})
            </h4>
            <ul className="text-sm divide-y divide-red-200 border border-red-200 rounded-input bg-red-50">
              {errors.map(e => (
                <li key={e.playerId} className="px-3 py-2">
                  <span className="font-medium text-charcoal-950">{e.name}:</span>{' '}
                  <span className="text-red-700">{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
