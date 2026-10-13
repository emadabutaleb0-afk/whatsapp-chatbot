import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const TRADE_INS = [
  {
    id: 'trd_001',
    tradeInNumber: 'TRD-1001',
    clientName: 'الحاج عاطف المنشاوي',
    clientPhone: '01555443322',
    carMake: 'Toyota',
    carModel: 'Toyota Fortuner 2020 V6 4.0L',
    carYear: 2020,
    mileage: '55,000 كم',
    condition: 'ممتازة فابريكا صيانات توكيل',
    paintStatus: 'فابريكا بالكامل (دهان المصنع)',
    estimatedValue: '2,100,000 ج.م (تثمين معتمد)',
    notes: 'تم فحص السيارة بمركز الفحص بفرع التجمع وتثمينها رسمياً لاستبدالها بـ Fortuner 2024 ودفع الفارق كاش.',
    status: 'approved',
    at: Date.now() - 2 * 86400000
  },
  {
    id: 'trd_002',
    tradeInNumber: 'TRD-1002',
    clientName: 'المستشار معتز الشافعي',
    clientPhone: '01099884422',
    carMake: 'Mercedes-Benz',
    carModel: 'Mercedes-Benz C180 Avantgarde 2019',
    carYear: 2019,
    mileage: '60,000 كم',
    condition: 'حالة نادرة كسر زيرو',
    paintStatus: 'فابريكا بالكامل',
    estimatedValue: '2,450,000 ج.م (تثمين معتمد)',
    notes: 'فحص هندسي كامل 150 نقطة سليم 100%، جاري استبدالها بـ Mercedes C200 AMG 2024.',
    status: 'approved',
    at: Date.now() - 3 * 86400000
  },
  {
    id: 'trd_003',
    tradeInNumber: 'TRD-1003',
    clientName: 'م. شريف المنياوي',
    clientPhone: '01223344889',
    carMake: 'Nissan',
    carModel: 'Nissan Sunny 2021 Super Saloon',
    carYear: 2021,
    mileage: '48,000 كم',
    condition: 'جيدة جداً',
    paintStatus: 'فابريكا بالكامل',
    estimatedValue: '680,000 - 720,000 ج.م (مبدئي)',
    notes: 'طلب العميل معاينة وفحص السيارة يوم الخميس القادم واستبدالها بـ MG 4 EV كهربائية زيرو.',
    status: 'pending',
    at: Date.now() - 1 * 86400000
  },
  {
    id: 'trd_004',
    tradeInNumber: 'TRD-1004',
    clientName: 'أ. كريم عبد الحميد',
    clientPhone: '01011229988',
    carMake: 'Kia',
    carModel: 'Kia Cerato 2019 Topline',
    carYear: 2019,
    mileage: '72,000 كم',
    condition: 'جيدة جداً فابريكا سقف وكبوت وشنطة',
    paintStatus: 'راشة إكصدامين نظافة فقط',
    estimatedValue: '850,000 - 900,000 ج.م (مبدئي)',
    notes: 'تواصل عبر واتساب لإرسال صور السيارة ورخصة التسيير، بانتظار فحص المعرض.',
    status: 'pending',
    at: Date.now() - 12 * 3600000
  },
  {
    id: 'trd_005',
    tradeInNumber: 'TRD-1005',
    clientName: 'د. هاني الجوهري',
    clientPhone: '01144558877',
    carMake: 'Renault',
    carModel: 'Renault Megane Turbo 2020 Signature',
    carYear: 2020,
    mileage: '65,000 كم',
    condition: 'ممتازة صيانة كاملة بالتوكيل',
    paintStatus: 'فابريكا بالكامل',
    estimatedValue: '980,000 - 1,020,000 ج.م (مبدئي)',
    notes: 'مهتم باستبدالها بـ Peugeot 3008 GT 2024 زيرو بالتقسيط.',
    status: 'pending',
    at: Date.now() - 6 * 3600000
  },
  {
    id: 'trd_006',
    tradeInNumber: 'TRD-1006',
    clientName: 'أ. طارق عبد المحسن',
    clientPhone: '01004455221',
    carMake: 'Škoda',
    carModel: 'Škoda Octavia A7 2018 Style Plus',
    carYear: 2018,
    mileage: '89,000 كم',
    condition: 'ممتازة تم الاستبدال',
    paintStatus: 'فابريكا دواخل وخوارج',
    estimatedValue: '880,000 ج.م (تمت التسوية)',
    notes: 'تمت الصفقة بنجاح واستلام السيارة القديمة وتسليم العميل Octavia A8 2024 وتقسيط الفارق.',
    status: 'completed',
    at: Date.now() - 15 * 86400000
  },
  {
    id: 'trd_007',
    tradeInNumber: 'TRD-1007',
    clientName: 'د. مصطفى الشريف',
    clientPhone: '01012345678',
    carMake: 'Toyota',
    carModel: 'Toyota Corolla 2020 Active Plus',
    carYear: 2020,
    mileage: '62,000 كم',
    condition: 'ممتازة تم الاستبدال',
    paintStatus: 'فابريكا بالكامل',
    estimatedValue: '920,000 ج.م (تمت التسوية)',
    notes: 'تم استبدالها بـ Toyota Corolla 2024 Smart Key زيرو ونقل الملكية بنجاح.',
    status: 'completed',
    at: Date.now() - 20 * 86400000
  }
];

const dbContent = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
dbContent.tradeIns = TRADE_INS;

fs.writeFileSync(DB_FILE, JSON.stringify(dbContent, null, 2), 'utf-8');
console.log(`✅ Successfully seeded ${TRADE_INS.length} trade-in appraisal records into ${DB_FILE}!`);
