// Automotive Dealership CRM & Clients Classification Controller
import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let customersList = [];
let currentFilterClass = 'all';
let currentFilterTier = 'all';
let currentFilterPayment = 'all';
let searchQuery = '';
let editingPhone = null;

export function initCustomers() {
  const addBtn = $('addCustomerBtn');
  const modal = $('customerModal');
  const closeBtn = $('closeCustomerModalBtn');
  const cancelBtn = $('cancelCustomerBtn');
  const form = $('customerForm');
  const refreshBtn = $('refreshCustomersBtn');
  const searchInput = $('customerSearchInput');
  const tierFilter = $('customerTierFilter');
  const paymentFilter = $('customerPaymentFilter');
  const exportBtn = $('exportCustomersCSVBtn');

  // Open Add Modal
  addBtn?.addEventListener('click', () => {
    editingPhone = null;
    $('customerModalTitle').textContent = 'إضافة عميل جديد وتصنيف الاهتمام';
    form?.reset();
    $('crmCustPhone').disabled = false;
    modal?.classList.remove('hidden');
  });

  const closeModal = () => {
    modal?.classList.add('hidden');
    form?.reset();
    editingPhone = null;
    $('crmCustPhone').disabled = false;
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Form Submit (Create or Update)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('crmCustName')?.value.trim();
    const phone = $('crmCustPhone')?.value.trim();
    const classification = $('crmCustClassification')?.value || 'lead';
    const tier = $('crmCustTier')?.value || 'Standard';
    const preferredCar = $('crmCustPreferredCar')?.value.trim() || '';
    const budgetRange = $('crmCustBudget')?.value.trim() || '';
    const preferredPayment = $('crmCustPayment')?.value || 'كاش فوري';
    const city = $('crmCustCity')?.value.trim() || 'القاهرة';
    const tags = $('crmCustTags')?.value.trim();
    const notes = $('crmCustNotes')?.value.trim() || '';

    if (!name || !phone) {
      toast('يرجى ملء اسم العميل ورقم هاتفه', 'err');
      return;
    }

    const payload = {
      name,
      phone,
      classification,
      tier,
      preferredCar,
      budgetRange,
      preferredPayment,
      city,
      tags,
      notes
    };

    try {
      if (editingPhone) {
        await api.updateCustomer(editingPhone, payload);
        toast('تم تحديث بيانات العميل وتصنيفه بنجاح! ✅');
      } else {
        await api.createCustomer(payload);
        toast('تمت إضافة العميل الجديد إلى قاعدة البيانات بنجاح! 👤✨');
      }
      closeModal();
      await loadCustomers();
    } catch (err) {
      toast('تعذر حفظ بيانات العميل: ' + err.message, 'err');
    }
  });

  // Filter tabs
  const tabs = document.querySelectorAll('#customerClassTabs .cust-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active', 'bg-violet-600', 'text-white', 'shadow-xs');
        t.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      });
      tab.classList.add('active', 'bg-violet-600', 'text-white', 'shadow-xs');
      tab.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      currentFilterClass = tab.dataset.class || 'all';
      renderCustomers();
    });
  });

  // Filters inputs
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCustomers();
  });

  tierFilter?.addEventListener('change', (e) => {
    currentFilterTier = e.target.value;
    renderCustomers();
  });

  paymentFilter?.addEventListener('change', (e) => {
    currentFilterPayment = e.target.value;
    renderCustomers();
  });

  refreshBtn?.addEventListener('click', () => {
    loadCustomers();
    toast('تم تحديث قاعدة بيانات العملاء.');
  });

  exportBtn?.addEventListener('click', exportCSV);

  // Delegation on customer cards (Edit, Delete, WhatsApp, Note)
  const listEl = $('customersList');
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-cust-action]');
      if (!btn) return;
      const phone = btn.dataset.phone;
      const action = btn.dataset.custAction;
      const cust = customersList.find(c => c.phone === phone);
      if (!cust) return;

      if (action === 'edit') {
        editingPhone = phone;
        $('customerModalTitle').textContent = 'تعديل بيانات وتصنيف العميل';
        $('crmCustName').value = cust.name || '';
        $('crmCustPhone').value = cust.phone || '';
        $('crmCustPhone').disabled = true;
        $('crmCustClassification').value = cust.classification || 'lead';
        $('crmCustTier').value = cust.tier || 'Standard';
        $('crmCustPreferredCar').value = cust.preferredCar || '';
        $('crmCustBudget').value = cust.budgetRange || '';
        $('crmCustPayment').value = cust.preferredPayment || 'كاش فوري';
        $('crmCustCity').value = cust.city || 'القاهرة';
        $('crmCustTags').value = Array.isArray(cust.tags) ? cust.tags.join(', ') : (cust.tags || '');
        $('crmCustNotes').value = cust.notes || '';
        modal?.classList.remove('hidden');
      } else if (action === 'delete') {
        if (!confirm(`هل أنت متأكد من حذف العميل "${cust.name}" نهائياً من قاعدة البيانات؟`)) return;
        try {
          await api.deleteCustomer(phone);
          toast('تم حذف العميل بنجاح');
          await loadCustomers();
        } catch (err) {
          toast('تعذر حذف العميل: ' + err.message, 'err');
        }
      }
    });
  }
}

