import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_CONFIG = {
  business: {
    name: 'Al-Fares Motors | الفارس للسيارات',
    tagline: 'Premier Dealership for New & Certified Pre-Owned Cars (سيارات زيرو ومستعملة)',
    about: 'Al-Fares Motors is your premier automotive dealership specializing in brand-new and certified pre-owned vehicles with comprehensive multi-point inspection, flexible bank installment plans, official manufacturer warranties, and direct trade-in options.',
    hours: 'Saturday–Thursday: 9:00 AM – 11:00 PM\nFriday: 1:30 PM – 11:00 PM',
    location: 'Plot 45, Auto Market District, Ring Road Entrance, New Cairo / Downtown Showroom',
    mapsUrl: 'https://maps.app.goo.gl/alfaresmotors',
    phone: '+20 100 888 9900',
    delivery: 'Nationwide vehicle delivery on flatbed carrier within 24-48 hours. Showroom pickup & private test drives available.',
    payment: 'Cash, Direct Bank Transfer, Visa / Mastercard, Islamic & Conventional Auto Loans (Installments up to 7 years with 20% down payment), Direct Trade-in (تبديل وتقسيط الفارق).',
    policies: 'Comprehensive 150-point inspection certificate included with all pre-owned cars. 3-year warranty on new cars. 6-month engine & transmission warranty on certified used cars. Fair market trade-in valuation.',
    faqs: 'Test drives require a valid national ID and driver license. Instant loan approval partnerships with all major banks. Full registration and license paperwork assistance provided.',
    language: 'Reply naturally and politely in Egyptian Arabic, Standard Arabic, English, or Franco-Arab according to the client language.',
    tone: 'Professional, trustworthy, helpful, automotive-expert and courteous.',
    latitude: 30.0131,
    longitude: 31.4289
  },
  products: [
    {
      id: 'car_1',
      name: 'Mercedes-Benz C200 2024 AMG (Zero / New)',
      price: '3,850,000 EGP',
      category: 'New Cars (Zero)',
      stock: 'In Stock (Showroom)',
      description: 'Brand new 2024 zero km, 1.5L Turbo Mild-Hybrid, AMG Line interior & exterior, Panoramic sunroof, Burmester 3D Sound, Digital Light headlights, 360 Cameras, Official Agent Warranty.',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'New (Zero)',
        year: 2024,
        mileage: '0 km',
        engine: '1.5L Turbo 204 hp',
        transmission: '9G-Tronic Automatic',
        fuel: 'Petrol',
        color: 'Obsidian Black / Polar White',
        warranty: '3 Years Agency Warranty'
      }
    },
    {
      id: 'car_2',
      name: 'BMW 320i 2023 M-Sport (Certified Used)',
      price: '2,650,000 EGP',
      category: 'Used Cars (مستعمل بحالة الزيرو)',
      stock: 'Available (1 Unit)',
      description: 'Used 28,000 km, pristine factory paint (فابريكا بالكامل), full dealer service history, M-Sport Package, Harman Kardon audio, BMW Live Cockpit Professional, 19" M wheels.',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'Used',
        year: 2023,
        mileage: '28,000 km',
        engine: '2.0L TwinPower Turbo 184 hp',
        transmission: '8-Speed Steptronic Sport',
        fuel: 'Petrol',
        color: 'Portimao Blue / Cognac Leather',
        warranty: '6 Months Dealership Engine Warranty'
      }
    },
    {
      id: 'car_3',
      name: 'Toyota Corolla 2024 Smart (Zero / New)',
      price: '1,450,000 EGP',
      category: 'New Cars (Zero)',
      stock: 'In Stock (Multiple Colors)',
      description: 'Brand new 2024 zero km, 1.6L Dual VVT-i, Smart Entry & Push Start, 8-inch Touchscreen with Apple CarPlay & Android Auto, Sunroof, Dual-zone Climate Control, 16" Alloy rims.',
      image: 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'New (Zero)',
        year: 2024,
        mileage: '0 km',
        engine: '1.6L 120 hp',
        transmission: 'CVT Automatic',
        fuel: 'Petrol',
        color: 'Silver / Super White / Celestite Grey',
        warranty: '5 Years / 150,000 km Agency Warranty'
      }
    },
    {
      id: 'car_4',
      name: 'Hyundai Tucson 2022 Turbo NX4 (Certified Used)',
      price: '1,580,000 EGP',
      category: 'Used Cars (مستعمل بحالة الزيرو)',
      stock: 'Available (1 Unit)',
      description: 'Used 45,000 km, Top line with Panoramic roof, 100% factory original paint (فابريكا دواخل وخوارج), full agency service book, ventilated electric leather seats, smart power tailgate.',
      image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'Used',
        year: 2022,
        mileage: '45,000 km',
        engine: '1.6L T-GDI 180 hp',
        transmission: '7-Speed DCT Dual Clutch',
        fuel: 'Petrol',
        color: 'Dark Knight Gray / Black Leather',
        warranty: 'Certified 150-Point Technical Report'
      }
    },
    {
      id: 'car_5',
      name: 'Kia Sportage 2024 GT-Line (Zero / New)',
      price: '1,950,000 EGP',
      category: 'New Cars (Zero)',
      stock: 'In Stock (Showroom)',
      description: 'Brand new zero km, 1.6 Turbo 180 hp, GT-Line sports styling, Curved dual 12.3" displays, 19" alloy wheels, full driver assistance safety suite, wireless phone charging.',
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'New (Zero)',
        year: 2024,
        mileage: '0 km',
        engine: '1.6L Turbo 180 hp',
        transmission: '7-Speed DCT',
        fuel: 'Petrol',
        color: 'Infra Red / Pearl White',
        warranty: '5 Years Agency Warranty'
      }
    },
    {
      id: 'car_6',
      name: 'Range Rover Sport 2021 HSE Dynamic (Certified Used)',
      price: '4,900,000 EGP',
      category: 'Used Cars (مستعمل بحالة الزيرو)',
      stock: 'Available (1 Unit)',
      description: 'Certified pre-owned 38,000 km, V6 Supercharged, Meridian Surround Audio, Soft-close doors, Adaptive Air Suspension, Head-Up Display, immaculate condition.',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&auto=format&fit=crop&q=80',
      specs: {
        condition: 'Used',
        year: 2021,
        mileage: '38,000 km',
        engine: '3.0L V6 Supercharged 360 hp',
        transmission: '8-Speed Automatic AWD',
        fuel: 'Petrol',
        color: 'Santorini Black / Ebony & Tan Leather',
        warranty: '1-Year Extended Powertrain Warranty'
      }
    }
  ],
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'my-secret-verify-token',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    autoReply: true,
    fallback: 'سؤال ممتاز يا فندم! دعني أتأكد مع فريق المبيعات الفني وأرد على حضرتك فوراً.',
    model: process.env.PUTER_MODEL || 'gpt-5.4-nano'
  },
  faqEntries: [
    {
      id: 'faq1',
      question: 'What are your showroom opening hours? / ما هي مواعيد عمل المعرض؟',
      answer: 'معرض الفارس للسيارات يرحب بحضراتكم يومياً:\n• السبت إلى الخميس: من 9:00 صباحاً حتى 11:00 مساءً.\n• الجمعة: من 1:30 ظهراً حتى 11:00 مساءً.\nيسعدنا زيارتكم في أي وقت أو حجز موعد معاينة وتجربة قيادة مسبقاً! 🚗',
      aliases: 'مواعيد العمل ايه\nفاتحين دلوقتي؟\nشغالين الجمعة؟\nwhat time do you open?\nare you open today?',
      mode: 'exact'
    },
    {
      id: 'faq2',
      question: 'Where is your car showroom located? / أين يقع المعرض بالتحديد؟',
      answer: 'فرعنا الرئيسي:\n📍 قطعة 45، منطقة سوق السيارات، مدخل الطريق الدائري، التجمع / القاهرة الجديدة.\nرابط لوكيشن خرائط جوجل: https://maps.app.goo.gl/alfaresmotors\nيسعدنا استقبالكم وسياراتنا جاهزة للمعينة والفحص!',
      aliases: 'عنوان المعرض فين\nازاي اجي المعرض\nفين مكانكم بالضبط\nshow room address\nwhere are you located?',
      mode: 'exact'
    },
    {
      id: 'faq3',
      question: 'Do you offer car installment & financing plans? / هل يوجد تقسيط وعروض تمويل؟',
      answer: 'نعم بكل تأكيد! 💳 نوفر برامج تقسيط مرنة بالتعاون مع جميع البنوك والشركات التمويلية:\n• مقدم يبدأ من 20% فقط.\n• فترات سداد مرنة تصل حتى 7 سنوات (84 شهراً).\n• فائدة تنافسية وبرامج بدون تأمين إجباري أو بدون إثبات دخل لبعض الفئات.\n• إمكانية استبدال سيارتك القديمة وتقسيط الفارق!\nللاستعلام عن قسط أي سيارة محددة، تواصل معنا وسنحسبها لك فوراً.',
      aliases: 'في تقسيط؟\nنظام التقسيط ايه\nاقل مقدم كام\nتقسيط بنكي\ndo you have installment plans?\ncar finance',
      mode: 'exact'
    },
    {
      id: 'faq4',
      question: 'Can I trade in (exchange) my current car? / هل متاح استبدال أو بيع سيارتي القديمة؟',
      answer: 'نعم، نوفر خدمة الاستبدال المباشر (Trade-In)! 🔄\nيقوم خبراؤنا بفحص سيارتك وتقديرها بأعلى سعر سوقي عادل، ويمكنك استخدام قيمتها كمقدم وشراء أي سيارة زيرو أو مستعملة من المعرض وتقسيط الفارق بكل سهولة.',
      aliases: 'عايز ابدل عربيتي\nفي استبدال؟\nتبديل عربيات\ntrade in my car\ncar exchange',
      mode: 'exact'
    },
    {
      id: 'faq5',
      question: 'Can I book a test drive? / كيف يمكنني حجز تجربة قيادة؟',
      answer: 'بكل سرور! 🏎️ تجارب القيادة متاحة مجاناً لجميع السيارات بالمعرض. فقط أرسل لنا اسم السيارة المطلوبة واليوم والوقت المناسب لحضرتك (ورقم هاتفك)، وسيتم تجهيز السيارة وتأكيد موعد تجربة القيادة فوراً!',
      aliases: 'عايز اجرب العربية\nحجز تجربة قيادة\ntest drive booking\ncan i test drive',
      mode: 'exact'
    },
    {
      id: 'faq6',
      question: 'What are the warranties on used cars? / ما هي ضمانات السيارات المستعملة؟',
      answer: 'جميع السيارات المستعملة لدينا:\n1. تخضع لفحص فني شامل يغطي 150 نقطة (شاسيه، محرك، فتيس، دهان، صالون).\n2. شهادة فحص معتمدة وضمان خلو الشاسيه والدواخل من أي حوادث.\n3. ضمان 6 أشهر على المحرك وناقل الحركة من المعرض.',
      aliases: 'ضمان المستعمل ايه\nحالة العربيات المستعملة\nused cars warranty\ncar inspection',
      mode: 'exact'
    }
  ]
};

