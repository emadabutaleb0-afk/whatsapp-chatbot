// Performance dashboard — volume, response time, business KPIs, AI insights and activity trends.

import { $, esc, refreshIcons, toast, fmtDuration } from './ui.js';
import { api } from './api.js';
import { barChart, lineChart, donut, hourlyChart } from './charts.js';

let ctx = null;
let range = 30;
let data = null;
let loading = false;

export function initDashboard(context) {
  ctx = context;

  const rangeGroup = $('rangeGroup');
  if (rangeGroup) {
    rangeGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-range]');
      if (!b) return;
      range = Number(b.dataset.range);
      document.querySelectorAll('[data-range]').forEach((x) => x.classList.toggle('active', x === b));
      loadMetrics(true);
    });
  }

  const refreshBtn = $('refreshMetrics');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadMetrics(true));
  }

  const seedBtn = $('seedDemo');
  if (seedBtn) {
    seedBtn.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Loading…';
      try {
        await api.seedDemo();
        await loadMetrics(true);
        toast('Sample business data loaded.');
      } catch (err) {
        toast('Could not load sample data: ' + err.message, 'err');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Load sample data';
      }
    });
  }

  const resetBtn = $('resetMetrics');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      try {
        await api.clearMetrics();
        await loadMetrics(true);
        toast('Metrics reset.');
      } catch (err) {
        toast('Could not reset: ' + err.message, 'err');
      }
    });
  }

  const clearUnansweredBtn = $('clearUnanswered');
  if (clearUnansweredBtn) {
    clearUnansweredBtn.addEventListener('click', async () => {
      try {
        await api.clearUnanswered();
        await loadMetrics(true);
        toast('Unanswered questions cleared.');
      } catch (err) {
        toast('Could not clear: ' + err.message, 'err');
      }
    });
  }

  // Top questions and unanswered question clicks -> add to FAQ
  const topQList = $('topQuestions');
  if (topQList) {
    topQList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-q]');
      if (row && ctx && ctx.createFaqFrom) {
        ctx.createFaqFrom(row.dataset.q);
      }
    });
  }

  const unList = $('unansweredList');
  if (unList) {
    unList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-q]');
      if (row && ctx && ctx.createFaqFrom) {
        ctx.createFaqFrom(row.dataset.q);
      }
    });
  }

  // Click delegation for metric cards navigation (e.g. view orders/reservations)
  const metricCards = $('metricCards');
  if (metricCards) {
    metricCards.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav && ctx && ctx.goto) {
        ctx.goto(nav.dataset.nav);
      }
    });
  }

  // Click delegation for AI recommendations action buttons
  const insightsPanel = $('aiInsightsPanel');
  if (insightsPanel) {
    insightsPanel.addEventListener('click', (e) => {
      const faqBtn = e.target.closest('[data-faq-q]');
      if (faqBtn && ctx && ctx.createFaqFrom) {
        ctx.createFaqFrom(faqBtn.dataset.faqQ);
        return;
      }
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn && ctx && ctx.goto) {
        ctx.goto(navBtn.dataset.nav);
      }
    });
  }

  // Click delegation for Recent Activity Feed items
  const activityList = $('recentActivityList');
  if (activityList) {
    activityList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-jump]');
      if (row && ctx && ctx.goto) {
        ctx.goto(row.dataset.jump);
      }
    });
  }
}

export function getCurrentMetrics() {
  return data;
}

export async function loadMetrics(force = false) {
  if (loading) return;
  if (data && !force && data.days === range) {
    renderDashboard();
    return;
  }
  loading = true;
  if (!data) $('metricCards').innerHTML = skeletonCards();
  try {
    data = await api.metrics(range);
    renderDashboard();
  } catch (e) {
    $('metricCards').innerHTML = `<div class="metric sm:col-span-2 lg:col-span-4"><p class="text-sm text-rose-600">Could not load metrics: ${esc(e.message)}</p></div>`;
  } finally {
    loading = false;
  }
}

function skeletonCards() {
  return Array.from({ length: 8 }).map(() =>
    '<div class="metric"><div class="h-3 w-24 rounded bg-slate-100 animate-pulse"></div><div class="mt-3 h-7 w-16 rounded bg-slate-100 animate-pulse"></div></div>').join('');
}

