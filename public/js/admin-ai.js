import { $, refreshIcons, toast } from './ui.js';
import { getLang, t } from './i18n.js';
import { api } from './api.js';

let ctx = null;
let analyticsData = null;
let branchesData = [];
let leadScores = {};
let sentimentAlerts = [];
let learnedData = [];

export function initAdminAI(context) {
  ctx = context;
  wireAdminAIEvents();
}

export async function loadAdminAI() {
  await Promise.all([
    loadAnalytics(),
    loadBranches(),
    loadGallery(),
    loadLearnedAnswers()
  ]);
  renderAdminAI();
}

async function loadLearnedAnswers() {
  try {
    const res = await fetch('/api/ai/learned');
    const data = await res.json();
    learnedData = data.learned || [];
  } catch (e) {
    learnedData = [];
  }
}

async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    analyticsData = data.analytics || {};
    // Extract lead scores and sentiments
    leadScores = analyticsData.leadScores || {};
    sentimentAlerts = (analyticsData.sentimentHistory || []).filter(s => s.shouldEscalate).slice(0, 10);
  } catch (e) {
    analyticsData = { carInquiries: {}, peakHours: {}, leadScores: {}, sentimentHistory: [] };
  }
}

async function loadBranches() {
  try {
    const res = await fetch('/api/branches');
    const data = await res.json();
    branchesData = data.branches || [];
  } catch (e) {
    branchesData = [];
  }
}

let galleryData = [];
async function loadGallery() {
  try {
    const res = await fetch('/api/cars/gallery');
    const data = await res.json();
    galleryData = data.gallery || [];
  } catch (e) {
    galleryData = [];
  }
}

function renderAdminAI() {
  renderLeadScores();
  renderSentimentAlerts();
  renderAnalyticsCharts();
  renderBranches();
  renderGallery();
  renderLearnedAnswers();
  updateStats();
  refreshIcons();
}

function renderLearnedAnswers() {
  const container = $('adminLearnedList');
  if (!container) return;
  const badge = $('statLearnedBadge');
  if (badge) badge.textContent = `${learnedData.length} إجابة متعلمة`;

  if (!learnedData.length) {
    container.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">لم يتم تسجيل ردود متعلمة بعد — عند الرد على العملاء في المحادثات المباشرة، سيتعلم الذكاء الاصطناعي إجابتك فوراً!</p>';
    return;
  }

  container.innerHTML = learnedData.map(l => {
    const dateStr = l.learnedAt ? new Date(l.learnedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs transition hover:border-[#128C7E]/40">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-2">
            <span class="rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 text-[11px] font-semibold">رد معتمد من المالك</span>
            <span class="text-slate-400 font-mono text-[10px]">${dateStr}</span>
          </div>
          <button class="text-rose-500 hover:text-rose-700 p-1" data-del-learned="${l.id}" title="حذف هذا الرد المتعلم">
            <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
          </button>
        </div>
        <p class="font-semibold text-slate-900 dark:text-slate-100 mb-1">سؤال العميل: "${l.question}"</p>
        <p class="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">${l.answer}</p>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-del-learned]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delLearned;
      if (!confirm('هل تريد حذف هذه الإجابة المتعلمة؟')) return;
      try {
        await fetch(`/api/ai/learned/${id}`, { method: 'DELETE' });
        toast('تم حذف الإجابة المتعلمة');
        await loadLearnedAnswers();
        renderLearnedAnswers();
        refreshIcons();
      } catch (e) {
        toast('فشل الحذف: ' + e.message, 'err');
      }
    });
  });
}

function maskPhone(phone) {
  if (!phone) return 'Unknown';
  const str = String(phone).replace(/\D/g, '');
  if (str.length < 8) return str;
  return str.slice(0, 4) + '****' + str.slice(-4);
}

function updateStats() {
  const hotLeads = Object.values(leadScores).filter(s => s.tier === 'hot').length;
  if ($('statHotLeads')) $('statHotLeads').textContent = hotLeads;
  if ($('statSentimentAlerts')) $('statSentimentAlerts').textContent = sentimentAlerts.length;
  if ($('statBranches')) $('statBranches').textContent = branchesData.length;
  if ($('statGallery')) $('statGallery').textContent = galleryData.length;
  if ($('sentimentBadge')) $('sentimentBadge').textContent = sentimentAlerts.length;
}

