// Main application coordinator for ClientBot

import { $, esc, refreshIcons, toast, fmtText } from './ui.js';
import { api } from './api.js';
import { initDashboard, loadMetrics, getCurrentMetrics } from './dashboard.js';
import { initFaq, renderFaq, collectFaqs, addEntry } from './faq.js';
import { initChat, loadConversations, sendMessage } from './chat.js';
import { initOrders, loadOrders } from './orders.js';
import { initReservations, loadReservations } from './reservations.js';
import { initReminders, loadReminders } from './reminders.js';
import { initLiveChat, loadLiveChat } from './livechat.js';
import { initBroadcast, loadBroadcast } from './broadcast.js';
import { initTeam, loadTeam, applyPermissions, currentRole } from './team.js';
import { initTemplates, loadTemplates } from './templates.js';
import { initHelpCenter, loadHelpCenter } from './helpcenter.js';
import { exportLogsCSV, exportLogsPDF, exportMetricsCSV, exportMetricsPDF, exportCarsCSV, exportCarsPDF } from './export.js';
import { applyLanguage, toggleLanguage, getLang } from './i18n.js';
import { initAdminAI, loadAdminAI } from './admin-ai.js';
import { initTradeIns, loadTradeIns } from './tradeins.js';
import { initCalculator, updateCalculatorCars, openCalculatorForCar } from './calculator.js';
import { initCustomers, loadCustomers } from './customers.js';

