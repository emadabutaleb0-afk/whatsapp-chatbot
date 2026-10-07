// AI & Multilingual Automotive Reasoning Engine for WhatsApp Car Dealership Assistant
import { puter } from '@heyputer/puter.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'you', 'your', 'i', 'me', 'my', 'we', 'of', 'to',
  'in', 'on', 'at', 'for', 'and', 'or', 'it', 'this', 'that', 'can', 'could', 'would',
  'have', 'has', 'any', 'there', 'what', 'when', 'where', 'how', 'much', 'many', 'please',
  'hi', 'hello', 'hey', 'does', 'did', 'be', 'with', 'from', 'about', 'open'
]);

export function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\u0640\u064B-\u065F]/g, '') // remove Arabic Tashkeel
    .replace(/[أإآء]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

export function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length > 5 && nb.length > 5 && (na.includes(nb) || nb.includes(na))) return 0.92;
  
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;

  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  return inter / (ta.size + tb.size - inter);
}

export function matchFaq(text, entries = []) {
  let best = null;
  let bestScore = 0;

  for (const e of entries) {
    if (!e.question || !e.answer) continue;
    const candidates = [e.question, ...String(e.aliases || '').split('\n')].filter(Boolean);
    for (const cand of candidates) {
      const score = similarity(text, cand);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
  }

  return bestScore >= 0.65 ? { entry: best, score: bestScore } : null;
}

export function matchHelpCenter(text, articles = []) {
  const norm = normalize(text);
  if (!norm || !articles.length) return null;

  let best = null;
  let bestScore = 0;

  for (const art of articles) {
    let score = 0;
    const titleScore = similarity(norm, art.title);
    if (titleScore > score) score = titleScore;

    // Check tags
    const tags = Array.isArray(art.tags) ? art.tags : [];
    for (const tag of tags) {
      const nTag = normalize(tag);
      if (nTag && norm.includes(nTag)) {
        score = Math.max(score, 0.85);
      }
    }

    // Check content token overlap
    const contentTokens = tokenize(art.content);
    const queryTokens = tokenize(text);
    if (queryTokens.length) {
      let matchedTokens = 0;
      queryTokens.forEach(t => {
        if (contentTokens.includes(t)) matchedTokens++;
      });
      const overlap = matchedTokens / queryTokens.length;
      if (overlap >= 0.4) {
        score = Math.max(score, 0.65 + (overlap * 0.30));
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = art;
    }
  }

  return bestScore >= 0.60 ? { article: best, score: bestScore } : null;
}

export function buildSystemPrompt(cfg = {}) {
  const b = cfg.business || {};
  const cars = cfg.products || [];
  const fallback = (cfg.whatsapp && cfg.whatsapp.fallback) ||
    "سؤال ممتاز يا فندم! دعني أتأكد مع فريق المبيعات الفني وأرد على حضرتك فوراً.";

  const L = [];
  L.push(`You are the official AI Automotive Sales & Dealership Assistant for "${b.name || 'Al-Fares Motors'}".`);
  L.push('You communicate directly with car buyers and clients on WhatsApp on behalf of the dealership owner and sales team.');
  L.push('Your specialty is selling NEW (Zero) and CERTIFIED PRE-OWNED (Used / مستعمل بحالة الزيرو) cars.');
  L.push('');
  L.push('## LANGUAGE & DIALECT GUIDELINES (CRITICAL)');
  L.push('1. Detect the client language & dialect automatically and reply in the EXACT same style:');
  L.push('   - If client speaks Egyptian Arabic (e.g. "عايز اعرف سعر السياره", "بكام كاش", "في تقسيط", "فين المعرض", "عايز اجرب العربية"), reply in natural, polite Egyptian Arabic.');
  L.push('   - If client uses Franco-Arab (e.g. "feen el ma3rad", "bkam el mercedes", "3ayz a7gez test drive"), reply warmly in Egyptian Arabic or English.');
  L.push('   - If client speaks English, reply in fluent professional English.');
  L.push('   - If client speaks Modern Standard Arabic or Gulf Arabic, reply in polite, courteous Arabic.');
  L.push('2. Keep replies professional, automotive-expert, warm, structured with bullet points when quoting specs, and easy to read on WhatsApp.');
  L.push('');
  L.push('## CORE RULES');
  L.push('1. Answer ONLY using the car inventory and dealership information below. Never invent car models, prices, mileage, or false promises.');
  L.push('2. Clearly distinguish whether a car is NEW (Zero / زيرو) or CERTIFIED USED (مستعمل بحالة الزيرو مع الفحص الفني).');
  L.push('3. Highlight financing options (بنوك، تقسيط حتى 7 سنوات، مقدم يبدأ من 20%) واستبدال السيارات (Trade-In).');
  L.push('4. If an APPROVED ANSWER below covers the question, use it as the answer.');
  L.push(`5. If the answer is not in the information below, say: "${fallback}"`);
  L.push('6. Always quote exact prices with the currency (e.g. 3,850,000 EGP).');
  L.push('7. Conclude replies with a courteous call-to-action (e.g. offer to book a test drive / حجز تجربة قيادة, share showroom location pin, or calculate bank installments).');

  const faqs = (cfg.faqEntries || []).filter(f => f.question && f.answer);
  if (faqs.length) {
    L.push('');
    L.push('## APPROVED DEALERSHIP ANSWERS (highest priority)');
    faqs.forEach((f, i) => {
      L.push(`${i + 1}. Client asks: ${f.question}`);
      const alt = String(f.aliases || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (alt.length) L.push(`   Aliases: ${alt.join(' | ')}`);
      L.push(`   Approved reply: ${f.answer}`);
    });
  }

  const learned = (cfg.learnedAnswers || []).filter(l => l.question && l.answer);
  if (learned.length) {
    L.push('');
    L.push('## RESPONSES TAUGHT DIRECTLY BY HUMAN OWNER (HIGHEST PRIORITY / RECENT LEARNING)');
    L.push('The showroom owner personally answered these client questions. Use this exact knowledge whenever a client asks something similar:');
    learned.forEach((l, i) => {
      L.push(`${i + 1}. Client asked: "${l.question}"`);
      if (l.aliases) L.push(`   Aliases: ${l.aliases}`);
      L.push(`   Owner Approved Response: "${l.answer}"`);
    });
  }

  L.push('');
  L.push('## DEALERSHIP INFORMATION');
  if (b.name) L.push(`Name: ${b.name}`);
  if (b.tagline) L.push(`Tagline: ${b.tagline}`);
  if (b.about) L.push(`About: ${b.about}`);
  if (b.hours) L.push(`Opening hours:\n${b.hours}`);
  if (b.location) L.push(`Location:\n${b.location}`);
  if (b.mapsUrl) L.push(`Map link: ${b.mapsUrl}`);
  if (b.phone) L.push(`Phone: ${b.phone}`);
  if (b.delivery) L.push(`Delivery / Transport: ${b.delivery}`);
  if (b.payment) L.push(`Payment & Financing: ${b.payment}`);
  if (b.policies) L.push(`Warranties & Inspection Policies:\n${b.policies}`);

  const branches = cfg.branches || [];
  if (branches.length) {
    L.push('');
    L.push('## SHOWROOM BRANCHES (LIVE DATABASE)');
    branches.forEach((br, i) => {
      L.push(`- Branch ${i + 1}: ${br.name} | Address: ${br.address} | Phone: ${br.phone} | Hours: ${br.hours} | Maps: ${br.mapsUrl || ''}`);
    });
  }

  L.push('');
  L.push('## VEHICLE INVENTORY & PRICES (CARS DATABASE)');
  if (cars.length) {
    cars.forEach(c => {
      const specText = c.specs ? ` [Year: ${c.specs.year || ''}, Mileage: ${c.specs.mileage || ''}, Engine: ${c.specs.engine || ''}, Condition: ${c.specs.condition || ''}]` : '';
      L.push(`- ${c.name}: ${c.price || 'Call for price'} | Condition/Category: ${c.category || 'Automotive'} | Status: ${c.stock || 'In Stock'}.${specText} ${c.description || ''}`);
    });
  }

  if (cfg.ordersCount != null || cfg.reservationsCount != null) {
    L.push('');
    L.push(`## REAL-TIME DATABASE ACTIVITY: ${cfg.ordersCount || 0} active purchase orders, ${cfg.reservationsCount || 0} confirmed test drive bookings.`);
  }

  const templates = (cfg.templates || []).filter(t => t.enabled !== false);
  if (templates.length) {
    L.push('');
    L.push('## PRE-WRITTEN MESSAGE TEMPLATES (Use or adapt for matching scenarios)');
    templates.forEach(t => {
      L.push(`- [${t.name} (${t.scenario})]: "${t.content}"`);
    });
  }

  const articles = cfg.articles || [];
  if (articles.length) {
    L.push('');
    L.push('## HELP CENTER AUTOMOTIVE KNOWLEDGE BASE (Autonomous resolution articles)');
    articles.forEach((a, i) => {
      L.push(`Article ${i + 1} [${a.category}]: ${a.title}`);
      if (a.tags?.length) L.push(`Tags: ${a.tags.join(', ')}`);
      L.push(`Content: ${a.content}`);
      L.push('');
    });
  }

  return L.join('\n');
}

/**
 * Intelligent Intent & Action Analyzer for Car Dealership
 */
export function analyzeIntent(text, config = {}, history = []) {
  const norm = normalize(text);
  const raw = String(text || '').trim();

  const humanTriggers = [
    'human', 'agent', 'support', 'person', 'representative', 'operator', 'talk to someone',
    'salesman', 'مسؤول مبيعات', 'مستشار مبيعات', 'خدمه عملاء', 'خدمة عملاء', 'عايز اكلم حد',
    'عاوز اكلم حد', 'كلمني حد', 'بني ادم', 'حولني لحد', 'عايز موظف', 'كلمني موظف', 'موظف مبيعات', 'موظف خدمة عملاء', 'مساعده بشريه',
    'شكوى', 'مشكله', 'مشكلة', 'مدير المعرض'
  ].map(normalize);
  if (humanTriggers.some(t => norm.includes(t))) {
    const isAngry = /(مشكله|مشكلة|شكوى|زفت|سيء|تأخير|غلط|فلوس|نصب|angry|bad|terrible|scam)/i.test(raw);
    const isUrgent = /(urgent|ضروري|طوارئ|بسرعة|حالاً|asap)/i.test(raw);
    const sentiment = isAngry ? 'Frustrated' : isUrgent ? 'Urgent' : 'Inquiry';
    const issueSummary = isAngry 
      ? `Client escalated an issue: "${raw.slice(0, 120)}"` 
      : `Client requested sales advisor handover regarding: "${raw.slice(0, 120)}"`;
    const recommendedAction = 'Connect client with a senior sales advisor to negotiate purchase or financing.';

    return {
      type: 'HUMAN_TAKEOVER',
      reply: 'تم تحويل المحادثة لأحد مستشاري المبيعات وخبراء السيارات لدينا وسيقوم بالرد على حضرتك فوراً هنا في الشات للإجابة على جميع الاستفسارات الفنية والتمويلية. 👨‍💼🚗\nOur sales specialist has been notified and will assist you shortly.',
      handoffBriefing: {
        issueSummary,
        sentiment,
        recommendedAction,
        lastMessage: raw
      },
      sentimentData: { sentiment: isAngry ? 'frustrated' : isUrgent ? 'urgent' : 'neutral', score: isAngry ? 0.8 : isUrgent ? 0.7 : 0.3, shouldEscalate: isAngry || isUrgent }
    };
  }

  // 2. Dealership Location Pin Request Intent
  const locationTriggers = [
    'اللوكيشن', 'لوكيشن', 'ابعثلي اللوكيشن', 'ابعتلي اللوكيشن', 'موقع المعرض', 'عنوان المعرض', 'مكان المعرض',
    'gps', 'send location', 'location pin', 'share location', 'feen el ma3rad', 'feen el mkan', 'where is showroom',
    'where are you located', 'المكان', 'مكان', 'العنوان', 'عنوان', 'فين', 'فروعكم', 'الفروع', 'فرعكم'
  ].map(normalize);
  if (locationTriggers.some(t => norm.includes(t))) {
    const b = config.business || {};
    return {
      type: 'SEND_LOCATION',
      lat: b.latitude || 30.0444,
      lng: b.longitude || 31.4582,
      name: b.name || 'Al-Fares Motors Showroom',
      address: b.location || 'New Cairo & Nasr City Showrooms',
      reply: `فروع ومواقع معارض الفارس موتورز مصر (إدارة هاني مسعود): 📍\n\n1️⃣ فرع التجمع الأول (القاهرة الجديدة):\nمول 5، المجاورة الخامسة، التجمع الأول – بجوار موقف الأتوبيس.\n\n2️⃣ فرع مدينة نصر (القاهرة):\n17 شارع المشروع، متفرع من مصطفى النحاس، مدينة نصر.\n\n📞 هاتف وواتساب المبيعات: 01501511117 / +201501511117\n🌐 خريطة الفروع على موقعنا: https://alfarismotors.ai/branches\nتشرفنا بالزيارة في أي وقت لمعاينة وفحص السيارات! 🚗`
    };
  }

  // Helper matching for automotive brands and models
  const carAliases = {
    'Mercedes-Benz C200 2024 AMG (Zero / New)': ['mercedes', 'c200', 'مرسيدس', 'مرسيدس c200', 'مرسيدس زيرو', 'c 200'],
    'BMW 320i 2023 M-Sport (Certified Used)': ['bmw', '320', '320i', 'بي ام', 'بي ام دبليو', 'بي ام 320', 'بي ام مستعمل'],
    'Toyota Corolla 2024 Smart (Zero / New)': ['toyota', 'corolla', 'تويوتا', 'كورولا', 'تويوتا كورولا', 'كورولا زيرو'],
    'Hyundai Tucson 2022 Turbo NX4 (Certified Used)': ['tucson', 'hyundai', 'توسان', 'هيونداي توسان', 'توسان تيربو', 'توسان مستعمل'],
    'Kia Sportage 2024 GT-Line (Zero / New)': ['sportage', 'kia', 'سبورتاج', 'كيا سبورتاج', 'سبورتاج زيرو', 'كيا'],
    'Range Rover Sport 2021 HSE Dynamic (Certified Used)': ['range rover', 'رينج روفر', 'رنج روفر', 'رينج روفر سبورت', 'rover']
  };

  const getCarMatches = (car) => {
    const aliases = carAliases[car.name] || [];
    return [normalize(car.name), ...aliases.map(normalize)];
  };

  const cars = config.products || [];

  // 3. Car Image / Photo Request Intent
  const imageTriggers = ['صوره', 'صورة', 'صور', 'photo', 'picture', 'image', 'وريني', 'show me', 'شكلها ايه'];
  if (imageTriggers.some(t => norm.includes(t))) {
    for (const c of cars) {
      const candidates = getCarMatches(c);
      if (candidates.some(cand => norm.includes(cand))) {
        return {
          type: 'SEND_IMAGE',
          imageUrl: c.image || 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
          caption: `${c.name} — ${c.price}\n${c.description || ''}`,
          reply: `تفضل صورة ${c.name} (${c.price})! 🚗\nمتاحة لدينا بالمعرض للمعاينة والفحص الفوري.`
        };
      }
    }
    // If asking for general car photos
    if (cars.length > 0) {
      const firstCar = cars[0];
      return {
        type: 'SEND_IMAGE',
        imageUrl: firstCar.image,
        caption: `${firstCar.name} — ${firstCar.price}`,
        reply: `تفضل صورة ${firstCar.name}! تحب تشوف صور لموديل أو عربية تانية معينة؟ 🚗`
      };
    }
  }

  // 4. Test Drive & Showroom Appointment Intent (حجز تجربة قيادة / معاينة)
  const testDriveTriggers = [
    'تجربه قياده', 'تجربة قيادة', 'تست درايف', 'معاينه', 'معاينة', 'احجز ميعاد', 'احجز موعد',
    'اجرب العربية', 'اجرب العربيه', 'test drive', 'test-drive', 'appointment', 'viewing', 'visit showroom'
  ].map(normalize);
  if (testDriveTriggers.some(t => norm.includes(t))) {
    let carName = 'سيارة من اختيارك';
    for (const c of cars) {
      const candidates = getCarMatches(c);
      if (candidates.some(cand => norm.includes(cand))) {
        carName = c.name;
        break;
      }
    }

    let timeDesc = 'بالمعرض في المواعيد الرسمية';
    if (norm.includes('بكره') || norm.includes('غدا') || norm.includes('tomorrow')) timeDesc = 'غداً في المعرض';
    else if (norm.includes('الجمعه') || norm.includes('friday')) timeDesc = 'يوم الجمعة بعد صلاة الظهر';
    else if (norm.includes('السبت') || norm.includes('saturday')) timeDesc = 'يوم السبت';

    const hourMatch = raw.match(/(\d{1,2})(:00)?\s*(pm|am|مساء|صباحا)?/i);
    if (hourMatch) timeDesc += ` الساعة ${hourMatch[0]}`;

    return {
      type: 'BOOKING_CREATE',
      partySize: 1,
      time: `${carName} — ${timeDesc}`,
      reply: `تم تأكيد حجز موعد تجربة القيادة والمعاينة بنجاح! 🏎️📅\n• السيارة: ${carName}\n• الموعد: ${timeDesc}\n• موقع المعرض: التجمع / سوق السيارات\nيسعدنا استقبال حضرتك ونتمنى لك تجربة ممتعة!`
    };
  }

  // 5. Car Booking / Earnest Money / Purchase Intent (حجز وشراء سيارة)
  const buyTriggers = [
    'عايز اشتري', 'عاوز اشتري', 'حجز عربيه', 'حجز سيارة', 'احجزلي العربيه', 'احجزلي العربية',
    'عايز احجز', 'عاوز احجز', 'buy car', 'book car', 'reserve car', 'purchase'
  ];
  const foundCars = [];
  for (const c of cars) {
    const candidates = getCarMatches(c);
    for (const cand of candidates) {
      if (norm.includes(cand)) {
        foundCars.push({
          name: c.name,
          qty: 1,
          price: c.price,
          subtotal: c.price
        });
        break;
      }
    }
  }

  if (buyTriggers.some(t => norm.includes(t)) && foundCars.length > 0) {
    const targetCar = foundCars[0];
    return {
      type: 'ORDER_CREATE',
      items: [targetCar],
      total: targetCar.price,
      address: 'تسليم وترخيص المعرض',
      intentData: {
        items: [targetCar],
        total: targetCar.price,
        address: 'تسليم وترخيص المعرض'
      },
      reply: `تم تسجيل طلب حجز سيارتك المبدئي بنجاح! 🚘🎉\n• السيارة: ${targetCar.name}\n• السعر الإجمالي: ${targetCar.price}\n• نظام الدفع: كاش أو تقسيط بنكي بمقدم يبدأ من 20%.\nمن فضلك أرسل رقم هاتفك واسمك بالكامل وسيتواصل معك مدير المبيعات فوراً لتجهيز أوراق التعاقد والاستلام!`
    };
  }

  // 6. Conversational Affirmation & Multi-Turn Context ("yes", "sure", "تمام", "اه", etc.)
  const yesWords = new Set([
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please', 'course',
    'نعم', 'اه', 'ايوه', 'ايوة', 'ياريت', 'تمام', 'اكيد', 'ماشي', 'اوك', 'اوكي', 'يلا', 'بالتاكيد'
  ]);
  const normTokens = norm.split(' ').filter(Boolean);
  const isAffirmative = normTokens.some(w => yesWords.has(w)) ||
    /^(yes|yeah|sure|ok|نعم|اه|ايوة|ياريت|تمام)$/i.test(raw);

  if (isAffirmative && Array.isArray(history) && history.length > 0) {
    const lastBotMsg = [...history].reverse().find(m => m.role === 'assistant' || m.reply);
    const lastBotText = lastBotMsg ? String(lastBotMsg.content || lastBotMsg.reply || '') : '';
    const normBot = normalize(lastBotText);

    // If last bot message proposed a test drive
    if (normBot.includes('تجرب') || normBot.includes('test drive') || normBot.includes('معاين')) {
      const isAr = /[\u0600-\u06FF]/.test(raw) || /[\u0600-\u06FF]/.test(lastBotText);
      return {
        type: 'BOOKING_CREATE',
        partySize: 1,
        time: 'موعد تجربة قيادة بالمعرض',
        intentData: { partySize: 1, time: 'موعد تجربة قيادة بالمعرض' },
        reply: isAr
          ? `تنورنا بكل سرور! 🚗 تم تأكيد موعد زيارتك لمعاينة وتجربة القيادة. في أي يوم أو ساعة تفضل الزيارة حتى نجهز السيارة لحضرتك؟`
          : `We look forward to welcoming you! 🚗 For what day and time would you like to schedule your test drive?`
      };
    }

    // General positive confirmation
    const isAr = /[\u0600-\u06FF]/.test(raw);
    return {
      type: 'AFFIRMATION_REPLY',
      reply: isAr
        ? `في خدمتك دائماً! 🚗 تحب تستفسر عن مواصفات سيارة معينة (زيرو أو مستعملة)، أو أنظمة التقسيط والتمويل البنكي، أو حجز تجربة قيادة؟`
        : `At your service! 🚗 Would you like to check out specific car specs, auto financing plans, or schedule a test drive?`
    };
  }

  return { type: 'NORMAL_CHAT' };
}

/**
 * Call Puter AI via OpenAI-Compatible HTTP endpoint or Puter.js SDK
 */
async function callPuterAI(messages, model = 'gpt-5.4-nano') {
  const puterToken = process.env.PUTER_AUTH_TOKEN || process.env.PUTER_API_KEY;

  // Method A: Standard OpenAI-Compatible Endpoint using Puter Auth Token
  if (puterToken) {
    try {
      const response = await fetch('https://api.puter.com/puterai/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${puterToken}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.25,
          max_tokens: 350
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn('Puter OpenAI-compatible HTTP call failed, trying SDK fallback:', err.message);
    }
  }

  // Method B: Puter.js SDK
  if (puterToken) {
    try {
      puter.setAuthToken(puterToken);
      const puterRes = await puter.ai.chat(messages, { model });
      const text = puterRes?.message?.content || (typeof puterRes === 'string' ? puterRes : puterRes?.text);
      if (text && String(text).trim()) return String(text).trim();
    } catch (err) {
      console.warn('Puter.js SDK call failed:', err.message);
    }
  }

  return null;
}

/**
 * Main Answer Generation
 */
export async function answerQuestion(question, config, history = []) {
  const start = Date.now();
  const fallback = (config.whatsapp && config.whatsapp.fallback) ||
    "سؤال ممتاز يا فندم! دعني أتأكد مع فريق المبيعات الفني وأرد على حضرتك فوراً.";

  // 1. Intent Analysis
  const intent = analyzeIntent(question, config, history);
  if (intent.type !== 'NORMAL_CHAT') {
    return {
      reply: intent.reply,
      faqHit: false,
      source: 'intent-engine',
      intentType: intent.type,
      intentData: intent,
      handoffBriefing: intent.handoffBriefing || null,
      isFallback: false,
      durationMs: Date.now() - start
    };
  }

  // 1.5. Check Human Owner Learned Answers (Trained by Real Interactions)
  const matchedLearned = matchFaq(question, config.learnedAnswers || []);
  if (matchedLearned && matchedLearned.entry && matchedLearned.score >= 0.60) {
    return {
      reply: matchedLearned.entry.answer,
      faqHit: true,
      source: 'owner-learned',
      isFallback: false,
      durationMs: Date.now() - start
    };
  }

  // 2. FAQ Match Check
  const matched = matchFaq(question, config.faqEntries || []);
  if (matched && matched.entry) {
    if (matched.entry.mode === 'exact' || matched.score >= 0.82) {
      return {
        reply: matched.entry.answer,
        faqHit: true,
        source: 'faq',
        isFallback: false,
        durationMs: Date.now() - start
      };
    }
  }

  // 3. Help Center Knowledge Base Check
  const matchedArt = matchHelpCenter(question, config.articles || []);
  if (matchedArt && matchedArt.score >= 0.70) {
    const isArabic = /[\u0600-\u06FF]/.test(question);
    const prefix = isArabic
      ? `بخصوص استفسارك عن (${matchedArt.article.title}):\n`
      : `According to our dealership guides (${matchedArt.article.title}):\n`;
    const suffix = isArabic
      ? '\n\nهل تحب نحسبلك قسط سيارة محددة أو تشرفنا في المعرض للمعاينة؟ 🚗'
      : '\n\nWould you like us to calculate an installment plan or schedule a showroom visit? 🚗';
    return {
      reply: prefix + matchedArt.article.content + suffix,
      faqHit: false,
      source: 'helpcenter',
      matchedArticle: matchedArt.article.title,
      confidence: matchedArt.score,
      isFallback: false,
      durationMs: Date.now() - start
    };
  }

  const systemPrompt = buildSystemPrompt(config);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: question }
  ];

  // 4. Puter AI (Free, Unlimited OpenAI API endpoint via Puter)
  const puterModel = process.env.PUTER_MODEL || 'gpt-5.4-nano';
  const puterReply = await callPuterAI(messages, puterModel);
  if (puterReply) {
    const isFallback = puterReply.toLowerCase().includes(fallback.slice(0, 20).toLowerCase());
    return {
      reply: puterReply,
      faqHit: false,
      source: `puter-${puterModel}`,
      isFallback,
      durationMs: Date.now() - start
    };
  }

  // 5. Gemini API (if key available)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const contents = [];
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: question }]
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 350 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const isFallback = text.toLowerCase().includes(fallback.slice(0, 20).toLowerCase());
          return {
            reply: text,
            faqHit: false,
            source: 'gemini',
            isFallback,
            durationMs: Date.now() - start
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call fallback:', err.message);
    }
  }

  // 6. Native OpenAI API (if key available)
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.2, max_tokens: 350 })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          const isFallback = text.toLowerCase().includes(fallback.slice(0, 20).toLowerCase());
          return {
            reply: text,
            faqHit: false,
            source: 'openai',
            isFallback,
            durationMs: Date.now() - start
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI API call fallback:', err.message);
    }
  }

  // 7. Automotive Knowledge & Rule Answering Engine
  const reply = localSmartCarAnswer(question, config);
  const isFallback = reply === fallback;
  return {
    reply,
    faqHit: matched ? true : false,
    source: 'smart-automotive-rule',
    isFallback,
    durationMs: Date.now() - start
  };
}

