// Dedicated Reminders & Follow-ups Management Module for Al-Fares Motors

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let reminders = [];
let statusFilter = 'pending';
let typeFilter = 'all';
let searchQuery = '';
let loading = false;

export function initReminders() {
  // Status filter tabs
  const tabs = $('remViewStatusTabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-status]');
      if (!btn) return;
      statusFilter = btn.dataset.status;
      tabs.querySelectorAll('[data-status]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.classList.toggle('bg-white', active);
        b.classList.toggle('dark:bg-slate-700', active);
        b.classList.toggle('text-teal-700', active);
        b.classList.toggle('dark:text-teal-300', active);
        b.classList.toggle('shadow-sm', active);
        b.classList.toggle('text-slate-600', !active);
        b.classList.toggle('dark:text-slate-300', !active);
      });
      renderList();
    });
  }

  // Type filter select
  const typeSelect = $('remViewTypeFilter');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      typeFilter = e.target.value;
      renderList();
    });
  }

  // Search input
  const searchInput = $('remViewSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderList();
    });
  }

  // Refresh button
  $('refreshRemindersViewBtn')?.addEventListener('click', () => loadReminders(true));

  // Add Reminder button in dedicated view
  $('addReminderViewBtn')?.addEventListener('click', () => {
    const modal = $('reminderModal');
    if (modal) {
      const dateInput = $('remDueDate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
      modal.classList.remove('hidden');
    }
  });

  // Reminders List Click Delegation (WhatsApp, Toggle, Delete)
  const listEl = $('remindersViewList');
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const rem = reminders.find((r) => r.id === id);
      if (!rem) return;

      if (action === 'send-wa') {
        try {
          await api.sendReminder(id);
          rem.status = 'sent';
          toast('تم تسجيل إرسال التذكير بنجاح 🟢');
          const cleanPhone = rem.clientPhone.startsWith('20') ? rem.clientPhone : '2' + rem.clientPhone;
          const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rem.message || '')}`;
          window.open(url, '_blank');
          renderList();
          updateBadges();
        } catch (err) {
          toast('خطأ في الإرسال: ' + err.message, 'err');
        }
      } else if (action === 'toggle-done') {
        const newStatus = rem.status === 'completed' ? 'pending' : 'completed';
        try {
          await api.updateReminder(id, { status: newStatus });
          rem.status = newStatus;
          toast(newStatus === 'completed' ? 'تم تحديد التذكير كمكتمل ✅' : 'تمت إعادة فتح التذكير ⏳');
          renderList();
          updateBadges();
        } catch (err) {
          toast('خطأ في التحديث: ' + err.message, 'err');
        }
      } else if (action === 'delete-rem') {
        if (!confirm('هل أنت متأكد من حذف هذا التذكير؟')) return;
        try {
          await api.deleteReminder(id);
          reminders = reminders.filter((r) => r.id !== id);
          toast('تم حذف التذكير بنجاح');
          renderList();
          updateBadges();
        } catch (err) {
          toast('خطأ في الحذف: ' + err.message, 'err');
        }
      }
    });
  }

  // Export Reminders to CSV
  $('exportRemindersCSVBtn')?.addEventListener('click', exportCSV);
}

export async function loadReminders(force = false) {
  if (loading && !force) return;
  loading = true;

  const listEl = $('remindersViewList');
  if (listEl && !reminders.length) {
    listEl.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">جاري تحميل قائمة التذكيرات والمتابعات...</p>';
  }

  try {
    const res = await api.getReminders();
    reminders = res.reminders || [];
    renderList();
    updateBadges();
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<p class="text-sm text-rose-600 py-4 text-center">تعذر تحميل التذكيرات: ${esc(err.message)}</p>`;
    }
  } finally {
    loading = false;
  }
}

function updateBadges() {
  const pendingCount = reminders.filter((r) => r.status === 'pending').length;
  const badge = $('remindersCountBadge');
  if (badge) {
    badge.textContent = String(pendingCount);
    badge.classList.toggle('hidden', pendingCount === 0);
  }
}

