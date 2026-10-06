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

  L.push('');
  L.push('## VEHICLE INVENTORY & PRICES (CARS DATABASE)');
  if (cars.length) {
    cars.forEach(c => {
      const specText = c.specs ? ` [Year: ${c.specs.year || ''}, Mileage: ${c.specs.mileage || ''}, Engine: ${c.specs.engine || ''}, Condition: ${c.specs.condition || ''}]` : '';
      L.push(`- ${c.name}: ${c.price || 'Call for price'} | Condition/Category: ${c.category || 'Automotive'} | Status: ${c.stock || 'In Stock'}.${specText} ${c.description || ''}`);
    });
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

  // 1. Human Sales Advisor Request Intent
  const humanTriggers = [
    'human', 'agent', 'support', 'person', 'representative', 'operator', 'talk to someone',
    'sales', 'salesman', 'مسؤول مبيعات', 'مستشار مبيعات', 'خدمه عملاء', 'خدمة عملاء', 'عايز اكلم حد',
    'عاوز اكلم حد', 'كلمني حد', 'بني ادم', 'شخص', 'حولني لحد', 'موظف', 'مساعده بشريه',
    'الدعم', 'شكوى', 'مشكله', 'مشكلة', 'مدير المعرض'
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
      }
    };
  }

  // 2. Dealership Location Pin Request Intent
  const locationTriggers = [
    'اللوكيشن', 'لوكيشن', 'ابعثلي اللوكيشن', 'ابعتلي اللوكيشن', 'موقع المعرض', 'عنوان المعرض', 'مكان المعرض',
    'gps', 'send location', 'location pin', 'share location', 'feen el ma3rad', 'feen el mkan', 'where is showroom',
    'where are you located'
  ].map(normalize);
  if (locationTriggers.some(t => norm.includes(t))) {
    const b = config.business || {};
    return {
      type: 'SEND_LOCATION',
      lat: b.latitude || 30.0131,
      lng: b.longitude || 31.4289,
      name: b.name || 'Al-Fares Motors Showroom',
      address: b.location || 'New Cairo Showroom',
      reply: `تفضل لوكيشن معرض الفارس للسيارات على خرائط جوجل 📍\nيسعدنا تشريفك لمعاينة السيارات وتجربة القيادة:\n${b.mapsUrl || b.location}`
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
  if (norm.includes('hour') || norm.includes('open') || norm.includes('close') || norm.includes('مواعيد') || norm.includes('فاتحين') || norm.includes('تقفلوا') || norm.includes('ساعه')) {
    if (b.hours) {
      return isArabic
        ? `مواعيد عمل ${b.name || 'المعرض'}:\n${b.hours}\nتشرفنا بالزيارة في أي وقت! هل تحب نحجز لحضرتك موعد معاينة وتجربة قيادة مسبقاً؟ 🚗`
        : `Our showroom opening hours are:\n${b.hours}\nLet us know if you would like to book a test drive appointment! 🚗`;
    }
  }

  // Location / Address
  if (norm.includes('where') || norm.includes('location') || norm.includes('address') || norm.includes('مكان') || norm.includes('عنوان') || norm.includes('ازاي اجي')) {
    let reply = isArabic
      ? `موقع معرضنا في: ${b.location || 'التجمع الخامس / سوق السيارات'}.`
      : `Our showroom is located at: ${b.location || 'New Cairo Showroom'}.`;
    if (b.mapsUrl) {
      reply += isArabic
        ? `\n📍 رابط الموقع على خرائط جوجل: ${b.mapsUrl}`
        : `\n📍 Google Maps link: ${b.mapsUrl}`;
    }
    return reply;
  }

  // Installments / Financing / Loan calculation
  if (norm.includes('تقسيط') || norm.includes('قسط') || norm.includes('مقدم') || norm.includes('تمويل') || norm.includes('بنك') || norm.includes('installment') || norm.includes('finance') || norm.includes('loan')) {
    return isArabic
      ? `نوفر أنظمة تقسيط مرنة بالتعاون مع جميع البنوك: 💳\n• مقدم يبدأ من 20% للسيارات الزيرو و 25% للمستعمل.\n• فترات سداد مريحة حتى 7 سنوات.\n• إمكانية التقسيط بدون تأمين إجباري أو بدون إثبات دخل لبعض الفئات.\n• متاح استبدال سيارتك القديمة وتقسيط الفارق!\nتحب تحسب قسط سيارة محددة من المعرض؟`
      : `We offer flexible auto loans and installment programs with top banks: 💳\n• Down payment starting from 20% on new cars and 25% on certified used cars.\n• Flexible tenures up to 7 years.\n• Direct trade-in available!\nWould you like us to calculate the monthly payment for a specific model?`;
  }

  // Trade-In / Car exchange
  if (norm.includes('استبدال') || norm.includes('تبديل') || norm.includes('ابدل') || norm.includes('trade in') || norm.includes('exchange')) {
    return isArabic
      ? `نعم متاح خدمة الاستبدال المباشر (Trade-In)! 🔄\nيتم فحص سيارتك وتثمينها بأعلى سعر سوقي عادل، واستخدام قيمتها كمقدم لأي سيارة تختارها بالمعرض مع تقسيط الفارق. تحب تشرفنا بالسيارة لفحصها وتحديد السعر؟`
      : `Yes, we offer direct trade-ins! 🔄 We appraise your current vehicle at fair market value and apply it as a down payment toward any new or used car from our showroom. Would you like to bring it in for evaluation?`;
  }

  // Test drive request
  if (norm.includes('تجرب') || norm.includes('test drive')) {
    return isArabic
      ? `يسعدنا جداً حجز تجربة قيادة لحضرتك! 🏎️ تجارب القيادة متاحة لجميع السيارات بالمعرض. أرسل لنا الموديل الذي ترغب في تجربته واليوم والوقت المناسب وسنجهز السيارة لحضرتك فوراً.`
      : `We would love to arrange a test drive for you! 🏎️ Please share the car model and your preferred date/time, and we will have it ready for you!`;
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

  // General Car Catalog / What do you have?
  if (norm.includes('عندكم ايه') || norm.includes('انواع') || norm.includes('سيارات') || norm.includes('عربيات') || norm.includes('cars') || norm.includes('models') || norm.includes('list')) {
    if (cars.length) {
      const list = cars.slice(0, 5).map(c => `• ${c.name}: ${c.price} (${c.category})`).join('\n');
      return isArabic
        ? `أبرز السيارات المتوفرة لدينا بالمعرض حالياً:\n${list}\n\nتحب تستفسر عن تفاصيل ومواصفات أي سيارة منهم؟ 🚗`
        : `Here are our top featured vehicles currently in our showroom:\n${list}\n\nWhich one would you like to explore specs or test drive? 🚗`;
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