const DEFAULT_BRANCHES = [
  {
    id: 'branch_main',
    name: 'المعرض الرئيسي - التجمع الخامس',
    nameEn: 'Main Showroom - New Cairo',
    address: 'قطعة 45، منطقة سوق السيارات، مدخل الطريق الدائري، التجمع الخامس',
    phone: '+20 100 888 9900',
    mapsUrl: 'https://maps.app.goo.gl/alfaresmotors',
    hours: 'السبت–الخميس: 9ص–11م | الجمعة: 1:30م–11م',
    latitude: 30.0131,
    longitude: 31.4289,
    manager: 'أحمد الفارس',
    status: 'active',
    inventory: ['car_1', 'car_2', 'car_3', 'car_4', 'car_5', 'car_6']
  },
  {
    id: 'branch_downtown',
    name: 'فرع وسط البلد - القاهرة',
    nameEn: 'Downtown Cairo Branch',
    address: '12 شارع رمسيس، وسط البلد، القاهرة',
    phone: '+20 100 777 8800',
    mapsUrl: 'https://maps.app.goo.gl/alfaresmotors-downtown',
    hours: 'السبت–الخميس: 10ص–10م | الجمعة: 2م–10م',
    latitude: 30.0626,
    longitude: 31.2497,
    manager: 'محمد عبد الرحمن',
    status: 'active',
    inventory: ['car_3', 'car_5']
  },
  {
    id: 'branch_alex',
    name: 'فرع الإسكندرية',
    nameEn: 'Alexandria Branch',
    address: 'طريق الكورنيش، سيدي جابر، الإسكندرية',
    phone: '+20 100 666 7700',
    mapsUrl: 'https://maps.app.goo.gl/alfaresmotors-alex',
    hours: 'السبت–الخميس: 10ص–10م | الجمعة: 2م–10م',
    latitude: 31.2001,
    longitude: 29.9187,
    manager: 'كريم السيد',
    status: 'active',
    inventory: ['car_2', 'car_4']
  }
];

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_welcome',
    scenario: 'welcome',
    name: 'Car Dealership Welcome',
    description: 'Sent on first contact or greeting',
    content: 'أهلاً بك في {business_name}! 🚗 الوكيل المفضل لأفضل السيارات الزيرو والمستعملة بحالة المصنع. كيف يمكننا مساعدتك اليوم بخصوص موديلات السيارات المتاحة، عروض التقسيط، أو حجز تجربة قيادة؟',
    enabled: true
  },
  {
    id: 'tpl_out_of_hours',
    scenario: 'out_of_hours',
    name: 'Showroom Out of Hours',
    description: 'Sent when clients message after closing time',
    content: 'شكراً لتواصلك مع {business_name}! 🌙 المعرض مغلق حالياً. مواعيد العمل الرسمية:\n{hours}\nسنتواصل مع حضرتك أول ساعات الصباح للإجابة على كامل استفساراتك!',
    enabled: true
  },
  {
    id: 'tpl_testdrive_confirm',
    scenario: 'booking_confirm',
    name: 'Test Drive / Inspection Appointment Confirmation',
    description: 'Sent when a test drive or showroom visit is confirmed',
    content: 'تم تأكيد موعدك بنجاح في {business_name}! 📅\n• السيارة / الموعد: {time}\n• عدد الضيوف: {party_size}\nالمعرض بانتظارك لتجربة القيادة والفحص الفني. نتشرف بزيارتكم!',
    enabled: true
  },
  {
    id: 'tpl_car_reservation',
    scenario: 'order_confirm',
    name: 'Car Purchase & Booking Confirmation',
    description: 'Sent when client confirms booking or earnest money request',
    content: 'تم تسجيل طلب حجز السيارة برقم {order_number} بنجاح! 🚘\n• السيارة / القيمة: {total}\nفريق المبيعات سيتواصل معك لتجهيز أوراق التمويل والتسليم الفوري. شكراً لاختيارك {business_name}!',
    enabled: true
  },
  {
    id: 'tpl_human_handover',
    scenario: 'human_handover',
    name: 'Automotive Sales Specialist Handover',
    description: 'Sent when client requests sales advisor',
    content: 'تم تحويل المحادثة لأحد مستشاري المبيعات وخبراء السيارات لدينا وسيقوم بالتواصل معك فوراً هنا في الشات للإجابة عن أدق التفاصيل الفنية والتمويلية. 👨‍💼🚗',
    enabled: true
  },
  {
    id: 'tpl_location_pin',
    scenario: 'location_pin',
    name: 'Showroom Location & GPS Pin',
    description: 'Sent when client requests dealership address',
    content: 'مقر معرضنا: {address}.\nرابط موقعنا على خرائط جوجل: {map_url} 📍\nتنورنا في أي وقت للمعاينة!',
    enabled: true
  }
];

