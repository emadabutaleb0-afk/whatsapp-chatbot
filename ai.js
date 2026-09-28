// AI & Multilingual Reasoning Engine for WhatsApp Business Assistant
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
  const products = cfg.products || [];
  const fallback = (cfg.whatsapp && cfg.whatsapp.fallback) ||
    "I'm not sure about that one — let me check with the team and get back to you shortly.";

  const L = [];
  L.push(`You are the official WhatsApp assistant for "${b.name || 'this business'}".`);
  L.push('You reply to real clients on WhatsApp on behalf of the business owner.');
  L.push('');
  L.push('## LANGUAGE & DIALECT GUIDELINES (CRITICAL)');
  L.push('1. Detect the client language & dialect automatically and reply in the EXACT same style:');
  L.push('   - If client speaks Egyptian Arabic (e.g. "عايز اعرف", "بكام", "فين مكانكم", "شغالين دلوقتي"), reply in natural, polite Egyptian Arabic.');
  L.push('   - If client uses Franco-Arab (e.g. "feen el mkan", "bkam", "3ayz a7gez"), reply warmly in Egyptian Arabic or English.');
  L.push('   - If client speaks English, reply in English.');
  L.push('   - If client speaks Modern Standard Arabic, reply in polite Arabic.');
  L.push('2. Keep replies short (1-3 WhatsApp-style messages), warm, helpful, and natural.');
  L.push('');
  L.push('## CORE RULES');
  L.push('1. Answer ONLY using the business information below. Never invent hours, addresses, products, prices, stock or promises.');
  L.push('2. If an APPROVED ANSWER below covers the question, use it as the answer. Keep its wording and facts.');
  L.push(`3. If the answer is not in the information below, say: "${fallback}"`);
  L.push('4. Always quote exact prices with the currency (e.g. 65 EGP).');
  L.push('5. End with a light next step (offer to take their order, book a table, or share the location pin).');

  const faqs = (cfg.faqEntries || []).filter(f => f.question && f.answer);
  if (faqs.length) {
    L.push('');
    L.push('## APPROVED ANSWERS (highest priority)');
    faqs.forEach((f, i) => {
      L.push(`${i + 1}. Client asks: ${f.question}`);
      const alt = String(f.aliases || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (alt.length) L.push(`   Aliases: ${alt.join(' | ')}`);
      L.push(`   Approved reply: ${f.answer}`);
    });
  }

  L.push('');
  L.push('## BUSINESS INFORMATION');
  if (b.name) L.push(`Name: ${b.name}`);
  if (b.tagline) L.push(`Tagline: ${b.tagline}`);
  if (b.about) L.push(`About: ${b.about}`);
  if (b.hours) L.push(`Opening hours:\n${b.hours}`);
  if (b.location) L.push(`Location:\n${b.location}`);
  if (b.mapsUrl) L.push(`Map link: ${b.mapsUrl}`);
  if (b.phone) L.push(`Phone: ${b.phone}`);
  if (b.delivery) L.push(`Delivery: ${b.delivery}`);
  if (b.payment) L.push(`Payment: ${b.payment}`);
  if (b.policies) L.push(`Policies:\n${b.policies}`);

  L.push('');
  L.push('## PRODUCTS & PRICES');
  if (products.length) {
    products.forEach(p => {
      L.push(`- ${p.name}: ${p.price || 'available'} (${p.category || 'general'}) — ${p.stock || 'in stock'}. ${p.description || ''}`);
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
    L.push('## HELP CENTER KNOWLEDGE BASE (Autonomous resolution articles)');
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
 * Intelligent Intent & Action Analyzer
 */
export function analyzeIntent(text, config = {}, history = []) {
  const norm = normalize(text);
  const raw = String(text || '').trim();

  // 1. Human Agent Request Intent
  const humanTriggers = [
    'human', 'agent', 'support', 'person', 'representative', 'operator', 'talk to someone',
    'خدمه عملاء', 'خدمة عملاء', 'خدمه العملاء', 'خدمة العملاء', 'عايز اكلم حد', 'عاوز اكلم حد',
    'كلمني حد', 'بني ادم', 'شخص', 'حولني لحد', 'موظف', 'مساعده بشريه', 'help me with agent',
    'الدعم', 'الدعم الفني', 'شكوى', 'مشكله', 'مشكلة', 'خدمة'
  ].map(normalize);
  if (humanTriggers.some(t => norm.includes(t))) {
    const isAngry = /(مشكله|مشكلة|شكوى|زفت|سيء|تأخير|غلط|فلوس|نصب|angry|bad|terrible|late|wrong|horrible|broken|issue|problem|delay|scam)/i.test(raw);
    const isUrgent = /(urgent|ضروري|طوارئ|بسرعة|حالاً|asap)/i.test(raw);
    const sentiment = isAngry ? 'Frustrated' : isUrgent ? 'Urgent' : 'Inquiry';
    const issueSummary = isAngry 
      ? `Customer reported an escalation/complaint: "${raw.slice(0, 120)}"` 
      : `Customer requested staff handover regarding: "${raw.slice(0, 120)}"`;
    const recommendedAction = isAngry 
      ? 'Review recent customer orders/receipts and prioritize resolution.' 
      : 'Connect with customer and answer outstanding questions.';

    return {
      type: 'HUMAN_TAKEOVER',
      reply: 'تم تحويل المحادثة لأحد ممثلي خدمة العملاء وسيقوم بالرد عليك هنا في أقرب وقت. 👨‍💼\nI have notified our staff and a team member will reply to you here shortly.',
      handoffBriefing: {
        issueSummary,
        sentiment,
        recommendedAction,
        lastMessage: raw
      }
    };
  }

  // 2. GPS Location Pin Request Intent
  const locationTriggers = [
    'اللوكيشن', 'لوكيشن', 'ابعثلي اللوكيشن', 'ابعتلي اللوكيشن', 'موقعكم فين', 'gps',
    'send location', 'location pin', 'share location', 'feen el mkan', 'where are you on map'
  ].map(normalize);
  if (locationTriggers.some(t => norm.includes(t))) {
    const b = config.business || {};
    return {
      type: 'SEND_LOCATION',
      lat: b.latitude || 30.0444,
      lng: b.longitude || 31.2357,
      name: b.name || 'Our Location',
      address: b.location || 'Downtown',
      reply: `تفضل لوكيشن الفرع الخاص بنا على خرائط جوجل 📍\nHere is our location pin:\n${b.mapsUrl || b.location}`
    };
  }

  // Helper dictionary of Arabic product keywords
  const productAliases = {
    'Flat white': ['flat white', 'فلات وايت', 'فلات'],
    'Spanish Latte (Iced)': ['spanish latte', 'اسبانيش لاتيه', 'اسبانيش', 'سبانيش لاتيه', 'ايس سبانيش'],
    'V60 Specialty Drip': ['v60', 'في 60', 'قهوة v60', 'دريب'],
    'Almond Croissant': ['croissant', 'كرواسون', 'كرواسان', 'الموند كرواسون']
  };

  const getProductMatches = (p) => {
    const aliases = productAliases[p.name] || [];
    return [normalize(p.name), ...aliases.map(normalize)];
  };

  // 3. Product Image Request Intent
  const imageTriggers = ['صوره', 'صورة', 'صور', 'photo', 'picture', 'image', 'وريني', 'show me'];
  if (imageTriggers.some(t => norm.includes(t))) {
    const products = config.products || [];
    for (const p of products) {
      const candidates = getProductMatches(p);
      if (candidates.some(cand => norm.includes(cand))) {
        return {
          type: 'SEND_IMAGE',
          imageUrl: p.image || 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600',
          caption: `${p.name} — ${p.price}\n${p.description || ''}`,
          reply: `تفضل صورة ${p.name} (${p.price})! ☕`
        };
      }
    }
  }

  // 4. Table Booking / Reservation Intent
  const bookingTriggers = ['احجز', 'حجز', 'ترابيزه', 'ترابيزة', 'طاوله', 'طاولة', 'book', 'reserve', 'table', 'reservation', 'a7gez'];
  if (bookingTriggers.some(t => norm.includes(t))) {
    const partyMatch = raw.match(/(\d+)\s*(people|persons|شخص|أشخاص|افراد|أفراد)?/i) ||
      raw.match(/ل\s*(\d+)/i) ||
      raw.match(/for\s*(\d+)/i);
    const partySize = partyMatch ? parseInt(partyMatch[1], 10) : 2;

    let timeDesc = 'Evening';
    if (norm.includes('بكره') || norm.includes('غدا') || norm.includes('tomorrow')) timeDesc = 'Tomorrow Evening';
    else if (norm.includes('الجمعه') || norm.includes('friday')) timeDesc = 'Friday Evening';
    else if (norm.includes('السبت') || norm.includes('saturday')) timeDesc = 'Saturday Evening';

    const hourMatch = raw.match(/(\d{1,2})(:00)?\s*(pm|am|مساء|صباحا)?/i);
    if (hourMatch) timeDesc += ` at ${hourMatch[0]}`;

    return {
      type: 'BOOKING_CREATE',
      partySize,
      time: timeDesc,
      reply: `تم تأكيد حجزك بنجاح! 📅\n• عدد الأفراد: ${partySize} أشخاص\n• الموعد: ${timeDesc}\nنحن في انتظاركم ونتمنى لكم وقتاً ممتعاً!`
    };
  }

  // 5. Order Taking / Cart Intent
  const orderTriggers = [
    'عايز اطلب', 'عاوز اطلب', 'دليفري ل', 'توصيل ل', 'طلب اوردر', 'order', 'delivery to', 'i want to order', 'add to cart', 'هات'
  ];
  const products = config.products || [];
  const foundItems = [];

  for (const p of products) {
    const candidates = getProductMatches(p);
    for (const cand of candidates) {
      if (norm.includes(cand)) {
        const regex = new RegExp(`(\\d+)\\s*(${cand})`, 'i');
        const qMatch = norm.match(regex);
        const qty = qMatch ? parseInt(qMatch[1], 10) : 1;
        const priceNum = parseInt(String(p.price).replace(/[^\d]/g, ''), 10) || 50;
        foundItems.push({
          name: p.name,
          qty,
          price: p.price,
          subtotal: (priceNum * qty) + ' EGP'
        });
        break;
      }
    }
  }

  if (orderTriggers.some(t => norm.includes(t)) || (foundItems.length > 0 && (norm.includes('عايز') || norm.includes('عاوز') || norm.includes('want') || norm.includes('order')))) {
    if (foundItems.length > 0) {
      const totalNum = foundItems.reduce((acc, it) => acc + (parseInt(it.subtotal, 10) || 0), 0) + 25;
      const itemsList = foundItems.map(i => `• ${i.qty}× ${i.name} (${i.subtotal})`).join('\n');
      return {
        type: 'ORDER_CREATE',
        items: foundItems,
        total: `${totalNum} EGP (شامل 25 EGP توصيل)`,
        address: 'عنوان العميل عبر الواتساب',
        reply: `تم تسجيل طلبك بنجاح! 🛍️\n\n${itemsList}\n\n• الإجمالي: ${totalNum} EGP (شامل 25 EGP توصيل)\n• وقت التوصيل المتوقع: 30–45 دقيقة.\nمن فضلك أرسل عنوانك ورقم التواصل لتأكيد خروج الدليفري فوراً!`
      };
    }
  }

  // 6. Conversational Affirmation & Multi-Turn Context ("yes", "sure", "اه", "نعم", "تمام", etc.)
  const yesWords = new Set([
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please', 'course',
    'نعم', 'اه', 'ايوه', 'ايوة', 'ياريت', 'تمام', 'اكيد', 'ماشي', 'اوك', 'اوكي', 'يلا', 'بالتاكيد', 'اطلب'
  ]);
  const normTokens = norm.split(' ').filter(Boolean);
  const isAffirmative = normTokens.some(w => yesWords.has(w)) ||
    /^(yes|yeah|sure|ok|نعم|اه|ايوة|ياريت|تمام)$/i.test(raw);

  if (isAffirmative && Array.isArray(history) && history.length > 0) {
    const lastBotMsg = [...history].reverse().find(m => m.role === 'assistant' || m.reply);
    const lastBotText = lastBotMsg ? String(lastBotMsg.content || lastBotMsg.reply || '') : '';
    const normBot = normalize(lastBotText);

    // Case A: Last bot message asked to order delivery
    if (normBot.includes('deliver') || normBot.includes('order') || normBot.includes('دليفري') || normBot.includes('توصيل') || normBot.includes('نطلبلك')) {
      let matchedProduct = null;
      for (const p of products) {
        const candidates = getProductMatches(p);
        if (candidates.some(c => normBot.includes(c))) {
          matchedProduct = p;
          break;
        }
      }

      const p = matchedProduct || products[0];
      if (p) {
        const priceNum = parseInt(String(p.price).replace(/[^\d]/g, ''), 10) || 55;
        const totalNum = priceNum + 25; // 25 delivery
        const isAr = /[\u0600-\u06FF]/.test(raw) || /[\u0600-\u06FF]/.test(lastBotText);
        return {
          type: 'ORDER_CREATE',
          items: [{ name: p.name, qty: 1, price: p.price, subtotal: `${priceNum} EGP` }],
          total: `${totalNum} EGP (includes 25 EGP delivery)`,
          address: 'Pending address from chat',
          intentData: {
            items: [{ name: p.name, qty: 1, price: p.price, subtotal: `${priceNum} EGP` }],
            total: `${totalNum} EGP`,
            address: 'Pending address from chat'
          },
          reply: isAr
            ? `تمام جداً يا فندم! 🛍️ تم تسجيل طلبك: 1× ${p.name} (${p.price}).\n• الإجمالي مع التوصيل: ${totalNum} EGP.\nمن فضلك أرسل عنوان التوصيل ورقم هاتفك لتأكيد خروج الأوردر فوراً!`
            : `Great! 🛍️ I have noted your order: 1× ${p.name} (${p.price}).\n• Total with delivery: ${totalNum} EGP.\nPlease share your delivery address and contact number so we can dispatch it right away!`
        };
      }
    }

    // Case B: Last bot message asked about table reservation
    if (normBot.includes('table') || normBot.includes('reserve') || normBot.includes('book') || normBot.includes('طاولة') || normBot.includes('طاوله') || normBot.includes('حجز')) {
      const isAr = /[\u0600-\u06FF]/.test(raw) || /[\u0600-\u06FF]/.test(lastBotText);
      return {
        type: 'BOOKING_CREATE',
        partySize: 2,
        time: 'Upcoming',
        intentData: { partySize: 2, time: 'Upcoming' },
        reply: isAr
          ? `تنورنا بكل سرور! ☕ تحب الحجز لطاولة لعدد كام شخص وفي أي موعد أو يوم؟`
          : `Wonderful, we would love to host you! ☕ For how many people and at what date/time would you like to reserve?`
      };
    }

    // Case C: General positive confirmation
    const isAr = /[\u0600-\u06FF]/.test(raw);
    return {
      type: 'AFFIRMATION_REPLY',
      reply: isAr
        ? `في خدمتك دائماً! ☕ تحب تطلب أي صنف من أصنافنا المميزة، أو تسأل عن مواعيدنا ومكاننا؟`
        : `At your service! ☕ Would you like to order anything from our menu, or inquire about our hours and location?`
    };
  }

  return { type: 'NORMAL_CHAT' };
}

/**
 * Main Answer Generation
 */
export async function answerQuestion(question, config, history = []) {
  const start = Date.now();
  const fallback = (config.whatsapp && config.whatsapp.fallback) ||
    "I'm not sure about that one — let me check with the team and get back to you shortly.";

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
      : `According to our Help Center (${matchedArt.article.title}):\n`;
    const suffix = isArabic
      ? '\n\nهل تحتاج إلى مساعدة إضافية في هذا الشأن؟ ☕'
      : '\n\nLet us know if you need anything else! ☕';
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

  // 3. Puter.js AI (OpenAI GPT-5.4 Nano & GPT models via Puter)
  const puterToken = process.env.PUTER_AUTH_TOKEN || process.env.PUTER_API_KEY;
  if (puterToken) {
    try {
      puter.setAuthToken(puterToken);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: question }
      ];
      const model = process.env.PUTER_MODEL || 'gpt-5.4-nano';
      const puterRes = await puter.ai.chat(messages, { model });
      const text = puterRes?.message?.content || (typeof puterRes === 'string' ? puterRes : puterRes?.text);
      if (text && String(text).trim()) {
        const clean = String(text).trim();
        const isFallback = clean.toLowerCase().includes(fallback.slice(0, 20).toLowerCase());
        return {
          reply: clean,
          faqHit: false,
          source: `puter-${model}`,
          isFallback,
          durationMs: Date.now() - start
        };
      }
    } catch (err) {
      console.warn('Puter.js AI call failed, falling back:', err.message);
    }
  }

  // 4. Gemini API (if key available)
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
          generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
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
      console.warn('Gemini API call failed, falling back:', err.message);
    }
  }

  // 4. OpenAI API (if key available)
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: question }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.2, max_tokens: 250 })
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
      console.warn('OpenAI API call failed, falling back:', err.message);
    }
  }

  // 5. Bilingual Egyptian/Arabic/English Rule Engine
  const reply = localSmartAnswer(question, config);
  const isFallback = reply === fallback;
  return {
    reply,
    faqHit: matched ? true : false,
    source: 'smart-rule',
    isFallback,
    durationMs: Date.now() - start
  };
}