export async function loadCustomers() {
  const host = $('customersList');
  if (host && !customersList.length) {
    host.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">جاري تحميل سجل العملاء وتصنيفاتهم...</p>';
  }

  try {
    const res = await api.getCustomers();
    customersList = res.customers || [];
    renderCustomers();
    updateKpis();
  } catch (err) {
    if (host) {
      host.innerHTML = `<p class="text-sm text-rose-500 py-4 text-center">تعذر تحميل بيانات العملاء: ${err.message}</p>`;
    }
  }
}

function updateKpis() {
  const total = customersList.length;
  const vip = customersList.filter(c => c.classification === 'vip' || c.tier === 'Platinum' || c.tier === 'Gold').length;
  const hot = customersList.filter(c => c.classification === 'serious_buyer').length;
  const testTrade = customersList.filter(c => c.classification === 'test_drive' || c.classification === 'trade_in').length;

  if ($('kpiTotalClients')) $('kpiTotalClients').textContent = String(total);
  if ($('kpiVipClients')) $('kpiVipClients').textContent = String(vip);
  if ($('kpiHotLeads')) $('kpiHotLeads').textContent = String(hot);
  if ($('kpiTradeInClients')) $('kpiTradeInClients').textContent = String(testTrade);

  const badge = $('customersCountBadge');
  if (badge) {
    badge.textContent = String(total);
  }
}