const DEFAULT_TEAM_MEMBERS = [
  {
    id: 'team_1',
    name: 'Emad Hamza (Dealership Director)',
    email: 'director@alfaresmotors.com',
    role: 'admin',
    status: 'active',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 30
  },
  {
    id: 'team_2',
    name: 'Karim Mansour (Sales Advisor & Appraisals)',
    email: 'karim@alfaresmotors.com',
    role: 'editor',
    status: 'active',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 14
  },
  {
    id: 'team_3',
    name: 'Nour El-Din (Finance & Banking Specialist)',
    email: 'finance@alfaresmotors.com',
    role: 'viewer',
    status: 'active',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  }
];

const DEFAULT_ARTICLES = [
  {
    id: 'art_financing_calculator',
    title: 'أنظمة التقسيط التمويلي وشروط البنوك (Auto Loans & Installments)',
    category: 'Finance & Payments',
    tags: ['installment', 'finance', 'تقسيط', 'بنوك', 'مقدم', 'قسط', 'قرض سيارة'],
    content: 'نوفر تقسيطاً مصرفياً مباشراً عبر أكثر من 12 بنكاً مصرياً وعربياً. يبدأ المقدم من 20% للسيارات الزيرو و 25% للسيارات المستعملة، مع فترات سداد تمتد من سنة إلى 7 سنوات. الأوراق المطلوبة للموظفين: صورة بطاقة الرقم القومي، إثبات دخل حديث، وإيصال مرافق. لأصحاب الأعمال والمهن الحرة: سجل تجاري وبطاقة ضريبية وكشف حساب بنكي لآخر 6 أشهر. متاح أيضاً برامج بدون إثبات دخل بمقدم 40% إلى 50%.',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7
  },
  {
    id: 'art_used_cars_inspection',
    title: 'معايير فحص وضمان السيارات المستعملة (150-Point Inspection)',
    category: 'Vehicle Quality',
    tags: ['inspection', 'used cars', 'ضمان', 'فحص', 'فابريكا', 'شاسيه', 'مستعمل'],
    content: 'تخضع كل سيارة مستعملة بالمعرض لتقرير فحص فني دقيق يشمل: سلامة الشاسيه والعفشة بنسبة 100%، فحص طلاء الهيكل بجهاز ديجيتال لتوثيق الفابريكا، فحص المحرك والفتيس بالكمبيوتر، مطابقة العداد الفعلي عبر مراكز الخدمة المعتمدة. نمنح العميل ضماناً لمدة 6 أشهر أو 10,000 كم ضد عيوب المحرك وناقل الحركة مع أحقية فحص السيارة بأي مركز معتمد يختاره العميل.',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: 'art_trade_in_process',
    title: 'إجراءات استبدال السيارات وتقييم السعر (Trade-In Program)',
    category: 'Trade-In & Sales',
    tags: ['trade in', 'exchange', 'استبدال', 'تبديل', 'بيع عربيتي', 'تقييم'],
    content: 'يمكنك إحضار سيارتك الحالية لأي من فروعنا للحصول على تقييم فني وتثميني فوري خلال 30 دقيقة. يحصل العميل على أعلى سعر سوقي عادل لسيارته، ويتم احتساب القيمة كدفعة أولى أو مقدم لشراء أي سيارة أخرى (زيرو أو مستعملة)، مع تقسيط المبلغ المتبقي على أقساط مريحة دون الحاجة لدفع أي سيولة نقدية جديدة.',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3
  },
  {
    id: 'art_licensing_delivery',
    title: 'إجراءات الترخيص ونقل الملكية وشحن السيارات (Licensing & Delivery)',
    category: 'Operations & Services',
    tags: ['license', 'delivery', 'ترخيص', 'مرور', 'تسليم', 'شحن', 'ونش'],
    content: 'يقوم فريق العلاقات الحكومية بالمعرض بإنهاء جميع إجراءات المرور ونقل الملكية وتجديد الرخص بالنيابة عن العميل وتوفير لوحات تجارية للتسليم الفوري. كما نوفر خدمة شحن وتوصيل السيارات حتى باب المنزل بجميع محافظات الجمهورية عبر حاملات سيارات مؤمنة بالكامل.',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  }
];

const DEFAULT_KNOWLEDGE_GAPS = [
  {
    id: 'gap_hybrid_electric',
    question: 'هل متوفر سيارات هايبرد أو كهربائية بالكامل؟ / Do you sell Hybrid or Electric cars?',
    frequency: 32,
    category: 'Inventory & Electric Vehicles',
    suggestedTitle: 'السيارات الهايبرد والكهربائية المتاحة وشواحنها (EV & Hybrid)',
    suggestedDraft: 'نعم! نوفر تشكيلة من سيارات الهايبرد (Mild-Hybrid و Plug-in Hybrid) مثل مرسيدس C-Class وتويوتا كورولا هايبرد، مع خدمة توريد شواحن منزلية معتمدة.',
    status: 'open',
    detectedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    addressedAt: null
  },
  {
    id: 'gap_down_payment_no_work',
    question: 'هل يمكن التقسيط بمقدم 30% بدون مفردات مرتب لربات البيوت أو بدون وظيفة؟',
    frequency: 24,
    category: 'Finance & Eligibility',
    suggestedTitle: 'برامج التقسيط بدون استعلام عمل أو إثبات دخل رسمي',
    suggestedDraft: 'نعم، متاح برامج تمويل خاصة بدون إثبات دخل رسمي بمقدم يبدأ من 40% إلى 50% بصورة البطاقة القومية فقط وفترة سداد حتى 5 سنوات.',
    status: 'open',
    detectedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    addressedAt: null
  },
  {
    id: 'gap_insurance_packages',
    question: 'هل التأمين الإجباري شامل طوال فترة القسط وما هي الشركات المعتمدة؟',
    frequency: 18,
    category: 'Insurance Policies',
    suggestedTitle: 'باقات التأمين الشامل التنافسية على السيارات',
    suggestedDraft: 'نتعامل مع أكبر شركات التأمين المعتمدة بنسب اشتراك تبدأ من 2.2% سنوياً مع وثائق تغطي الحوادث الكلية والجزئية والسرقة والحريق مع إمكانية التقسيط.',
    status: 'open',
    detectedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    addressedAt: null
  }
];

let memoryStore = {
  config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
  logs: [],
  demoMetrics: null,
  unanswered: [],
  orders: [],
  reservations: [],
  customers: {},
  campaigns: [],
  teamMembers: JSON.parse(JSON.stringify(DEFAULT_TEAM_MEMBERS)),
  templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
  articles: JSON.parse(JSON.stringify(DEFAULT_ARTICLES)),
  handoffTickets: [],
  knowledgeGaps: JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_GAPS))
};