function half(series, fn) {
  const mid = Math.floor(series.length / 2);
  const a = series.slice(0, mid).reduce((s, d) => s + (fn(d) || 0), 0);
  const b = series.slice(mid).reduce((s, d) => s + (fn(d) || 0), 0);
  return { prev: a, curr: b };
}

function deltaHTML(curr, prev, { invert = false, suffix = '%' } = {}) {
  if (!prev && !curr) return '<span class="text-slate-400">No trend yet</span>';
  if (!prev) return '<span class="delta-up font-medium">New activity</span>';
  const pct = ((curr - prev) / prev) * 100;
  const good = invert ? pct < 0 : pct > 0;
  const arrow = pct >= 0 ? '▲' : '▼';
  if (Math.abs(pct) < 1) return '<span class="text-slate-400">Flat vs. previous</span>';
  return `<span class="${good ? 'delta-up' : 'delta-down'} font-medium">${arrow} ${Math.abs(pct).toFixed(0)}${suffix}</span> <span class="text-slate-400">vs. prev</span>`;
}

function metricCard(icon, label, value, sub) {
  return `<div class="metric">
    <p class="metric-label"><i data-lucide="${icon}" class="h-3.5 w-3.5 text-[#128C7E]"></i> ${esc(label)}</p>
    <p class="metric-value">${value}</p>
    <p class="metric-sub">${sub}</p>
  </div>`;
}