/**
 * Intelligent Egyptian Arabic & English Automotive Rule Answering
 */
function localSmartCarAnswer(question, config) {
  const norm = normalize(question);
  const b = config.business || {};
  const cars = config.products || [];
  const fallback = (config.whatsapp && config.whatsapp.fallback) ||
    "سؤال ممتاز يا فندم! دعني أتأكد مع فريق المبيعات الفني وأرد على حضرتك فوراً.";

  const isArabic = /[\u0600-\u06FF]/.test(question);

  // Greetings
  if (/^(hi|hello|hey|welcome)\b/i.test(norm) || /^(سلام|اهلا|مرحبا|صباح الخير|مساء الخير|ازيك|السلام عليكم)/.test(norm)) {
    return isArabic
      ? `أهلاً بك في ${b.name || 'معرض الفارس للسيارات'}! 🚗 يسعدنا خدمتك، تحب تستفسر عن سيارات الزيرو أم المستعملة بحالة الفابريكا، عروض التقسيط، أو حجز تجربة قيادة؟`
      : `Hello and welcome to ${b.name || 'Al-Fares Motors'}! 🚗 How can I help you today with our new cars (zero), certified used vehicles, financing plans, or test drive bookings?`;
  }

  // Gratitude / Thank you
  if (/^(thank|thanks|thx|ty|شكرا|شكراً|تسلم|تسلمي|الف شكر|الله يخليك|حبيبي)\b/i.test(norm)) {
    return isArabic
      ? `العفو يا فندم! 🚗 في خدمتك دائماً، والمعرض مفتوح لاستقبالك وتجربة أي سيارة في أي وقت.`
      : `You are very welcome! 🚗 Always happy to assist. Visit our showroom anytime for viewing and test drives!`;
  }

  // Agreement / OK
  if (/^(ok|okay|fine|cool|great|تمام|ماشي|اوك|اوكي|حسنا)\b/i.test(norm)) {
    return isArabic
      ? `تحت أمرك يا فندم! إذا كان لديك أي استفسار عن مواصفات سيارة محددة أو حساب قسط بنكي، نحن هنا دائماً. 🚗`
      : `At your service! Feel free to ask anytime about car specs, financing options, or showroom visits. 🚗`;
  }

  // Opening hours
  if (norm.includes('hour') || norm.includes('time') || norm.includes('open') || norm.includes('close') || norm.includes('مواعيد') || norm.includes('فاتحين') || norm.includes('تقفلوا') || norm.includes('ساعه') || norm.includes('ساعات العمل') || norm.includes('الوقت') || norm.includes('وقت') || norm.includes('شغالين')) {
    return isArabic
      ? `مواعيد عمل معارض الفارس موتورز مصر (Al-Fares Motors) بإدارة هاني مسعود: ⏰\n\n• السبت إلى الخميس: من 2:00 PM حتى 12:00 AM (من 2 ظهراً حتى 12 منتصف الليل).\n• يوم الجمعة: من 3:00 PM حتى 12:00 AM (من 3 عصراً حتى 12 منتصف الليل).\n\n📞 هاتف المبيعات وخدمة العملاء: 01501511117 / +201501511117\nتشرفنا في أي وقت للمعاينة وتجربة القيادة! 🚗`
      : `Al-Fares Motors Showroom Working Hours: ⏰\n\n• Saturday to Thursday: 2:00 PM – 12:00 AM\n• Friday: 3:00 PM – 12:00 AM\n\n📞 Phone: +201501511117\nLooking forward to welcoming you for viewing and test drives! 🚗`;
  }

  // Location / Address / Branches
  if (norm.includes('where') || norm.includes('location') || norm.includes('address') || norm.includes('branch') || norm.includes('مكان') || norm.includes('عنوان') || norm.includes('ازاي اجي') || norm.includes('فين') || norm.includes('فروع') || norm.includes('فرع')) {
    return isArabic
      ? `فروع ومواقع معارض الفارس موتورز مصر (إدارة هاني مسعود): 📍\n\n1️⃣ فرع التجمع الأول (القاهرة الجديدة):\nمول 5، المجاورة الخامسة، التجمع الأول – بجوار موقف الأتوبيس.\n\n2️⃣ فرع مدينة نصر (القاهرة):\n17 شارع المشروع، متفرع من مصطفى النحاس، مدينة نصر.\n\n📞 هاتف وواتساب المبيعات: 01501511117 / +201501511117\n🌐 خريطة الفروع على موقعنا: https://alfarismotors.ai/branches\nتشرفنا بالزيارة في أي وقت لمعاينة وفحص السيارات! 🚗`
      : `Al-Fares Motors Showrooms (Hany Massoud): 📍\n\n1. First Settlement Branch (New Cairo): Mall 5, 5th Neighborhood, next to the bus terminal.\n2. Nasr City Branch (Cairo): 17 El-Mashroua St., off Mostafa El-Nahas St.\n\n📞 Phone & WhatsApp: +201501511117\n🌐 Branch Locator: https://alfarismotors.ai/branches`;
  }

  // Founder, Facebook page & Socials
  if (norm.includes('هاني مسعود') || norm.includes('فيس') || norm.includes('فيسبوك') || norm.includes('facebook') || norm.includes('تيك توك') || norm.includes('tiktok') || norm.includes('مين صاحب') || norm.includes('المؤسس')) {
    return isArabic
      ? `معرض الفارس موتورز مصر تحت إدارة الأستاذ هاني مسعود (Hany Massoud): 🌟\n• الصفحة الرسمية للأستاذ هاني مسعود على فيسبوك: https://www.facebook.com/hany.massoud82/\n• الموقع الرسمي للمعرض: https://alfarismotors.ai\n• تيك توك: https://www.tiktok.com/@elfarismotors\n• يوتيوب: https://www.youtube.com/@alfarismotors\n• الخط الساخن وواتساب: 01501511117 / +201501511117\nتشرفنا في أي وقت!`
      : `Al-Fares Motors is founded and managed by Mr. Hany Massoud: 🌟\n• Official Facebook: https://www.facebook.com/hany.massoud82/\n• Official Website: https://alfarismotors.ai\n• TikTok: https://www.tiktok.com/@elfarismotors\n• Direct Hotline: +201501511117`;
  }

  // Non-automotive queries (Food / Drinks / Cafe / etc.)
  if (norm.includes('اكل') || norm.includes('طعام') || norm.includes('وجبات') || norm.includes('قهوه') || norm.includes('كافيه') || norm.includes('مطعم') || norm.includes('فلات وايت') || norm.includes('لاتيه') || norm.includes('كواسون') || norm.includes('food') || norm.includes('coffee')) {
    return isArabic
      ? `أهلاً بحضرتك في الفارس موتورز مصر (Al-Fares Motors)! 🚗 نحن معرض سيارات رائد متخصص في بيع وشراء وتقسيط واستبدال السيارات الزيرو والمستعملة الفابريكا (إدارة هاني مسعود).\nيسعدنا مساعدتك في اختيار سيارتك، حساب أقساط البنوك، أو حجز موعد لتجربة القيادة في فرعينا (التجمع الأول ومدينة نصر).`
      : `Welcome to Al-Fares Motors! 🚗 We are an automotive dealership specializing in new and certified pre-owned vehicles. How may we assist you with car specifications, financing plans, or test drive bookings?`;
  }

  // Installments / Financing / Loan calculation
  if (norm.includes('تقسيط') || norm.includes('قسط') || norm.includes('مقدم') || norm.includes('تمويل') || norm.includes('بنك') || norm.includes('installment') || norm.includes('finance') || norm.includes('loan')) {
    return isArabic
      ? `نوفر أنظمة تقسيط مرنة بالتعاون مع كبرى البنوك والشركات التمويلية: 💳\n• مقدم يبدأ من 20% للسيارات الزيرو و 25% للمستعمل الفابريكا.\n• فترات سداد مريحة حتى 7 سنوات.\n• برامج متنوعة: للموظفين، أصحاب السجلات التجارية، والمهن الحرة، وبرامج خاصة للأطباء والمهندسين بدون إثبات دخل معقد.\n• إمكانية التقسيط بدون تأمين إجباري واستبدال سيارتك القديمة وتقسيط الفارق!\nتحب تحسب قسط سيارة محددة من المعرض؟ 🚗`
      : `We offer flexible auto financing and installment programs with top Egyptian banks: 💳\n• Down payment starting from 20% on new cars and 25% on certified used cars.\n• Tenures up to 7 years.\n• Direct trade-in available!\nWould you like us to calculate the monthly payment for a specific vehicle?`;
  }

  // Trade-In / Car exchange
  if (norm.includes('استبدال') || norm.includes('تبديل') || norm.includes('ابدل') || norm.includes('trade in') || norm.includes('exchange')) {
    return isArabic
      ? `نعم متاح خدمة الاستبدال المباشر (Trade-In)! 🔄\nيتم فحص سيارتك وتثمينها بأعلى سعر سوقي عادل، واستخدام قيمتها كمقدم لأي سيارة تختارها بالمعرض مع تقسيط الفارق. تحب تشرفنا بالسيارة في فرع التجمع الأول أو مدينة نصر لفحصها وتحديد السعر؟`
      : `Yes, we offer direct trade-ins! 🔄 We appraise your current vehicle at fair market value and apply it as a down payment toward any new or used car from our showroom. Would you like to bring it in for evaluation?`;
  }

  // Test drive request
  if (norm.includes('تجرب') || norm.includes('test drive')) {
    return isArabic
      ? `يسعدنا جداً حجز تجربة قيادة لحضرتك! 🏎️ تجارب القيادة متاحة لجميع السيارات بالمعرض. أرسل لنا الموديل الذي ترغب في تجربته واليوم والوقت المناسب وسنجهز السيارة لحضرتك فوراً.`
      : `We would love to arrange a test drive for you! 🏎️ Please share the car model and your preferred date/time, and we will have it ready for you!`;
  }

  // General Car Catalog / Prices / What do you have? ("اسعار", "سعر", "عار", "الاسعار", "عربيات", "سيارات")
  if (norm.includes('اسعار') || norm.includes('سعر') || norm.includes('الاسعار') || norm.includes('قائمه الاسعار') || norm.includes('عار') || norm.includes('عندكم ايه') || norm.includes('انواع') || norm.includes('سيارات') || norm.includes('عربيات') || norm.includes('cars') || norm.includes('models') || norm.includes('list') || norm.includes('الكتالوج') || norm.includes('كتالوج') || norm.includes('المتاح') || norm.includes('المعروض')) {
    if (cars.length) {
      const list = cars.slice(0, 6).map(c => `• ${c.name}: ${c.price} (${c.category})`).join('\n');
      return isArabic
        ? `أهلاً بك في الفارس موتورز مصر! 🚗 لدينا تشكيلة تضم أكثر من 65 سيارة زيرو ومستعملة فابريكا بالكامل بأسعار معلنة وضمان معتمد. إليك عينة من أبرز السيارات المتاحة وأسعارها:\n\n${list}\n\n• إجمالي المعروض: أكثر من 65 سيارة تشمل مرسيدس، كيا، هيونداي، بي إم دابليو، رينج روفر، ميتسوبيشي، شيري، سكودا، جيتور، أوبل، بيجو، وغيرها.\n• جميع السيارات متوفرة كاش وبالتقسيط البنكي بمقدم يبدأ من 20%.\n🌐 تصفح كامل المعرض على موقعنا: https://alfarismotors.ai/cars\nتحب تستفسر عن سيارة معينة أو فئة سعرية محددة؟`
        : `Welcome to Al-Fares Motors! 🚗 We offer over 65 certified new & pre-owned vehicles:\n\n${list}\n\n🌐 View our entire live catalog: https://alfarismotors.ai/cars\nWhich vehicle or price range would you like to explore? 🚗`;
    }
  }

  // Specific Car Specs and Pricing Match
  for (const c of cars) {
    const cName = normalize(c.name);
    if (cName && (norm.includes(cName) || cName.split(' ').some(tok => tok.length > 3 && norm.includes(tok)))) {
      const desc = c.description ? `\n• المواصفات: ${c.description}` : '';
      return isArabic
        ? `سعر ${c.name} هو ${c.price || 'متاح عند الطلب'}.\n• الحالة: ${c.stock || 'متوفرة بالمعرض'} (${c.category || ''}).${desc}\n\nتحب تحجز موعد لتجربة قيادتها أو تستفسر عن نظام تقسيطها؟ 🚗`
        : `Our ${c.name} is quoted at ${c.price || 'available upon request'}.\n• Status: ${c.stock || 'In Stock'} (${c.category || ''}).${desc}\n\nWould you like to schedule a test drive or check out installment options? 🚗`;
    }
  }

  // Check Help Center articles before falling back
  const artMatch = matchHelpCenter(question, config.articles || []);
  if (artMatch && artMatch.score >= 0.55) {
    const art = artMatch.article;
    return isArabic
      ? `بخصوص استفسارك عن (${art.title}):\n${art.content}\n\nهل تحتاج إلى مساعدة إضافية في هذا الشأن؟ 🚗`
      : `Regarding (${art.title}):\n${art.content}\n\nLet us know if you need any further assistance! 🚗`;
  }

  return isArabic
    ? 'أهلاً بك! لم أتمكن من معرفة التفاصيل بدقة، تم تسجيل استفسارك وسيقوم أحد مستشاري المبيعات بالمعرض بالتواصل معك وتزويدك بكافة التفاصيل. 🚗'
    : fallback;
}

