// Chat simulator controller for previewing the WhatsApp assistant

import { $, esc, refreshIcons, fmtText, uid } from './ui.js';
import { api, loadConvIndex, saveConvIndex, loadConversation, saveConversation, deleteConversation, touchConversation } from './api.js';

let ctx = null;

const SUGGESTIONS = [
  'ما هي السيارات المتوفرة بالمعرض زيرو ومستعمل؟',
  'سعر وتفاصيل مرسيدس C200 AMG موديل 2024 زيرو',
  'عايز اعرف نظام تقسيط BMW 320 ومقدمها كام',
  'حجز موعد لمعاينة وتجربة قيادة سيارة',
  'هل متاح استبدال سيارتي القديمة (Trade-In)؟',
  'موقع صالة العرض ومواعيد العمل وأرقام التواصل'
];

function timeLabel(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function messageHTML(m) {
  if (m.role === 'user') {
    return `<div class="msg-row user">
      <div>
        <div class="bubble user">${fmtText(m.content)}</div>
        <div class="msg-time text-right">${timeLabel(m.at)}</div>
      </div>
    </div>`;
  }
  return `<div class="msg-row">
    <div class="msg-avatar"><i data-lucide="bot" class="h-3.5 w-3.5"></i></div>
    <div>
      <div class="bubble ${m.error ? 'err' : 'bot'}">${fmtText(m.content)}</div>
      <div class="msg-time">${timeLabel(m.at)}</div>
    </div>
  </div>`;
}

function emptyStateHTML(cfg) {
  const b = (cfg && cfg.business) || {};
  const isAr = document.documentElement.lang === 'ar' || localStorage.getItem('alfares_lang') === 'ar';
  return `<div class="empty">
    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#128C7E] to-[#0ea5e9] text-white shadow-md shadow-[#128C7E]/20">
      <i data-lucide="car" class="h-7 w-7"></i>
    </div>
    <h3 class="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">${esc(b.name || (isAr ? 'مستشار مبيعات الفارس للسيارات' : 'Al-Fares Motors AI Sales Advisor'))}</h3>
    <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-md mx-auto">
      ${isAr
        ? 'اختبر ردود مستشار مبيعات المعرض الذكي تماماً كما يجيب عملاءك على واتساب. يسحب الأسعار والمواصفات الرسمية من قاعدة بيانات السيارات، يحسب الأقساط البنكية، ويحدد مواعيد تجارب القيادة!'
        : 'Test your automotive AI sales advisor as clients experience it on WhatsApp. It quotes exact vehicle inventory specs, prices, bank installments, trade-in values, and schedules test drives!'}
    </p>
    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <i data-lucide="check" class="h-3 w-3"></i> ${isAr ? 'سيارات زيرو ومستعملة معتمدة' : 'Zero & Certified Used Inventory'}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
        <i data-lucide="gauge" class="h-3 w-3"></i> ${isAr ? 'حجز تجارب قيادة فورية' : 'Instant Test Drive Scheduling'}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
        <i data-lucide="sparkles" class="h-3 w-3"></i> Puter AI & Local Engine
      </span>
    </div>
  </div>`;
}

export function initChat(context) {
  ctx = context;

  const composer = $('composer');
  if (composer) {
    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage($('input').value);
    });
  }

  const input = $('input');
  if (input) {
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
  }

  const suggBox = $('suggestions');
  if (suggBox) {
    suggBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sugg]');
      if (b) sendMessage(b.dataset.sugg);
    });
  }

  const onNew = () => {
    newConversation();
    closeSheet();
  };
  $('newChatBtn')?.addEventListener('click', onNew);
  $('newChatSide')?.addEventListener('click', onNew);
  $('newChatSheet')?.addEventListener('click', onNew);

  const handleConvClick = async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const id = del.dataset.del;
      ctx.state.convIndex = await deleteConversation(id);
      if (ctx.state.convId === id) {
        if (ctx.state.convIndex.length) await openConversation(ctx.state.convIndex[0].id);
        else newConversation(false);
      } else renderConvList();
      return;
    }
    const item = e.target.closest('[data-conv]');
    if (item) {
      await openConversation(item.dataset.conv);
      if (ctx.goto) ctx.goto('chat');
      closeSheet();
    }
  };

  $('convList')?.addEventListener('click', handleConvClick);
  $('convListMobile')?.addEventListener('click', handleConvClick);

  $('mobileConvBtn')?.addEventListener('click', () => $('convSheet')?.classList.remove('hidden'));
  $('closeSheet')?.addEventListener('click', closeSheet);
  $('convSheet')?.addEventListener('click', (e) => {
    if (e.target === $('convSheet')) closeSheet();
  });
}

