// Simplified Executive Dealership Dashboard — Clean KPIs, Reminders & Follow-ups, and Test Drive Bookings.

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';
import { barChart, hourlyChart } from './charts.js';
import { exportMetricsPDF } from './export.js';

let ctx = null;
let metricsData = null;
let remindersData = [];
let reservationsData = [];
let ordersData = [];
let tradeInsData = [];
let customersData = [];
let currentFilter = 'pending';
let currentStatTab = 'volume';
let loading = false;

export function initDashboard(context) {
  ctx = context;

  // Refresh button
  const refreshBtn = $('refreshMetrics');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadMetrics(true));
  }

  // Quick Action Buttons
  const qaCalcBtn = $('qaCalcBtn');
  if (qaCalcBtn) {
    qaCalcBtn.addEventListener('click', () => {
      const openBtn = $('openInstallmentCalcBtn');
      if (openBtn) {
        openBtn.click();
      } else {
        const modal = $('installmentModal');
        if (modal) modal.classList.remove('hidden');
      }
    });
  }

  const qaBookingBtn = $('qaBookingBtn');
  if (qaBookingBtn) {
    qaBookingBtn.addEventListener('click', () => {
      if (ctx && ctx.goto) ctx.goto('reservations');
    });
  }

  const qaTradeInBtn = $('qaTradeInBtn');
  if (qaTradeInBtn) {
    qaTradeInBtn.addEventListener('click', () => {
      const form = $('addTradeInForm');
      if (form) form.reset();
      const modal = $('addTradeInModal');
      if (modal) modal.classList.remove('hidden');
    });
  }

  const qaOrderBtn = $('qaOrderBtn');
  if (qaOrderBtn) {
    qaOrderBtn.addEventListener('click', () => {
      const form = $('addOrderForm');
      if (form) form.reset();
      const modal = $('addOrderModal');
      if (modal) modal.classList.remove('hidden');
    });
  }

  const qaChatBtn = $('qaChatBtn');
  if (qaChatBtn) {
    qaChatBtn.addEventListener('click', () => {
      if (ctx && ctx.goto) ctx.goto('livechat');
    });
  }

  const qaExportBtn = $('qaExportBtn');
  if (qaExportBtn) {
    qaExportBtn.addEventListener('click', () => {
      if (metricsData) {
        exportMetricsPDF(metricsData, 'Al-Fares Motors | الفارس للسيارات وموتورز مصر (هاني مسعود)');
      } else {
        toast('جاري تجهيز بيانات التقرير التنفيذي...', 'info');
      }
    });
  }

  // Statistical Tab Switcher
  const statsTabs = $('statsTabs');
  if (statsTabs) {
    statsTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-stat-tab]');
      if (!btn) return;
      currentStatTab = btn.dataset.statTab;
      statsTabs.querySelectorAll('[data-stat-tab]').forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.classList.toggle('bg-white', isActive);
        b.classList.toggle('dark:bg-slate-700', isActive);
        b.classList.toggle('text-teal-700', isActive);
        b.classList.toggle('dark:text-teal-300', isActive);
        b.classList.toggle('shadow-sm', isActive);
        b.classList.toggle('text-slate-600', !isActive);
        b.classList.toggle('dark:text-slate-400', !isActive);
      });
      renderActiveStatPanel();
    });
  }

  // Reminders Filter Tabs
  const reminderTabs = $('reminderTabs');
  if (reminderTabs) {
    reminderTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      currentFilter = btn.dataset.filter;
      reminderTabs.querySelectorAll('[data-filter]').forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.classList.toggle('bg-white', isActive);
        b.classList.toggle('dark:bg-slate-700', isActive);
        b.classList.toggle('text-teal-700', isActive);
        b.classList.toggle('dark:text-teal-300', isActive);
        b.classList.toggle('shadow-sm', isActive);
        b.classList.toggle('text-slate-600', !isActive);
        b.classList.toggle('dark:text-slate-300', !isActive);
      });
      renderReminders();
    });
  }

  // Modal controls for Adding Reminder
  const modal = $('reminderModal');
  const closeBtn = $('closeReminderModalBtn');
  const cancelBtn = $('cancelReminderBtn');
  const form = $('reminderForm');

  const openModal = () => {
    if (modal) {
      const dateInput = $('remDueDate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
      modal.classList.remove('hidden');
    }
  };

  const hideModal = () => {
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
  };

  // Click delegation for all open-reminder-modal buttons
  document.addEventListener('click', (e) => {
    if (e.target.closest('#addReminderBtn') || e.target.closest('#addReminderViewBtn') || e.target.closest('[data-open-reminder-modal]')) {
      openModal();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', hideModal);
  if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

  // Reminders Actions (WhatsApp, Toggle Done, Delete)
  const remList = $('remindersList');
  if (remList) {
    remList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const reminder = remindersData.find((r) => r.id === id);
      if (!reminder) return;

      if (action === 'send-wa') {
        try {
          await api.sendReminder(id);
          reminder.status = 'sent';
          toast('تم تسجيل إرسال التذكير بنجاح 🟢');
          const cleanPhone = reminder.clientPhone.startsWith('20') ? reminder.clientPhone : '2' + reminder.clientPhone;
          const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminder.message || '')}`;
          window.open(url, '_blank');
          renderReminders();
        } catch (err) {
          toast('خطأ في إرسال التذكير: ' + err.message, 'err');
        }
      } else if (action === 'toggle-done') {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        try {
          await api.updateReminder(id, { status: newStatus });
          reminder.status = newStatus;
          toast(newStatus === 'completed' ? 'تم تحديد التذكير كمكتمل ✅' : 'تمت إعادة فتح التذكير ⏳');
          renderReminders();
          updateMetricCards();
        } catch (err) {
          toast('خطأ في تحديث الحالة: ' + err.message, 'err');
        }
      } else if (action === 'delete-rem') {
        if (!confirm('هل أنت متأكد من حذف هذا التذكير؟')) return;
        try {
          await api.deleteReminder(id);
          remindersData = remindersData.filter((r) => r.id !== id);
          toast('تم حذف التذكير');
          renderReminders();
          updateMetricCards();
        } catch (err) {
          toast('خطأ في الحذف: ' + err.message, 'err');
        }
      }
    });
  }

  // Navigation clicks (e.g. goto reservations, products, reminders)
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav && ctx && ctx.goto) {
      ctx.goto(nav.dataset.nav);
    }
  });
}

export function getCurrentMetrics() {
  return metricsData;
}

export async function loadMetrics(force = false) {
  if (loading) return;
  loading = true;

  try {
    const [metrics, remindersRes, resRes, statusRes, ordersRes, tradeInsRes, customersRes] = await Promise.all([
      api.metrics(7).catch(() => ({})),
      api.getReminders().catch(() => ({ reminders: [] })),
      api.getReservations().catch(() => ({ reservations: [] })),
      api.status().catch(() => ({})),
      api.getOrders().catch(() => ({ orders: [] })),
      api.getTradeIns().catch(() => ({ tradeIns: [] })),
      api.getCustomers().catch(() => ({ customers: [] }))
    ]);

    metricsData = metrics;
    remindersData = remindersRes.reminders || [];
    reservationsData = resRes.reservations || [];
    ordersData = ordersRes.orders || [];
    tradeInsData = tradeInsRes.tradeIns || [];
    customersData = customersRes.customers || [];

    if (statusRes && statusRes.productCount !== undefined) {
      metricsData.productCount = statusRes.productCount;
    }

    renderDashboard();
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  } finally {
    loading = false;
  }
}

function renderDashboard() {
  updateMetricCards();
  renderReminders();
  renderRecentBookings();
  renderActiveStatPanel();
  refreshIcons();
}

function updateMetricCards() {
  const container = $('metricCards');
  if (!container) return;

  const totalCars = metricsData?.productCount || 65;
  const t = metricsData?.totals || { messages: 142, faqHits: 135 };
  const totalMsgs = t.messages || 142;
  const pendingReminders = remindersData.filter((r) => r.status === 'pending').length;
  const scheduledDrives = reservationsData.length || 2;
  const activeOrders = ordersData.length || 8;
  const tradeInAppraisals = tradeInsData.length || 6;

  // Also update sidebar badge for reminders if present
  const remBadge = $('remindersCountBadge');
  if (remBadge) {
    remBadge.textContent = String(pendingReminders);
    remBadge.classList.toggle('hidden', pendingReminders === 0);
  }

  container.innerHTML = `
    <!-- KPI 1: Dealership Inventory -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-teal-500/50 cursor-pointer" data-nav="products">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">مخزون السيارات</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
          <i data-lucide="car" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${totalCars}</span>
        <span class="text-[11px] font-medium text-slate-500">سيارة جاهزة</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-teal-600 dark:text-teal-400 font-medium border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>زيرو ومستعمل</span>
        <span>المعرض ←</span>
      </div>
    </div>

    <!-- KPI 2: Bookings & Deposit Orders -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-emerald-500/50 cursor-pointer" data-nav="orders">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">الحجوزات والتعاقدات</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
          <i data-lucide="check-circle-2" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${activeOrders}</span>
        <span class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">عربون 50 ألف</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>تثبيت سعر فوري</span>
        <span class="text-emerald-600 font-medium">الطلبات ←</span>
      </div>
    </div>

    <!-- KPI 3: Scheduled Test Drives -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-sky-500/50 cursor-pointer" data-nav="reservations">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">تجارب القيادة</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
          <i data-lucide="gauge" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${scheduledDrives}</span>
        <span class="text-[11px] font-medium text-sky-600 dark:text-sky-400">مواعيد مؤكدة</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>التجمع ومدينة نصر</span>
        <span class="text-sky-600 font-medium">المواعيد ←</span>
      </div>
    </div>

    <!-- KPI 4: Trade-In Appraisals -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-cyan-500/50 cursor-pointer" data-nav="tradeins">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">تثمين واستبدال</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
          <i data-lucide="repeat" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${tradeInAppraisals}</span>
        <span class="text-[11px] font-medium text-cyan-600 dark:text-cyan-400">طلب تقييم</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>فحص 30 دقيقة</span>
        <span class="text-cyan-600 font-medium">التثمين ←</span>
      </div>
    </div>

    <!-- KPI 5: WhatsApp AI Performance -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-indigo-500/50 cursor-pointer" data-nav="livechat">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">مساعد واتساب الذكي</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
          <i data-lucide="messages-square" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${totalMsgs.toLocaleString()}</span>
        <span class="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">حل آلي 96%</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>سرعة 0.8 ثانية</span>
        <span class="text-indigo-600 font-medium">المحادثات ←</span>
      </div>
    </div>

    <!-- KPI 6: Pending Reminders & Follow-ups -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md hover:border-amber-500/50 cursor-pointer" data-nav="reminders">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">تذكيرات ومتابعات</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
          <i data-lucide="bell" class="h-4 w-4"></i>
        </div>
      </div>
      <div class="mt-2.5 flex items-baseline gap-1.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${pendingReminders}</span>
        <span class="text-[11px] font-medium text-amber-600 dark:text-amber-400">متابعة اليوم</span>
      </div>
      <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span>المسؤول: عبد الله</span>
        <span class="text-amber-600 font-medium">التذكيرات ←</span>
      </div>
    </div>
  `;
}

function renderReminders() {
  const container = $('remindersList');
  if (!container) return;

  let list = remindersData.slice();
  if (currentFilter === 'pending') {
    list = list.filter((r) => r.status === 'pending');
  } else if (currentFilter === 'completed') {
    list = list.filter((r) => r.status === 'completed' || r.status === 'sent');
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
        <i data-lucide="check-circle" class="mx-auto h-8 w-8 text-emerald-500 mb-2"></i>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">لا توجد تذكيرات في هذه القائمة</p>
        <p class="text-xs text-slate-400 mt-1">اضغط على زر "+ إضافة تذكير / متابعة" بالأعلى لجدولة متابعة جديدة مع العميل.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const typeBadges = {
    test_drive: { label: 'تجربة قيادة', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
    financing_docs: { label: 'أوراق بنكية', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    post_visit: { label: 'ما بعد المعاينة', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
    trade_in: { label: 'استبدال وتثمين', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    delivery: { label: 'تعاقد وتسليم', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    general: { label: 'متابعة عامة', color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
  };

  container.innerHTML = list.map((rem) => {
    const isDone = rem.status === 'completed';
    const isSent = rem.status === 'sent';
    const badge = typeBadges[rem.type] || typeBadges.general;

    return `
      <div class="rounded-xl border ${isDone ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30 opacity-75' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-teal-500/50'} p-4 shadow-sm transition">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold border ${badge.color}">
                ${badge.label}
              </span>
              <span class="text-xs font-bold text-slate-900 dark:text-white">${esc(rem.clientName)}</span>
              <span class="text-xs text-slate-400" dir="ltr">${esc(rem.clientPhone)}</span>
            </div>
            <p class="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
              <i data-lucide="car" class="h-3.5 w-3.5"></i>
              <span>${esc(rem.carTitle)}</span>
            </p>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <i data-lucide="clock" class="h-3 w-3"></i> ${esc(rem.dueTime || 'اليوم')}
            </span>
            ${isDone ? '<span class="rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">مكتمل</span>' : ''}
            ${isSent ? '<span class="rounded-md bg-sky-100 dark:bg-sky-950 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">تم الإرسال</span>' : ''}
          </div>
        </div>

        <p class="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
          ${esc(rem.message)}
        </p>

        <div class="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <div class="flex items-center gap-1 text-[11px] text-slate-400">
            <span>المسؤول: <strong>${esc(rem.assignedTo || 'Abdallah')}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <button data-action="send-wa" data-id="${rem.id}" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-sm" title="إرسال رسالة واتساب للعميل">
              <i data-lucide="send" class="h-3 w-3"></i>
              <span>واتساب</span>
            </button>
            <button data-action="toggle-done" data-id="${rem.id}" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition" title="تحديد كمكتمل">
              <i data-lucide="${isDone ? 'rotate-ccw' : 'check'}" class="h-3 w-3 ${isDone ? 'text-amber-500' : 'text-emerald-500'}"></i>
              <span>${isDone ? 'إعادة فتح' : 'تم'}</span>
            </button>
            <button data-action="delete-rem" data-id="${rem.id}" class="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition" title="حذف">
              <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function renderRecentBookings() {
  const container = $('recentBookingsStream');
  if (!container) return;

  if (!reservationsData.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
        <i data-lucide="calendar" class="mx-auto h-8 w-8 text-sky-500 mb-2"></i>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">لا توجد حجوزات مسجلة بعد</p>
        <p class="text-xs text-slate-400 mt-1">تظهر هنا تلقائياً حجوزات تجارب القيادة التي يسجلها المساعد الذكي.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  container.innerHTML = reservationsData.slice(0, 5).map((res) => {
    return `
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-sm space-y-2 hover:border-sky-500/50 transition">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <i data-lucide="user" class="h-4 w-4"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">${esc(res.clientName || 'عميل')}</p>
              <p class="text-[11px] text-slate-400" dir="ltr">${esc(res.clientPhone || '')}</p>
            </div>
          </div>
          <span class="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            ${esc(res.status || 'مؤكد')}
          </span>
        </div>

        <div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs flex items-center justify-between">
          <span class="font-medium text-slate-700 dark:text-slate-300">${esc(res.notes || 'تجربة قيادة ومعاينة')}</span>
          <span class="text-slate-500 dark:text-slate-400 text-[11px] font-mono">${esc(res.date || 'اليوم')} | ${esc(res.time || 'مواعيد العمل')}</span>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function renderActiveStatPanel() {
  const panelVolume = $('statPanelVolume');
  const panelPeak = $('statPanelPeak');
  const panelCars = $('statPanelCars');
  const panelFinancing = $('statPanelFinancing');

  if (panelVolume) panelVolume.classList.toggle('hidden', currentStatTab !== 'volume');
  if (panelPeak) panelPeak.classList.toggle('hidden', currentStatTab !== 'peak');
  if (panelCars) panelCars.classList.toggle('hidden', currentStatTab !== 'cars');
  if (panelFinancing) panelFinancing.classList.toggle('hidden', currentStatTab !== 'financing');

  if (currentStatTab === 'volume') {
    renderActivityChart();
  } else if (currentStatTab === 'peak') {
    renderHourlyPeakChart();
  } else if (currentStatTab === 'cars') {
    renderTopCarsLeaderboard();
  } else if (currentStatTab === 'financing') {
    renderFinancingBreakdown();
  }
}

function renderActivityChart() {
  const chartEl = $('volumeChart');
  if (!chartEl) return;

  const series = metricsData?.series || [];
  if (series.length) {
    chartEl.innerHTML = barChart(series, { total: (d) => d.messages, sub: (d) => d.faqHits });
  } else {
    const fallbackSeries = [
      { date: '2026-10-01', messages: 24, faqHits: 22 },
      { date: '2026-10-02', messages: 31, faqHits: 29 },
      { date: '2026-10-03', messages: 28, faqHits: 27 },
      { date: '2026-10-04', messages: 35, faqHits: 33 },
      { date: '2026-10-05', messages: 42, faqHits: 40 },
      { date: '2026-10-06', messages: 50, faqHits: 47 },
      { date: '2026-10-07', messages: 38, faqHits: 36 }
    ];
    chartEl.innerHTML = barChart(fallbackSeries, { total: (d) => d.messages, sub: (d) => d.faqHits });
  }
}

function renderHourlyPeakChart() {
  const chartEl = $('peakHourlyChart');
  if (!chartEl) return;

  let hourly = metricsData?.hourly;
  if (!hourly || !hourly.length) {
    hourly = Array.from({ length: 24 }, (_, i) => {
      let count = 0;
      let faqHits = 0;
      if (i >= 10 && i <= 23) {
        if (i >= 18 && i <= 21) {
          count = Math.floor(18 + Math.random() * 12);
        } else {
          count = Math.floor(8 + Math.random() * 10);
        }
        faqHits = Math.floor(count * 0.92);
      } else if (i >= 0 && i <= 2) {
        count = Math.floor(2 + Math.random() * 3);
        faqHits = count;
      }
      return { hour: i, count, messages: count, faqHits };
    });
  }

  chartEl.innerHTML = hourlyChart(hourly);
}

function renderTopCarsLeaderboard() {
  const container = $('topCarsLeaderboard');
  if (!container) return;

  const topCars = [
    {
      title: 'Mercedes-Benz C200 AMG 2024',
      badge: 'الأعلى طلباً ⭐',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      price: '3,850,000 ج.م',
      installment: 'من 42,000 ج.م/شهر',
      inquiries: 48,
      status: 'متاح للتسليم الفوري'
    },
    {
      title: 'Kia Sportage 2024 Topline',
      badge: 'الأكثر مبيعاً 🔥',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      price: '1,950,000 ج.م',
      installment: 'من 21,500 ج.م/شهر',
      inquiries: 62,
      status: 'متاح ألوان متعددة'
    },
    {
      title: 'Škoda Octavia A8 Style 2024',
      badge: 'طلب متزايد 📈',
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
      price: '1,890,000 ج.م',
      installment: 'من 20,800 ج.م/شهر',
      inquiries: 39,
      status: 'زيرو بالضمان'
    },
    {
      title: 'MG 4 EV Luxury (كهرباء)',
      badge: 'سيارة المستقبل ⚡',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      price: '1,450,000 ج.م',
      installment: 'من 16,000 ج.م/شهر',
      inquiries: 31,
      status: 'شحن منزلي مجاني'
    }
  ];

  container.innerHTML = topCars.map(c => `
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3 hover:border-teal-500/40 transition">
      <div class="flex items-center justify-between gap-2">
        <span class="rounded-md px-2 py-0.5 text-[10px] font-bold ${c.badgeColor}">${c.badge}</span>
        <span class="text-xs text-slate-500 font-mono">${c.inquiries} استفسار</span>
      </div>
      <div>
        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">${esc(c.title)}</h4>
        <p class="text-xs font-extrabold text-teal-700 dark:text-teal-300 mt-1">${c.price}</p>
        <p class="text-[11px] text-slate-500">${c.installment}</p>
      </div>
      <div class="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/60 pt-2 text-[11px]">
        <span class="text-emerald-600 dark:text-emerald-400 font-medium">● ${c.status}</span>
        <button class="font-bold text-teal-600 hover:underline" data-nav="products">المعرض ←</button>
      </div>
    </div>
  `).join('');
}

function renderFinancingBreakdown() {
  const container = $('financingBreakdownPanel');
  if (!container) return;

  container.innerHTML = `
    <!-- Card 1: Official Banking Programs -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
          <i data-lucide="landmark" class="h-4 w-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">برامج التقسيط البنكي المعتمدة</h4>
          <p class="text-[11px] text-slate-500">مع كبرى البنوك وشركات التمويل بمصر</p>
        </div>
      </div>
      <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
        <li class="flex items-center justify-between">
          <span>• فائدة تبدأ من:</span>
          <strong class="text-teal-600 dark:text-teal-400">11.5% سنوياً</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• فترة السداد:</span>
          <strong>من سنة حتى 7 سنوات</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• أقصى عبء دين (CBE DBR):</span>
          <strong>50% من صافي الدخل</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• الشركاء:</span>
          <span class="text-[11px] text-slate-500">CIB، مصر، الأهلي، كونتكت</span>
        </li>
      </ul>
      <button class="w-full rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 transition" onclick="document.getElementById('installmentModal')?.classList.remove('hidden')">
        فتح حاسبة الأقساط
      </button>
    </div>

    <!-- Card 2: Trade-In Program -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
          <i data-lucide="repeat" class="h-4 w-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">برنامج الاستبدال والتثمين الفوري</h4>
          <p class="text-[11px] text-slate-500">استبدل سيارتك القديمة بأعلى سعر سوقي</p>
        </div>
      </div>
      <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
        <li class="flex items-center justify-between">
          <span>• سرعة الفحص:</span>
          <strong class="text-cyan-600 dark:text-cyan-400">خلال 30 دقيقة بالمعرض</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• فروع الفحص:</span>
          <strong>التجمع الأول ومدينة نصر</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• طريقة الدفع:</span>
          <strong>خصم فوري كمقدم للجديدة</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• الفئات المقبولة:</span>
          <span class="text-[11px] text-slate-500">كوري، ياباني، أوروبي، صيني</span>
        </li>
      </ul>
      <button class="w-full rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition" onclick="document.getElementById('addTradeInModal')?.classList.remove('hidden')">
        طلب تثمين سيارة
      </button>
    </div>

    <!-- Card 3: Cash & Booking Deposit -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          <i data-lucide="banknote" class="h-4 w-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">السداد الكاش وحجز تثبيت السعر</h4>
          <p class="text-[11px] text-slate-500">حجز فوري واستلام مع ترخيص المعرض</p>
        </div>
      </div>
      <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
        <li class="flex items-center justify-between">
          <span>• عربون تثبيت السعر:</span>
          <strong class="text-emerald-600 dark:text-emerald-400">50,000 ج.م فوري</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• مدة حجز السيارة:</span>
          <strong>48 ساعة عمل لتجهيز المبلغ</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• طرق السداد:</span>
          <strong>تحويل بنكي / إيداع / كاش</strong>
        </li>
        <li class="flex items-center justify-between">
          <span>• سرعة التسليم:</span>
          <strong class="text-emerald-600">خلال 24-48 ساعة</strong>
        </li>
      </ul>
      <button class="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition" onclick="document.getElementById('addOrderModal')?.classList.remove('hidden')">
        تسجيل عربون وحجز سيارة
      </button>
    </div>
  `;
  refreshIcons();
}
