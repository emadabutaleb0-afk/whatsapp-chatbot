// Trade-Ins & Vehicle Appraisals Pipeline Controller
import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let tradeInsState = [];
let currentFilter = 'all';
let searchQuery = '';

export function initTradeIns() {
  const addBtn = $('addTradeInBtn');
  const modal = $('addTradeInModal');
  const closeBtn = $('closeTradeInModal');
  const cancelBtn = $('cancelTradeInBtn');
  const form = $('addTradeInForm');
  const refreshBtn = $('refreshTradeInsBtn');
  const searchInput = $('tradeInSearchInput');

  if (addBtn && modal) {
    addBtn.addEventListener('click', () => {
      form?.reset();
      modal.classList.remove('hidden');
    });
  }

  const closeModal = () => modal?.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      clientName: $('tiClientName')?.value.trim(),
      clientPhone: $('tiClientPhone')?.value.trim(),
      carMake: $('tiCarModel')?.value.trim(),
      carModel: $('tiCarModel')?.value.trim(),
      carYear: Number($('tiCarYear')?.value),
      mileage: $('tiMileage')?.value.trim(),
      paintStatus: $('tiPaintStatus')?.value,
      notes: $('tiNotes')?.value.trim()
    };

    try {
      await api.createTradeIn(payload);
      toast('تم تسجيل طلب الاستبدال والتثمين بنجاح! 🔄');
      closeModal();
      await loadTradeIns();
    } catch (err) {
      toast('فشل تسجيل الطلب: ' + err.message, 'err');
    }
  });

  refreshBtn?.addEventListener('click', () => {
    loadTradeIns();
    toast('تم تحديث قائمة طلبات الاستبدال.');
  });

  // Filter tabs
  const tabs = document.querySelectorAll('#tradeInStatusTabs .tradein-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active', 'bg-white', 'dark:bg-slate-700', 'text-cyan-700', 'dark:text-cyan-300', 'shadow-sm');
        t.classList.add('text-slate-600', 'dark:text-slate-300');
      });
      tab.classList.add('active', 'bg-white', 'dark:bg-slate-700', 'text-cyan-700', 'dark:text-cyan-300', 'shadow-sm');
      tab.classList.remove('text-slate-600', 'dark:text-slate-300');
      currentFilter = tab.dataset.status || 'all';
      renderTradeIns();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTradeIns();
  });

  // Auto-load trade-ins on module initialization
  loadTradeIns();
}

export async function loadTradeIns() {
  try {
    const res = await api.getTradeIns();
    tradeInsState = res.tradeIns || [];
    renderTradeIns();
    updateBadge();
  } catch (err) {
    console.error('Could not load trade-ins:', err);
  }
}

function updateBadge() {
  const badge = $('tradeInsCountBadge');
  if (badge) {
    const pendingCount = tradeInsState.filter(t => t.status === 'pending').length;
    badge.textContent = pendingCount || tradeInsState.length || 0;
  }
}

export function renderTradeIns() {
  const host = $('tradeInsList');
  if (!host) return;

  let filtered = tradeInsState;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => t.status === currentFilter);
  }

  if (searchQuery) {
    filtered = filtered.filter(t => 
      (t.clientName || '').toLowerCase().includes(searchQuery) ||
      (t.clientPhone || '').includes(searchQuery) ||
      (t.carModel || '').toLowerCase().includes(searchQuery)
    );
  }

  if (!filtered.length) {
    host.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <i data-lucide="repeat" class="mx-auto h-8 w-8 text-slate-300"></i>
        <p class="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">لا توجد طلبات استبدال حالياً</p>
        <p class="text-xs text-slate-400 mt-1">عند طلب العملاء استبدال سياراتهم على واتساب، سيتم إدراج طلبات التثمين هنا تلقائياً.</p>
      </div>`;
    refreshIcons();
    return;
  }

  host.innerHTML = filtered.map(t => {
    const statusMap = {
      pending: { label: 'في انتظار الفحص ⏳', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
      inspected: { label: 'تم الفحص الفني 🔍', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
      approved: { label: 'تمت الموافقة والتثمين ✅', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
      completed: { label: 'تم التعاقد والاستبدال 🤝', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
      cancelled: { label: 'ملغي ❌', bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
    };
    const s = statusMap[t.status] || statusMap.pending;
    const cleanPhone = String(t.clientPhone || '').replace(/[^\d]/g, '');

    return `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 shadow-xs space-y-3" data-id="${t.id}">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 p-2 font-mono text-xs font-bold">${esc(t.tradeInNumber || 'TRD')}</span>
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t.clientName)}</h4>
              <p class="text-xs text-slate-400 font-mono" dir="ltr">${esc(t.clientPhone)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full px-2.5 py-0.5 text-xs font-bold ${s.bg}">${s.label}</span>
            <select class="ti-status-select rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-1 outline-none text-slate-700 dark:text-slate-300" data-id="${t.id}">
              <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>⏳ معلق للفحص</option>
              <option value="approved" ${t.status === 'approved' ? 'selected' : ''}>✅ موافقة وتثمين</option>
              <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>🤝 تم التعاقد</option>
              <option value="cancelled" ${t.status === 'cancelled' ? 'selected' : ''}>❌ إلغاء</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span class="text-slate-400 block font-medium">السيارة الحالية:</span>
            <p class="font-bold text-slate-900 dark:text-white mt-0.5">${esc(t.carModel || t.carMake)} (${t.carYear || ''})</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">العداد:</span>
            <p class="font-bold text-slate-900 dark:text-white mt-0.5">${esc(t.mileage || 'غير محدد')}</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">حالة الدهان:</span>
            <p class="font-bold text-slate-900 dark:text-white mt-0.5">${esc(t.paintStatus || 'فابريكا')}</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">التقدير المالي:</span>
            <p class="font-bold text-cyan-600 mt-0.5">${esc(t.estimatedValue || 'في انتظار الفحص')}</p>
          </div>
        </div>

        ${t.notes ? `<p class="text-xs text-slate-600 dark:text-slate-400 italic">ملاحظات: ${esc(t.notes)}</p>` : ''}

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span class="text-[11px] text-slate-400">${new Date(t.at || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <div class="flex items-center gap-2">
            ${cleanPhone ? `
              <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`أهلاً بك أستاذ ${t.clientName} في الفارس موتورز بخصوص تثمين سيارتك (${t.carModel || ''})، يسعدنا التنسيق معك...`)}" target="_blank" class="flex items-center gap-1 rounded-lg bg-emerald-600 text-white font-bold px-3 py-1.5 hover:bg-emerald-700 transition">
                <i data-lucide="send" class="h-3.5 w-3.5"></i> واتساب مباشر
              </a>
            ` : ''}
            <button class="ti-delete-btn p-1.5 text-slate-400 hover:text-rose-600 transition" data-id="${t.id}" title="حذف">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Wire status change
  host.querySelectorAll('.ti-status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      try {
        await api.updateTradeInStatus(id, status);
        toast('تم تحديث حالة طلب الاستبدال.');
        await loadTradeIns();
      } catch (err) {
        toast('فشل التحديث: ' + err.message, 'err');
      }
    });
  });

  // Wire delete
  host.querySelectorAll('.ti-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('هل أنت متأكد من حذف طلب الاستبدال؟')) return;
      try {
        await api.deleteTradeIn(id);
        toast('تم حذف الطلب.');
        await loadTradeIns();
      } catch (err) {
        toast('فشل الحذف: ' + err.message, 'err');
      }
    });
  });

  refreshIcons();
}