const state = {
  view: 'dashboard',
  config: null,
  convIndex: [],
  convId: null,
  messages: [],
  productFilter: {
    category: 'all',
    brand: 'all',
    price: 'all',
    search: ''
  },
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
  initReminders();
  initLiveChat();
  initBroadcast();
  initTeam((newRole) => {
    applyPermissions(newRole);
  });
  initTemplates();
  initHelpCenter(context);
  initAdminAI(context);
  initTradeIns();
  initCalculator((state.config && state.config.products) || []);
  initCustomers();

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
    updateCalculatorCars(state.config.products || []);
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
    const remBadge = $('remindersCountBadge');
    if (remBadge && statusData.remindersCount !== undefined) {
      remBadge.textContent = String(statusData.remindersCount);
      remBadge.classList.toggle('hidden', statusData.remindersCount === 0);
    }
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

function parseCarPrice(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/,/g, '').replace(/[^\d.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function productRow(p, i, origIdx) {
  const isUsed = (p.category || '').toLowerCase().includes('used') || (p.category || '').includes('مستعمل');
  const numPrice = parseCarPrice(p.priceNum || p.price);
  const roughMonthly = numPrice > 0 ? Math.round((numPrice * 0.8 * 1.6) / 60) : 0;

  return `
  <div class="card" data-prod="${origIdx !== undefined ? origIdx : i}">
    <div class="flex items-start gap-3.5">
      ${p.image ? `
        <div class="hidden sm:flex w-32 h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-5 items-center justify-center">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" class="w-full h-full object-cover hover:scale-105 transition duration-300" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="grid flex-1 gap-3 md:grid-cols-2">
        <div class="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase ${isUsed ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}">${isUsed ? 'Certified Used (مستعمل فابريكا)' : 'New / Zero (زيرو)'}</span>
            ${roughMonthly > 0 ? `
              <span class="rounded-lg bg-teal-50 dark:bg-teal-950 text-[#128C7E] px-2 py-0.5 text-[10px] font-bold">
                قسط يبدأ من: ${roughMonthly.toLocaleString()} EGP/شهر
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn-calc-car flex items-center gap-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950 px-2 py-1 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-100 transition" data-idx="${origIdx !== undefined ? origIdx : i}" title="حساب قسط هذه السيارة">
              <i data-lucide="calculator" class="h-3.5 w-3.5"></i> <span>احسب القسط</span>
            </button>
            <button type="button" class="btn-share-car flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition" data-idx="${origIdx !== undefined ? origIdx : i}" title="مشاركة المواصفات عبر واتساب">
              <i data-lucide="share-2" class="h-3.5 w-3.5"></i> <span>واتساب</span>
            </button>
          </div>
        </div>
        <label class="field md:col-span-2">
          <span>Car Model &amp; Trim (Make, Model, Year)</span>
          <input class="inp p-name font-medium" value="${esc(p.name)}" placeholder="e.g. Mercedes-Benz C200 2024 AMG (Zero / New)">
        </label>
        <label class="field"><span>Price</span><input class="inp p-price font-semibold text-[#128C7E]" value="${esc(p.price)}" placeholder="e.g. 3,850,000 EGP"></label>
        <label class="field"><span>Category / Condition</span>
          <input class="inp p-cat" value="${esc(p.category)}" placeholder="New Cars (Zero) / Used Cars (Certified)">
        </label>
        <label class="field"><span>Availability / Stock</span><input class="inp p-stock" value="${esc(p.stock)}" placeholder="In Stock (Showroom)"></label>
        <label class="field"><span>Car Photo Link (Sent to clients via WhatsApp)</span><input class="inp p-image text-xs" value="${esc(p.image)}" placeholder="https://example.com/car.jpg"></label>
        <label class="field md:col-span-2"><span>Vehicle Specifications &amp; Warranty Details</span><input class="inp p-desc text-xs" value="${esc(p.description)}" placeholder="e.g. 1.5L Turbo 204hp, AMG Line, Panoramic roof, 0 km, 3-year warranty"></label>
      </div>
      <button class="p-del mt-6 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Remove Car">
        <i data-lucide="trash-2" class="h-4 w-4"></i>
      </button>
    </div>
  </div>`;
}

function renderProducts() {
  const allList = (state.config && state.config.products) || [];
  const host = $('productList');
  if (!host) return;

  const f = state.productFilter;
  let filtered = allList.map((p, origIdx) => ({ ...p, origIdx }));

  // Category filter
  if (f.category === 'used') {
    filtered = filtered.filter(p => (p.category || '').toLowerCase().includes('used') || (p.category || '').includes('مستعمل'));
  } else if (f.category === 'suv') {
    filtered = filtered.filter(p => 
      (p.specs?.bodyType || '').toLowerCase() === 'suv' || 
      (p.name || '').toLowerCase().includes('suv') ||
      (p.name || '').includes('سبورتاج') || (p.name || '').includes('توسان') || (p.name || '').includes('تيجو') || (p.name || '').includes('جيتور') || (p.name || '').includes('داستر')
    );
  } else if (f.category === 'sedan') {
    filtered = filtered.filter(p => 
      (p.specs?.bodyType || '').toLowerCase() === 'sedan' || 
      (p.name || '').toLowerCase().includes('sedan') ||
      (p.name || '').includes('فيرنا') || (p.name || '').includes('النترا') || (p.name || '').includes('سيراتو') || (p.name || '').includes('كورولا') || (p.name || '').includes('صني') || (p.name || '').includes('ميغان')
    );
  }

  // Brand filter
  if (f.brand && f.brand !== 'all') {
    filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(f.brand.toLowerCase()));
  }

  // Price range filter
  if (f.price === 'under_1m') {
    filtered = filtered.filter(p => parseCarPrice(p.priceNum || p.price) < 1000000);
  } else if (f.price === '1m_2m') {
    filtered = filtered.filter(p => {
      const pNum = parseCarPrice(p.priceNum || p.price);
      return pNum >= 1000000 && pNum <= 2000000;
    });
  } else if (f.price === '2m_4m') {
    filtered = filtered.filter(p => {
      const pNum = parseCarPrice(p.priceNum || p.price);
      return pNum >= 2000000 && pNum <= 4000000;
    });
  } else if (f.price === 'over_4m') {
    filtered = filtered.filter(p => parseCarPrice(p.priceNum || p.price) > 4000000);
  }

  // Search filter
  if (f.search) {
    filtered = filtered.filter(p => 
      (p.name || '').toLowerCase().includes(f.search) ||
      (p.description || '').toLowerCase().includes(f.search) ||
      (p.price || '').toLowerCase().includes(f.search)
    );
  }

  // Update counter
  const counter = $('carFilterCounter');
  if (counter) {
    counter.textContent = `عرض ${filtered.length} سيارة من أصل ${allList.length}`;
  }

  if (!filtered.length) {
    host.innerHTML = `
    <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center">
      <i data-lucide="car" class="mx-auto h-8 w-8 text-slate-300"></i>
      <p class="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">لم يتم العثور على سيارات تطابق الفلتر</p>
      <p class="mx-auto mt-1 max-w-sm text-xs text-slate-500">جرب تغيير شروط البحث أو اختيار ماركة أخرى.</p>
    </div>`;
  } else {
    host.innerHTML = filtered.map(p => productRow(p, p.origIdx, p.origIdx)).join('');
  }

  // Wire buttons on cards
  host.querySelectorAll('.btn-calc-car').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const car = allList[idx];
      if (car) openCalculatorForCar(car);
    });
  });

  host.querySelectorAll('.btn-share-car').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const car = allList[idx];
      if (car) {
        const text = `🚗 ${car.name}\n• السعر: ${car.price}\n• الحالة: ${car.category || 'متوفرة بالمعرض'}\n${car.description ? '• المواصفات: ' + car.description + '\n' : ''}${car.image ? '• رابط الصورة: ' + car.image + '\n' : ''}\nمتاحة لدى معارض الفارس موتورز مصر (التجمع الأول ومدينة نصر). كاش وبالتقسيط البنكي حتى 7 سنوات!`;
        navigator.clipboard.writeText(text).then(() => {
          toast('تم نسخ مواصفات السيارة ورابط الصورة لواتساب! 📋');
        });
      }
    });
  });

  refreshIcons();
}