function renderCustomers() {
  const host = $('customersList');
  if (!host) return;

  let filtered = customersList.slice();

  // Classification filter
  if (currentFilterClass !== 'all') {
    filtered = filtered.filter(c => c.classification === currentFilterClass);
  }

  // Tier filter
  if (currentFilterTier !== 'all') {
    filtered = filtered.filter(c => c.tier === currentFilterTier);
  }

  // Payment filter
  if (currentFilterPayment !== 'all') {
    filtered = filtered.filter(c => (c.preferredPayment || '').includes(currentFilterPayment));
  }

  // Search
  if (searchQuery) {
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(searchQuery) ||
      (c.phone || '').includes(searchQuery) ||
      (c.preferredCar || '').toLowerCase().includes(searchQuery) ||
      (c.city || '').toLowerCase().includes(searchQuery) ||
      (c.notes || '').toLowerCase().includes(searchQuery)
    );
  }

  const counter = $('custFilteredCounter');
  if (counter) {
    counter.textContent = `عرض ${filtered.length} من أصل ${customersList.length} عميل`;
  }

  if (!filtered.length) {
    host.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center">
        <i data-lucide="users" class="mx-auto h-8 w-8 text-slate-300"></i>
        <p class="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">لا يوجد عملاء يطابقون شروط البحث أو التصنيف</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-slate-500">جرب تغيير شروط الفلترة أو الضغط على "+ إضافة عميل جديد".</p>
      </div>`;
    refreshIcons();
    return;
  }

  const classBadges = {
    vip: { bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: 'crown', label: 'عميل VIP متميز' },
    serious_buyer: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: 'flame', label: 'مشتري جاد (جاهز للتعاقد)' },
    test_drive: { bg: 'bg-blue-100 text-blue-900 border-blue-300', icon: 'car', label: 'حاجز تجربة قيادة' },
    trade_in: { bg: 'bg-cyan-100 text-cyan-900 border-cyan-300', icon: 'repeat', label: 'استبدال سيارة (Trade-In)' },
    installment: { bg: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: 'credit-card', label: 'تقسيط بنكي' },
    lead: { bg: 'bg-slate-100 text-slate-800 border-slate-300', icon: 'user', label: 'عميل مهتم (Lead)' },
    inactive: { bg: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: 'clock', label: 'غير متفاعل' }
  };

  const tierBadges = {
    Platinum: 'bg-purple-100 text-purple-800 border-purple-200',
    Gold: 'bg-amber-100 text-amber-800 border-amber-200',
    Silver: 'bg-slate-200 text-slate-700 border-slate-300',
    Standard: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  host.innerHTML = filtered.map(c => {
    const cls = classBadges[c.classification] || classBadges.lead;
    const tierClass = tierBadges[c.tier] || tierBadges.Standard;
    const cleanPhone = String(c.phone || '').replace(/[^\d]/g, '');
    const waPhone = cleanPhone.startsWith('20') ? cleanPhone : '2' + cleanPhone;

    return `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-violet-300 dark:hover:border-violet-700 transition">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold text-base shadow-sm">
              ${esc((c.name || 'C').slice(0, 2).toUpperCase())}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-slate-900 dark:text-white text-base">${esc(c.name)}</h4>
                <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${cls.bg}">
                  ${cls.label}
                </span>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${tierClass}">
                  ${esc(c.tier || 'Standard')}
                </span>
              </div>
              <p class="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">+${esc(c.phone)}</p>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-1.5">
            <a href="https://wa.me/${waPhone}" target="_blank" class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition" title="فتح محادثة واتساب">
              <i data-lucide="message-circle" class="h-3.5 w-3.5"></i>
              <span>واتساب</span>
            </a>
            <button data-cust-action="edit" data-phone="${c.phone}" class="rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 transition" title="تعديل بيانات وتصنيف العميل">
              <i data-lucide="edit-3" class="h-4 w-4"></i>
            </button>
            <button data-cust-action="delete" data-phone="${c.phone}" class="rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 p-2 text-slate-400 transition" title="حذف العميل">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span class="text-slate-400 block font-medium">السيارة المهتم بها:</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">${esc(c.preferredCar || 'غير محددة')}</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">الميزانية المقدرة:</span>
            <p class="font-bold text-[#128C7E] mt-0.5">${esc(c.budgetRange || 'غير محدد')}</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">طريقة السداد:</span>
            <p class="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">${esc(c.preferredPayment || 'كاش أو تقسيط')}</p>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">المحافظة / المدينة:</span>
            <p class="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">${esc(c.city || 'القاهرة')}</p>
          </div>
        </div>

        ${c.notes ? `
          <div class="mt-3 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 p-2.5 text-xs text-violet-950 dark:text-violet-200">
            <span class="font-bold">ملاحظات المستشار:</span> ${esc(c.notes)}
          </div>
        ` : ''}

        ${Array.isArray(c.tags) && c.tags.length ? `
          <div class="flex flex-wrap gap-1 mt-2.5">
            ${c.tags.map(t => `<span class="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">#${esc(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  refreshIcons();
}

function exportCSV() {
  if (!customersList.length) {
    toast('لا يوجد عملاء لتصديرهم', 'err');
    return;
  }

  const headers = ['اسم العميل', 'رقم الهاتف', 'التصنيف', 'المستوى', 'السيارة المهتم بها', 'الميزانية', 'طريقة السداد', 'المدينة', 'الملاحظات'];
  const rows = customersList.map(c => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"+${c.phone || ''}"`,
    `"${(c.classificationLabelAr || c.classification || '').replace(/"/g, '""')}"`,
    `"${c.tier || 'Standard'}"`,
    `"${(c.preferredCar || '').replace(/"/g, '""')}"`,
    `"${(c.budgetRange || '').replace(/"/g, '""')}"`,
    `"${(c.preferredPayment || '').replace(/"/g, '""')}"`,
    `"${(c.city || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `alfares_clients_crm_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast('تم تصدير قاعدة بيانات العملاء إلى Excel بنجاح! 📊');
}