// Initialize DB file
export async function initDB() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Check if db.json still has old restaurant/cafe data (e.g. "Nour Coffee House")
    const isOldShop = parsed.config?.business?.name?.toLowerCase().includes('nour') ||
                      parsed.config?.business?.name?.toLowerCase().includes('coffee') ||
                      parsed.config?.business?.about?.toLowerCase().includes('coffee') ||
                      (parsed.config?.products && parsed.config.products.some(p => p.name?.toLowerCase().includes('latte') || p.name?.toLowerCase().includes('croissant')));

    if (isOldShop) {
      console.log('🔄 Migrating legacy cafe database to Al-Fares Motors Automotive Dealership...');
      memoryStore = {
        config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
        logs: [],
        demoMetrics: null,
        unanswered: [],
        orders: [],
        reservations: [],
        customers: {},
        campaigns: [],
        teamMembers: JSON.parse(JSON.stringify(DEFAULT_TEAM_MEMBERS)),
        templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
        articles: JSON.parse(JSON.stringify(DEFAULT_ARTICLES)),
        handoffTickets: [],
        knowledgeGaps: JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_GAPS))
      };
      await flush();
    } else {
      memoryStore = {
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
        logs: parsed.logs || [],
        demoMetrics: parsed.demoMetrics || null,
        unanswered: parsed.unanswered || [],
        orders: parsed.orders || [],
        reservations: parsed.reservations || [],
        customers: parsed.customers || {},
        campaigns: parsed.campaigns || [],
        teamMembers: parsed.teamMembers?.length ? parsed.teamMembers : JSON.parse(JSON.stringify(DEFAULT_TEAM_MEMBERS)),
        templates: parsed.templates?.length ? parsed.templates : JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
        articles: parsed.articles?.length ? parsed.articles : JSON.parse(JSON.stringify(DEFAULT_ARTICLES)),
        handoffTickets: parsed.handoffTickets || [],
        knowledgeGaps: parsed.knowledgeGaps?.length ? parsed.knowledgeGaps : JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_GAPS))
      };
    }
  } catch (err) {
    await flush();
  }
}

export function parseOrderAmount(totalStr) {
  const clean = String(totalStr || '').replace(/,/g, '');
  const match = clean.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

let flushQueue = Promise.resolve();

async function flush() {
  flushQueue = flushQueue.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmpFile = DB_FILE + '.tmp';
      await fs.writeFile(tmpFile, JSON.stringify(memoryStore, null, 2), 'utf-8');
      await fs.rename(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error writing to DB file:', err);
    }
  });
  return flushQueue;
}

/* ================= Config ================= */

export function getConfig() {
  const cfg = JSON.parse(JSON.stringify(memoryStore.config));
  if (cfg.whatsapp) {
    cfg.whatsapp.hasAccessToken = !!cfg.whatsapp.accessToken;
  }
  return cfg;
}

export async function saveConfig(newConfig) {
  if (!newConfig) return getConfig();
  
  if (newConfig.business) {
    memoryStore.config.business = { ...memoryStore.config.business, ...newConfig.business };
  }
  if (Array.isArray(newConfig.products)) {
    memoryStore.config.products = newConfig.products;
  }
  if (Array.isArray(newConfig.faqEntries)) {
    memoryStore.config.faqEntries = newConfig.faqEntries;
  }
  if (newConfig.whatsapp) {
    const existingToken = memoryStore.config.whatsapp?.accessToken || '';
    const updatedToken = newConfig.whatsapp.accessToken || existingToken;
    memoryStore.config.whatsapp = {
      ...memoryStore.config.whatsapp,
      ...newConfig.whatsapp,
      accessToken: updatedToken
    };
  }
  
  await flush();
  return getConfig();
}

/* ================= Logs ================= */

export function getLogs() {
  return memoryStore.logs.slice().reverse();
}

export async function addLog(entry) {
  const log = {
    id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: Date.now(),
    ...entry
  };
  memoryStore.logs.push(log);
  if (memoryStore.logs.length > 1000) {
    memoryStore.logs = memoryStore.logs.slice(-1000);
  }

  // Update customer summary
  if (entry.from) {
    const cust = getCustomer(entry.from, entry.name);
    cust.lastSeen = Date.now();
    cust.messageCount = (cust.messageCount || 0) + 1;
    if (entry.name && entry.name !== 'Client') cust.name = entry.name;
    memoryStore.customers[entry.from] = cust;
  }

  await flush();
  return log;
}

export async function clearLogs() {
  memoryStore.logs = [];
  await flush();
  return true;
}

/* ================= Customers & Human Takeover ================= */

export function getCustomer(phone, name = 'Client') {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  if (!memoryStore.customers[cleanPhone]) {
    memoryStore.customers[cleanPhone] = {
      phone: cleanPhone,
      name: name || 'Client',
      tags: ['New Client'],
      isHumanTakeover: false,
      takeoverUntil: null,
      cart: [],
      orderCount: 0,
      totalSpent: 0,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };
  }
  return memoryStore.customers[cleanPhone];
}

export async function updateCustomer(phone, updates = {}) {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  const cust = getCustomer(cleanPhone);
  memoryStore.customers[cleanPhone] = { ...cust, ...updates };
  await flush();
  return memoryStore.customers[cleanPhone];
}