function renderLeadScores() {
  const container = $('adminLeadScores');
  if (!container) return;
  
  const phones = Object.keys(leadScores);
  if (phones.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-400 py-4">${getLang() === 'en' ? 'No lead scoring data yet' : 'لا توجد بيانات عملاء بعد'}</p>`;
    return;
  }
  
  let html = '';
  for (const phone of phones) {
    const score = leadScores[phone];
    let tierBg = 'bg-blue-100 text-blue-700';
    let tierIcon = '❄️';
    
    if (score.tier === 'hot') {
      tierBg = 'bg-rose-100 text-rose-700';
      tierIcon = '🔥';
    } else if (score.tier === 'warm') {
      tierBg = 'bg-amber-100 text-amber-700';
      tierIcon = '🌡️';
    }
    
    html += `
<div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
  <div>
    <p class="text-sm font-medium text-slate-900 dark:text-slate-100">${maskPhone(phone)}</p>
    <p class="text-xs text-slate-400">${score.summary || score.tier}</p>
  </div>
  <span class="text-xs font-bold px-2 py-1 rounded-full ${tierBg}">${tierIcon} ${score.score || 0}/100</span>
</div>`;
  }
  container.innerHTML = html;
}

function renderSentimentAlerts() {
  const container = $('adminSentimentAlerts');
  if (!container) return;
  
  if (sentimentAlerts.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-400 py-4">${getLang() === 'en' ? 'No escalation alerts currently ✅' : 'لا توجد تنبيهات حالياً ✅'}</p>`;
    return;
  }
  
  let html = '';
  for (const alert of sentimentAlerts) {
    html += `
<div class="flex items-start gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
  <span class="text-lg">${alert.sentiment === 'frustrated' ? '😤' : '⚡'}</span>
  <div>
    <p class="text-xs font-medium text-rose-800 dark:text-rose-300">${maskPhone(alert.phone)}</p>
    <p class="text-xs text-rose-600 dark:text-rose-400">${alert.reason || alert.sentiment}</p>
    <p class="text-[10px] text-slate-400">${alert.ts ? new Date(alert.ts).toLocaleString('ar-EG') : ''}</p>
  </div>
</div>`;
  }
  container.innerHTML = html;
}

function renderAnalyticsCharts() {
  const inquiriesContainer = $('adminCarInquiries');
  if (inquiriesContainer) {
    const inquiries = analyticsData.carInquiries || {};
    const models = Object.keys(inquiries);
    if (models.length === 0) {
      inquiriesContainer.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">لا توجد بيانات بعد</p>';
    } else {
      let max = 1;
      for (const m of models) if (inquiries[m] > max) max = inquiries[m];
      
      let html = '';
      for (const m of models) {
        const count = inquiries[m];
        const pct = Math.round((count / max) * 100);
        const shortName = m;
        html += `
<div class="flex items-center gap-2">
  <span class="text-xs w-24 truncate text-right">${shortName}</span>
  <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
    <div class="bg-emerald-500 h-2 rounded-full" style="width: ${pct}%"></div>
  </div>
  <span class="text-xs w-6 text-slate-400">${count}</span>
</div>`;
      }
      inquiriesContainer.innerHTML = html;
    }
  }

  const hoursContainer = $('adminPeakHours');
  if (hoursContainer) {
    const hours = analyticsData.peakHours || {};
    let maxHour = 1;
    for (let i = 0; i < 24; i++) {
      if ((hours[i] || 0) > maxHour) maxHour = hours[i];
    }
    
    let html = '';
    let hasData = false;
    for (let i = 0; i < 24; i++) {
      const count = hours[i] || 0;
      if (count > 0) hasData = true;
      const pct = Math.max(5, Math.round((count / maxHour) * 100));
      const bg = (i >= 9 && i <= 22) ? '#128C7E' : '#94a3b8';
      html += `<div class="flex-1 rounded-t" style="height: ${pct}%; background: ${bg}" title="${i}:00 - ${count} messages"></div>`;
    }
    if (hasData) {
      hoursContainer.innerHTML = html;
    } else {
      hoursContainer.innerHTML = '<p class="text-sm text-slate-400 m-auto">لا توجد بيانات بعد</p>';
    }
  }
}

function renderBranches() {
  const container = $('adminBranches');
  if (!container) return;
  
  if (branchesData.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-4 col-span-3">${getLang() === 'en' ? 'No branches configured' : 'لا توجد فروع مضافة'}</p>`;
    return;
  }
  
  let html = '';
  for (const b of branchesData) {
    html += `
<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
  <div class="flex items-start justify-between mb-2">
    <h3 class="font-semibold text-sm text-slate-900 dark:text-slate-100">${getLang() === 'en' ? (b.nameEn || b.name) : b.name}</h3>
    <span class="text-xs px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${b.status === 'active' ? (getLang() === 'en' ? '● Active' : '● نشط') : (getLang() === 'en' ? '○ Inactive' : '○ غير نشط')}</span>
  </div>
  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">📍 ${getLang() === 'en' ? (b.addressEn || b.address) : b.address}</p>
  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">📞 ${b.phone}</p>
  <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">👤 ${getLang() === 'en' ? (b.managerEn || b.manager) : b.manager}</p>
  <p class="text-xs text-slate-400">🚗 ${(b.inventory || []).length} ${getLang() === 'en' ? 'vehicles in stock' : 'سيارة في المخزون'}</p>
</div>`;
  }
  container.innerHTML = html;
}

