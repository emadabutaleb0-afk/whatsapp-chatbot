import assert from 'assert';

const BASE_URL = 'http://localhost:3005';

async function fetchJSON(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runSystemTests() {
  console.log('🚗 Starting End-to-End System Tests for Al-Fares Motors...');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name} ->`, err.message);
        failed++;
      }
    };
  }

  const tests = [
    // 1. Static Assets
    test('1. Static HTML Root (GET /)', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert(text.includes('Al-Fares Motors'));
      assert(text.includes('id="metricCards"'));
      assert(text.includes('id="statsTabs"'));
    }),

    test('2. Static App JS (GET /js/app.js)', async () => {
      const res = await fetch(`${BASE_URL}/js/app.js`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert(text.includes('initDashboard'));
      assert(text.includes('setView'));
    }),

    // 2. Health & Status
    test('3. API Status (GET /api/status)', async () => {
      const { status, ok, data } = await fetchJSON('/api/status');
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert.strictEqual(data.productCount, 65);
      assert(data.businessName.includes('Al-Fares Motors'));
    }),

    // 3. Config
    test('4. Config API (GET /api/config)', async () => {
      const { status, ok, data } = await fetchJSON('/api/config');
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.config && data.config.products && data.config.products.length === 65);
      assert(data.config.faqEntries && data.config.faqEntries.length >= 30);
    }),

    // 4. Metrics
    test('5. Metrics (GET /api/metrics?days=7)', async () => {
      const { status, ok, data } = await fetchJSON('/api/metrics?days=7');
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.totals && data.totals.messages !== undefined);
      assert(Array.isArray(data.series));
      assert(Array.isArray(data.hourly));
    }),

    // 5. Chat AI Inquiries
    test('6. Chat Assistant Installment Inquiry (POST /api/chat)', async () => {
      const { status, ok, data } = await fetchJSON('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'عايز احسب قسط كيا سبورتاج بمقدم 30% على 5 سنين',
          history: []
        })
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.reply && data.reply.length > 20);
      assert(data.reply.includes('قسط') || data.reply.includes('سبورتاج') || data.reply.includes('جنيه'));
    }),

    test('7. Chat Assistant Trade-In Valuation (POST /api/chat)', async () => {
      const { status, ok, data } = await fetchJSON('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'عايز ابدل عربيتي نيسان صني 2021 فابريكا بالكامل',
          history: []
        })
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.reply && data.reply.length > 20);
      assert(data.reply.includes('استبدال') || data.reply.includes('تثمين') || data.reply.includes('المعرض') || data.reply.includes('نيسان'));
    }),

    // 6. Direct Calculator Endpoint
    test('8. Installment Calculator API (POST /api/calculator/installment)', async () => {
      const { status, ok, data } = await fetchJSON('/api/calculator/installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carPrice: 2000000,
          downPaymentPct: 20,
          years: 5
        })
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      const c = data.calculation;
      assert(c && c.downPayment === 400000);
      assert.strictEqual(c.financedAmount, 1600000);
      assert(c.monthlyInstallment > 0);
      assert(c.minNetSalary > 0);
      assert(c.approxAnnualInsurance > 0);
    }),

    // 7. Trade-Ins API
    test('9. Trade-In Submission & Lifecycle (POST & GET & PATCH /api/trade-ins)', async () => {
      const createRes = await fetchJSON('/api/trade-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'د. مصطفى الشريف',
          clientPhone: '01012345678',
          carMake: 'Toyota',
          carModel: 'Corolla 2022',
          carYear: 2022,
          mileage: '45,000 كم',
          paintStatus: 'فابريكا بالكامل',
          notes: 'فحص بفرع التجمع الأول'
        })
      });
      assert.strictEqual(createRes.status, 200);
      assert(createRes.data.tradeIn && createRes.data.tradeIn.id);
      const tiId = createRes.data.tradeIn.id;

      // Update status
      const patchRes = await fetchJSON(`/api/trade-ins/${tiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inspected', updates: { appraiseOffer: 950000 } })
      });
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.data.tradeIn.status, 'inspected');

      // Cleanup
      const delRes = await fetchJSON(`/api/trade-ins/${tiId}`, { method: 'DELETE' });
      assert.strictEqual(delRes.status, 200);
    }),

    // 8. Car Comparison & Budget Recommendation
    test('10. Vehicle Comparison API (POST /api/ai/compare-cars)', async () => {
      const { status, ok, data } = await fetchJSON('/api/ai/compare-cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carA: 'Mercedes-Benz C200',
          carB: 'Kia Sportage'
        })
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.comparison && (data.comparison.recommendation || data.comparison.cheaperCar));
    }),

    test('11. Budget Recommendation API (POST /api/ai/recommend-budget)', async () => {
      const { status, ok, data } = await fetchJSON('/api/ai/recommend-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: 1800000,
          preferences: { suvOnly: true }
        })
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(Array.isArray(data.recommendations));
    }),

    // 9. Orders & Reservations
    test('12. Orders API (GET & POST /api/orders)', async () => {
      const createRes = await fetchJSON('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'م. أحمد خالد',
          clientPhone: '01122334455',
          items: [{ name: 'Kia Sportage 2024 Topline', qty: 1, price: '1,950,000', subtotal: '1,950,000' }],
          total: '50,000 ج.م عربون حجز وتثبيت السعر',
          notes: 'استلام فرع التجمع'
        })
      });
      assert.strictEqual(createRes.status, 200);
      assert(createRes.data.order && createRes.data.order.id);
    }),

    test('13. Reservations API (GET & POST /api/reservations)', async () => {
      const createRes = await fetchJSON('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'أ. طارق عبد الرحمن',
          clientPhone: '01233445566',
          partySize: 2,
          date: '2026-10-15',
          time: '18:00',
          notes: 'تجربة قيادة مرسيدس C200 - فرع مدينة نصر'
        })
      });
      assert.strictEqual(createRes.status, 200);
      assert(createRes.data.reservation && createRes.data.reservation.id);
    }),

    // 10. Reminders Lifecycle
    test('14. Reminders Lifecycle (POST, PATCH, DELETE /api/reminders)', async () => {
      const createRes = await fetchJSON('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'محمد سالم',
          clientPhone: '01099887766',
          carTitle: 'Škoda Octavia A8',
          type: 'financing_docs',
          dueDate: '2026-10-14',
          dueTime: '15:00',
          message: 'متابعة استلام مفردات المرتب وكشف الحساب البنكي',
          assignedTo: 'Abdallah'
        })
      });
      assert.strictEqual(createRes.status, 200);
      const remId = createRes.data.reminder.id;

      // Update
      const patchRes = await fetchJSON(`/api/reminders/${remId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.data.reminder.status, 'completed');

      // Delete
      const delRes = await fetchJSON(`/api/reminders/${remId}`, { method: 'DELETE' });
      assert.strictEqual(delRes.status, 200);
    }),

    // 11. Customers CRM & 360 Context
    test('15. Unified Customer Context (GET /api/customers/:phone/unified)', async () => {
      const { status, ok, data } = await fetchJSON('/api/customers/01012345678/unified');
      assert.strictEqual(status, 200);
      assert.strictEqual(ok, true);
      assert(data.profile && data.profile.aiSummary && data.profile.name);
    })
  ];

  for (const t of tests) {
    await t();
  }

  console.log(`\n========================================`);
  console.log(`End-to-End System Test Results: ${passed} Passed, ${failed} Failed.`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