export function getAllCustomers() {
  return Object.values(memoryStore.customers).sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function setHumanTakeover(phone, isTakeover, durationMinutes = 60) {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  const cust = getCustomer(cleanPhone);
  cust.isHumanTakeover = !!isTakeover;
  cust.takeoverUntil = isTakeover ? Date.now() + durationMinutes * 60 * 1000 : null;
  await flush();
  return cust;
}

export function isCustomerInTakeover(phone) {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  const cust = memoryStore.customers[cleanPhone];
  if (!cust || !cust.isHumanTakeover) return false;
  if (cust.takeoverUntil && Date.now() > cust.takeoverUntil) {
    cust.isHumanTakeover = false;
    cust.takeoverUntil = null;
    return false;
  }
  return true;
}

export function getCustomerConversations() {
  const convMap = {};
  memoryStore.logs.forEach(l => {
    if (!l.from) return;
    const p = l.from;
    if (!convMap[p]) {
      const cust = getCustomer(p, l.name);
      convMap[p] = {
        phone: p,
        name: cust.name || l.name || 'Client',
        isHumanTakeover: isCustomerInTakeover(p),
        tags: cust.tags || [],
        cart: cust.cart || [],
        lastMessageAt: l.at,
        lastMessageText: l.incoming || l.reply || '',
        messages: []
      };
    }
    convMap[p].messages.push(l);
    if (l.at > convMap[p].lastMessageAt) {
      convMap[p].lastMessageAt = l.at;
      convMap[p].lastMessageText = l.incoming || l.reply || '';
    }
  });

  return Object.values(convMap).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

/* ================= Car Orders & Bookings ================= */

export function getOrders() {
  return memoryStore.orders.slice().sort((a, b) => b.at - a.at);
}

export async function createOrder({ clientPhone, clientName, items, total, address, notes }) {
  const count = memoryStore.orders.length + 1;
  const orderNumber = 'CAR-' + String(count).padStart(4, '0');
  const order = {
    id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    orderNumber,
    clientPhone: String(clientPhone).replace(/[^\d]/g, ''),
    clientName: clientName || 'Client',
    items: items || [],
    total: total || '0 EGP',
    address: address || 'Showroom Delivery & Registration',
    notes: notes || '',
    status: 'pending', // pending, confirmed, preparing, ready_for_pickup, delivered, cancelled
    at: Date.now()
  };

  memoryStore.orders.unshift(order);

  // Update customer CRM stats
  const cust = getCustomer(clientPhone, clientName);
  cust.orderCount = (cust.orderCount || 0) + 1;
  const numVal = parseOrderAmount(total);
  cust.totalSpent = (cust.totalSpent || 0) + numVal;
  if (!cust.tags.includes('Car Buyer')) cust.tags.push('Car Buyer');
  if (cust.orderCount >= 2 && !cust.tags.includes('VIP Collector')) cust.tags.push('VIP Collector');
  cust.cart = [];
  memoryStore.customers[clientPhone] = cust;

  await flush();
  return order;
}

export async function updateOrderStatus(orderId, newStatus) {
  const order = memoryStore.orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) throw new Error('Car booking order not found');
  order.status = newStatus;
  order.updatedAt = Date.now();
  await flush();
  return order;
}

/* ================= Test Drives & Showroom Appointments ================= */

export function getReservations() {
  return memoryStore.reservations.slice().sort((a, b) => b.at - a.at);
}

export async function createReservation({ clientPhone, clientName, partySize, date, time, notes }) {
  const res = {
    id: 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    clientPhone: String(clientPhone).replace(/[^\d]/g, ''),
    clientName: clientName || 'Client',
    partySize: Number(partySize) || 1,
    date: date || 'Today',
    time: time || 'Showroom Hours',
    notes: notes || 'Test Drive Appointment',
    status: 'confirmed', // confirmed, pending, completed, cancelled
    at: Date.now()
  };

  memoryStore.reservations.unshift(res);

  const cust = getCustomer(clientPhone, clientName);
  if (!cust.tags.includes('Test Drive Guest')) cust.tags.push('Test Drive Guest');
  memoryStore.customers[clientPhone] = cust;

  await flush();
  return res;
}

export async function updateReservationStatus(resId, newStatus) {
  const res = memoryStore.reservations.find(r => r.id === resId);
  if (!res) throw new Error('Test drive appointment not found');
  res.status = newStatus;
  res.updatedAt = Date.now();
  await flush();
  return res;
}

/* ================= Broadcast Campaigns ================= */

export function getCampaigns() {
  return memoryStore.campaigns.slice().sort((a, b) => b.at - a.at);
}

export async function createCampaign({ title, message, targetTag = 'all', sentCount = 0 }) {
  const camp = {
    id: 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    message,
    targetTag,
    sentCount,
    status: 'sent',
    at: Date.now()
  };
  memoryStore.campaigns.unshift(camp);
  await flush();
  return camp;
}

/* ================= Metrics & Demo Seeding ================= */

export async function recordUnanswered(question) {
  const q = String(question || '').trim();
  if (!q) return;
  const existing = memoryStore.unanswered.find(u => u.question.toLowerCase() === q.toLowerCase());
  if (existing) {
    existing.count = (existing.count || 1) + 1;
    existing.updatedAt = Date.now();
  } else {
    memoryStore.unanswered.unshift({ question: q, count: 1, createdAt: Date.now() });
  }
  await flush();
}

export async function clearUnanswered() {
  memoryStore.unanswered = [];
  if (memoryStore.demoMetrics) {
    memoryStore.demoMetrics.unanswered = [];
  }
  await flush();
  return true;
}

export async function clearMetrics() {
  memoryStore.demoMetrics = null;
  memoryStore.unanswered = [];
  await flush();
  return true;
}

export async function seedDemoData(requestedDays = 30) {
  const days = Math.max(1, Math.min(90, Number(requestedDays) || 30));
  const series = [];
  const now = new Date();
  
  let totalMessages = 0;
  let totalFaqHits = 0;
  let totalFallbacks = 0;
  let totalPos = 0;
  let totalNeg = 0;
  let totalNeutral = 0;
  let totalMs = 0;
  let totalMsCount = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    const isWeekend = d.getDay() === 4 || d.getDay() === 5; // Thu/Fri in region
    const baseCount = isWeekend ? 32 : 20;
    const msgCount = Math.max(6, Math.floor(baseCount + (Math.sin(i * 0.5) * 8) + (Math.random() * 8)));
    const faqHits = Math.floor(msgCount * (0.75 + Math.random() * 0.15));
    const fallbacks = Math.max(0, Math.floor(msgCount * 0.05));
    
    const pos = Math.floor(msgCount * 0.82);
    const neg = Math.max(0, Math.floor(msgCount * 0.02));
    const neutral = Math.max(0, msgCount - pos - neg);
    
    const dayAvgMs = Math.floor(650 + Math.random() * 600);
    
    totalMessages += msgCount;
    totalFaqHits += faqHits;
    totalFallbacks += fallbacks;
    totalPos += pos;
    totalNeg += neg;
    totalNeutral += neutral;
    totalMs += dayAvgMs * msgCount;
    totalMsCount += msgCount;

    series.push({
      date: dateStr,
      messages: msgCount,
      faqHits,
      fallbacks,
      msCount: msgCount,
      msTotal: dayAvgMs * msgCount,
      pos,
      neg,
      neutral
    });
  }

  // 24-hour distribution curve for peak hours
  const hourlyCurve = [
    0.01, 0.005, 0.005, 0.005, 0.005, 0.01, 0.02, 0.03, // 00:00 - 07:00
    0.06, 0.08, 0.10, 0.09, 0.08, 0.07, 0.06, 0.07,   // 08:00 - 15:00
    0.08, 0.09, 0.11, 0.10, 0.08, 0.06, 0.03, 0.01    // 16:00 - 23:00
  ];
  const hourly = hourlyCurve.map((pct, hour) => {
    const count = Math.max(1, Math.round(totalMessages * pct));
    const faq = Math.round(count * 0.78);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      messages: count,
      faqHits: faq,
      fallbacks: Math.max(0, count - faq)
    };
  });

  const demoTopics = [
    { label: 'أسعار ومواصفات السيارات', count: Math.floor(totalMessages * 0.35) },
    { label: 'برامج التقسيط والتمويل البنكي', count: Math.floor(totalMessages * 0.28) },
    { label: 'حجز تجارب القيادة (Test Drive)', count: Math.floor(totalMessages * 0.18) },
    { label: 'استبدال السيارات (Trade-In)', count: Math.floor(totalMessages * 0.12) },
    { label: 'عنوان المعرض والمواعيد', count: Math.floor(totalMessages * 0.07) }
  ];

  const demoTopQuestions = [
    { question: 'بكام مرسيدس C200 زيرو 2024؟', count: Math.round(totalMessages * 0.12) || 64 },
    { question: 'هل في تقسيط للبي ام دبليو 320 ومقدمها كام؟', count: Math.round(totalMessages * 0.10) || 52 },
    { question: 'عايز احجز تجربة قيادة لتويوتا كورولا بكره', count: Math.round(totalMessages * 0.08) || 41 },
    { question: 'ممكن ابدل عربيتي النترا واخد كيا سبورتاج؟', count: Math.round(totalMessages * 0.06) || 30 },
    { question: 'مواعيد المعرض يوم الجمعة ايه؟', count: Math.round(totalMessages * 0.05) || 24 },
    { question: 'هل العربيات المستعملة فابريكا بالكامل ومعاها فحص؟', count: Math.round(totalMessages * 0.04) || 20 }
  ];

  const demoUnanswered = [
    { question: 'هل متوفر استيراد سيارات معاقين أو سيارات كهربائية تسلا؟', count: 6 },
    { question: 'هل يمكن ترخيص السيارة 3 سنوات مباشرة من المعرض؟', count: 4 },
    { question: 'هل تقبلون بيع سيارة بالتوكيل المباشر بدون تجديد؟', count: 3 }
  ];

  // Seed sample car orders if empty
  if (!memoryStore.orders.length) {
    memoryStore.orders = [
      {
        id: 'ord_demo_1',
        orderNumber: 'CAR-0001',
        clientPhone: '201012345678',
        clientName: 'م. أحمد الشناوي',
        items: [
          { name: 'Mercedes-Benz C200 2024 AMG (Zero / New)', qty: 1, price: '3,850,000 EGP', subtotal: '3,850,000 EGP' }
        ],
        total: '3,850,000 EGP (دفعة حجز أولى 150,000 EGP والباقي تمويل بنكي)',
        address: 'استلام فوري من المعرض الرئيسي بالتجمع',
        notes: 'اللون المطلوب Obsidian Black مع رخصة 3 سنوات',
        status: 'confirmed',
        at: Date.now() - 1000 * 60 * 45
      },
      {
        id: 'ord_demo_2',
        orderNumber: 'CAR-0002',
        clientPhone: '201198765432',
        clientName: 'د. سارة فؤاد',
        items: [
          { name: 'BMW 320i 2023 M-Sport (Certified Used)', qty: 1, price: '2,650,000 EGP', subtotal: '2,650,000 EGP' }
        ],
        total: '2,650,000 EGP',
        address: 'معاينة وفحص فني بالمعرض قبل إتمام العقد',
        notes: 'تم فحص السيارة بالمركز المعتمد وتقرير 150 نقطة مطابق',
        status: 'ready_for_pickup',
        at: Date.now() - 1000 * 60 * 120
      },
      {
        id: 'ord_demo_3',
        orderNumber: 'CAR-0003',
        clientPhone: '201255556666',
        clientName: 'طارق عبد الرحيم',
        items: [
          { name: 'Toyota Corolla 2024 Smart (Zero / New)', qty: 1, price: '1,450,000 EGP', subtotal: '1,450,000 EGP' }
        ],
        total: '1,450,000 EGP',
        address: 'شحن على ونش مغلق إلى الإسكندرية',
        notes: 'تم سداد كامل القيمة تحويل بنكي',
        status: 'delivered',
        at: Date.now() - 1000 * 60 * 360
      }
    ];
  }

  // Seed sample test drives if empty
  if (!memoryStore.reservations.length) {
    memoryStore.reservations = [
      {
        id: 'res_demo_1',
        clientPhone: '201012345678',
        clientName: 'م. أحمد الشناوي',
        partySize: 2,
        date: 'غداً الأربعاء',
        time: '6:30 PM (تجربة قيادة مرسيدس C200)',
        notes: 'العميل يرغب في فحص قيادة على الدائري الأوسطي',
        status: 'confirmed',
        at: Date.now() - 1000 * 60 * 60
      },
      {
        id: 'res_demo_2',
        clientPhone: '201099887766',
        clientName: 'خالد مصطفى',
        partySize: 1,
        date: 'الخميس القادم',
        time: '7:00 PM (معاينة هيونداي توسان NX4)',
        notes: 'مصحوب بمهندس فحص خارجي للمعاينة',
        status: 'confirmed',
        at: Date.now() - 1000 * 60 * 180
      }
    ];
  }

  // Seed sample campaigns if empty
  if (!memoryStore.campaigns.length) {
    memoryStore.campaigns = [
      {
        id: 'camp_demo_1',
        title: 'عروض تقسيط سيارات زيرو بمقدم 20% وبدون مصاريف إدارية',
        message: 'عروض الفارس للسيارات! 🚗 احصل الآن على سيارتك الزيرو 2024 (مرسيدس، بي ام، تويوتا، كيا) بأقل مقدم 20% وأطول فترة سداد حتى 7 سنوات وبدون مصاريف إدارية هذا الأسبوع فقط! تواصل معنا لمزيد من التفاصيل.',
        targetTag: 'all',
        sentCount: 65,
        status: 'sent',
        at: Date.now() - 1000 * 60 * 60 * 24 * 2
      }
    ];
  }

  const totalRevenue = memoryStore.orders.reduce((sum, o) => sum + parseOrderAmount(o.total), 0);
  const totalGuests = memoryStore.reservations.reduce((sum, r) => sum + (Number(r.partySize) || 1), 0);
  const custKeys = Object.keys(memoryStore.customers || {});
  const totalCustomers = Math.max(custKeys.length, 48);
  const repeatRate = 38;

  const openHandoffs = (memoryStore.handoffTickets || []).filter(h => h.status === 'open').length;
  const autoRate = totalMessages ? Math.round(((totalMessages - totalFallbacks) / totalMessages) * 100) : 94;

  // Build Recent Activity Stream
  const activity = [];
  (memoryStore.orders || []).forEach(o => {
    activity.push({
      id: o.id,
      type: 'order',
      title: `Car Booking ${o.orderNumber || ''} · ${o.clientName || 'Client'}`,
      detail: `${o.total || 'Vehicle booked'} · Status: ${o.status || 'new'}`,
      timestamp: o.at || Date.now(),
      badgeClass: o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
      badgeText: o.status || 'car_booking',
      icon: 'car'
    });
  });

  (memoryStore.reservations || []).forEach(r => {
    activity.push({
      id: r.id,
      type: 'reservation',
      title: `Test Drive (${r.partySize || 1} guest) · ${r.clientName || 'Client'}`,
      detail: `${r.date} at ${r.time} · ${r.notes || 'Appointment booked'}`,
      timestamp: r.at || Date.now(),
      badgeClass: 'bg-teal-50 text-teal-700',
      badgeText: r.status || 'confirmed',
      icon: 'calendar'
    });
  });

  (memoryStore.handoffTickets || []).forEach(h => {
    activity.push({
      id: h.id,
      type: 'handoff',
      title: `Car Sales Advisor Handover · ${h.clientName || h.clientPhone || 'Client'}`,
      detail: h.reason || 'Client requested sales advisor for negotiation/finance',
      timestamp: h.createdAt || Date.now(),
      badgeClass: h.status === 'open' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600',
      badgeText: h.status || 'ticket',
      icon: 'user-check'
    });
  });

  activity.sort((a, b) => b.timestamp - a.timestamp);

  // Automotive AI Insights & Recommendations
  const insights = [
    {
      category: 'Showroom Traffic & Peak Hours',
      icon: 'clock',
      title: 'Peak automotive inquiries between 5:00 PM – 9:30 PM',
      description: 'Over 40% of car financing and test drive inquiries arrive in the evening. Automotive sales advisors should be active on WhatsApp.',
      tone: 'info'
    },
    {
      category: 'Inventory & FAQ Opportunity',
      icon: 'sparkles',
      title: `${demoUnanswered.length} recurring questions need vehicle FAQ answers`,
      description: `Clients frequently inquire about "${demoUnanswered[0]?.question || 'electric cars'}". Adding this as an exact FAQ entry boosts AI auto-resolution to ${Math.min(99, autoRate + 4)}%.`,
      tone: 'action',
      actionQuestion: demoUnanswered[0]?.question || null
    },
    {
      category: 'Automotive Sales & Pipeline',
      icon: 'trending-up',
      title: `${memoryStore.orders.length} car purchases logged via WhatsApp (${totalRevenue.toLocaleString()} EGP)`,
      description: 'Conversational car sales pipeline is actively converting clients into showroom visits and deposits. Top searched: Mercedes C200 & BMW 320i.',
      tone: 'success'
    },
    {
      category: 'AI Real-Time Response Rate',
      icon: 'zap',
      title: `Avg. response time: ${(totalMsCount ? (totalMs / totalMsCount / 1000).toFixed(1) : '1.0')}s`,
      description: 'Your dealership AI replies in ~1 second, delivering instant vehicle specs, photos, and installment calculations 24/7.',
      tone: 'success'
    }
  ];

  memoryStore.demoMetrics = {
    days,
    totals: {
      messages: totalMessages,
      faqHits: totalFaqHits,
      fallbacks: totalFallbacks,
      pos: totalPos,
      neg: totalNeg,
      neutral: totalNeutral
    },
    business: {
      totalOrders: memoryStore.orders.length,
      totalRevenue,
      totalReservations: memoryStore.reservations.length,
      totalGuests,
      totalCustomers,
      repeatRate,
      openHandoffs,
      autoRate
    },
    series,
    hourly,
    avgMs: totalMsCount ? Math.round(totalMs / totalMsCount) : 980,
    topics: demoTopics,
    topQuestions: demoTopQuestions,
    unanswered: memoryStore.unanswered.length ? memoryStore.unanswered : demoUnanswered,
    recentActivity: activity.slice(0, 8),
    insights
  };

  await flush();
  return memoryStore.demoMetrics;
}

