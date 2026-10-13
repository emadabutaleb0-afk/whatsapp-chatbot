import fs from 'fs';
import { answerQuestion } from '../ai.js';

const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));

const testCases = [
  { name: '1. Greeting', q: 'سلام عليكم' },
  { name: '2. Working Hours', q: 'مواعيد العمل ايه في المعرض؟' },
  { name: '3. Showroom Location', q: 'فين مكان المعرض بالضبط؟' },
  { name: '4. Trade-In Request', q: 'عايز ابدل نيسان صني 2020 فابريكا' },
  {
    name: '5. Trade-In Followup (ايوة)',
    q: 'ايوة',
    history: [
      { role: 'user', content: 'عايز ابدل نيسان 2020' },
      { role: 'assistant', content: 'تحب نحدد موعد لفحص وتثمين السيارة بالمعرض اليوم؟ 📞' }
    ]
  },
  { name: '6. Car Comparison', q: 'قارن بين كيا سبورتاج وهيونداي توسان' },
  { name: '7. Specific Model Price', q: 'سعر تويوتا كورولا كام؟' },
  { name: '8. Installment Calculation', q: 'احسب قسط كيا سبورتاج بمقدم 30%' },
  { name: '9. Test Drive Request', q: 'عايز احجز تجربة قيادة لتوسان بكره في التجمع' },
  { name: '10. Human Sales Rep Handover', q: 'عايز اكلم موظف مبيعات ضروري' },
  { name: '11. General Car Catalog', q: 'عندكم عربيات ايه واسعارها؟' },
  { name: '12. Brand Inventory', q: 'عندكم هيونداي ايه متوفر؟' },
  { name: '13. Financing Policy FAQ', q: 'ما هي الأوراق المطلوبة لتقسيط سيارة بالنسبة للموظفين؟' },
  { name: '14. Unanswered Out-of-Scope Query', q: 'بتصلحوا مراكب في المعرض؟' }
];

console.log('=== COMPREHENSIVE AI REPLIES AUDIT ===\n');

for (const tc of testCases) {
  console.log(`--- [${tc.name}] ---`);
  console.log(`Q: "${tc.q}"`);
  const res = await answerQuestion(tc.q, db.config, tc.history || []);
  console.log(`Source/Intent: ${res.intentType || res.source}`);
  console.log(`Reply:\n${res.reply}\n`);
}
