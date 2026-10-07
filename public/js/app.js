// Main application coordinator for ClientBot

import { $, esc, refreshIcons, toast, fmtText } from './ui.js';
import { api } from './api.js';
import { initDashboard, loadMetrics, getCurrentMetrics } from './dashboard.js';
import { initFaq, renderFaq, collectFaqs, addEntry } from './faq.js';
import { initChat, loadConversations, sendMessage } from './chat.js';
import { initOrders, loadOrders } from './orders.js';
import { initReservations, loadReservations } from './reservations.js';
import { initLiveChat, loadLiveChat } from './livechat.js';
import { initBroadcast, loadBroadcast } from './broadcast.js';
import { initTeam, loadTeam, applyPermissions, currentRole } from './team.js';
import { initTemplates, loadTemplates } from './templates.js';
import { initHelpCenter, loadHelpCenter } from './helpcenter.js';
import { exportLogsCSV, exportLogsPDF, exportMetricsCSV, exportMetricsPDF } from './export.js';
import { applyLanguage, toggleLanguage, getLang } from './i18n.js';
import { initAdminAI, loadAdminAI } from './admin-ai.js';

const state = {
  view: 'dashboard',
  config: null,
  convIndex: [],
  convId: null,
  messages: [],
  streaming: false,
  dirty: false,
  logs: []
};

/* ============================== Boot ============================== */

async function boot() {
  // Apply saved theme (night mode default preference support)
  const savedTheme = localStorage.getItem('alfares_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeButtonUI();

  // Apply default language (Arabic full localization)
  applyLanguage(getLang());

  refreshIcons();

  // Dismiss loading screen with smooth transition
  const loader = $('appLoader');
  if (loader) {
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 500);
  }

  const webhookDisplay = window.location.origin + '/webhook';
  const whEl = $('webhookUrl');
  if (whEl) whEl.textContent = webhookDisplay;

  // Auto-sync Puter.js auth token to backend if available in browser
  try {
    const puterToken = window.puter?.authToken || localStorage.getItem('puter_auth_token') || sessionStorage.getItem('puter_auth_token');
    if (puterToken) {
      api.syncPuterToken(puterToken).catch(() => {});
    }
  } catch (e) {}

  wireUI();

  const context = {
    state,
    markDirty,
    save: saveAll,
    goto: setView,
    createFaqFrom: (q) => {
      setView('faq');
      addEntry({ question: q });
    },
    testInChat: (q) => {
      setView('chat');
      sendMessage(q);
    }
  };

  initDashboard(context);
  initFaq(context);
  initChat(context);
  initOrders();
  initReservations();
  initLiveChat();
  initBroadcast();
  initTeam((newRole) => {
    applyPermissions(newRole);
  });
  initTemplates();
  initHelpCenter(context);
  initAdminAI(context);

  await Promise.all([loadConfig(), loadConversations()]);

  setView('dashboard');
  setInterval(pollStatus, 25000);
}

/* ============================== Config & Status ============================== */

async function loadConfig() {
  try {
    const data = await api.getConfig();
    state.config = data.config || {};
    fillForms(state.config);
    updateStatusChips();
    renderProducts();
    renderFaq();
  } catch (err) {
    toast('Could not load configuration: ' + err.message, 'err');
  }
}

async function pollStatus() {
  try {
    const s = await api.status();
    updateStatusChips(s);
  } catch (e) {}
}

function updateStatusChips(statusData) {
  const w = (state.config && state.config.whatsapp) || {};
  const b = (state.config && state.config.business) || {};

  const connected = !!(w.phoneNumberId && w.verifyToken && (w.hasAccessToken || w.accessToken));
  const live = connected && w.autoReply !== false;

  const sideBiz = $('sideBizName');
  if (sideBiz) sideBiz.textContent = b.name || 'Set up your business';

  const botState = $('botState');
  if (botState) {
    botState.innerHTML = live
      ? '<span class="text-emerald-600 font-medium">● Live on WhatsApp</span>'
      : connected
        ? '<span class="text-amber-600 font-medium">● Auto-reply paused</span>'
        : '<span class="text-slate-400">● Not connected</span>';
  }

  const dot = $('waStatusDot');
  if (dot) {
    dot.className = 'h-2.5 w-2.5 rounded-full ' + (live ? 'bg-emerald-500' : connected ? 'bg-amber-500' : 'bg-slate-300');
  }

  const waText = $('waStatusText');
  if (waText) {
    waText.textContent = live
      ? 'Connected — clients are answered automatically 24/7'
      : connected
        ? 'Connected — auto-reply is paused'
        : 'Not connected';
  }

  const verifyEcho = $('verifyEcho');
  if (verifyEcho) {
    verifyEcho.textContent = w.verifyToken || '—';
  }

  // Update badges
  if (statusData) {
    const ordBadge = $('ordersCountBadge');
    if (ordBadge && statusData.ordersCount !== undefined) {
      ordBadge.textContent = String(statusData.ordersCount);
      ordBadge.classList.toggle('hidden', statusData.ordersCount === 0);
    }
  }
}