export async function loadConversations() {
  ctx.state.convIndex = await loadConvIndex();
  renderConvList();
  if (ctx.state.convIndex.length) {
    await openConversation(ctx.state.convIndex[0].id);
  } else {
    newConversation(false);
  }
}

export function newConversation(persistNow = true) {
  ctx.state.convId = uid();
  ctx.state.messages = [];
  renderMessages();
  renderConvList();
  if (persistNow) $('input')?.focus();
}

export async function openConversation(id) {
  ctx.state.convId = id;
  ctx.state.messages = await loadConversation(id);
  renderMessages();
  renderConvList();
}

function renderConvList() {
  const html = ctx.state.convIndex && ctx.state.convIndex.length
    ? ctx.state.convIndex.map((c) => `
        <div class="conv-item ${c.id === ctx.state.convId ? 'active' : ''}" data-conv="${c.id}">
          <i data-lucide="message-square" class="h-3.5 w-3.5 flex-none text-slate-400"></i>
          <span class="title">${esc(c.title || 'New conversation')}</span>
          <button class="conv-del" data-del="${c.id}" title="Delete"><i data-lucide="x" class="h-3.5 w-3.5"></i></button>
        </div>`).join('')
    : '<p class="px-2.5 py-2 text-xs text-slate-400">No conversations yet</p>';

  if ($('convList')) $('convList').innerHTML = html;
  if ($('convListMobile')) $('convListMobile').innerHTML = html;
  refreshIcons();
}

export function renderMessages() {
  const host = $('messages');
  if (!host) return;

  host.innerHTML = ctx.state.messages && ctx.state.messages.length
    ? ctx.state.messages.map(messageHTML).join('')
    : emptyStateHTML(ctx.state.config);

  renderSuggestions();
  refreshIcons();
  scrollDown();
}

function renderSuggestions() {
  const host = $('suggestions');
  if (!host) return;
  if (ctx.state.messages && ctx.state.messages.length) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = SUGGESTIONS.map(s =>
    `<button type="button" class="chip" data-sugg="${esc(s)}">${esc(s)}</button>`
  ).join('');
}

function scrollDown() {
  const host = $('messages');
  if (host) host.scrollTop = host.scrollHeight;
}

