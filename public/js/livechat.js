// Two-way Live Chat & Human Agent Handover Console

import { $, esc, refreshIcons, toast, fmtText } from './ui.js';
import { api } from './api.js';
import { exportLogsCSV, exportLogsPDF } from './export.js';

let conversations = [];
let handoffTickets = [];
let activePhone = null;
let pollTimer = null;
let cachedLogs = [];

export function initLiveChat() {
  const convListEl = $('liveConvList');
  if (convListEl) {
    convListEl.addEventListener('click', (e) => {
      const item = e.target.closest('[data-client-phone]');
      if (!item) return;
      activePhone = item.dataset.clientPhone;
      renderActiveThread();
      renderConvList();
    });
  }

  $('takeoverToggle')?.addEventListener('change', async (e) => {
    if (!activePhone) return;
    const isTakeover = e.target.checked;
    try {
      await api.toggleTakeover(activePhone, isTakeover);
      toast(isTakeover ? 'Human agent takeover activated. AI bot paused.' : 'Bot auto-reply resumed.');
      await loadConversations(false);
    } catch (err) {
      toast('Failed to toggle takeover: ' + err.message, 'err');
    }
  });

  const replyForm = $('liveReplyForm');
  if (replyForm) {
    replyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('liveReplyInput');
      const text = input?.value.trim();
      if (!text || !activePhone) return;

      const sendBtn = $('liveSendBtn');
      if (sendBtn) sendBtn.disabled = true;

      try {
        const res = await api.replyConversation(activePhone, text);
        if (input) input.value = '';
        if (res && res.learned) {
          toast('✨ تم إرسال الرد، وتعلّم الذكاء الاصطناعي هذا السؤال والجواب تلقائياً!');
        } else {
          toast('Message sent to client on WhatsApp');
        }
        await loadConversations(false);
      } catch (err) {
        toast('Failed to send WhatsApp message: ' + err.message, 'err');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        input?.focus();
      }
    });
  }

  $('refreshLiveChatBtn')?.addEventListener('click', () => loadConversations(true));

  // Search in conversations
  $('searchLiveConvs')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const convItems = document.querySelectorAll('#liveConvList [data-client-phone]');
    convItems.forEach(item => {
      const txt = item.textContent.toLowerCase();
      item.style.display = txt.includes(q) ? '' : 'none';
    });
  });

  // Quick Canned Replies
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-canned-btn');
    if (btn && btn.dataset.canned) {
      const input = $('liveReplyInput');
      if (input) {
        input.value = btn.dataset.canned;
        input.focus();
        toast('تم إدراج الرد السريع في حقل الإرسال');
      }
    }
  });


  // Mode switcher: Live WhatsApp Chats vs Messages Audit Log
  const chatTabBtn = $('liveTabChatBtn');
  const logsTabBtn = $('liveTabLogsBtn');
  const chatPanel = $('liveChatPanelWrap');
  const logsPanel = $('liveLogsPanelWrap');
  const logsTools = $('liveLogsTools');

  const switchMode = (mode) => {
    const isChat = mode === 'chat';
    if (chatPanel) {
      chatPanel.classList.toggle('hidden', !isChat);
      chatPanel.classList.toggle('flex', isChat);
    }
    if (logsPanel) {
      logsPanel.classList.toggle('hidden', isChat);
    }
    if (logsTools) {
      logsTools.classList.toggle('hidden', isChat);
      logsTools.classList.toggle('flex', !isChat);
    }

    if (chatTabBtn && logsTabBtn) {
      chatTabBtn.className = isChat
        ? 'flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 px-3.5 py-1.5 text-xs font-bold text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 shadow-xs'
        : 'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
      logsTabBtn.className = !isChat
        ? 'flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 px-3.5 py-1.5 text-xs font-bold text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 shadow-xs'
        : 'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
    }

    if (!isChat) {
      loadLogsList();
    }
    refreshIcons();
  };

  chatTabBtn?.addEventListener('click', () => switchMode('chat'));
  logsTabBtn?.addEventListener('click', () => switchMode('logs'));

  // Wire logs tools
  $('refreshLogs')?.addEventListener('click', loadLogsList);
  $('clearLogs')?.addEventListener('click', async () => {
    if (!confirm('هل أنت متأكد من مسح سجل الرسائل؟')) return;
    try {
      await api.clearLogs();
      await loadLogsList();
      toast('تم مسح سجل الرسائل بنجاح');
    } catch (e) {
      toast('خطأ في مسح السجل: ' + e.message, 'err');
    }
  });

  $('exportLogsCSVBtn')?.addEventListener('click', () => {
    exportLogsCSV(cachedLogs);
  });
  $('exportLogsPDFBtn')?.addEventListener('click', () => {
    exportLogsPDF(cachedLogs, 'Al-Fares Motors | الفارس موتورز');
  });


  // --- AI Copilot: Smart Draft ---
  $('copilotDraftBtn')?.addEventListener('click', async () => {
    if (!activePhone) {
      toast('Select a client conversation first', 'err');
      return;
    }
    const conv = conversations.find(c => c.phone === activePhone);
    if (!conv) return;

    const btn = $('copilotDraftBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="h-3.5 w-3.5 animate-spin"></i> Drafting…';
    }
    refreshIcons();

    try {
      const incomingMsgs = (conv.messages || []).filter(m => m.incoming);
      const lastIncoming = incomingMsgs.length ? incomingMsgs[incomingMsgs.length - 1].incoming : '';

      let draftText = '';
      if (window.puter?.ai?.chat) {
        try {
          const isArabic = /[\u0600-\u06FF]/.test(lastIncoming);
          const cName = conv.name && conv.name !== 'Client' ? conv.name : (isArabic ? 'يا فندم' : 'there');
          const prompt = `You are an AI automotive sales advisor for "Al-Fares Motors". Draft a professional, courteous response to the client "${cName}" who asked: "${lastIncoming}". Quote specs, installments, or offer a test drive/visit if relevant. Match language (${isArabic ? 'Egyptian Arabic' : 'English'}). Return ONLY the suggested reply message text without extra remarks or quotes.`;
          const puterRes = await window.puter.ai.chat(prompt, { model: 'gpt-5.4-nano' });
          const content = puterRes?.message?.content || (typeof puterRes === 'string' ? puterRes : puterRes?.text);
          if (content && String(content).trim()) {
            draftText = String(content).trim();
          }
        } catch (puterErr) {
          console.warn('Puter browser copilot draft fallback:', puterErr);
        }
      }

      if (!draftText) {
        const res = await api.callCopilotDraft({
          customerName: conv.name,
          lastMessage: lastIncoming,
          history: conv.messages
        });
        draftText = res.draft;
      }

      const input = $('liveReplyInput');
      if (input && draftText) {
        input.value = draftText;
        input.focus();
        toast('✨ AI Copilot drafted a reply based on conversation context!');
      }
    } catch (err) {
      toast('Failed to draft reply: ' + err.message, 'err');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" class="h-3.5 w-3.5 text-amber-500"></i> AI Draft';
        refreshIcons();
      }
    }
  });

  // --- AI Copilot: Tone Rewriting ---
  $('copilotToneSelect')?.addEventListener('change', async (e) => {
    const tone = e.target.value;
    if (!tone) return;
    const input = $('liveReplyInput');
    const text = input?.value.trim();
    if (!text) {
      toast('Type or draft a response first to improve tone', 'err');
      e.target.value = '';
      return;
    }

    try {
      let improvedText = '';
      if (window.puter?.ai?.chat) {
        try {
          const prompt = `Rewrite the following customer service message in a "${tone}" tone. Keep the exact meaning and language intact. Output ONLY the rewritten message:\n\n${text}`;
          const puterRes = await window.puter.ai.chat(prompt, { model: 'gpt-5.4-nano' });
          const content = puterRes?.message?.content || (typeof puterRes === 'string' ? puterRes : puterRes?.text);
          if (content && String(content).trim()) {
            improvedText = String(content).trim();
          }
        } catch (puterErr) {
          console.warn('Puter browser tone rewrite fallback:', puterErr);
        }
      }

      if (!improvedText) {
        const res = await api.callCopilotImprove({ text, tone });
        improvedText = res.improved;
      }

      if (input && improvedText) {
        input.value = improvedText;
        input.focus();
        toast(`✨ Draft rewritten in ${tone} tone!`);
      }
    } catch (err) {
      toast('Failed to improve tone: ' + err.message, 'err');
    } finally {
      e.target.value = '';
    }
  });

  // --- AI Copilot: Instant Multilingual Translator ---
  $('copilotTranslateBtn')?.addEventListener('click', () => {
    const input = $('liveReplyInput');
    const conv = conversations.find(c => c.phone === activePhone);
    const incomingMsgs = conv ? (conv.messages || []).filter(m => m.incoming) : [];
    const lastIncoming = incomingMsgs.length ? incomingMsgs[incomingMsgs.length - 1].incoming : '';

    const textToTranslate = input?.value.trim() || lastIncoming;
    const srcInp = $('translateSourceText');
    const resInp = $('translateResultText');
    if (srcInp) srcInp.value = textToTranslate;
    if (resInp) resInp.value = '';

    $('translateModal')?.classList.remove('hidden');
    srcInp?.focus();
  });

  $('closeTranslateModal')?.addEventListener('click', () => {
    $('translateModal')?.classList.add('hidden');
  });

  $('executeTranslateBtn')?.addEventListener('click', async () => {
    const text = $('translateSourceText')?.value.trim();
    const targetLang = $('targetLangSelect')?.value || 'en';
    if (!text) {
      toast('Please enter text to translate', 'err');
      return;
    }

    const btn = $('executeTranslateBtn');
    if (btn) btn.textContent = 'Translating…';
    try {
      if (window.puter?.ai?.chat) {
        try {
          const res = await window.puter.ai.chat(
            `Translate the following text accurately into target language "${targetLang}". Output ONLY the translation without any notes:\n\n${text}`,
            { model: 'gpt-5.4-nano' }
          );
          const out = res?.message?.content || (typeof res === 'string' ? res : res?.text);
          if (out && $('translateResultText')) {
            $('translateResultText').value = String(out).trim();
            return;
          }
        } catch (puterErr) {
          console.warn('Puter client translation fallback to server:', puterErr);
        }
      }
      const res = await api.callCopilotTranslate({ text, targetLang });
      if ($('translateResultText')) {
        $('translateResultText').value = res.translated || '';
      }
    } catch (err) {
      toast('Translation failed: ' + err.message, 'err');
    } finally {
      if (btn) btn.textContent = 'Translate';
    }
  });

  $('applyTranslationBtn')?.addEventListener('click', () => {
    const translated = $('translateResultText')?.value.trim();
    if (!translated) {
      toast('No translation to apply', 'err');
      return;
    }
    const input = $('liveReplyInput');
    if (input) {
      input.value = translated;
      input.focus();
    }
    $('translateModal')?.classList.add('hidden');
    toast('Translation applied to composer!');
  });

  // --- AI Copilot: Quick Insert Knowledge ---
  $('copilotInsertKnowledgeBtn')?.addEventListener('click', openQuickKnowledgeModal);
  $('closeInsertKnowledgeModal')?.addEventListener('click', () => {
    $('insertKnowledgeModal')?.classList.add('hidden');
  });

  $('quickKnowledgeSearch')?.addEventListener('input', (e) => {
    renderQuickKnowledgeItems(e.target.value.toLowerCase().trim());
  });

  $('quickKnowledgeList')?.addEventListener('click', (e) => {
    const target = e.target.closest('[data-quick-art-id]');
    if (!target) return;
    const artId = target.dataset.quickArtId;
    const art = cachedKnowledgeArticles.find(a => a.id === artId);
    if (!art) return;

    const input = $('liveReplyInput');
    if (input) {
      const snippet = `${art.title}:\n${art.content}`;
      input.value = input.value ? `${input.value}\n\n${snippet}` : snippet;
      input.focus();
    }
    $('insertKnowledgeModal')?.classList.add('hidden');
    toast('Knowledge snippet inserted!');
  });
}

