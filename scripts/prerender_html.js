import fs from 'fs';
import path from 'path';

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const tradeIns = db.tradeIns || [];
const customers = Object.values(db.customers || {});

// 1. Generate Trade-Ins HTML
const statusMap = {
  pending: { label: 'في انتظار الفحص ⏳', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  inspected: { label: 'تم الفحص الفني 🔍', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  approved: { label: 'تمت الموافقة والتثمين ✅', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  completed: { label: 'تم التعاقد والاستبدال 🤝', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  cancelled: { label: 'ملغي ❌', bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
};

const tradeInsHTML = tradeIns.map(t => {
  const s = statusMap[t.status] || statusMap.pending;
  const cleanPhone = String(t.clientPhone || '').replace(/[^\d]/g, '');
  const formattedDate = new Date(t.at || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

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
        <span class="text-[11px] text-slate-400">${formattedDate}</span>
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
}).join('\n');

// 2. Generate Customers HTML
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

const customersHTML = customers.map(c => {
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
    </div>`;
}).join('\n');

// 3. Inject into public/index.html
let html = fs.readFileSync(INDEX_HTML, 'utf-8');

// Replace tradeInsList
const tradeInsRegex = /<div id="tradeInsList" class="space-y-3">[\s\S]*?<\/div>/;
html = html.replace(tradeInsRegex, `<div id="tradeInsList" class="space-y-3">\n${tradeInsHTML}\n</div>`);

// Replace customersList
const customersRegex = /<div id="customersList" class="space-y-3">[\s\S]*?<\/div>/;
html = html.replace(customersRegex, `<div id="customersList" class="space-y-3">\n${customersHTML}\n</div>`);

fs.writeFileSync(INDEX_HTML, html, 'utf-8');
console.log('✅ Successfully pre-rendered tradeIns and customers into public/index.html!');