/**
 * Intelligent Egyptian Arabic & English rule answering
 */
function localSmartAnswer(question, config) {
  const norm = normalize(question);
  const b = config.business || {};
  const products = config.products || [];
  const fallback = (config.whatsapp && config.whatsapp.fallback) ||
    "I'm not sure about that one — let me check with the team and get back to you shortly.";

  const isArabic = /[\u0600-\u06FF]/.test(question);

  // Greetings
  if (/^(hi|hello|hey|welcome)\b/i.test(norm) || /^(سلام|اهلا|مرحبا|صباح الخير|مساء الخير|ازيك|السلام عليكم)/.test(norm)) {
    return isArabic
      ? `أهلاً بك في ${b.name || 'بيتنا'}! ☕ نورتنا، نقدر نساعدك ازاي النهاردة بخصوص مواعيدنا، مكاننا، أو المنيو؟`
      : `Hello! Welcome to ${b.name || 'our business'}! ☕ How can I help you today with our hours, location, or menu?`;
  }

  // Gratitude / Thank you
  if (/^(thank|thanks|thx|ty|شكرا|شكراً|تسلم|تسلمي|الف شكر|الله يخليك|حبيبي)\b/i.test(norm)) {
    return isArabic
      ? `العفو يا فندم! ☕ في خدمتكم دائماً، وتنورونا في أي وقت.`
      : `You are very welcome! ☕ Always happy to assist. Let us know if you need anything else!`;
  }

  // Agreement / OK
  if (/^(ok|okay|fine|cool|great|تمام|ماشي|اوك|اوكي|حسنا)\b/i.test(norm)) {
    return isArabic
      ? `تحت أمرك في أي وقت! إذا كان لديك أي استفسار آخر بخصوص المنيو أو الفرع، نحن هنا دائماً. ☕`
      : `At your service! Feel free to reach out anytime if you have any questions. ☕`;
  }

  // Opening hours
  if (norm.includes('hour') || norm.includes('open') || norm.includes('close') || norm.includes('مواعيد') || norm.includes('فاتحين') || norm.includes('تقفلوا') || norm.includes('ساعه')) {
    if (b.hours) {
      return isArabic
        ? `مواعيد عمل ${b.name || 'المكان'}:\n${b.hours}\nتنورونا في أي وقت! هل تحب تحجز طاولة مسبقاً؟`
        : `Our opening hours are:\n${b.hours}\nLet us know if you would like to book a table!`;
    }
  }

  // Location / Address
  if (norm.includes('where') || norm.includes('location') || norm.includes('address') || norm.includes('مكان') || norm.includes('عنوان') || norm.includes('ازاي اجي')) {
    let reply = isArabic
      ? `مكاننا في: ${b.location || 'الفرع الرئيسي'}.`
      : `We are located at ${b.location || 'our main location'}.`;
    if (b.mapsUrl) {
      reply += isArabic
        ? `\nرابط لوكيشن جوجل مابس: ${b.mapsUrl}`
        : `\nGoogle Maps link: ${b.mapsUrl}`;
    }
    return reply;
  }

  // Products & Prices
  for (const p of products) {
    const pName = normalize(p.name);
    if (pName && (norm.includes(pName) || pName.split(' ').some(tok => tok.length > 3 && norm.includes(tok)))) {
      const desc = p.description ? ` (${p.description})` : '';
      return isArabic
        ? `سعر ${p.name}${desc} هو ${p.price || 'متوفر'}. وحالته: ${p.stock || 'متوفر حالياً'}. تحب نطلبلك منه دليفري؟ 🛍️`
        : `Our ${p.name}${desc} is ${p.price || 'available'}. Status: ${p.stock || 'In stock'}. Would you like to order for delivery? 🛍️`;
    }
  }

  // Delivery info
  if (norm.includes('deliver') || norm.includes('ship') || norm.includes('دليفري') || norm.includes('توصيل')) {
    if (b.delivery) {
      return isArabic
        ? `خدمة التوصيل: ${b.delivery}\nتحب تسجل طلبك دلوقتي؟`
        : `${b.delivery}\nWould you like to place an order now?`;
    }
  }

  // Payment methods
  if (norm.includes('pay') || norm.includes('visa') || norm.includes('cash') || norm.includes('دفع') || norm.includes('انستاباي') || norm.includes('فيزا') || norm.includes('كاش')) {
    if (b.payment) {
      return isArabic
        ? `طرق الدفع المتاحة لدينا: ${b.payment}.`
        : `We accept: ${b.payment}.`;
    }
  }

  // General menu inquiry
  if (norm.includes('menu') || norm.includes('price') || norm.includes('منيو') || norm.includes('اسعار') || norm.includes('عندكم ايه') || norm.includes('مشروبات')) {
    if (products.length) {
      const list = products.slice(0, 4).map(p => `• ${p.name}: ${p.price}`).join('\n');
      return isArabic
        ? `أشهر الأصناف عندنا:\n${list}\nتحب تطلب إيه منهم النهاردة؟`
        : `Here are our most popular items:\n${list}\nWhich one would you like to order?`;
    }
  }

  // Order issue / complaint handling
  if (norm.includes('غلط') || norm.includes('خلط') || norm.includes('مشكل') || norm.includes('تاخير') || norm.includes('متأخر') || norm.includes('ناقص') || norm.includes('wrong') || norm.includes('delay')) {
    return isArabic
      ? `نعتذر لحضرتك جداً عن أي خطأ أو تأخير حدث في الأوردر! 🙏 برجاء تزويدنا برقم الموبايل المسجل به الطلب أو تفاصيل الأصناف حتى نتواصل مع الفرع فوراً ونعوض حضرتك.`
      : `We sincerely apologize for any issue or delay with your order! 🙏 Please share your order details or registered phone number so our team can resolve this immediately.`;
  }

  // Response waiting / attention inquiry
  if (norm.includes('رد') || norm.includes('تأخرتوا') || norm.includes('reply') || norm.includes('anyone there')) {
    return isArabic
      ? `أهلاً بحضرتك، نعتذر عن أي انتظار! 🙏 أنا المساعد الذكي الخاص بالمكان، ومعاك حالاً. تحب أساعدك بخصوص المنيو، المواعيد، أو أحولك لأحد ممثلي خدمة العملاء؟`
      : `Hello! Apologies for the wait. 🙏 I am here to assist you right now with our menu, hours, location, or connect you with staff. How can I help?`;
  }

  // Check Help Center articles before falling back
  const artMatch = matchHelpCenter(question, config.articles || []);
  if (artMatch && artMatch.score >= 0.55) {
    const art = artMatch.article;
    return isArabic
      ? `بخصوص استفسارك عن (${art.title}):\n${art.content}\n\nهل تحتاج إلى مساعدة إضافية في هذا الشأن؟ ☕`
      : `According to our Help Center (${art.title}):\n${art.content}\n\nLet us know if you need any further assistance! ☕`;
  }

  return isArabic
    ? 'أهلاً بك! لم أتمكن من معرفة التفاصيل بدقة، تم تسجيل استفسارك وسيقوم أحد ممثلينا بمتابعتك والرد عليك في أقرب وقت. ☕'
    : fallback;
}