function collectProducts() {
  const current = (state.config && state.config.products) || [];
  const rows = [...document.querySelectorAll('[data-prod]')];
  rows.forEach(row => {
    const origIdx = Number(row.dataset.prod);
    if (origIdx >= 0 && current[origIdx]) {
      current[origIdx] = {
        ...current[origIdx],
        name: row.querySelector('.p-name')?.value.trim() || current[origIdx].name,
        price: row.querySelector('.p-price')?.value.trim() || current[origIdx].price,
        category: row.querySelector('.p-cat')?.value.trim() || current[origIdx].category,
        stock: row.querySelector('.p-stock')?.value.trim() || current[origIdx].stock,
        image: row.querySelector('.p-image')?.value.trim() || current[origIdx].image,
        description: row.querySelector('.p-desc')?.value.trim() || current[origIdx].description
      };
    }
  });
  return current.filter(p => p.name || p.price);
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

  $('mobileMenuDrawer')?.classList.add('hidden');

  const convPanel = $('convPanel');
  if (convPanel) {
    convPanel.style.display = view === 'chat' ? 'flex' : 'none';
  }

  try {
    if (view === 'dashboard') loadMetrics();
    else if (view === 'admin-ai') loadAdminAI();
    else if (view === 'faq') renderFaq();
    else if (view === 'products') renderProducts();
    else if (view === 'orders') loadOrders();
    else if (view === 'reservations') loadReservations();
    else if (view === 'tradeins') loadTradeIns();
    else if (view === 'customers') loadCustomers();
    else if (view === 'reminders') loadReminders();
    else if (view === 'livechat') loadLiveChat();
    else if (view === 'broadcast') loadBroadcast();
    else if (view === 'team') loadTeam();
    else if (view === 'templates') loadTemplates();
    else if (view === 'helpcenter') loadHelpCenter();
    else if (view === 'logs') refreshLogs();
  } catch (e) {
    console.error('Error loading view:', view, e);
  }

  try {
    applyPermissions(currentRole);
  } catch (e) {}

  refreshIcons();
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

  // Mobile drawer controls
  $('mobileMenuBtn')?.addEventListener('click', () => {
    $('mobileMenuDrawer')?.classList.remove('hidden');
    refreshIcons();
  });
  $('closeMobileMenu')?.addEventListener('click', () => {
    $('mobileMenuDrawer')?.classList.add('hidden');
  });
  $('mobileMenuOverlay')?.addEventListener('click', () => {
    $('mobileMenuDrawer')?.classList.add('hidden');
  });

  // Wire all navigation buttons
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.view))
  );

  // Car database search and filters
  const carSearch = $('carSearchInput');
  carSearch?.addEventListener('input', (e) => {
    state.productFilter.search = e.target.value.toLowerCase().trim();
    renderProducts();
  });

  const catPills = document.querySelectorAll('#carCategoryFilterPills .car-filter-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => {
        p.classList.remove('active', 'bg-[#128C7E]', 'text-white', 'shadow-xs');
        p.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      });
      pill.classList.add('active', 'bg-[#128C7E]', 'text-white', 'shadow-xs');
      pill.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      state.productFilter.category = pill.dataset.cat || 'all';
      renderProducts();
    });
  });

  $('carBrandFilter')?.addEventListener('change', (e) => {
    state.productFilter.brand = e.target.value;
    renderProducts();
  });

  $('carPriceFilter')?.addEventListener('change', (e) => {
    state.productFilter.price = e.target.value;
    renderProducts();
  });

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

  $('exportCarsCSVBtn')?.addEventListener('click', () => {
    const cars = (state.config && state.config.products) || [];
    exportCarsCSV(cars);
  });

  $('exportCarsPDFBtn')?.addEventListener('click', () => {
    const cars = (state.config && state.config.products) || [];
    const bName = (state.config && state.config.business && state.config.business.name) || 'Al-Fares Motors | الفارس للسيارات';
    exportCarsPDF(cars, bName);
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