/* ==========================================================================
   AI COPILOT & AUTOMOTIVE DRAFTING ENGINE
   ========================================================================== */

export async function generateCopilotDraft({ customerName, lastMessage, history = [], articles = [], businessName = 'Al-Fares Motors' }) {
  const norm = normalize(lastMessage || '');
  const isArabic = /[\u0600-\u06FF]/.test(lastMessage || '');
  const cName = customerName && customerName !== 'Client' ? customerName : (isArabic ? 'يا فندم' : 'there');

  // Try Puter AI first
  const articleSnippets = (articles || []).slice(0, 4).map(a => `- ${a.title}: ${a.content}`).join('\n');
  const histText = (history || []).slice(-4).map(h => `${h.role || (h.incoming ? 'Client' : 'Agent')}: ${h.content || h.incoming || h.reply}`).join('\n');
  const prompt = `You are an expert automotive sales copilot for "${businessName}".
Customer Name: ${cName}
Recent conversation:
${histText}
Latest customer message: "${lastMessage}"

Available Knowledge:
${articleSnippets || 'New and certified pre-owned cars, flexible bank installments, test drives, trade-ins.'}

Draft a professional, courteous, and automotive-expert response to send to this client right now. Match language (${isArabic ? 'Egyptian Arabic' : 'English'}). Provide ONLY the suggested message text, with no preamble or explanations.`;

  const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
  if (puterReply) return puterReply;

  // Rule-based fallbacks for automotive copilot
  if (norm.includes('تقسيط') || norm.includes('قسط') || norm.includes('finance')) {
    return isArabic
      ? `أهلاً بك ${cName}! نوفر برامج تقسيط مرنة بالتعاون مع البنوك بمقدم يبدأ من 20% وفترات سداد حتى 7 سنوات. هل في سيارة معينة تحب نحسبلك قسطها الشهري بالضبط؟ 🚗`
      : `Hello ${cName}! We offer bank financing with down payments starting at 20% and tenures up to 7 years. Which vehicle would you like an installment calculation for? 🚗`;
  }

  if (norm.includes('تجرب') || norm.includes('test drive')) {
    return isArabic
      ? `أهلاً ${cName}! يسعدنا جداً ترتيب تجربة قيادة لحضرتك بالمعرض. في أي يوم وساعة يناسبك الحضور؟ 🏎️`
      : `Hi ${cName}! We would be thrilled to schedule a test drive for you. Which day and time works best for your showroom visit? 🏎️`;
  }

  return isArabic
    ? `أهلاً بحضرتك ${cName}، معاك مستشار المبيعات من ${businessName}. يسعدنا جداً مساعدتك في اختيار سيارتك الأنسب! ممكن توضحلنا الموديل أو الميزانية المناسبة لحضرتك؟ 🚗`
    : `Hello ${cName}! This is ${businessName} sales advisory. We are happy to assist you in finding your ideal car! Could you share which model or budget you have in mind? 🚗`;
}

