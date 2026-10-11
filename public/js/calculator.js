// Automotive Financing, Installment Calculator & Vehicle Comparison Controller
import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let currentCars = [];
let currentCalcResult = null;

export function initCalculator(cars = []) {
  currentCars = cars;
  populateCarDropdowns();
  wireInstallmentModal();
  wireComparisonModal();
}

export function updateCalculatorCars(cars = []) {
  currentCars = cars;
  populateCarDropdowns();
}

function populateCarDropdowns() {
  const calcSelect = $('calcCarSelect');
  const compSelectA = $('compareCarSelectA');
  const compSelectB = $('compareCarSelectB');

  if (calcSelect) {
    const existingVal = calcSelect.value;
    calcSelect.innerHTML = `<option value="custom">✏️ إدخال سعر يدوي مخصص...</option>` +
      currentCars.map(c => `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.price)}</option>`).join('');
    if (existingVal) calcSelect.value = existingVal;
  }

  if (compSelectA && compSelectB) {
    const opts = currentCars.map(c => `<option value="${esc(c.name)}">${esc(c.name)} (${esc(c.price)})</option>`).join('');
    compSelectA.innerHTML = opts;
    compSelectB.innerHTML = opts;
    if (currentCars.length > 1) {
      compSelectB.selectedIndex = 1;
    }
  }
}

/* ==========================================================================
   INSTALLMENT CALCULATOR MODAL LOGIC
   ========================================================================== */