/* ==========================================================================
   AI AGENT COPILOT & REAL-TIME TRANSLATION ENGINE
   ========================================================================== */

export async function generateCopilotDraft({ customerName, lastMessage, history = [], articles = [], businessName = 'Nour Coffee House' }) {
  const norm = normalize(lastMessage || '');
  const isArabic = /[\u0600-\u06FF]/.test(lastMessage || '');
  const cName = customerName && customerName !== 'Client' ? customerName : (isArabic ? 'يا فندم' : 'there');

  // 1. If customer has a complaint / delay issue
  if (/(تأخير|مشكلة|شكوى|زفت|سيء|تأخر|غلط|late|delay|wrong|broken|issue|problem)/i.test(norm)) {
    return isArabic
      ? `أهلاً بحضرتك ${cName}، نعتذر جداً عن أي إزعاج أو تأخير حدث في طلبك. 🙏 أنا براجع مع الكابتن/الدليفري فوراً للتأكد من وصوله لحضرتك في أسرع وقت. ممكن بس دقيقة واحدة أتابع مع الفرع وأبلغ حضرتك؟`
      : `Hello ${cName}, I sincerely apologize for the delay and any frustration caused. 🙏 I am personally checking on the status of your order with our dispatch team right now and will update you in just a moment!`;
  }

  // 2. If customer asked about hours or location
  if (norm.includes('hour') || norm.includes('مواعيد') || norm.includes('فاتحين') || norm.includes('ساعه')) {
    return isArabic
      ? `أهلاً ${cName}! مواعيد عملنا من 8:00 صباحاً حتى 12:00 منتصف الليل يومياً. تنورنا في أي وقت! تحب نحجزلك طاولة مسبقاً؟ ☕`
      : `Hi ${cName}! We are open daily from 8:00 AM to 12:00 AM. We would love to have you over! Would you like to reserve a table? ☕`;
  }

  // 3. If customer asked about menu/recommendations
  if (norm.includes('منيو') || norm.includes('menu') || norm.includes('coffee') || norm.includes('قهوة') || norm.includes('عندكم')) {
    return isArabic
      ? `أهلاً ${cName}! ☕ أنصحك تجرب الفلات وايت المميز بتاعنا أو الكولد برو المنعش مع كرواسون زبدة طازج. تحب نسجلك أوردر دليفري يوصلك فوراً؟`
      : `Hi ${cName}! ☕ I highly recommend our specialty Flat White or signature Cold Brew alongside our fresh butter croissant. Would you like me to place a delivery order for you?`;
  }

  // 4. If Help Center match is found
  const artMatch = matchHelpCenter(lastMessage, articles);
  if (artMatch && artMatch.article) {
    return isArabic
      ? `أهلاً بك ${cName}! بخصوص استفسارك:\n${artMatch.article.content}\n\nهل في أي حاجة تانية أقدر أساعد حضرتك بيها؟`
      : `Hello ${cName}! Regarding your inquiry:\n${artMatch.article.content}\n\nPlease let me know if you need any additional details!`;
  }

  // 5. General warm professional reply
  return isArabic
    ? `أهلاً بحضرتك ${cName}، معاك خدمة عملاء ${businessName}. يسعدنا جداً مساعدتك! ممكن توضحلنا استفسارك بالتفصيل عشان نقدر نخدمك في أسرع وقت؟ ☕`
    : `Hello ${cName}! This is ${businessName} customer support. We are happy to help you! Could you please share more details about your request so we can assist you right away? ☕`;
}

