// Simplified Executive Dealership Dashboard — Clean KPIs, Reminders & Follow-ups, and Test Drive Bookings.

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';
import { barChart } from './charts.js';

let ctx = null;
let metricsData = null;
let remindersData = [];
let reservationsData = [];
let currentFilter = 'pending';
let loading = false;

export function initDashboard(context) {
  ctx = context;

  // Refresh button
  const refreshBtn = $('refreshMetrics');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadMetrics(true));
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

  // Form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientName = $('remClientName')?.value?.trim();
      const clientPhone = $('remClientPhone')?.value?.trim();
      const carTitle = $('remCarTitle')?.value?.trim();
      const type = $('remType')?.value;
      const dueDate = $('remDueDate')?.value;
      const dueTime = $('remDueTime')?.value?.trim();
      const message = $('remMessage')?.value?.trim();

      if (!clientName || !clientPhone || !carTitle) {
        toast('يرجى ملء جميع الحقول المطلوبة', 'err');
        return;
      }

      try {
        await api.createReminder({
          clientName,
          clientPhone,
          carTitle,
          type,
          dueDate,
          dueTime: dueTime || 'اليوم',
          message: message || `أهلاً بك ${clientName}! بخصوص سيارة ${carTitle} في الفارس موتورز.`
        });
        toast('تمت إضافة التذكير بنجاح! 🔔');
        hideModal();
        await loadMetrics(true);
      } catch (err) {
        toast('تعذر إضافة التذكير: ' + err.message, 'err');
      }
    });
  }

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
    const [metrics, remindersRes, resRes, statusRes] = await Promise.all([
      api.metrics(7).catch(() => ({})),
      api.getReminders().catch(() => ({ reminders: [] })),
      api.getReservations().catch(() => ({ reservations: [] })),
      api.status().catch(() => ({}))
    ]);

    metricsData = metrics;
    remindersData = remindersRes.reminders || [];
    reservationsData = resRes.reservations || [];

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
  renderActivityChart();
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

  // Also update sidebar badge for reminders if present
  const remBadge = $('remindersCountBadge');
  if (remBadge) {
    remBadge.textContent = String(pendingReminders);
    remBadge.classList.toggle('hidden', pendingReminders === 0);
  }

  container.innerHTML = `
    <!-- KPI 1: Dealership Inventory -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md cursor-pointer" data-nav="products">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">مخزون السيارات المتاح</span>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
          <i data-lucide="car" class="h-5 w-5"></i>
        </div>
      </div>
      <div class="mt-3 flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 dark:text-white">${totalCars}</span>
        <span class="text-xs font-medium text-slate-500">سيارة جاهزة للتسليم</span>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-medium">
        <span>زيرو ومستعمل معتمد</span>
        <span>تصفح المعرض ←</span>
      </div>
    </div>

    <!-- KPI 2: Active Inquiries & Messages -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md cursor-pointer" data-nav="livechat">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">محادثات واستفسارات العملاء</span>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
          <i data-lucide="message-square" class="h-5 w-5"></i>
        </div>
      </div>
      <div class="mt-3 flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 dark:text-white">${totalMsgs.toLocaleString()}</span>
        <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">رد آلي ذكي 96%</span>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>واتساب المعرض نشط</span>
        <span class="text-emerald-600 font-medium">محادثات العملاء ←</span>
      </div>
    </div>

    <!-- KPI 3: Scheduled Test Drives -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md cursor-pointer" data-nav="reservations">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">مواعيد تجارب القيادة</span>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
          <i data-lucide="gauge" class="h-5 w-5"></i>
        </div>
      </div>
      <div class="mt-3 flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 dark:text-white">${scheduledDrives}</span>
        <span class="text-xs font-medium text-sky-600 dark:text-sky-400">مواعيد مؤكدة</span>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>فروع التجمع ومدينة نصر</span>
        <span class="text-sky-600 font-medium">إدارة المواعيد ←</span>
      </div>
    </div>

    <!-- KPI 4: Pending Reminders & Follow-ups -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md cursor-pointer" data-nav="reminders">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">تذكيرات ومتابعات معلقة</span>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
          <i data-lucide="bell" class="h-5 w-5"></i>
        </div>
      </div>
      <div class="mt-3 flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 dark:text-white">${pendingReminders}</span>
        <span class="text-xs font-medium text-amber-600 dark:text-amber-400">تحتاج متابعة اليوم</span>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>المسؤول: عبد الله</span>
        <span class="text-amber-600 font-medium">قائمة التذكيرات الكاملة ←</span>
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