function wireInstallmentModal() {
  const modal = $('installmentModal');
  const openBtn = $('openInstallmentCalcBtn');
  const closeBtn = $('closeInstallmentModal');
  const carSelect = $('calcCarSelect');
  const priceInput = $('calcPriceInput');
  const downRange = $('calcDownPctRange');
  const yearsRange = $('calcYearsRange');
  const copyBtn = $('copyInstallmentQuoteBtn');
  const shareBtn = $('shareInstallmentWABtn');
  const insertBtn = $('insertInstallmentToChatBtn');

  openBtn?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
    recalculate();
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  carSelect?.addEventListener('change', () => {
    const val = carSelect.value;
    if (val !== 'custom') {
      const car = currentCars.find(c => c.id === val);
      if (car) {
        const raw = String(car.priceNum || car.price || '').replace(/,/g, '').replace(/[^\d.]/g, '');
        const num = parseFloat(raw);
        if (num && priceInput) priceInput.value = num;
      }
    }
    recalculate();
  });

  priceInput?.addEventListener('input', recalculate);

  downRange?.addEventListener('input', (e) => {
    const val = e.target.value;
    $('calcDownPctDisplay').textContent = `${val}%`;
    recalculate();
  });

  yearsRange?.addEventListener('input', (e) => {
    const val = e.target.value;
    $('calcYearsDisplay').textContent = `${val} سنوات`;
    recalculate();
  });

  // Down payment presets
  document.querySelectorAll('.calc-pct-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const pct = Number(btn.dataset.pct);
      if (downRange) downRange.value = pct;
      $('calcDownPctDisplay').textContent = `${pct}%`;
      recalculate();
    });
  });

  // Copy WhatsApp quote
  copyBtn?.addEventListener('click', () => {
    if (!currentCalcResult) return;
    const text = generateWhatsAppQuote(currentCalcResult);
    navigator.clipboard.writeText(text).then(() => {
      toast('تم نسخ عرض التقسيط المفصل لحافظتك بنجاح! 📋');
    }).catch(() => {
      toast('تعذر النسخ التلقائي');
    });
  });

  // Direct WhatsApp Web share
  shareBtn?.addEventListener('click', () => {
    if (!currentCalcResult) return;
    const text = generateWhatsAppQuote(currentCalcResult);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  // Insert to active reply box (live chat)
  insertBtn?.addEventListener('click', () => {
    if (!currentCalcResult) return;
    const text = generateWhatsAppQuote(currentCalcResult);
    const replyInput = $('liveReplyInput');
    if (replyInput) {
      replyInput.value = text;
      modal?.classList.add('hidden');
      toast('تم إدراج عرض التقسيط في صندوق الرد!');
      replyInput.focus();
    } else {
      navigator.clipboard.writeText(text);
      toast('تم نسخ العرض (انتقل للمحادثات للصقه).');
    }
  });

  // Trigger initial calculation
  recalculate();
}

export function openCalculatorForCar(car) {
  const modal = $('installmentModal');
  const carSelect = $('calcCarSelect');
  const priceInput = $('calcPriceInput');

  if (carSelect) carSelect.value = car.id || 'custom';
  if (priceInput) {
    const raw = String(car.priceNum || car.price || '').replace(/,/g, '').replace(/[^\d.]/g, '');
    const num = parseFloat(raw);
    if (num) priceInput.value = num;
  }
  modal?.classList.remove('hidden');
  recalculate();
}

async function recalculate() {
  const price = Number($('calcPriceInput')?.value) || 1500000;
  const downPct = Number($('calcDownPctRange')?.value) || 20;
  const years = Number($('calcYearsRange')?.value) || 5;

  try {
    const res = await api.calculateInstallment({
      price,
      downPaymentPct: downPct,
      tenureYears: years,
      annualInterestRate: 12
    });

    if (res.ok && res.calculation) {
      currentCalcResult = res.calculation;
      renderCalculation(res.calculation);
    }
  } catch (err) {
    console.error('Calculation error:', err);
  }
}

function renderCalculation(c) {
  if ($('calcResDownPayment')) $('calcResDownPayment').textContent = c.formattedDownPayment;
  if ($('calcResFinanced')) $('calcResFinanced').textContent = c.formattedFinancedAmount;
  if ($('calcResMonthly')) $('calcResMonthly').textContent = c.formattedMonthlyInstallment;
  if ($('calcResInterest')) $('calcResInterest').textContent = c.formattedTotalInterest;

  const altGrid = $('calcAlternativesGrid');
  if (altGrid && Array.isArray(c.alternatives)) {
    altGrid.innerHTML = c.alternatives.map(a => `
      <div class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${a.years === c.tenureYears ? 'ring-2 ring-teal-500' : ''}">
        <span class="text-slate-400 block font-medium">${a.years} سنوات (${a.months} شهر)</span>
        <p class="font-bold text-teal-700 dark:text-teal-300 mt-0.5">${a.formattedMonthly}</p>
      </div>
    `).join('');
  }
}

function generateWhatsAppQuote(c) {
  const carSelect = $('calcCarSelect');
  let carName = 'السيارة المختارة';
  if (carSelect && carSelect.value !== 'custom') {
    const found = currentCars.find(item => item.id === carSelect.value);
    if (found) carName = found.name;
  }

  const alt3 = c.alternatives?.find(a => a.years === 3)?.formattedMonthly || '—';
  const alt5 = c.alternatives?.find(a => a.years === 5)?.formattedMonthly || '—';
  const alt7 = c.alternatives?.find(a => a.years === 7)?.formattedMonthly || '—';

  return `حسبة التقسيط البنكي التقديرية لدى الفارس موتورز مصر: 💳🚗\n` +
    `• السيارة: ${carName}\n` +
    `• السعر الإجمالي: ${c.formattedPrice}\n` +
    `• المقدم المطلوب (${c.downPaymentPct}%): ${c.formattedDownPayment}\n` +
    `• المبلغ الممول: ${c.formattedFinancedAmount}\n` +
    `• مدة التقسيط: ${c.tenureYears} سنوات (${c.tenureMonths} شهر)\n` +
    `• القسط الشهري التقريبي: ${c.formattedMonthlyInstallment} / شهرياً 🌟\n\n` +
    `خيارات فترات السداد الأخرى بنفس المقدم (${c.downPaymentPct}%):\n` +
    `• 3 سنوات: ${alt3} / شهرياً\n` +
    `• 5 سنوات: ${alt5} / شهرياً\n` +
    `• 7 سنوات: ${alt7} / شهرياً\n\n` +
    `🏦 بنوك وشركات التمويل: بنك مصر، البنك الأهلي، بنك ناصر، كونتكت، فاليو، درايف.\n` +
    `📝 المستندات: صورة البطاقة الشخصية + إثبات دخل أو سجل تجاري.\n` +
    `📍 تفضل بزيارة معارضنا (التجمع الأول / مدينة نصر) لمعاينة السيارة واستلام عرض التقسيط النهائي!`;
}

/* ==========================================================================
   VEHICLE COMPARISON MODAL LOGIC
   ========================================================================== */

function wireComparisonModal() {
  const modal = $('compareCarsModal');
  const openBtn = $('openCompareCarsBtn');
  const closeBtn = $('closeCompareModal');
  const selectA = $('compareCarSelectA');
  const selectB = $('compareCarSelectB');
  const copyBtn = $('copyComparisonBtn');
  const insertBtn = $('insertComparisonBtn');

  openBtn?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
    runComparison();
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  selectA?.addEventListener('change', runComparison);
  selectB?.addEventListener('change', runComparison);

  copyBtn?.addEventListener('click', () => {
    const text = $('compareResultContainer')?.innerText || '';
    if (text) {
      navigator.clipboard.writeText(text);
      toast('تم نسخ المقارنة لحافظتك! 📋');
    }
  });

  insertBtn?.addEventListener('click', () => {
    const text = $('compareResultContainer')?.innerText || '';
    const replyInput = $('liveReplyInput');
    if (replyInput && text) {
      replyInput.value = text;
      modal?.classList.add('hidden');
      toast('تم إدراج المقارنة في صندوق الرد!');
      replyInput.focus();
    }
  });
}

async function runComparison() {
  const carA = $('compareCarSelectA')?.value;
  const carB = $('compareCarSelectB')?.value;
  const container = $('compareResultContainer');
  if (!container || !carA || !carB) return;

  container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">جاري تحليل المقارنة بالذكاء الاصطناعي...</p>`;

  try {
    const res = await api.compareCars(carA, carB);
    if (res.ok && res.comparison) {
      renderComparison(res.comparison);
    }
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">تعذر إجراء المقارنة: ${err.message}</p>`;
  }
}

function renderComparison(cmp) {
  const container = $('compareResultContainer');
  if (!container) return;

  const a = cmp.carA;
  const b = cmp.carB;

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-xs">
      <!-- Car A Card -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 space-y-2.5">
        <h4 class="font-bold text-slate-900 dark:text-white text-sm">${esc(a.name)}</h4>
        <p class="font-extrabold text-[#128C7E] text-base">${esc(a.price)}</p>
        <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 inline-block">${esc(a.category || 'Automotive')}</span>
        <div class="space-y-1 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
          <p>• سنة الصنع: ${esc(a.specs?.year || '—')}</p>
          <p>• المحرك: ${esc(a.specs?.engine || '—')}</p>
          <p>• ناقل الحركة: ${esc(a.specs?.transmission || '—')}</p>
          <p>• العداد: ${esc(a.specs?.mileage || '—')}</p>
          <p>• القسط التقريبي (5 سنين): <strong class="text-teal-600">${a.installment?.formattedMonthlyInstallment || '—'}</strong></p>
        </div>
      </div>

      <!-- Car B Card -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 space-y-2.5">
        <h4 class="font-bold text-slate-900 dark:text-white text-sm">${esc(b.name)}</h4>
        <p class="font-extrabold text-indigo-600 text-base">${esc(b.price)}</p>
        <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 inline-block">${esc(b.category || 'Automotive')}</span>
        <div class="space-y-1 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
          <p>• سنة الصنع: ${esc(b.specs?.year || '—')}</p>
          <p>• المحرك: ${esc(b.specs?.engine || '—')}</p>
          <p>• ناقل الحركة: ${esc(b.specs?.transmission || '—')}</p>
          <p>• العداد: ${esc(b.specs?.mileage || '—')}</p>
          <p>• القسط التقريبي (5 سنين): <strong class="text-indigo-600">${b.installment?.formattedMonthlyInstallment || '—'}</strong></p>
        </div>
      </div>
    </div>

    <!-- AI Recommendation -->
    <div class="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 text-xs text-indigo-950 dark:text-indigo-200">
      <div class="flex items-center gap-1.5 font-bold mb-1">
        <i data-lucide="sparkles" class="h-4 w-4 text-indigo-600"></i>
        <span>التقييم والتوصية الذكية (الفارق المالي: ${cmp.formattedPriceDiff})</span>
      </div>
      <p class="leading-relaxed">${esc(cmp.recommendation)}</p>
    </div>
  `;

  refreshIcons();
}