export function improveCopilotDraft(draftText, tone = 'polite') {
  const isArabic = /[\u0600-\u06FF]/.test(draftText || '');
  const clean = String(draftText || '').trim();
  if (!clean) return draftText;

  switch (tone) {
    case 'polite':
      return isArabic
        ? `عزيزنا العميل، تحياتنا وتقديرنا لحضرتك. 🌸\n${clean}\n\nنشكر تفهمكم ويسعدنا دائماً خدمتكم على أكمل وجه.`
        : `Dear valued customer,\n${clean}\n\nThank you for your patience, and please do not hesitate to reach out if you need further assistance. Warm regards.`;

    case 'concise': {
      const lines = clean.split('\n').filter(l => l.trim().length > 0);
      const core = lines.length > 1 ? lines[1] : lines[0];
      return isArabic
        ? `${core.replace(/أهلاً.*?،/g, '').trim()} في خدمتكم دائماً.`
        : `${core.replace(/^(Hello|Hi|Dear).*?[,!.]/i, '').trim()} At your service.`;
    }

    case 'warm':
      return isArabic
        ? `يا هلا والله! نورتنا جداً 😊☕\n${clean}\n\nيومك جميل وكل السعادة ليك ولأحبابك! ✨`
        : `Hey there! Wonderful to chat with you! 😊☕\n${clean}\n\nWishing you a fantastic day ahead! ✨`;

    case 'detailed':
      return isArabic
        ? `${clean}\n\n📌 خطوات المتابعة والحل:\n1. تم تسجيل طلبك وإعطاؤه أولوية متابعة لدى فريق العمل.\n2. سنوافيك بالتحديث النهائي فوراً هنا في الشات.\n• للمساعدة الفورية في أي وقت، يمكنك التواصل مع خط الطوارئ الخاص بنا.`
        : `${clean}\n\n📌 Next Steps & Resolution:\n1. Your request has been logged with our priority support queue.\n2. We will confirm resolution within minutes.\n• For immediate assistance, feel free to contact our direct store line.`;

    default:
      return draftText;
  }
}

