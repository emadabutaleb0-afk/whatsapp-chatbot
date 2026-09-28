// Tiny dependency-free SVG charts for ClientBot

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function niceMax(v) {
  if (v <= 4) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function xLabels(series) {
  const n = series.length;
  const every = n <= 8 ? 1 : n <= 14 ? 2 : n <= 34 ? 5 : 15;
  return series.map((d, i) => (i === n - 1 || i % every === 0 ? d.date.slice(5) : ''));
}

/**
 * Stacked bar chart: total bars with a highlighted sub-portion.
 */
export function barChart(series, { total, sub }) {
  const W = 720, H = 220, padL = 34, padR = 8, padT = 12, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = niceMax(Math.max(1, ...series.map((d) => total(d))));
  const bw = Math.max(2, (iw / Math.max(series.length, 1)) * 0.62);
  const step = iw / Math.max(series.length, 1);
  const labels = xLabels(series);

  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ih / 4) * i;
    const val = Math.round(max - (max / 4) * i);
    g += `<line class="grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>`;
    g += `<text class="axis-text" x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${val}</text>`;
  }

  let bars = '';
  series.forEach((d, i) => {
    const t = total(d), s = sub ? sub(d) : 0;
    const x = padL + step * i + (step - bw) / 2;
    const ht = (t / max) * ih, hs = (Math.min(s, t) / max) * ih;
    if (t > 0) {
      bars += `<rect class="bar" x="${x.toFixed(1)}" y="${(padT + ih - ht).toFixed(1)}" width="${bw.toFixed(1)}" height="${ht.toFixed(1)}" rx="2"><title>${esc(d.date)}: ${t} messages</title></rect>`;
      if (hs > 0) bars += `<rect class="bar-sub" x="${x.toFixed(1)}" y="${(padT + ih - hs).toFixed(1)}" width="${bw.toFixed(1)}" height="${hs.toFixed(1)}" rx="2"><title>${esc(d.date)}: ${s} matched an FAQ answer</title></rect>`;
    }
    if (labels[i]) bars += `<text class="axis-text" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}${bars}</svg>`;
}

/**
 * Line / area chart. value() may return null for gaps.
 */
export function lineChart(series, value, { suffix = '', fmt = (v) => String(v) } = {}) {
  const W = 720, H = 200, padL = 40, padR = 8, padT = 12, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = series.map(value);
  const present = vals.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!present.length) {
    return `<svg viewBox="0 0 ${W} ${H}"><text class="axis-text" x="${W / 2}" y="${H / 2}" text-anchor="middle" style="font-size:12px">No data yet</text></svg>`;
  }
  const max = niceMax(Math.max(...present));
  const step = series.length > 1 ? iw / (series.length - 1) : 0;
  const labels = xLabels(series);

  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ih / 4) * i;
    const val = max - (max / 4) * i;
    g += `<line class="grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>`;
    g += `<text class="axis-text" x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${esc(fmt(val))}${esc(suffix)}</text>`;
  }

  const pt = (i, v) => [padL + step * i, padT + ih - (v / max) * ih];
  let d = '', started = false, area = '', dots = '', firstX = null, lastX = null;
  vals.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) { started = false; return; }
    const [x, y] = pt(i, v);
    d += (started ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
    area += (firstX === null ? 'M' + x.toFixed(1) + ' ' + y.toFixed(1) : ' L' + x.toFixed(1) + ' ' + y.toFixed(1));
    if (firstX === null) firstX = x;
    lastX = x;
    started = true;
    if (series.length <= 32) dots += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"><title>${esc(series[i].date)}: ${esc(fmt(v))}${esc(suffix)}</title></circle>`;
  });
  if (firstX !== null) area += ` L${lastX.toFixed(1)} ${(padT + ih).toFixed(1)} L${firstX.toFixed(1)} ${(padT + ih).toFixed(1)} Z`;

  let xl = '';
  series.forEach((s, i) => {
    if (labels[i]) xl += `<text class="axis-text" x="${(padL + step * i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}<path class="line-area" d="${area}"/><path class="line-path" d="${d}"/>${dots}${xl}</svg>`;
}

/**
 * Donut gauge for a 0-100 score.
 */
export function donut(score, label) {
  const r = 46, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const on = (pct / 100) * c;
  const color = pct >= 75 ? '#059669' : pct >= 50 ? '#128C7E' : pct >= 30 ? '#d97706' : '#e11d48';
  return `<div class="flex items-center gap-4">
    <svg viewBox="0 0 120 120" class="h-[104px] w-[104px] shrink-0">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="11"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
        stroke-dasharray="${on.toFixed(1)} ${(c - on).toFixed(1)}" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" style="font-size:22px;font-weight:600;fill:#0f172a">${Math.round(pct)}%</text>
      <text x="60" y="76" text-anchor="middle" style="font-size:10px;fill:#94a3b8">positive</text>
    </svg>
    <div class="min-w-0 text-sm">${label}</div>
  </div>`;
}

/**
 * 24-hour distribution bar chart
 */
export function hourlyChart(hourly) {
  if (!hourly || !hourly.length) {
    return `<div class="py-8 text-center text-xs text-slate-400">No hourly activity recorded yet</div>`;
  }

  const W = 720, H = 160, padL = 34, padR = 12, padT = 12, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const getCount = (h) => (h.messages != null ? h.messages : (h.count != null ? h.count : 0));
  const max = niceMax(Math.max(1, ...hourly.map(getCount)));
  const step = iw / 24;
  const bw = Math.max(4, step * 0.65);

  let g = '';
  for (let i = 0; i <= 3; i++) {
    const y = padT + (ih / 3) * i;
    const val = Math.round(max - (max / 3) * i);
    g += `<line class="grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>`;
    g += `<text class="axis-text" x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${val}</text>`;
  }

  const peakCount = Math.max(...hourly.map(getCount));

  let bars = '';
  hourly.forEach((h, i) => {
    const count = getCount(h);
    const hourLabel = h.label || (typeof h.hour === 'number' ? `${String(h.hour).padStart(2, '0')}:00` : String(h.hour || ''));
    const x = padL + step * i + (step - bw) / 2;
    const ht = (count / max) * ih;
    const isPeak = count === peakCount && count > 0;
    const fillClass = isPeak ? 'bar-peak' : 'bar-hourly';
    const autoHits = h.faqHits != null ? h.faqHits : (h.faq != null ? h.faq : 0);

    bars += `<rect class="${fillClass}" x="${x.toFixed(1)}" y="${(padT + ih - ht).toFixed(1)}" width="${bw.toFixed(1)}" height="${ht.toFixed(1)}" rx="2">
      <title>${esc(hourLabel)}: ${count} client messages (${autoHits} automated)</title>
    </rect>`;

    // Show label every 3 hours
    if (i % 3 === 0 || i === 23) {
      const shortHour = hourLabel.length >= 2 ? hourLabel.slice(0, 2) : String(i).padStart(2, '0');
      bars += `<text class="axis-text" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(shortHour)}</text>`;
    }
  });

  return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}${bars}</svg>`;
}