export async function improveCopilotDraft(draftText, tone = 'polite') {
  const clean = String(draftText || '').trim();
  if (!clean) return draftText;

  const prompt = `Rewrite the following automotive customer service message in a "${tone}" tone (${tone === 'polite' ? 'courteous, appreciative, professional' : tone === 'warm' ? 'friendly, welcoming, enthusiastic' : tone === 'concise' ? 'direct, brief, to the point' : 'thorough, step-by-step resolution'}). Keep the original language and automotive context intact. Provide ONLY the rewritten text:\n\n${clean}`;
  const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
  if (puterReply) return puterReply;

  return draftText;
}

export async function translateContent(text, targetLang = 'en') {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const prompt = `Translate the following automotive dealership text accurately into target language code "${targetLang}". Output ONLY the translated text without commentary or quotes:\n\n${raw}`;
  const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
  if (puterReply) return puterReply;

  return `[Translated to ${targetLang.toUpperCase()}]: ${raw}`;
}


export async function analyzeSentiment(text, history = []) {
  const norm = normalize(text);
  const raw = String(text || '').trim();

  const prompt = `Analyze the emotional state of the following text and recent history.
Text: "${raw}"
Return ONLY a valid JSON object with: { "sentiment": "frustrated"|"urgent"|"excited"|"neutral"|"negative", "score": number between 0 and 1, "shouldEscalate": boolean, "reason": "string explaining why" }`;
  
  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) {
      const match = puterReply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.sentiment) return parsed;
      }
    }
  } catch (e) {}

  const frustratedKeywords = ['مشكله', 'مشكلة', 'شكوى', 'زفت', 'سيء', 'تأخير', 'غلط', 'فلوس', 'نصب', 'مزعج', 'تعبت', 'ماشيش', 'angry', 'bad', 'terrible', 'scam', 'frustrated', 'problem', 'issue', 'delayed', 'wrong'];
  const urgentKeywords = ['ضروري', 'طوارئ', 'بسرعة', 'حالاً', 'عاجل', 'urgent', 'asap', 'immediately', 'now', 'right now'];
  const excitedKeywords = ['اشتري', 'عايز', 'ابغى', 'interested', 'buy', 'purchase', 'want', 'love', 'perfect', 'great', 'amazing', 'ممتاز', 'محتاج'];

  const isFrustrated = frustratedKeywords.some(k => norm.includes(normalize(k)));
  const isUrgent = urgentKeywords.some(k => norm.includes(normalize(k)));
  const isExcited = excitedKeywords.some(k => norm.includes(normalize(k)));

  let sentiment = 'neutral';
  let score = 0.5;
  let reason = 'Normal inquiry';

  if (isFrustrated) { sentiment = 'frustrated'; score = 0.8; reason = 'Detected frustrated keywords'; }
  else if (isUrgent) { sentiment = 'urgent'; score = 0.7; reason = 'Detected urgent keywords'; }
  else if (isExcited) { sentiment = 'excited'; score = 0.8; reason = 'Detected interested/excited keywords'; }
  
  return {
    sentiment,
    score,
    shouldEscalate: sentiment === 'frustrated' || score >= 0.7,
    reason
  };
}