function renderList() {
  const container = $('remindersViewList');
  if (!container) return;

  let filtered = reminders.slice();

  // Status Filter
  if (statusFilter === 'pending') {
    filtered = filtered.filter((r) => r.status === 'pending');
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter((r) => r.status === 'completed' || r.status === 'sent');
  }

  // Type Filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter((r) => r.type === typeFilter);
  }

  // Search Filter
  if (searchQuery) {
    filtered = filtered.filter((r) =>
      (r.clientName || '').toLowerCase().includes(searchQuery) ||
      (r.clientPhone || '').includes(searchQuery) ||
      (r.carTitle || '').toLowerCase().includes(searchQuery) ||
      (r.message || '').toLowerCase().includes(searchQuery)
    );
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
        <i data-lucide="bell-off" class="mx-auto h-10 w-10 text-slate-400 mb-3"></i>
        <h4 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد تذكيرات مطابقة للبحث أو التصفية</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">يمكنك إضافة تذكير جديد بخصوص مواعيد تجارب القيادة، الموافقات التمويلية، أو متابعة ما بعد زيارة المعرض.</p>
        <button id="addEmptyRemBtn" class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition">
          <i data-lucide="plus-circle" class="h-4 w-4"></i> + إضافة تذكير جديد
        </button>
      </div>
    `;
    $('addEmptyRemBtn')?.addEventListener('click', () => {
      $('addReminderViewBtn')?.click();
    });
    refreshIcons();
    return;
  }

  const typeBadges = {
    test_drive: { label: '🚗 تجربة قيادة', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
    financing_docs: { label: '📑 أوراق بنكية', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    post_visit: { label: '💬 ما بعد المعاينة', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
    trade_in: { label: '🔄 استبدال وتثمين', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    delivery: { label: '🔑 تعاقد وتسليم', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    general: { label: '🔔 متابعة عامة', color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
  };

  container.innerHTML = filtered.map((rem) => {
    const isDone = rem.status === 'completed';
    const isSent = rem.status === 'sent';
    const badge = typeBadges[rem.type] || typeBadges.general;

    return `
      <div class="rounded-2xl border ${isDone ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30 opacity-80' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500/50'} p-5 shadow-sm transition">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1.5 flex-1 min-w-[260px]">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badge.color}">
                ${badge.label}
              </span>
              <span class="text-sm font-bold text-slate-900 dark:text-white">${esc(rem.clientName)}</span>
              <span class="text-xs text-slate-400 font-mono" dir="ltr">${esc(rem.clientPhone)}</span>
            </div>
            <p class="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <i data-lucide="car" class="h-4 w-4"></i>
              <span>السيارة: ${esc(rem.carTitle)}</span>
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <i data-lucide="clock" class="h-3.5 w-3.5"></i> ${esc(rem.dueTime || 'اليوم')}
            </span>
            ${isDone ? '<span class="rounded-lg bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">مكتمل ✅</span>' : ''}
            ${isSent ? '<span class="rounded-lg bg-sky-100 dark:bg-sky-950 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">تم الإرسال 📨</span>' : ''}
          </div>
        </div>

        <div class="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
          <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
            ${esc(rem.message)}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div class="text-xs text-slate-400 flex items-center gap-2">
            <span>المسؤول: <strong class="text-slate-600 dark:text-slate-300">${esc(rem.assignedTo || 'Abdallah')}</strong></span>
            <span>•</span>
            <span>التاريخ: ${esc(rem.dueDate || 'اليوم')}</span>
          </div>

          <div class="flex items-center gap-2">
            <button data-action="send-wa" data-id="${rem.id}" class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500">
              <i data-lucide="send" class="h-3.5 w-3.5"></i>
              <span>واتساب للعميل</span>
            </button>
            <button data-action="toggle-done" data-id="${rem.id}" class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <i data-lucide="${isDone ? 'rotate-ccw' : 'check'}" class="h-3.5 w-3.5 ${isDone ? 'text-amber-500' : 'text-emerald-500'}"></i>
              <span>${isDone ? 'إعادة فتح' : 'تم الإنجاز'}</span>
            </button>
            <button data-action="delete-rem" data-id="${rem.id}" class="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition" title="حذف التذكير">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function exportCSV() {
  if (!reminders.length) {
    toast('لا توجد تذكيرات للتصدير', 'err');
    return;
  }
  const headers = ['المعرف', 'اسم العميل', 'رقم الهاتف', 'السيارة', 'نوع المتابعة', 'الموعد', 'الحالة', 'نص الرسالة'];
  const rows = reminders.map((r) => [
    r.id,
    r.clientName,
    r.clientPhone,
    r.carTitle,
    r.typeLabelAr || r.type,
    r.dueTime,
    r.status,
    `"${(r.message || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `reminders_alfares_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast('تم تحميل ملف التذكيرات بنجاح');
}