export async function getMetrics(days = 30) {
  const reqDays = Number(days) || 30;
  if (memoryStore.demoMetrics && memoryStore.demoMetrics.days === reqDays && memoryStore.demoMetrics.business) {
    const m = memoryStore.demoMetrics;
    m.business.totalOrders = memoryStore.orders.length;
    m.business.totalRevenue = memoryStore.orders.reduce((sum, o) => sum + parseOrderAmount(o.total), 0);
    m.business.totalReservations = memoryStore.reservations.length;
    m.business.totalGuests = memoryStore.reservations.reduce((sum, r) => sum + (Number(r.partySize) || 1), 0);
    m.business.openHandoffs = (memoryStore.handoffTickets || []).filter(h => h.status === 'open').length;
    m.unanswered = memoryStore.unanswered.length ? memoryStore.unanswered : m.unanswered;
    return m;
  }
  return await seedDemoData(reqDays);
}

/* ================= Team Members & RBAC ================= */

export function getTeamMembers() {
  return memoryStore.teamMembers || [];
}

export async function inviteTeamMember({ name, email, role }) {
  if (!name || !email) throw new Error('Name and email are required');
  const validRoles = ['admin', 'editor', 'viewer'];
  const assignedRole = validRoles.includes(role) ? role : 'viewer';

  const member = {
    id: 'team_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: assignedRole,
    status: 'active',
    addedAt: Date.now()
  };

  memoryStore.teamMembers = memoryStore.teamMembers || [];
  memoryStore.teamMembers.push(member);
  await flush();
  return member;
}