export async function scoreLeadQuality(messages = [], customerData = {}) {
  const prompt = `Analyze these messages and customer data and score the lead quality 0-100 based on purchase intent signals.
Messages: ${JSON.stringify(messages)}
Data: ${JSON.stringify(customerData)}
Return ONLY a valid JSON object with: { "score": number 0-100, "tier": "hot"|"warm"|"cold", "signals": ["string"], "summary": "string" }`;

  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) {
      const match = puterReply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.score === 'number') return parsed;
      }
    }
  } catch (e) {}

  let score = 0;
  let signals = [];
  const joinedText = messages.map(m => m.content || '').join(' ').toLowerCase();
  
  if (/(عايز اشتري|بكام|موديل|سعر|price|model|mercedes|bmw|toyota)/i.test(joinedText)) { score += 20; signals.push('Asked about specific car model'); }
  if (/(تقسيط|قسط|تمويل|finance|installment)/i.test(joinedText)) { score += 15; signals.push('Asked about installment/financing'); }
  if (/(تجربة|test drive|تجربة قيادة)/i.test(joinedText)) { score += 15; signals.push('Requested test drive'); }
  if (/(تبديل|استبدال|trade|trade-in)/i.test(joinedText)) { score += 10; signals.push('Asked about trade-in'); }
  if (/(سعر|بكام|price)/i.test(joinedText)) { score += 10; signals.push('Asked about price'); }
  if (/(متاح|متوفر|موجود|available|stock)/i.test(joinedText)) { score += 10; signals.push('Asked about availability/stock'); }
  if (messages.length >= 3) { score += 5; signals.push('Sent 3+ messages'); }
  if (/(توصيل|شحن|استلام|delivery)/i.test(joinedText)) { score += 5; signals.push('Asked about delivery'); }
  if (/(ميزانية|budget|فلوس)/i.test(joinedText)) { score += 10; signals.push('Mentioned budget'); }
  if (/^(السلام عليكم|اهلا|hello|hi|مرحبا|ازيك)$/i.test(joinedText.trim())) { score -= 10; signals.push('Just casual chat'); }

  score = Math.max(0, Math.min(100, score));
  let tier = 'cold';
  if (score >= 60) tier = 'hot';
  else if (score >= 30) tier = 'warm';

  return {
    score,
    tier,
    signals,
    summary: `Rule-based scoring returned ${score} (${tier} tier)`
  };
}

