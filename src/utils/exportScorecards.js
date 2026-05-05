import { jsPDF } from 'jspdf';
import { calc9HoleHandicap, calcTeamHandicap } from '../constants';
import { getHolesForWeek, getStrokesPerHole } from './scorecardStrokes';

const exportScorecardsPdf = ({ week, currentGame, getPlayerById }) => {
  if (!week || !week.teeSheet || week.teeSheet.length === 0) return;

  const playableSlots = week.teeSheet.filter((slot) => slot.players && slot.players.length > 0);
  if (playableSlots.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const holes = getHolesForWeek(week);
  const nineLabel = week.nineHoles === 'back' ? 'Back 9 (Holes 10-18)' : 'Front 9 (Holes 1-9)';
  const weekDate = new Date(week.date + 'T00:00:00');
  const weekDateStr = weekDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const parTotal = holes.reduce((s, h) => s + h.par, 0);
  const yardsTotal = holes.reduce((s, h) => s + h.yards, 0);
  const is2Person = currentGame?.teamType === '2-person';

  playableSlots.forEach((slot, slotIdx) => {
    if (slotIdx > 0) doc.addPage();
    drawScorecard(doc, {
      slot, week, weekDateStr, nineLabel, holes, parTotal, yardsTotal,
      currentGame, is2Person, getPlayerById, pageW, pageH, margin
    });
  });

  doc.save(`scorecards-${week.date}.pdf`);
};

const drawScorecard = (doc, ctx) => {
  const {
    slot, weekDateStr, nineLabel, holes, parTotal, yardsTotal,
    currentGame, is2Person, getPlayerById, pageW, pageH, margin
  } = ctx;

  // ---------- Header ----------
  let y = margin + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('The Lakes Golf League — Scorecard', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(weekDateStr, pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(nineLabel, pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Tee Time: ${slot.time}`, margin, y);
  if (currentGame?.gameName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(currentGame.gameName, pageW - margin, y, { align: 'right' });
  }
  y += 4;

  doc.setDrawColor(100, 120, 100);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // ---------- Table layout ----------
  const nameColW = 52;
  const totalsCols = ['OUT', 'GROSS', 'NET'];
  const totalsColW = 14;
  const totalsW = totalsColW * totalsCols.length;
  const holesAreaW = pageW - margin * 2 - nameColW - totalsW;
  const holeColW = holesAreaW / holes.length;

  const tableLeft = margin;
  const holesLeft = tableLeft + nameColW;
  const totalsLeft = holesLeft + holesAreaW;

  const headerRowH = 6;
  const playerRowH = 14;
  const numHeaderRows = 4; // Hole, Yards, Par, HCP

  const drawCellBorder = (x, yy, w, h) => {
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.2);
    doc.rect(x, yy, w, h);
  };

  // Header rows
  const headerStartY = y;
  const headers = [
    { label: 'Hole', values: holes.map((h) => String(h.number)), totalsLabels: totalsCols, bold: true, fill: [235, 240, 235] },
    { label: 'Yards', values: holes.map((h) => String(h.yards)), totalsLabels: [String(yardsTotal), '', ''] },
    { label: 'Par', values: holes.map((h) => String(h.par)), totalsLabels: [String(parTotal), '', ''], bold: true },
    { label: 'HCP', values: holes.map((h) => String(h.handicapIndex)), totalsLabels: ['', '', ''], italic: true }
  ];

  headers.forEach((row, rIdx) => {
    const rowY = headerStartY + rIdx * headerRowH;

    if (row.fill) {
      doc.setFillColor(...row.fill);
      doc.rect(tableLeft, rowY, pageW - margin * 2, headerRowH, 'F');
    }

    drawCellBorder(tableLeft, rowY, nameColW, headerRowH);
    doc.setFont('helvetica', row.bold ? 'bold' : (row.italic ? 'italic' : 'normal'));
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(row.label, tableLeft + 2, rowY + headerRowH - 1.8);

    holes.forEach((_, hIdx) => {
      const x = holesLeft + hIdx * holeColW;
      drawCellBorder(x, rowY, holeColW, headerRowH);
      doc.setFont('helvetica', row.bold ? 'bold' : (row.italic ? 'italic' : 'normal'));
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(row.values[hIdx], x + holeColW / 2, rowY + headerRowH - 1.8, { align: 'center' });
    });

    totalsCols.forEach((_, tIdx) => {
      const x = totalsLeft + tIdx * totalsColW;
      drawCellBorder(x, rowY, totalsColW, headerRowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(row.totalsLabels[tIdx] ?? '', x + totalsColW / 2, rowY + headerRowH - 1.8, { align: 'center' });
    });
  });

  let cursorY = headerStartY + numHeaderRows * headerRowH;

  // Player rows — pad to 4 so the layout is consistent
  const playerSlots = [0, 1, 2, 3].map((i) => slot.players[i] ?? null);

  // Optional team handicap line above team B's row
  const teamHcp = (() => {
    if (!is2Person || !currentGame?.showTeamHandicap) return null;
    const fmt = currentGame?.handicapFormat || 'scramble';
    const teamA = playerSlots.slice(0, 2).filter((id) => id != null)
      .map((id) => calc9HoleHandicap(getPlayerById(id)?.handicap));
    const teamB = playerSlots.slice(2, 4).filter((id) => id != null)
      .map((id) => calc9HoleHandicap(getPlayerById(id)?.handicap));
    return {
      a: teamA.length ? calcTeamHandicap(teamA, fmt) : null,
      b: teamB.length ? calcTeamHandicap(teamB, fmt) : null
    };
  })();

  playerSlots.forEach((playerId, pIdx) => {
    const player = playerId != null ? getPlayerById(playerId) : null;

    // Team divider banner before player 0 and player 2 in 2-person games
    if (is2Person && (pIdx === 0 || pIdx === 2)) {
      const teamLabel = pIdx === 0 ? 'Team A' : 'Team B';
      const tHcp = teamHcp ? (pIdx === 0 ? teamHcp.a : teamHcp.b) : null;
      doc.setFillColor(245, 240, 220);
      doc.rect(tableLeft, cursorY, pageW - margin * 2, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 70, 30);
      doc.text(teamLabel, tableLeft + 2, cursorY + 3.6);
      if (tHcp != null) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Team HCP ${tHcp}`, pageW - margin - 2, cursorY + 3.6, { align: 'right' });
      }
      cursorY += 5;
    }

    const rowY = cursorY;

    // Name cell
    drawCellBorder(tableLeft, rowY, nameColW, playerRowH);
    doc.setFont('helvetica', player ? 'bold' : 'italic');
    doc.setFontSize(11);
    doc.setTextColor(player ? 0 : 150, player ? 0 : 150, player ? 0 : 150);
    doc.text(player ? player.name : '—', tableLeft + 2, rowY + 6);
    if (player) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`HCP ${calc9HoleHandicap(player.handicap)} (${player.handicap})`, tableLeft + 2, rowY + 11);
      doc.setTextColor(0, 0, 0);
    }

    // Hole score boxes with stroke dots
    const strokes = player ? getStrokesPerHole(player.handicap, ctx.week) : holes.map(() => 0);
    holes.forEach((_, hIdx) => {
      const x = holesLeft + hIdx * holeColW;
      drawCellBorder(x, rowY, holeColW, playerRowH);

      const dotCount = strokes[hIdx] || 0;
      if (dotCount > 0) {
        doc.setFillColor(0, 0, 0);
        const r = 0.9;
        const cy = rowY + 2.4;
        if (dotCount === 1) {
          doc.circle(x + holeColW / 2, cy, r, 'F');
        } else {
          // 2 dots side by side near the top
          doc.circle(x + holeColW / 2 - 1.6, cy, r, 'F');
          doc.circle(x + holeColW / 2 + 1.6, cy, r, 'F');
        }
      }
    });

    // Empty totals boxes
    totalsCols.forEach((_, tIdx) => {
      const x = totalsLeft + tIdx * totalsColW;
      drawCellBorder(x, rowY, totalsColW, playerRowH);
    });

    cursorY += playerRowH;
  });

  // ---------- Footer ----------
  const footY = pageH - margin - 8;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const sigW = 70;
  doc.text('Attest:', margin, footY);
  doc.line(margin + 14, footY + 0.5, margin + 14 + sigW, footY + 0.5);

  doc.text('Player:', margin + 14 + sigW + 12, footY);
  doc.line(margin + 14 + sigW + 12 + 14, footY + 0.5, margin + 14 + sigW + 12 + 14 + sigW, footY + 0.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('• = stroke given on this hole', pageW - margin, footY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
};

export default exportScorecardsPdf;