function autoGrow() {
  const el = $('input');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function showTyping() {
  const host = $('messages');
  const div = document.createElement('div');
  div.id = 'typingRow';
  div.className = 'msg-row';
  div.innerHTML = `<div class="msg-avatar"><i data-lucide="bot" class="h-3.5 w-3.5"></i></div>
    <div class="bubble bot"><span class="typing"><span></span><span></span><span></span></span></div>`;
  host.appendChild(div);
  refreshIcons();
  scrollDown();
  return div;
}

function setBusy(busy) {
  ctx.state.streaming = busy;
  const sendBtn = $('sendBtn');
  const stopBtn = $('stopBtn');
  const input = $('input');
  if (sendBtn) sendBtn.classList.toggle('hidden', busy);
  if (stopBtn) stopBtn.classList.toggle('hidden', !busy);
  if (input) input.disabled = busy;
}

export async function sendMessage(text) {
  if (!text || !text.trim() || ctx.state.streaming) return;
  const wasEmpty = !ctx.state.messages || ctx.state.messages.length === 0;

  const userMsg = { role: 'user', content: text.trim(), at: Date.now() };
  ctx.state.messages.push(userMsg);

  if (wasEmpty) renderMessages();
  else {
    $('messages')?.insertAdjacentHTML('beforeend', messageHTML(userMsg));
    renderSuggestions();
    scrollDown();
  }

  const input = $('input');
  if (input) input.value = '';
  autoGrow();

  await persist();
  setBusy(true);

  const typing = showTyping();

  try {
    const history = ctx.state.messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    const resp = await api.chat(userMsg.content, history);
    typing.remove();

    let finalReply = resp.reply;

    // If server responded with a generic fallback and browser has Puter.js loaded, use unlimited Puter AI
    if (resp.isFallback && window.puter?.ai?.chat) {
      try {
        const cfg = ctx.state.config || {};
        const b = cfg.business || {};
        const isArabic = /[\u0600-\u06FF]/.test(userMsg.content);
        const sysPrompt = `You are the official AI Automotive Sales Specialist for "${b.name || 'Al-Fares Motors'}".
Showroom: ${b.about || 'Dealership for New & Certified Pre-Owned Cars'}
Hours: ${b.hours || 'Sat–Thu 9 AM – 11 PM, Fri 1:30 PM – 11 PM'}
Location: ${b.location || 'New Cairo Auto Market Showroom'}
Payment & Financing: ${b.payment || 'Cash, Bank installments up to 7 years from 20% down, direct trade-ins'}
Vehicle Inventory: ${(cfg.products || []).map(p => `${p.name} (${p.price}, ${p.category})`).join('; ')}

Answer customer questions accurately, politely, and naturally in ${isArabic ? 'Egyptian Arabic' : 'English'}. Keep responses friendly, structured, and helpful. Offer test drive bookings or showroom visits.`;

        const puterMessages = [
          { role: 'system', content: sysPrompt },
          ...history.slice(-4),
          { role: 'user', content: userMsg.content }
        ];

        const pRes = await window.puter.ai.chat(puterMessages, { model: 'gpt-5.4-nano' });
        const pText = pRes?.message?.content || (typeof pRes === 'string' ? pRes : pRes?.text);
        if (pText && String(pText).trim()) {
          finalReply = String(pText).trim();
        }
      } catch (pErr) {
        console.warn('Puter browser chat fallback failed:', pErr);
      }
    }

    const botMsg = {
      role: 'assistant',
      content: finalReply || (ctx.state.config?.whatsapp?.fallback || "I'm checking with the team."),
      at: Date.now()
    };
    ctx.state.messages.push(botMsg);
    $('messages')?.insertAdjacentHTML('beforeend', messageHTML(botMsg));
    refreshIcons();
    scrollDown();
    await persist();
  } catch (err) {
    if (typing.isConnected) typing.remove();
    const errMsg = {
      role: 'assistant',
      content: 'Could not connect to the assistant: ' + (err.message || 'Server error'),
      at: Date.now(),
      error: true
    };
    ctx.state.messages.push(errMsg);
    $('messages')?.insertAdjacentHTML('beforeend', messageHTML(errMsg));
    refreshIcons();
    scrollDown();
    await persist();
  } finally {
    setBusy(false);
    $('input')?.focus();
  }
}

async function persist() {
  if (!ctx.state.convId) return;
  await saveConversation(ctx.state.convId, ctx.state.messages);
  const first = ctx.state.messages.find((m) => m.role === 'user');
  const title = first ? first.content.slice(0, 44) : 'New conversation';
  ctx.state.convIndex = await touchConversation(ctx.state.convId, title);
  renderConvList();
}

function closeSheet() {
  $('convSheet')?.classList.add('hidden');
}