export async function summarizeConversation(messages = [], clientName = '', businessName = 'Al-Fares Motors') {
  const prompt = `Generate a professional CRM deal summary for a conversation with client "${clientName}" at "${businessName}".
Detect: cars discussed, budget mentioned, financing interest, test drive requested, sentiment, and recommended action.
Messages: ${JSON.stringify(messages)}
Provide the summary in English (you can include Arabic terms if needed), highlighting the key points above.`;

  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) return puterReply;
  } catch (e) {}

  const topics = [];
  const joinedText = messages.map(m => m.content || '').join(' ').toLowerCase();
  if (/(تقسيط|finance)/i.test(joinedText)) topics.push('Financing');
  if (/(تجربة|test drive)/i.test(joinedText)) topics.push('Test Drive');
  if (/(مرسيدس|mercedes|bmw|تويوتا|toyota)/i.test(joinedText)) topics.push('Specific Cars');
  
  return `Client ${clientName} interacted with ${businessName}. Key topics detected: ${topics.join(', ') || 'General inquiry'}. Recommended to follow up.`;
}

export async function generateDynamicPromotion(leadScore = {}, customerHistory = [], inventory = [], lang = 'ar') {
  const isArabic = (lang || 'ar').toLowerCase().includes('ar');
  const tier = leadScore.tier || 'cold';
  
  const prompt = `Generate a personalized promotional offer message for a car dealership customer.
Lead Tier: ${tier}
Lead Signals: ${JSON.stringify(leadScore.signals || [])}
Inventory: ${JSON.stringify((inventory || []).slice(0, 3))}
Language: ${isArabic ? 'Egyptian Arabic' : 'English'}
If tier is hot: offer exclusive discount, priority test drive, free inspection.
If tier is warm: flexible installment highlight, offer callback from advisor.
If tier is cold: general inventory teaser, showroom visit invite.
Output ONLY the message text.`;

  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) return puterReply;
  } catch (e) {}

  if (tier === 'hot') {
    return isArabic 
      ? 'بما إنك مهتم جداً، بنقدملك خصم حصري وتجربة قيادة بأولوية وفحص مجاني! كلمنا دلوقتي.'
      : 'Since you are highly interested, we offer you an exclusive discount, priority test drive, and free inspection! Contact us now.';
  } else if (tier === 'warm') {
    return isArabic
      ? 'اكتشف خطط التقسيط المرنة بتاعتنا! مستشار المبيعات بتاعنا ممكن يكلمك يشرحلك كل التفاصيل.'
      : 'Discover our flexible installment plans! Our sales advisor can call you to explain all the details.';
  } else {
    return isArabic
      ? 'تعالى زورنا في المعرض وشوف تشكيلة العربيات الجديدة والمستعملة اللي عندنا!'
      : 'Visit our showroom to explore our wide inventory of new and used cars!';
  }
}