function satisfactionScore(t) {
  const rated = (t.pos || 0) + (t.neg || 0);
  if (!rated) return null;
  return (t.pos / rated) * 100;
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function renderDashboard() {
  if (!data) return;
  const t = data.totals || { messages: 0, faqHits: 0, fallbacks: 0, pos: 0, neg: 0, neutral: 0 };
  const b = data.business || {
    totalOrders: 0,
    totalRevenue: 0,
    totalReservations: 0,
    totalGuests: 0,
    totalCustomers: 0,
    repeatRate: 0,
    openHandoffs: 0,
    autoRate: 92
  };
  const series = data.series || [];

  /* ---- 8 Executive KPI Cards ---- */
  const vol = half(series, (d) => d.messages);
  const rtHalf = (() => {
    const mid = Math.floor(series.length / 2);
    const avg = (arr) => {
      const c = arr.reduce((s, d) => s + (d.msCount || 0), 0);
      const ms = arr.reduce((s, d) => s + (d.msTotal || 0), 0);
      return c ? ms / c : 0;
    };
    return { prev: avg(series.slice(0, mid)), curr: avg(series.slice(mid)) };
  })();
  const sat = satisfactionScore(t);
  const satHalf = (() => {
    const mid = Math.floor(series.length / 2);
    const sc = (arr) => {
      const p = arr.reduce((s, d) => s + (d.pos || 0), 0);
      const n = arr.reduce((s, d) => s + (d.neg || 0), 0);
      return p + n ? (p / (p + n)) * 100 : 0;
    };
    return { prev: sc(series.slice(0, mid)), curr: sc(series.slice(mid)) };
  })();
  const autoRate = b.autoRate ?? (t.messages ? Math.round(((t.messages - t.fallbacks) / t.messages) * 100) : 92);

  $('metricCards').innerHTML = [
    // 1. Messages handled
    metricCard('message-square', 'Messages Handled', (t.messages || 0).toLocaleString(),
      deltaHTML(vol.curr, vol.prev)),

    // 2. Automation rate
    metricCard('bot', 'AI Automation Rate', autoRate + '%',
      `<span class="text-slate-400">${(t.faqHits || 0).toLocaleString()} automated · ${t.fallbacks || 0} escalated</span>`),

    // 3. Response time
    metricCard('timer', 'Avg. Response Time', fmtDuration(data.avgMs),
      rtHalf.prev ? deltaHTML(rtHalf.curr, rtHalf.prev, { invert: true }) : '<span class="text-emerald-600 font-medium">Lightning-fast</span>'),

    // 4. CSAT
    metricCard('smile', 'Satisfaction (CSAT)', sat === null ? '—' : Math.round(sat) + '%',
      sat === null ? '<span class="text-slate-400">Waiting for reactions</span>' : deltaHTML(satHalf.curr, satHalf.prev, { suffix: ' pts' })),

    // 5. Car Bookings placed
    metricCard('check-circle-2', 'Car Bookings', (b.totalOrders || 0).toString(),
      `<span class="cursor-pointer font-medium text-emerald-600 hover:underline" data-nav="orders">View car bookings →</span>`),

    // 6. Direct revenue
    metricCard('badge-dollar-sign', 'Dealership Volume', `${(b.totalRevenue || 0).toLocaleString()} <span class="text-sm font-normal text-slate-500">EGP</span>`,
      `<span class="text-slate-400">Total vehicle bookings</span>`),

    // 7. Test drives & Showroom visits
    metricCard('gauge', 'Test Drives', (b.totalReservations || 0).toString(),
      `<span class="cursor-pointer font-medium text-emerald-600 hover:underline" data-nav="reservations">${b.totalGuests || 0} scheduled viewings →</span>`),

    // 8. Active clients
    metricCard('users', 'Car Buyers & Clients', (b.totalCustomers || 0).toString(),
      `<span class="text-slate-400">${b.repeatRate || 0}% returning clients</span>`)
  ].join('');

  /* ---- AI Assistant Insights & Recommendations ---- */
  renderAiInsights(data.insights || []);

  /* ---- Charts ---- */
  $('volumeChart').innerHTML = barChart(series, { total: (d) => d.messages, sub: (d) => d.faqHits });

  $('rtChart').innerHTML = lineChart(series, (d) => (d.msCount ? d.msTotal / d.msCount / 1000 : null), {
    suffix: 's', fmt: (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1)),
  });

  $('satGauge').innerHTML = sat === null
    ? `<div class="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No satisfaction signals yet.<br><span class="text-xs text-slate-400">Clients thanking the bot or reacting 👍 count as positive.</span></div>`
    : donut(sat, `<p class="font-medium text-slate-900">${(t.pos || 0).toLocaleString()} happy</p>
         <p class="mt-0.5 text-xs text-slate-500">${(t.neg || 0).toLocaleString()} unhappy · ${(t.neutral || 0).toLocaleString()} neutral</p>
         <p class="mt-2 text-xs font-medium ${satHalf.curr >= satHalf.prev ? 'text-emerald-600' : 'text-rose-600'}">
           ${satHalf.prev ? (satHalf.curr >= satHalf.prev ? '▲ Trending up' : '▼ Trending down') : 'Building history'}
         </p>`);

  $('satChart').innerHTML = lineChart(series, (d) => {
    const r = (d.pos || 0) + (d.neg || 0);
    return r ? Math.round((d.pos / r) * 100) : null;
  }, { suffix: '%', fmt: (v) => v.toFixed(0) });

  /* ---- 24-Hour Peak Activity Chart ---- */
  const hourlyEl = $('hourlyChart');
  if (hourlyEl) {
    hourlyEl.innerHTML = hourlyChart(data.hourly || []);
  }

  /* ---- Live Activity Feed ---- */
  renderRecentActivity(data.recentActivity || []);

  /* ---- Topics ---- */
  const topics = data.topics || [];
  const maxTopic = Math.max(1, ...topics.map((x) => x.count));
  $('topicList').innerHTML = topics.length
    ? topics.map((x) => `<div class="topic-row">
          <span class="w-[110px] shrink-0 truncate text-slate-600">${esc(x.label)}</span>
          <span class="topic-bar"><span style="width:${(x.count / maxTopic) * 100}%"></span></span>
          <span class="w-8 shrink-0 text-right text-xs font-medium text-slate-500">${x.count}</span>
        </div>`).join('')
    : '<p class="text-sm text-slate-500">No client questions recorded yet.</p>';

  /* ---- Questions ---- */
  const tq = data.topQuestions || [];
  $('topQuestions').innerHTML = tq.length
    ? tq.map((q, i) => `<button class="q-row" data-q="${esc(q.question)}" title="Click to add as FAQ answer">
          <span class="q-rank">${i + 1}</span>
          <span class="q-text">${esc(q.question)}</span>
          <span class="q-count">${q.count}×</span>
          <i data-lucide="plus" class="h-3.5 w-3.5 flex-none text-slate-300"></i>
        </button>`).join('')
    : `<p class="text-sm text-slate-500">Nothing yet. Once clients start messaging, their most repeated questions appear here — one tap turns any of them into a saved FAQ answer.</p>`;

  const un = data.unanswered || [];
  $('unansweredList').innerHTML = un.length
    ? un.slice(0, 8).map((u) => `<button class="q-row" data-q="${esc(u.question)}" title="Click to add as FAQ answer">
          <i data-lucide="circle-help" class="h-3.5 w-3.5 flex-none text-amber-500"></i>
          <span class="q-text">${esc(u.question)}</span>
          <span class="q-count">${u.count || 1}×</span>
        </button>`).join('')
    : '<p class="text-sm text-slate-500">Nothing unanswered — your bot had an answer for every question.</p>';

  refreshIcons();
}

