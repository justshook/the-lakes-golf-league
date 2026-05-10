import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { loginGhin, fetchHandicap } from './_lib/ghin.js';

const DELAY_MS = 250;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const isValidCdgaId = (id) => typeof id === 'string' && /^\d+$/.test(id.trim());

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true';

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from('handicap_sync_runs')
    .insert({ status: 'running', summary: { dryRun } })
    .select('id')
    .single();
  if (runErr) {
    return res.status(500).json({ error: 'Failed to create run row', detail: runErr.message });
  }
  const runId = runRow.id;

  const summary = {
    dryRun,
    totalProcessed: 0,
    changes: [],
    skipped: [],
    errors: []
  };

  try {
    const { data: players, error: playersErr } = await supabaseAdmin
      .from('players')
      .select('id, name, handicap, cdga_id')
      .order('id');
    if (playersErr) throw new Error(`Failed to load players: ${playersErr.message}`);

    const token = await loginGhin();

    for (const player of players) {
      summary.totalProcessed += 1;
      const cdgaId = (player.cdga_id || '').trim();

      if (!isValidCdgaId(cdgaId)) {
        summary.skipped.push({
          playerId: player.id,
          name: player.name,
          reason: cdgaId ? 'invalid-cdga-id' : 'no-cdga-id'
        });
        continue;
      }

      try {
        const newHandicap = await fetchHandicap(token, cdgaId);
        const previous = Number(player.handicap);
        const rounded = Math.round(newHandicap);

        if (!dryRun) {
          const { error: updateErr } = await supabaseAdmin
            .from('players')
            .update({ handicap: rounded })
            .eq('id', player.id);
          if (updateErr) throw new Error(`update players failed: ${updateErr.message}`);

          const { error: histErr } = await supabaseAdmin
            .from('handicap_history')
            .insert({ player_id: player.id, handicap: newHandicap });
          if (histErr) throw new Error(`insert handicap_history failed: ${histErr.message}`);
        }

        if (rounded !== previous) {
          summary.changes.push({
            playerId: player.id,
            name: player.name,
            previous,
            new: rounded,
            index: newHandicap
          });
        }
      } catch (err) {
        summary.errors.push({
          playerId: player.id,
          name: player.name,
          message: err.message || String(err)
        });
      }

      await sleep(DELAY_MS);
    }

    const status = summary.errors.length === 0 ? 'success' : 'partial';
    await supabaseAdmin
      .from('handicap_sync_runs')
      .update({ status, finished_at: new Date().toISOString(), summary })
      .eq('id', runId);

    return res.status(200).json({ runId, status, summary });
  } catch (err) {
    await supabaseAdmin
      .from('handicap_sync_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        summary,
        error_message: err.message || String(err)
      })
      .eq('id', runId);
    return res.status(500).json({ runId, status: 'failed', error: err.message || String(err) });
  }
}