function fillForms(cfg) {
  const b = cfg.business || {};
  const w = cfg.whatsapp || {};

  const map = {
    f_name: b.name,
    f_tagline: b.tagline,
    f_about: b.about,
    f_hours: b.hours,
    f_location: b.location,
    f_maps: b.mapsUrl,
    f_phone: b.phone,
    f_delivery: b.delivery,
    f_payment: b.payment,
    f_policies: b.policies,
    f_faqs: b.faqs,
    f_language: b.language,
    f_tone: b.tone,
    f_lat: b.latitude,
    f_lng: b.longitude,
    f_fallback: w.fallback,
    f_phoneId: w.phoneNumberId,
    f_verify: w.verifyToken
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = $(id);
    if (el) el.value = val || '';
  });

  const tokenInput = $('f_token');
  if (tokenInput) {
    tokenInput.value = '';
    tokenInput.placeholder = w.hasAccessToken ? '•••• saved token' : 'EAAG…';
  }

  const autoReplyBox = $('f_autoReply');
  if (autoReplyBox) {
    autoReplyBox.checked = w.autoReply !== false;
  }
}

function collectForms() {
  const cfg = state.config || {};
  const payload = {
    business: {
      name: $('f_name')?.value.trim() || '',
      tagline: $('f_tagline')?.value.trim() || '',
      about: $('f_about')?.value.trim() || '',
      hours: $('f_hours')?.value.trim() || '',
      location: $('f_location')?.value.trim() || '',
      mapsUrl: $('f_maps')?.value.trim() || '',
      phone: $('f_phone')?.value.trim() || '',
      delivery: $('f_delivery')?.value.trim() || '',
      payment: $('f_payment')?.value.trim() || '',
      policies: $('f_policies')?.value.trim() || '',
      faqs: $('f_faqs')?.value.trim() || '',
      language: $('f_language')?.value.trim() || '',
      tone: $('f_tone')?.value.trim() || '',
      latitude: parseFloat($('f_lat')?.value) || 30.0444,
      longitude: parseFloat($('f_lng')?.value) || 31.2357
    },
    products: collectProducts(),
    faqEntries: collectFaqs(),
    whatsapp: {
      phoneNumberId: $('f_phoneId')?.value.trim() || '',
      verifyToken: $('f_verify')?.value.trim() || '',
      autoReply: $('f_autoReply')?.checked ?? true,
      fallback: $('f_fallback')?.value.trim() || "I'm not sure about that one — let me check with the team and get back to you shortly."
    }
  };

  const tok = $('f_token')?.value.trim();
  if (tok) {
    payload.whatsapp.accessToken = tok;
  }

  return payload;
}

function markDirty() {
  state.dirty = true;
  const saveBar = $('saveBar');
  if (saveBar) saveBar.classList.remove('hidden');
  const saveMsg = $('saveMsg');
  if (saveMsg) saveMsg.textContent = 'Unsaved changes';
}