export async function updateMemberRole(id, role) {
  const member = (memoryStore.teamMembers || []).find(m => m.id === id);
  if (!member) throw new Error('Team member not found');
  member.role = role;
  await flush();
  return member;
}

export async function removeTeamMember(id) {
  memoryStore.teamMembers = (memoryStore.teamMembers || []).filter(m => m.id !== id);
  await flush();
  return true;
}

/* ================= Message Templates Library ================= */

export function getTemplates() {
  return memoryStore.templates || [];
}

export async function updateTemplate(id, updates = {}) {
  const tpl = (memoryStore.templates || []).find(t => t.id === id);
  if (!tpl) throw new Error('Template not found');
  Object.assign(tpl, updates);
  await flush();
  return tpl;
}

export async function addTemplate(data) {
  const tpl = {
    id: 'tpl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    scenario: data.scenario || 'custom',
    name: data.name || 'Custom Template',
    description: data.description || '',
    content: data.content || '',
    enabled: data.enabled !== false
  };
  memoryStore.templates = memoryStore.templates || [];
  memoryStore.templates.push(tpl);
  await flush();
  return tpl;
}

export async function deleteTemplate(id) {
  memoryStore.templates = (memoryStore.templates || []).filter(t => t.id !== id);
  await flush();
  return true;
}

export function renderTemplate(scenario, variables = {}, fallback = '') {
  const tpl = (memoryStore.templates || []).find(t => t.scenario === scenario && t.enabled !== false);
  if (!tpl || !tpl.content) return fallback;

  let text = tpl.content;
  Object.entries(variables).forEach(([key, val]) => {
    text = text.replaceAll(`{${key}}`, val || '');
  });
  return text;
}

/* ================= Help Center & Knowledge Base ================= */

export function getArticles() {
  return memoryStore.articles || [];
}

export async function addArticle({ title, category, tags = [], content }) {
  if (!title || !content) throw new Error('Title and content are required');
  const article = {
    id: 'art_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    category: (category || 'General').trim(),
    tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
    content: content.trim(),
    updatedAt: Date.now()
  };

  memoryStore.articles = memoryStore.articles || [];
  memoryStore.articles.unshift(article);
  await flush();
  return article;
}

export async function updateArticle(id, updates = {}) {
  const art = (memoryStore.articles || []).find(a => a.id === id);
  if (!art) throw new Error('Article not found');

  if (updates.title) art.title = updates.title.trim();
  if (updates.category) art.category = updates.category.trim();
  if (updates.content) art.content = updates.content.trim();
  if (updates.tags) {
    art.tags = Array.isArray(updates.tags)
      ? updates.tags
      : String(updates.tags).split(',').map(t => t.trim()).filter(Boolean);
  }
  art.updatedAt = Date.now();

  await flush();
  return art;
}

export async function deleteArticle(id) {
  memoryStore.articles = (memoryStore.articles || []).filter(a => a.id !== id);
  await flush();
  return true;
}

/* ================= Auto-Learn from Past Chats ================= */

export function learnFromPastChats() {
  const logs = memoryStore.logs || [];
  const unanswered = memoryStore.unanswered || [];

  const candidates = [
    {
      id: 'learn_electric_chargers',
      question: 'هل توفرون محطات شحن للسيارات الكهربائية عند استلام السيارة؟',
      suggestedAnswer: 'نعم، نوفر شواحن منزلية معتمدة بقدرة 7.4 kW و 22 kW مع كل سيارة كهربائية بالتعاون مع الموزع الرسمي.',
      category: 'Electric & Charging',
      frequency: 21,
      confidence: 0.95,
      tags: ['شحن', 'شاحن', 'كهرباء', 'ev', 'charger']
    },
    {
      id: 'learn_embassy_foreigners',
      question: 'هل يمكن للأجانب أو الدبلوماسيين شراء سيارة ونقل ترخيصها؟',
      suggestedAnswer: 'نعم بكل تأكيد، نوفر تسهيلات كاملة للإعفاءات الجمركية والدبلوماسية ولوحات الهيئة السياسية ونقل الملكية لغير المصريين بجواز السفر الساري.',
      category: 'Licensing & Foreign Buyers',
      frequency: 16,
      confidence: 0.93,
      tags: ['اجانب', 'دبلوماسي', 'جواز سفر', 'ترخيص']
    },
    {
      id: 'learn_tradein_appraisal_time',
      question: 'كم يستغرق فحص وتثمين سيارتي القديمة عند الاستبدال؟',
      suggestedAnswer: 'يستغرق الفحص والتثمين المبدئي من 25 إلى 40 دقيقة فقط داخل مركز الفحص الخاص بالمعرض ويتم تحديد السعر فوراً.',
      category: 'Trade-In & Appraisal',
      frequency: 14,
      confidence: 0.91,
      tags: ['تثمين', 'فحص', 'وقت', 'استبدال']
    }
  ];

  unanswered.slice(0, 5).forEach((u, i) => {
    candidates.push({
      id: 'learn_unans_' + i,
      question: u.question,
      suggestedAnswer: `تم تسجيل هذا الرد بناءً على أسئلة العملاء المتكررة: "${u.question}". تفضل بزيارة المعرض أو التحدث مع فريق المبيعات.`,
      category: 'Customer Inquiries',
      frequency: u.count || 2,
      confidence: 0.84,
      tags: ['unanswered', 'trending']
    });
  });

  return {
    analyzedChatsCount: Math.max(logs.length, 36),
    newInsightsFound: candidates.length,
    candidates
  };
}

/* ================= Smart Agent Handoff Tickets ================= */

export function getHandoffTickets() {
  return memoryStore.handoffTickets || [];
}

export async function createHandoffTicket({ phone, name, issueSummary, sentiment = 'Neutral', lastMessage, intentType }) {
  const ticket = {
    id: 'ticket_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    phone,
    name: name || 'Client',
    issueSummary: issueSummary || 'Client requested automotive sales advisor assistance.',
    sentiment: sentiment || 'Neutral',
    lastMessage: lastMessage || '',
    intentType: intentType || 'HUMAN_TAKEOVER',
    status: 'open',
    createdAt: Date.now()
  };

  memoryStore.handoffTickets = memoryStore.handoffTickets || [];
  memoryStore.handoffTickets = memoryStore.handoffTickets.filter(t => t.phone !== phone || t.status === 'resolved');
  memoryStore.handoffTickets.unshift(ticket);
  await flush();
  return ticket;
}

export async function resolveHandoffTicket(id) {
  const ticket = (memoryStore.handoffTickets || []).find(t => t.id === id);
  if (ticket) {
    ticket.status = 'resolved';
    ticket.resolvedAt = Date.now();
    await flush();
    return ticket;
  }
  return null;
}

/* ================= Knowledge Base Gaps Engine ================= */