export async function matchCarByImage(description = '', inventory = []) {
  const prompt = `Match the following car description/visual description to the best car from the inventory.
Description: "${description}"
Inventory: ${JSON.stringify(inventory)}
Return ONLY a valid JSON object with the matched car object, or null if no good match.`;

  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) {
      const match = puterReply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
    }
  } catch (e) {}

  const normDesc = normalize(description);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const car of (inventory || [])) {
    const carText = normalize((car.name || '') + ' ' + (car.description || ''));
    const score = similarity(normDesc, carText);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = car;
    }
  }
  
  return bestScore > 0.2 ? bestMatch : null;
}

export async function detectFaqGap(question = '', existingFaqs = []) {
  const normQ = normalize(question);
  let isGap = true;
  
  for (const faq of (existingFaqs || [])) {
    const faqText = normalize((faq.question || '') + ' ' + (faq.title || ''));
    if (similarity(normQ, faqText) >= 0.4) {
      isGap = false;
      break;
    }
  }
  
  if (!isGap) {
    return { isGap: false, gapCategory: 'none', suggestedQuestion: '', suggestedAnswer: '' };
  }
  
  const prompt = `A user asked a question that is not covered by existing FAQs.
Question: "${question}"
Generate a suggested FAQ entry for this question.
Categories: 'pricing', 'financing', 'inventory', 'warranty', 'location', 'test-drive', 'trade-in', 'other'.
Return ONLY a valid JSON object with: { "gapCategory": "string", "suggestedQuestion": "string", "suggestedAnswer": "string" }`;

  try {
    const puterReply = await callPuterAI([{ role: 'user', content: prompt }]);
    if (puterReply) {
      const match = puterReply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { isGap: true, gapCategory: parsed.gapCategory || 'other', suggestedQuestion: parsed.suggestedQuestion || question, suggestedAnswer: parsed.suggestedAnswer || '' };
      }
    }
  } catch (e) {}

  return { isGap: true, gapCategory: 'other', suggestedQuestion: question, suggestedAnswer: 'يرجى التواصل مع خدمة العملاء للمزيد من التفاصيل.' };
}