function renderAiInsights(insights) {
  const panel = $('aiInsightsPanel');
  if (!panel) return;
  if (!insights || !insights.length) {
    panel.innerHTML = '';
    return;
  }

  const itemsHTML = insights.map((item) => {
    const toneClass = item.tone === 'action' ? 'insight-action' : item.tone === 'success' ? 'insight-success' : 'insight-info';
    const actionBtn = item.actionQuestion
      ? `<button class="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-amber-600 shadow-sm" data-faq-q="${esc(item.actionQuestion)}">
          <i data-lucide="plus-circle" class="h-3 w-3"></i> Add FAQ Answer
        </button>`
      : '';

    return `<div class="insight-card ${toneClass}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <i data-lucide="${esc(item.icon || 'sparkles')}" class="h-3.5 w-3.5 text-[#128C7E]"></i>
          <span>${esc(item.category || 'AI Insight')}</span>
        </div>
      </div>
      <h4 class="mt-1 text-xs font-semibold text-slate-900">${esc(item.title)}</h4>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-600">${esc(item.description)}</p>
      ${actionBtn}
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <i data-lucide="sparkles" class="h-4 w-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900">AI Assistant Intelligence &amp; Recommendations</h3>
            <p class="text-xs text-slate-500">Automated actionable insights extracted from your live client conversations</p>
          </div>
        </div>
        <span class="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-700">Live AI Analysis</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        ${itemsHTML}
      </div>
    </div>
  `;
}

function renderRecentActivity(activities) {
  const container = $('recentActivityList');
  if (!container) return;

  if (!activities || !activities.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 py-3 text-center">No recent activity logged yet.</p>';
    return;
  }

  container.innerHTML = activities.slice(0, 6).map((act) => {
    let iconName = 'message-circle';
    let iconColor = 'text-slate-400 bg-slate-100';
    let jumpTarget = 'dashboard';
    let statusBadge = '';

    if (act.type === 'order') {
      iconName = 'shopping-bag';
      iconColor = 'text-emerald-600 bg-emerald-50';
      jumpTarget = 'orders';
      statusBadge = `<span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 capitalize">${esc(act.status || 'order')}</span>`;
    } else if (act.type === 'reservation') {
      iconName = 'calendar';
      iconColor = 'text-sky-600 bg-sky-50';
      jumpTarget = 'reservations';
      statusBadge = `<span class="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 capitalize">${esc(act.status || 'booked')}</span>`;
    } else if (act.type === 'handoff') {
      iconName = 'life-buoy';
      iconColor = 'text-amber-600 bg-amber-50';
      jumpTarget = 'livechat';
      statusBadge = `<span class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 capitalize">Handoff</span>`;
    }

    return `<div class="activity-row cursor-pointer" data-jump="${jumpTarget}" title="Click to view details">
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconColor}">
        <i data-lucide="${iconName}" class="h-3.5 w-3.5"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-1">
          <p class="truncate text-xs font-semibold text-slate-800">${esc(act.title)}</p>
          <span class="shrink-0 text-[10px] text-slate-400">${formatRelativeTime(act.at)}</span>
        </div>
        <div class="mt-0.5 flex items-center justify-between gap-1">
          <p class="truncate text-[11px] text-slate-500">${esc(act.detail)}</p>
          ${statusBadge}
        </div>
      </div>
    </div>`;
  }).join('');
}