export function getKnowledgeGaps() {
  const gaps = memoryStore.knowledgeGaps || [];
  const openCount = gaps.filter(g => g.status === 'open').length;
  const addressedCount = gaps.filter(g => g.status === 'addressed').length;
  return {
    gaps,
    stats: {
      total: gaps.length,
      open: openCount,
      addressed: addressedCount,
      resolutionRate: gaps.length ? Math.round((addressedCount / gaps.length) * 100) : 100
    }
  };
}

export async function addressKnowledgeGap(id, articleId = null) {
  const gap = (memoryStore.knowledgeGaps || []).find(g => g.id === id);
  if (!gap) throw new Error('Knowledge gap not found');

  gap.status = 'addressed';
  gap.addressedAt = Date.now();
  if (articleId) gap.linkedArticleId = articleId;

  await flush();
  return gap;
}

export async function addKnowledgeGap({ question, frequency = 1, category = 'General', suggestedTitle, suggestedDraft }) {
  const gap = {
    id: 'gap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    question,
    frequency,
    category,
    suggestedTitle: suggestedTitle || question,
    suggestedDraft: suggestedDraft || '',
    status: 'open',
    detectedAt: Date.now(),
    addressedAt: null
  };

  memoryStore.knowledgeGaps = memoryStore.knowledgeGaps || [];
  memoryStore.knowledgeGaps.unshift(gap);
  await flush();
  return gap;
}

/* ================= Unified Customer Context ================= */

export function getUnifiedCustomerContext(phone) {
  const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
  const orders = (memoryStore.orders || []).filter(o => String(o.clientPhone || '').replace(/[^\d]/g, '').includes(cleanPhone) || cleanPhone.includes(String(o.clientPhone || '').replace(/[^\d]/g, '')));
  const reservations = (memoryStore.reservations || []).filter(r => String(r.clientPhone || '').replace(/[^\d]/g, '').includes(cleanPhone) || cleanPhone.includes(String(r.clientPhone || '').replace(/[^\d]/g, '')));
  const logs = (memoryStore.logs || []).filter(l => String(l.from || '').replace(/[^\d]/g, '').includes(cleanPhone) || cleanPhone.includes(String(l.from || '').replace(/[^\d]/g, '')));
  const tickets = (memoryStore.handoffTickets || []).filter(t => String(t.phone || '').replace(/[^\d]/g, '').includes(cleanPhone) || cleanPhone.includes(String(t.phone || '').replace(/[^\d]/g, '')));

  const rawCust = (memoryStore.customers && memoryStore.customers[cleanPhone]) || {};
  const name = rawCust.name || (orders[0] && orders[0].clientName) || (logs[0] && logs[0].name) || 'Client';

  const totalSpend = orders.reduce((sum, o) => sum + parseOrderAmount(o.total), 0);
  const isVip = orders.length >= 1 || totalSpend >= 1000000 || reservations.length >= 2;

  const allText = logs.map(l => (l.incoming || '') + ' ' + (l.reply || '')).join(' ');
  const hasArabic = /[\u0600-\u06FF]/.test(allText);
  const preferredLanguage = hasArabic ? 'Arabic (Egyptian / Standard)' : 'English (US / UK)';

  const recurringIssues = [];
  if (orders.length > 0) recurringIssues.push('Car Purchases');
  if (reservations.length > 0) recurringIssues.push('Test Drive Bookings');
  if (allText.includes('تقسيط') || allText.includes('قسط') || allText.includes('finance')) recurringIssues.push('Auto Loan / Installment Inquiries');
  if (allText.includes('استبدال') || allText.includes('تبديل') || allText.includes('trade in')) recurringIssues.push('Vehicle Trade-In Evaluation');
  if (allText.includes('مرسيدس') || allText.includes('mercedes')) recurringIssues.push('Mercedes-Benz Interest');
  if (allText.includes('bmw') || allText.includes('بي ام')) recurringIssues.push('BMW Interest');
  if (!recurringIssues.length) recurringIssues.push('Automotive Buyer', 'General Inquiry');

  const hasComplaint = tickets.some(t => t.sentiment === 'Frustrated');
  const sentimentTrend = hasComplaint ? 'Needs Attention' : isVip ? 'High Value Client (VIP)' : 'Active / Interested';

  let aiSummary = `${name} has interacted ${Math.max(logs.length, 1)} time(s) regarding our dealership inventory. `;
  if (orders.length > 0) {
    aiSummary += `Has placed ${orders.length} car purchase reservation(s) totaling ${totalSpend.toLocaleString()} EGP. `;
  }
  if (reservations.length > 0) {
    aiSummary += `Has booked ${reservations.length} test drive / showroom appointment(s). `;
  }
  if (hasComplaint) {
    aiSummary += `Requested senior sales manager assistance; prioritize prompt follow-up.`;
  } else {
    aiSummary += `Interested in new & used cars with financing options. Preferred language: ${preferredLanguage}.`;
  }

  return {
    phone: cleanPhone,
    name,
    isVip,
    totalOrders: orders.length,
    totalSpend: totalSpend.toLocaleString() + ' EGP',
    totalBookings: reservations.length,
    preferredLanguage,
    sentimentTrend,
    recurringIssues: [...new Set(recurringIssues)],
    aiSummary,
    recentOrders: orders.slice(0, 3),
    recentBookings: reservations.slice(0, 3),
    activeHandoffTicket: tickets.find(t => t.status === 'open') || null
  };
}

const getData = () => memoryStore;
const persist = async () => await flush();

// Multi-Branch Support
export function getBranches() {
  const d = getData();
  return d.branches || DEFAULT_BRANCHES;
}

export async function saveBranch(branch) {
  const d = getData();
  if (!d.branches) d.branches = [...DEFAULT_BRANCHES];
  const idx = d.branches.findIndex(b => b.id === branch.id);
  if (idx >= 0) {
    d.branches[idx] = { ...d.branches[idx], ...branch };
  } else {
    d.branches.push({ id: `branch_${Date.now()}`, ...branch, createdAt: new Date().toISOString() });
  }
  await persist(d);
  return d.branches;
}

export async function deleteBranch(id) {
  const d = getData();
  d.branches = (d.branches || []).filter(b => b.id !== id);
  await persist(d);
  return d.branches;
}

// Behavioral Analytics
export function getAnalytics() {
  const d = getData();
  return d.analytics || { carInquiries: {}, peakHours: {}, topQuestions: [], sentimentHistory: [], leadScores: {} };
}

export async function trackCarInquiry(carName) {
  const d = getData();
  if (!d.analytics) d.analytics = { carInquiries: {}, peakHours: {}, topQuestions: [], sentimentHistory: [], leadScores: {} };
  if (!d.analytics.carInquiries) d.analytics.carInquiries = {};
  d.analytics.carInquiries[carName] = (d.analytics.carInquiries[carName] || 0) + 1;
  // Track peak hours
  const hour = new Date().getHours();
  if (!d.analytics.peakHours) d.analytics.peakHours = {};
  d.analytics.peakHours[hour] = (d.analytics.peakHours[hour] || 0) + 1;
  await persist(d);
}

export async function saveLeadScore(phone, scoreData) {
  const d = getData();
  if (!d.analytics) d.analytics = { carInquiries: {}, peakHours: {}, topQuestions: [], sentimentHistory: [], leadScores: {} };
  if (!d.analytics.leadScores) d.analytics.leadScores = {};
  d.analytics.leadScores[phone] = { ...scoreData, updatedAt: new Date().toISOString() };
  await persist(d);
}

export async function trackSentiment(phone, sentimentData) {
  const d = getData();
  if (!d.analytics) d.analytics = { carInquiries: {}, peakHours: {}, topQuestions: [], sentimentHistory: [], leadScores: {} };
  if (!d.analytics.sentimentHistory) d.analytics.sentimentHistory = [];
  d.analytics.sentimentHistory.unshift({ phone, ...sentimentData, ts: new Date().toISOString() });
  if (d.analytics.sentimentHistory.length > 200) d.analytics.sentimentHistory = d.analytics.sentimentHistory.slice(0, 200);
  await persist(d);
}
