// Internationalization (i18n) & Localization for Al-Fares Motors Automotive Suite
// Complete Arabic (Default) & English support with RTL/LTR switching

export const translations = {
  ar: {
    // Brand & General
    app_title: 'الفارس للسيارات — منصة مبيعات السيارات بالذكاء الاصطناعي',
    brand_name: 'Al-Fares Motors',
    brand_sub: 'الفارس للسيارات',
    admin_name: 'المدير العام',
    admin_badge: 'مدير النظام',
    not_connected: '● غير متصل',
    live_connected: '● متصل ونشط على واتساب',
    auto_paused: '● الرد التلقائي متوقف',
    active_role: 'الصلاحية الحالية:',
    role_admin: 'مدير كامل الصلاحيات',
    role_editor: 'مستشار مبيعات / محرر',
    role_viewer: 'عرض فقط',
    dark_mode: 'الوضع الليلي',
    light_mode: 'الوضع النهاري',
    lang_toggle: 'English',

    // Navigation Items
    nav_dashboard: 'لوحة التحكم',
    nav_admin_ai: 'لوحة الذكاء الاصطناعي',
    nav_products: 'قاعدة بيانات السيارات',
    nav_orders: 'حجوزات شراء السيارات',
    nav_reservations: 'مواعيد تجربة القيادة',
    nav_livechat: 'المحادثات المباشرة',
    nav_broadcast: 'الحملات الإعلانية',
    nav_chat: 'معاينة المساعد الذكي',
    nav_faq: 'الأسئلة الشائعة (FAQ)',
    nav_helpcenter: 'مركز المعرفة الفني',
    nav_business: 'بيانات المعرض والسياسات',
    nav_whatsapp: 'ربط واتساب API',
    nav_team: 'مستشاري المبيعات',
    nav_templates: 'قوالب الرسائل',
    nav_logs: 'رسائل واستفسارات العملاء',

    // Chat / Assistant Preview
    chat_header: 'معاينة مستشار المبيعات الذكي',
    chat_sub: 'اسأل أي استفسار يطرحه العميل عن السيارات والأسعار والمواصفات والتقسيط — هذا هو نفس البوت الذي يجيب على واتساب تلقائياً.',
    new_chat: 'محادثة جديدة',
    input_placeholder: 'اسأل عن سيارات المعرض، الأسعار، أنظمة التقسيط، حجز تجربة قيادة أو الاستبدال…',
    tuning_badge: 'متصل بقاعدة بيانات السيارات وذكاء Puter AI الفوري.',
    mode_badge: 'الوضع النشط: مستشار مبيعات سيارات & حجز تجارب قيادة',
    conversations_title: 'المحادثات السابقة',
    no_conversations: 'لا توجد محادثات سابقة',

    // Dashboard
    dash_header: 'لوحة القيادة والمؤشرات',
    dash_sub: 'أداء مستشار مبيعات الذكاء الاصطناعي في خدمة العملاء ومبيعات السيارات.',
    metric_messages: 'إجمالي المحادثات',
    metric_automation: 'نسبة الأتمتة بالذكاء الاصطناعي',
    metric_speed: 'متوسط سرعة الرد',
    metric_csat: 'معدل رضا العملاء (CSAT)',
    metric_orders: 'حجوزات السيارات',
    metric_revenue: 'حجم مبيعات المعرض',
    metric_reservations: 'تجارب القيادة',
    metric_customers: 'العملاء ومشتري السيارات',

    // Actions & Common
    save: 'حفظ',
    save_unsaved: 'تغييرات غير محفوظة',
    saved_success: 'تم حفظ التعديلات بنجاح',
    loading: 'جاري التحميل…',
    filter_all: 'الكل',
    export_csv: 'تصدير CSV',
    export_pdf: 'تصدير PDF',
    search: 'بحث…',
    cancel: 'إلغاء',
    confirm: 'تأكيد'
  },
  en: {
    // Brand & General
    app_title: 'Al-Fares Motors — WhatsApp AI Automotive Suite',
    brand_name: 'Al-Fares Motors',
    brand_sub: 'Dealership & Showroom',
    admin_name: 'Admin',
    admin_badge: 'ADMIN',
    not_connected: '● Not connected',
    live_connected: '● Live on WhatsApp',
    auto_paused: '● Auto-reply paused',
    active_role: 'Active Role:',
    role_admin: 'Full Admin',
    role_editor: 'Sales Advisor / Editor',
    role_viewer: 'View-Only',
    dark_mode: 'Night Mode',
    light_mode: 'Day Mode',
    lang_toggle: 'العربية',

    // Navigation Items
    nav_dashboard: 'Dashboard',
    nav_admin_ai: 'AI Intelligence',
    nav_products: 'Cars Database',
    nav_orders: 'Car Bookings',
    nav_reservations: 'Test Drives',
    nav_livechat: 'Live Chat',
    nav_broadcast: 'Broadcasts',
    nav_chat: 'Assistant Preview',
    nav_faq: 'FAQ Answers',
    nav_helpcenter: 'Car Knowledge',
    nav_business: 'Dealership Info',
    nav_whatsapp: 'Connect WhatsApp',
    nav_team: 'Sales Advisors',
    nav_templates: 'Templates',
    nav_logs: 'Client Messages',

    // Chat / Assistant Preview
    chat_header: 'Assistant Preview',
    chat_sub: 'Ask anything a car buyer would ask — this is the exact bot that replies on WhatsApp.',
    new_chat: 'New conversation',
    input_placeholder: 'Ask about car inventory, prices, bank installments, test drives, or trade-ins…',
    tuning_badge: 'Connected to internal vehicle database & Puter AI.',
    mode_badge: 'Active Mode: Automotive Sales & Test Drive Advisor',
    conversations_title: 'Conversations',
    no_conversations: 'No conversations yet',

    // Dashboard
    dash_header: 'Dashboard',
    dash_sub: 'How your automotive assistant is performing with real car buyers.',
    metric_messages: 'Messages Handled',
    metric_automation: 'AI Automation Rate',
    metric_speed: 'Avg. Response Time',
    metric_csat: 'Satisfaction (CSAT)',
    metric_orders: 'Car Bookings',
    metric_revenue: 'Dealership Volume',
    metric_reservations: 'Test Drives',
    metric_customers: 'Car Buyers & Clients',

    // Actions & Common
    save: 'Save',
    save_unsaved: 'Unsaved changes',
    saved_success: 'Changes saved successfully',
    loading: 'Loading…',
    filter_all: 'All',
    export_csv: 'Export CSV',
    export_pdf: 'Export PDF',
    search: 'Search…',
    cancel: 'Cancel',
    confirm: 'Confirm'
  }
};

let currentLang = localStorage.getItem('alfares_lang') || 'ar';

export function getLang() {
  return currentLang;
}

export function t(key) {
  const dict = translations[currentLang] || translations.ar;
  return dict[key] || translations.ar[key] || key;
}

export function setLanguage(lang) {
  if (lang !== 'ar' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('alfares_lang', lang);
  applyLanguage(lang);
}

export function toggleLanguage() {
  const next = currentLang === 'ar' ? 'en' : 'ar';
  setLanguage(next);
  return next;
}

export function applyLanguage(lang = currentLang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Apply translations to all DOM elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  // Apply placeholder translations
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });

  // Apply titles / tooltips
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.setAttribute('title', val);
  });

  // Update language toggle buttons
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.innerHTML = `<i data-lucide="languages" class="h-4 w-4"></i><span>${lang === 'ar' ? 'English' : 'العربية'}</span>`;
  }
  const langMobileBtn = document.getElementById('langToggleMobileBtn');
  if (langMobileBtn) {
    langMobileBtn.innerHTML = `<i data-lucide="languages" class="h-4 w-4"></i><span>${lang === 'ar' ? 'English' : 'العربية'}</span>`;
  }
}