function renderGallery() {
  const container = $('adminGallery');
  if (!container) return;
  
  if (galleryData.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-4 col-span-3">${getLang() === 'en' ? 'No cars available in showroom' : 'لا توجد سيارات في المعرض'}</p>`;
    return;
  }
  
  let html = '';
  for (const car of galleryData) {
    html += `
<div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
  <img src="${car.image}" alt="${car.name}" class="w-full h-40 object-cover" onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'">
  <div class="p-3">
    <p class="font-semibold text-sm text-slate-900 dark:text-slate-100">${car.name}</p>
    <p class="text-emerald-600 font-bold text-sm">${car.price}</p>
    <div class="flex gap-1 mt-1">
      <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">${car.category}</span>
      <span class="text-xs ${(car.stock || '').includes('Stock') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} px-2 py-0.5 rounded-full">${car.stock}</span>
    </div>
    ${car.specs ? `<div class="mt-2 text-xs text-slate-500 grid grid-cols-2 gap-0.5">
      <span>📅 ${car.specs.year || '-'}</span>
      <span>⚙️ ${car.specs.engine || '-'}</span>
      <span>🛣️ ${car.specs.mileage || '-'}</span>
      <span>⛽ ${car.specs.fuel || '-'}</span>
    </div>` : ''}
  </div>
</div>`;
  }
  container.innerHTML = html;
}

function wireAdminAIEvents() {
  const btnRefresh = $('btnRefreshAnalytics');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      toast('جاري تحديث البيانات...', 'info');
      await loadAdminAI();
      toast('تم تحديث البيانات', 'success');
    });
  }
  
  const btnAddBranch = $('btnAddBranch');
  if (btnAddBranch) {
    btnAddBranch.addEventListener('click', () => {
      toast('ميزة إضافة الفروع قيد التطوير', 'info');
    });
  }
  
  const btnRunFaqLearn = $('btnRunFaqLearn');
  if (btnRunFaqLearn) {
    btnRunFaqLearn.addEventListener('click', async () => {
      const origText = btnRunFaqLearn.innerHTML;
      btnRunFaqLearn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> جاري التحليل...';
      try {
        const metricsRes = await fetch('/api/metrics');
        const metricsData = await metricsRes.json();
        const unans = (metricsData.unansweredQuestions || []).slice(0, 3);
        
        if (unans.length === 0) {
          $('faqGapResults').innerHTML = '<p class="text-emerald-600">لا توجد أسئلة غير مجابة حالياً. النظام يعمل بكفاءة!</p>';
        } else {
          $('faqGapResults').innerHTML = '<p class="text-slate-500 mb-2">جاري توليد إجابات للأسئلة التالية:</p>';
          for (const q of unans) {
            $('faqGapResults').innerHTML += `<div class="p-2 bg-slate-50 dark:bg-slate-900 rounded mb-2 text-xs">${q}</div>`;
            await fetch('/api/ai/faq-gap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question: q })
            }).catch(e => {});
          }
          $('faqGapResults').innerHTML += '<p class="text-emerald-600 mt-2">تم توليد الإجابات المقترحة!</p>';
        }
      } catch (e) {
        toast('حدث خطأ أثناء الاتصال بالخادم', 'error');
      } finally {
        btnRunFaqLearn.innerHTML = origText;
        refreshIcons();
      }
    });
  }
  
  const btnGenPromotion = $('btnGenPromotion');
  if (btnGenPromotion) {
    btnGenPromotion.addEventListener('click', async () => {
      const tier = $('promoTier')?.value || 'hot';
      const score = tier === 'hot' ? 80 : tier === 'warm' ? 50 : 20;
      
      const origText = btnGenPromotion.innerHTML;
      btnGenPromotion.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> جاري التوليد...';
      try {
        const res = await fetch('/api/ai/promotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadScore: { tier, score }, lang: 'ar' })
        });
        const data = await res.json();
        if ($('promotionResult')) {
          $('promotionResult').value = data.promotion || 'تم التوليد بنجاح!';
        }
      } catch (e) {
        toast('حدث خطأ أثناء توليد العرض', 'error');
        if ($('promotionResult')) {
          $('promotionResult').value = 'عرض حصري لك! خصم 10% على سيارات مختارة.';
        }
      } finally {
        btnGenPromotion.innerHTML = origText;
        refreshIcons();
      }
    });
  }
}