let cachedKnowledgeArticles = [];

export async function loadLiveChat() {
  await loadConversations(true);
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const pane = document.querySelector('[data-pane="livechat"]');
    if (pane && !pane.classList.contains('hidden')) {
      loadConversations(false);
    }
  }, 6000);
}

async function loadConversations(showFeedback = false) {
  try {
    const [res, tRes] = await Promise.all([
      api.getConversations(),
      api.getHandoffTickets().catch(() => ({ tickets: [] }))
    ]);
    conversations = res.conversations || [];
    handoffTickets = tRes.tickets || [];
    if (!activePhone && conversations.length > 0) {
      activePhone = conversations[0].phone;
    }
    renderConvList();
    renderActiveThread();
    if (showFeedback) toast('Live chat updated');
  } catch (err) {
    console.error('Error loading conversations:', err);
  }
}

function renderConvList() {
  const host = $('liveConvList');
  if (!host) return;

  if (!conversations.length) {
    host.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">No active client conversations yet.</p>';
    return;
  }

  host.innerHTML = conversations.map(c => {
    const isActive = c.phone === activePhone;
    const isTakeover = c.isHumanTakeover;
    const hasTicket = handoffTickets.some(t => t.phone === c.phone && t.status === 'open');
    return `
    <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition ${isActive ? 'bg-emerald-50/60 border-l-4 border-l-[#128C7E]' : ''}" data-client-phone="${c.phone}">
      <div class="flex items-center justify-between mb-1">
        <p class="text-sm font-semibold text-slate-900 truncate">${esc(c.name || 'Client')}</p>
        <span class="text-[10px] text-slate-400">${new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p class="text-xs text-slate-500 truncate mb-1.5">${esc(c.lastMessageText || 'No message')}</p>
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[10px] font-mono text-slate-400">+${c.phone}</span>
        ${hasTicket ? '<span class="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold uppercase ml-auto">AI Handover</span>' : ''}
        ${isTakeover ? '<span class="pill bg-amber-50 text-amber-700 border border-amber-200 text-[10px] ' + (hasTicket ? '' : 'ml-auto') + '">Takeover</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function renderActiveThread() {
  const threadHost = $('liveMessagesThread');
  const headerName = $('liveClientName');
  const headerPhone = $('liveClientPhone');
  const takeoverBox = $('takeoverToggle');

  if (!activePhone) {
    if (threadHost) threadHost.innerHTML = '<div class="empty text-slate-400 text-sm mt-12 text-center">Select a customer conversation on the left.</div>';
    renderUnifiedCustomerPanel(null);
    return;
  }

  const conv = conversations.find(c => c.phone === activePhone);
  if (!conv) {
    renderUnifiedCustomerPanel(null);
    return;
  }

  renderUnifiedCustomerPanel(activePhone);

  if (headerName) headerName.textContent = conv.name || 'Client';
  if (headerPhone) headerPhone.textContent = '+' + conv.phone;
  if (takeoverBox) takeoverBox.checked = !!conv.isHumanTakeover;

  const pill = $('liveBotStatePill');
  if (pill) {
    if (conv.isHumanTakeover) {
      pill.textContent = 'تدخل بشري نشط 👤';
      pill.className = 'rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800';
    } else {
      pill.textContent = 'الرد الآلي نشط 🤖';
      pill.className = 'rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    }
  }

  const avatar = $('liveThreadAvatar');
  if (avatar) {
    avatar.textContent = (conv.name || 'CL').slice(0, 2).toUpperCase();
  }

  const ticket = handoffTickets.find(t => t.phone === activePhone && t.status === 'open');
  const briefingHTML = ticket ? `
    <div class="mb-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 shadow-sm animate-scaleIn">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold"><i data-lucide="sparkles" class="h-3 w-3"></i></span>
          <span class="text-xs font-bold uppercase tracking-wide text-amber-900">ClientBot AI · Smart Handover Briefing</span>
        </div>
        <span class="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase ${ticket.sentiment === 'Frustrated' ? 'text-rose-700 border border-rose-200' : 'text-amber-800 border border-amber-200'}">${esc(ticket.sentiment)}</span>
      </div>
      <p class="text-xs font-semibold text-slate-900 leading-relaxed mb-1">${esc(ticket.issueSummary)}</p>
      <p class="text-[11px] text-slate-500">Trigger inquiry: <span class="italic font-mono text-slate-700">"${esc(ticket.lastMessage || '')}"</span></p>
    </div>
  ` : '';

  const msgs = conv.messages || [];
  if (threadHost) {
    threadHost.innerHTML = briefingHTML + msgs.map(m => {
      const isClient = !!m.incoming;
      const timeStr = new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isClient) {
        return `
        <div class="msg-row user">
          <div>
            <div class="bubble user">${fmtText(m.incoming)}</div>
            <div class="msg-time text-right">${timeStr} · Client</div>
          </div>
        </div>`;
      }

      const isHuman = m.isHuman;
      return `
      <div class="msg-row">
        <div class="msg-avatar ${isHuman ? 'bg-amber-600' : 'bg-[#128C7E]'}">
          <i data-lucide="${isHuman ? 'user' : 'bot'}" class="h-3.5 w-3.5"></i>
        </div>
        <div>
          <div class="bubble bot">${fmtText(m.reply)}</div>
          <div class="msg-time">${timeStr} · ${isHuman ? 'Staff Agent' : 'AI Assistant'}</div>
        </div>
      </div>`;
    }).join('');

    threadHost.scrollTop = threadHost.scrollHeight;
  }

  refreshIcons();
}

async function renderUnifiedCustomerPanel(phone) {
  const panel = $('customerContextPanel');
  if (!panel) return;

  if (!phone) {
    if ($('custProfileName')) $('custProfileName').textContent = 'Select Client';
    if ($('custProfilePhone')) $('custProfilePhone').textContent = '—';
    if ($('custAvatar')) $('custAvatar').textContent = 'CL';
    $('custVipBadge')?.classList.add('hidden');
    if ($('custAiSummary')) $('custAiSummary').textContent = 'Select a conversation to inspect the AI-unified customer profile.';
    if ($('custTotalOrders')) $('custTotalOrders').textContent = '0';
    if ($('custTotalSpend')) $('custTotalSpend').textContent = '0 EGP';
    if ($('custLanguageBadge')) $('custLanguageBadge').textContent = '—';
    if ($('custSentimentTrend')) $('custSentimentTrend').textContent = '—';
    if ($('custRecurringIssues')) $('custRecurringIssues').innerHTML = '<span class="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px]">None recorded</span>';
    return;
  }

  try {
    const res = await api.callGetUnifiedCustomer(phone);
    const p = res.profile;
    if (!p) return;

    if ($('custProfileName')) $('custProfileName').textContent = p.name || 'Client';
    if ($('custProfilePhone')) $('custProfilePhone').textContent = '+' + p.phone;
    if ($('custAvatar')) {
      const parts = (p.name || 'Client').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
      $('custAvatar').textContent = initials;
    }

    if ($('custVipBadge')) {
      if (p.isVip) {
        $('custVipBadge').classList.remove('hidden');
      } else {
        $('custVipBadge').classList.add('hidden');
      }
    }

    if ($('custAiSummary')) {
      $('custAiSummary').textContent = p.aiSummary || 'No interaction summary available.';
    }

    if ($('custTotalOrders')) $('custTotalOrders').textContent = String(p.totalOrders || 0);
    if ($('custTotalSpend')) $('custTotalSpend').textContent = (p.totalSpend || 0).toLocaleString() + ' EGP';
    if ($('custLanguageBadge')) $('custLanguageBadge').textContent = p.preferredLanguage || 'Arabic / English';

    if ($('custSentimentTrend')) {
      const sentiment = p.sentimentTrend || 'Satisfied';
      $('custSentimentTrend').textContent = sentiment;
      $('custSentimentTrend').className = 'rounded font-semibold px-2 py-0.5 text-[11px] ' +
        (sentiment === 'Frustrated' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
         sentiment === 'Neutral' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200');
    }

    if ($('custRecurringIssues')) {
      const tags = p.recurringIssues || [];
      if (tags.length) {
        $('custRecurringIssues').innerHTML = tags.map(t =>
          `<span class="rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-medium border border-indigo-100">${esc(t)}</span>`
        ).join('');
      } else {
        $('custRecurringIssues').innerHTML = '<span class="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px]">None recorded</span>';
      }
    }
  } catch (err) {
    console.error('Failed to load unified customer context:', err);
  }
}

async function openQuickKnowledgeModal() {
  const modal = $('insertKnowledgeModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const searchInput = $('quickKnowledgeSearch');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }

  const listEl = $('quickKnowledgeList');
  if (listEl) listEl.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Loading articles...</p>';

  try {
    const res = await api.getHelpArticles();
    cachedKnowledgeArticles = res.articles || [];
    renderQuickKnowledgeItems('');
  } catch (err) {
    if (listEl) listEl.innerHTML = `<p class="text-xs text-rose-500 py-4 text-center">Failed to load: ${esc(err.message)}</p>`;
  }
}

function renderQuickKnowledgeItems(query) {
  const listEl = $('quickKnowledgeList');
  if (!listEl) return;

  let list = cachedKnowledgeArticles;
  if (query) {
    list = list.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.content.toLowerCase().includes(query) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  if (!list.length) {
    listEl.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No matching articles found.</p>';
    return;
  }

  listEl.innerHTML = list.map(art => `
    <div class="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#128C7E]/40 hover:bg-slate-50 transition cursor-pointer" data-quick-art-id="${art.id}">
      <div class="flex items-center justify-between mb-1">
        <h4 class="text-xs font-semibold text-slate-800">${esc(art.title)}</h4>
        <span class="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px]">${esc(art.category || 'General')}</span>
      </div>
      <p class="text-[11px] text-slate-500 line-clamp-2">${esc(art.content)}</p>
      <div class="mt-2 flex justify-end">
        <button type="button" class="text-[10px] font-semibold text-[#128C7E] hover:underline" data-quick-insert="${art.id}">Insert Article &rarr;</button>
      </div>
    </div>
  `).join('');
}


export async function loadLogsList() {
  const host = $('logList');
  if (!host) return;
  host.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">جاري تحميل سجل الرسائل...</p>';

  try {
    const data = await api.logs();
    cachedLogs = data.logs || [];
    if (!cachedLogs.length) {
      host.innerHTML = `
        <div class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <i data-lucide="inbox" class="mx-auto h-8 w-8 text-slate-400 mb-2"></i>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">لا توجد رسائل مسجلة بعد</p>
          <p class="text-xs text-slate-500 mt-1">تظهر هنا كافة الرسائل الواردة وردود البوت الذكي والمستشارين.</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    host.innerHTML = cachedLogs.map((l) => `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              ${esc((l.name || l.from || 'CL').slice(0, 2).toUpperCase())}
            </span>
            <span class="text-xs font-bold text-slate-900 dark:text-white">${esc(l.name || 'عميل')}</span>
            <span class="text-xs text-slate-400 font-mono" dir="ltr">+${esc(l.from || '')}</span>
          </div>
          <span class="text-[11px] text-slate-400">${l.at ? new Date(l.at).toLocaleString('ar-EG') : ''}</span>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-700 dark:text-slate-200">
          <span class="font-semibold text-slate-500 block mb-0.5">سؤال العميل:</span>
          ${fmtText(l.incoming || '—')}
        </div>
        ${l.reply ? `
          <div class="rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 p-3 text-xs text-teal-900 dark:text-teal-200">
            <span class="font-bold ${l.isHuman ? 'text-amber-700 dark:text-amber-300' : 'text-teal-700 dark:text-teal-400'} block mb-0.5">
              ${l.isHuman ? 'مستشار المبيعات (بشري):' : 'المساعد الذكي (آلي):'}
            </span>
            ${fmtText(l.reply)}
          </div>
        ` : ''}
      </div>
    `).join('');

    refreshIcons();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4 text-center">تعذر تحميل الرسائل: ${esc(err.message)}</p>`;
  }
}