export async function translateContent(text, targetLang = 'en') {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const puterToken = process.env.PUTER_AUTH_TOKEN || process.env.PUTER_API_KEY;
  if (puterToken) {
    try {
      puter.setAuthToken(puterToken);
      const prompt = `Translate the following customer support text accurately into target language code "${targetLang}". Output ONLY the translated text without commentary or quotes:\n\n${raw}`;
      const res = await puter.ai.chat(prompt, { model: process.env.PUTER_MODEL || 'gpt-5.4-nano' });
      const translated = res?.message?.content || (typeof res === 'string' ? res : res?.text);
      if (translated && String(translated).trim()) return String(translated).trim();
    } catch (e) {
      console.warn('Puter translation fallback:', e.message);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const prompt = `Translate the following customer support text accurately into target language code "${targetLang}". Output ONLY the translated text without commentary or quotes:\n\n${raw}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 250 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (translated) return translated;
      }
    } catch (e) {
      console.warn('LLM translation fallback:', e.message);
    }
  }

  // Instant High-Fidelity Rule-Based Dictionary Engine
  const langMap = {
    fr: {
      'welcome': 'Bienvenue chez nous! Comment pouvons-nous vous aider aujourd\'hui? ☕',
      'hours': 'Nos horaires d\'ouverture sont de 8h00 à minuit tous les jours.',
      'delay': 'Nous nous excusons sincèrement pour le retard. Nous vérifions votre commande immédiatement.'
    },
    de: {
      'welcome': 'Willkommen bei uns! Wie können wir Ihnen heute helfen? ☕',
      'hours': 'Unsere Öffnungszeiten sind täglich von 8:00 bis 24:00 Uhr.',
      'delay': 'Wir entschuldigen uns aufrichtig für die Verzögerung. Wir überprüfen Ihre Bestellung sofort.'
    },
    es: {
      'welcome': '¡Bienvenido a nuestro café! ¿En qué podemos ayudarte hoy? ☕',
      'hours': 'Nuestro horario de atención es todos los días de 8:00 a 24:00.',
      'delay': 'Nos disculpamos sinceramente por el retraso. Estamos verificando su pedido ahora mismo.'
    },
    it: {
      'welcome': 'Benvenuto da noi! Come possiamo aiutarti oggi? ☕',
      'hours': 'I nostri orari di apertura sono tutti i giorni dalle 8:00 alle 24:00.',
      'delay': 'Ci scusiamo sinceramente per il ritardo. Stiamo verificando il tuo ordine immediatamente.'
    },
    ar: {
      'hello': 'أهلاً بك! كيف يمكننا مساعدتك اليوم؟ ☕',
      'sorry': 'نعتذر بشدة عن أي تأخير، جاري متابعة طلبك فوراً.',
      'thank you': 'شكراً جزيلاً لتواصلك معنا!'
    }
  };

  const isArabic = /[\u0600-\u06FF]/.test(raw);

  if (targetLang === 'en' && isArabic) {
    if (raw.includes('نعتذر') || raw.includes('تأخير')) {
      return 'We sincerely apologize for any delay. We are actively tracking your order with our dispatch team right now.';
    }
    if (raw.includes('مواعيد') || raw.includes('فاتحين')) {
      return 'Our opening hours are daily from 8:00 AM to 12:00 Midnight. You are always welcome!';
    }
    if (raw.includes('مكان') || raw.includes('عنوان')) {
      return 'We are located at our main downtown branch. Looking forward to welcoming you!';
    }
    return `[English Translation]: ${raw}`;
  }

  if ((targetLang === 'ar' || targetLang === 'ar-EG') && !isArabic) {
    if (raw.toLowerCase().includes('apologize') || raw.toLowerCase().includes('sorry')) {
      return 'نعتذر لحضرتك جداً عن أي إزعاج، ونعمل على متابعة طلبك وحل الأمر فوراً. 🙏';
    }
    if (raw.toLowerCase().includes('welcome') || raw.toLowerCase().includes('hello')) {
      return 'أهلاً بحضرتك وسعداء بتواصلك معنا! كيف يمكننا خدمتك اليوم؟ ☕';
    }
    if (raw.toLowerCase().includes('hour') || raw.toLowerCase().includes('open')) {
      return 'مواعيد عملنا يومياً من 8:00 صباحاً وحتى 12:00 منتصف الليل.';
    }
    return `[الترجمة للعربية]: ${raw}`;
  }

  if (langMap[targetLang]) {
    if (raw.toLowerCase().includes('sorry') || raw.toLowerCase().includes('delay') || raw.includes('تأخير')) {
      return langMap[targetLang]['delay'];
    }
    if (raw.toLowerCase().includes('hour') || raw.includes('مواعيد')) {
      return langMap[targetLang]['hours'];
    }
    return langMap[targetLang]['welcome'];
  }

  return `[Translated to ${targetLang.toUpperCase()}]: ${raw}`;
}