async function saveAll() {
  const payload = collectForms();
  const saveBtn = $('saveBtn');
  const saveMsg = $('saveMsg');

  if (saveBtn) saveBtn.disabled = true;
  if (saveMsg) saveMsg.textContent = 'Saving…';

  try {
    const res = await api.saveConfig(payload);
    state.config = res.config;
    state.dirty = false;
    $('saveBar')?.classList.add('hidden');
    fillForms(state.config);
    updateStatusChips();
    toast('Saved — your bot now uses this updated information.');
  } catch (e) {
    if (saveMsg) saveMsg.textContent = 'Save failed';
    toast('Could not save: ' + e.message, 'err');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/* ============================== Cars Database / Products ============================== */

function productRow(p, i) {
  const isUsed = (p.category || '').toLowerCase().includes('used') || (p.category || '').includes('مستعمل');
  return `
  <div class="card" data-prod="${i}">
    <div class="flex items-start gap-3">
      <div class="grid flex-1 gap-3 md:grid-cols-2">
        <label class="field md:col-span-2">
          <div class="flex items-center justify-between">
            <span>Car Model &amp; Trim (Make, Model, Year)</span>
            <span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase ${isUsed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${isUsed ? 'Certified Used' : 'New / Zero'}</span>
          </div>
          <input class="inp p-name" value="${esc(p.name)}" placeholder="e.g. Mercedes-Benz C200 2024 AMG (Zero / New)">
        </label>
        <label class="field"><span>Price</span><input class="inp p-price" value="${esc(p.price)}" placeholder="e.g. 3,850,000 EGP"></label>
        <label class="field"><span>Category / Condition</span>
          <input class="inp p-cat" value="${esc(p.category)}" placeholder="New Cars (Zero) / Used Cars (Certified)">
        </label>
        <label class="field"><span>Availability / Stock</span><input class="inp p-stock" value="${esc(p.stock)}" placeholder="In Stock (Showroom)"></label>
        <label class="field"><span>Car Photo Link (Sent to clients via WhatsApp)</span><input class="inp p-image" value="${esc(p.image)}" placeholder="https://example.com/car.jpg"></label>
        <label class="field md:col-span-2"><span>Vehicle Specifications &amp; Warranty Details</span><input class="inp p-desc" value="${esc(p.description)}" placeholder="e.g. 1.5L Turbo 204hp, AMG Line, Panoramic roof, 0 km, 3-year warranty"></label>
      </div>
      <button class="p-del mt-6 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Remove Car">
        <i data-lucide="trash-2" class="h-4 w-4"></i>
      </button>
    </div>
  </div>`;
}

function renderProducts() {
  const list = (state.config && state.config.products) || [];
  const host = $('productList');
  if (!host) return;

  if (!list.length) {
    host.innerHTML = `
    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i data-lucide="car" class="mx-auto h-6 w-6 text-slate-300"></i>
      <p class="mt-3 text-sm font-medium text-slate-700">No cars in internal database</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add your new and used cars with exact specifications, prices, and photo links — the AI assistant quotes them and sends vehicle photos automatically on WhatsApp!</p>
    </div>`;
  } else {
    host.innerHTML = list.map(productRow).join('');
  }
  refreshIcons();
}

function collectProducts() {
  return [...document.querySelectorAll('[data-prod]')].map((row) => ({
    name: row.querySelector('.p-name')?.value.trim() || '',
    price: row.querySelector('.p-price')?.value.trim() || '',
    category: row.querySelector('.p-cat')?.value.trim() || '',
    stock: row.querySelector('.p-stock')?.value.trim() || '',
    image: row.querySelector('.p-image')?.value.trim() || '',
    description: row.querySelector('.p-desc')?.value.trim() || ''
  })).filter((p) => p.name || p.price);
}

/* ============================== Logs (Client Messages) ============================== */

function statusPill(s) {
  if (!s) return '';
  if (s === 'sent') return '<span class="pill pill-ok"><i data-lucide="check" class="h-3 w-3"></i> Replied</span>';
  if (s === 'human_takeover') return '<span class="pill bg-amber-50 text-amber-700 border border-amber-200">Human Takeover</span>';
  if (s === 'paused') return '<span class="pill pill-warn">Auto-reply off</span>';
  if (s === 'not_configured') return '<span class="pill pill-warn">Not connected</span>';
  return '<span class="pill pill-err">' + esc(s) + '</span>';
}

async function refreshLogs() {
  const host = $('logList');
  if (!host) return;
  host.innerHTML = '<p class="text-sm text-slate-500 py-4">Loading messages…</p>';
  try {
    const data = await api.logs();
    state.logs = data.logs || [];
  } catch (e) {
    host.innerHTML = '<p class="text-sm text-rose-600 py-4">Could not load messages: ' + esc(e.message) + '</p>';
    return;
  }

  if (!state.logs.length) {
    host.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i data-lucide="inbox" class="mx-auto h-6 w-6 text-slate-300"></i>
      <p class="mt-3 text-sm font-medium text-slate-700">No client messages yet</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">Every WhatsApp question and the bot or human response appears here.</p>
    </div>`;
    refreshIcons();
    return;
  }

  host.innerHTML = state.logs.map((l) => `
    <div class="card">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">${esc((l.name || l.from || '?').slice(0, 2).toUpperCase())}</span>
        <p class="text-sm font-medium text-slate-900">${esc(l.name || 'Client')}</p>
        <p class="text-xs text-slate-400 font-mono">+${esc(l.from || '')}</p>
        <span class="ml-auto text-xs text-slate-400">${l.at ? new Date(l.at).toLocaleString() : ''}</span>
        ${statusPill(l.status)}
      </div>
      <p class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">${fmtText(l.incoming || '—')}</p>
      ${l.reply ? `<p class="mt-2 rounded-lg bg-[#128C7E]/5 px-3 py-2 text-sm text-slate-700"><span class="mr-1 text-xs font-semibold ${l.isHuman ? 'text-amber-700' : 'text-[#0f766e]'}">${l.isHuman ? 'Staff:' : 'Bot:'}</span>${fmtText(l.reply)}</p>` : ''}
      ${l.error ? `<p class="mt-2 text-xs text-rose-600">${esc(l.error)}</p>` : ''}
    </div>`).join('');
  refreshIcons();
}

/* ============================== Views Navigation ============================== */

function setView(view) {
  state.view = view;
  document.querySelectorAll('.pane').forEach((p) => {
    const on = p.dataset.pane === view;
    p.classList.toggle('hidden', !on);
    p.classList.toggle('flex', on && (view === 'chat' || view === 'livechat'));
  });

  document.querySelectorAll('[data-view]').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  const convPanel = $('convPanel');
  if (convPanel) {
    convPanel.style.display = view === 'chat' ? 'flex' : 'none';
  }

  if (view === 'dashboard') loadMetrics();
  if (view === 'admin-ai') loadAdminAI();
  if (view === 'faq') renderFaq();
  if (view === 'products') renderProducts();
  if (view === 'orders') loadOrders();
  if (view === 'reservations') loadReservations();
  if (view === 'livechat') loadLiveChat();
  if (view === 'broadcast') loadBroadcast();
  if (view === 'team') loadTeam();
  if (view === 'templates') loadTemplates();
  if (view === 'helpcenter') loadHelpCenter();
  if (view === 'logs') refreshLogs();

  applyPermissions(currentRole);
}

/* ============================== Wiring UI Events ============================== */

function wireUI() {
  // Theme (Night Mode) toggle
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('alfares_theme', isDark ? 'dark' : 'light');
    updateThemeButtonUI();
    toast(isDark ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️');
    refreshIcons();
  };

  $('themeToggleBtn')?.addEventListener('click', toggleTheme);
  $('themeToggleMobileBtn')?.addEventListener('click', toggleTheme);

  // Language toggle (Arabic <-> English)
  const onToggleLang = () => {
    const newLang = toggleLanguage();
    toast(newLang === 'ar' ? 'تم تحويل الواجهة إلى العربية 🇪🇬' : 'Switched to English 🇬🇧');
    refreshIcons();
  };

  $('langToggleBtn')?.addEventListener('click', onToggleLang);
  $('langToggleMobileBtn')?.addEventListener('click', onToggleLang);

  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.view))
  );

  // Export buttons
  $('exportMetricsCSVBtn')?.addEventListener('click', () => {
    const m = getCurrentMetrics();
    exportMetricsCSV(m);
  });
  $('exportMetricsPDFBtn')?.addEventListener('click', () => {
    const m = getCurrentMetrics();
    const bName = (state.config && state.config.business && state.config.business.name) || 'Al-Fares Motors | الفارس للسيارات';
    exportMetricsPDF(m, bName);
  });
  $('exportLogsCSVBtn')?.addEventListener('click', () => {
    exportLogsCSV(state.logs);
  });
  $('exportLogsPDFBtn')?.addEventListener('click', () => {
    const bName = (state.config && state.config.business && state.config.business.name) || 'Al-Fares Motors | الفارس للسيارات';
    exportLogsPDF(state.logs, bName);
  });

  const formFields = [
    'f_name', 'f_tagline', 'f_about', 'f_hours', 'f_location', 'f_maps',
    'f_phone', 'f_delivery', 'f_payment', 'f_policies', 'f_faqs',
    'f_language', 'f_tone', 'f_fallback', 'f_lat', 'f_lng', 'f_phoneId', 'f_verify', 'f_token'
  ];

  formFields.forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', markDirty);
  });

  $('f_autoReply')?.addEventListener('change', markDirty);

  $('f_verify')?.addEventListener('input', (e) => {
    const echo = $('verifyEcho');
    if (echo) echo.textContent = e.target.value.trim() || '—';
  });

  $('saveBtn')?.addEventListener('click', saveAll);

  // Products add & remove
  $('addProductBtn')?.addEventListener('click', () => {
    if (!state.config) state.config = {};
    state.config.products = collectProducts();
    state.config.products.push({ name: '', price: '', category: '', stock: '', image: '', description: '' });
    renderProducts();
    markDirty();
    const rows = document.querySelectorAll('[data-prod]');
    const last = rows[rows.length - 1];
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      last.querySelector('.p-name')?.focus();
    }
  });

  const prodList = $('productList');
  if (prodList) {
    prodList.addEventListener('input', markDirty);
    prodList.addEventListener('click', (e) => {
      const del = e.target.closest('.p-del');
      if (!del) return;
      const row = del.closest('[data-prod]');
      const i = Number(row.dataset.prod);
      state.config.products = collectProducts().filter((_, idx) => idx !== i);
      renderProducts();
      markDirty();
    });
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach((b) => {
    b.addEventListener('click', async () => {
      const targetId = b.dataset.copy;
      const txt = $(targetId)?.textContent.trim();
      if (!txt || txt === '—') return;
      try {
        await navigator.clipboard.writeText(txt);
        toast('Copied to clipboard');
      } catch (e) {
        toast('Copy failed — please select manually', 'err');
      }
    });
  });

  // Test WhatsApp message send
  $('testSendBtn')?.addEventListener('click', async () => {
    const to = $('testNumber')?.value.replace(/[^\d]/g, '');
    const out = $('testResult');
    if (!to) {
      if (out) {
        out.className = 'mt-3 text-sm text-rose-600';
        out.textContent = 'Enter a valid number with country code (e.g. 201000000000).';
        out.classList.remove('hidden');
      }
      return;
    }

    if (out) {
      out.className = 'mt-3 text-sm text-slate-500';
      out.textContent = 'Sending message…';
      out.classList.remove('hidden');
    }

    try {
      const r = await api.testSend(to, 'Hello! This is a test from your ClientBot assistant.');
      if (out) {
        out.className = 'mt-3 text-sm ' + (r.ok ? 'text-emerald-600' : 'text-rose-600');
        out.textContent = r.ok ? 'Test message sent successfully.' : (r.response || 'Message delivery failed');
      }
    } catch (e) {
      if (out) {
        out.className = 'mt-3 text-sm text-rose-600';
        out.textContent = 'Failed: ' + e.message;
      }
    }
  });

  // Logs actions
  $('refreshLogs')?.addEventListener('click', refreshLogs);
  $('clearLogs')?.addEventListener('click', async () => {
    try {
      await api.clearLogs();
      await refreshLogs();
      toast('Message logs cleared');
    } catch (e) {
      toast('Could not clear logs: ' + e.message, 'err');
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function updateThemeButtonUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const btn = $('themeToggleBtn');
  const mobileBtn = $('themeToggleMobileBtn');
  const text = $('themeToggleText');

  if (text) {
    text.textContent = isDark ? 'نهاري' : 'ليلي';
  }
  if (btn) {
    btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" class="h-3.5 w-3.5 ${isDark ? 'text-amber-400' : 'text-indigo-500'}"></i><span>${isDark ? 'نهاري' : 'ليلي'}</span>`;
  }
  if (mobileBtn) {
    mobileBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" class="h-4 w-4 ${isDark ? 'text-amber-400' : 'text-indigo-500'}"></i>`;
  }
}

boot();
