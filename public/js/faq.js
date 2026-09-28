// FAQ answers manager — the owner's preferred wording for repeated questions.

import { $, esc, refreshIcons, toast, uid } from './ui.js';
import { api } from './api.js';

let ctx = null;          // { state, markDirty, save, goto, testInChat }
let search = '';
const open = new Set();

export function initFaq(context) {
  ctx = context;

  const addBtn = $('addFaqBtn');
  if (addBtn) addBtn.addEventListener('click', () => addEntry());

  const suggestBtn = $('suggestFaqBtn');
  if (suggestBtn) suggestBtn.addEventListener('click', suggest);

  const searchInput = $('faqSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      search = e.target.value.trim();
      renderFaq();
    });
  }

  const faqList = $('faqList');
  if (faqList) {
    faqList.addEventListener('input', (e) => {
      const row = e.target.closest('[data-faq]');
      if (!row) return;
      syncFromDom();
      if (e.target.classList.contains('q-input')) {
        const head = row.querySelector('.faq-q');
        if (head) head.textContent = e.target.value.trim() || 'New question';
      }
      ctx.markDirty();
      updateStats();
    });

    faqList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-faq]');
      if (!row) return;
      const id = row.dataset.faq;

      if (e.target.closest('.faq-del')) {
        e.stopPropagation();
        syncFromDom();
        ctx.state.config.faqEntries = (ctx.state.config.faqEntries || []).filter((f) => f.id !== id);
        open.delete(id);
        ctx.markDirty();
        renderFaq();
        return;
      }
      const modeBtn = e.target.closest('.mode-btn');
      if (modeBtn) {
        e.stopPropagation();
        syncFromDom();
        const entry = (ctx.state.config.faqEntries || []).find((f) => f.id === id);
        if (entry) entry.mode = modeBtn.dataset.mode;
        ctx.markDirty();
        renderFaq();
        return;
      }
      if (e.target.closest('.faq-test')) {
        e.stopPropagation();
        syncFromDom();
        const entry = (ctx.state.config.faqEntries || []).find((f) => f.id === id);
        if (entry && entry.question && ctx.testInChat) {
          ctx.testInChat(entry.question);
        }
        return;
      }
      if (e.target.closest('.faq-head')) {
        syncFromDom();
        if (open.has(id)) open.delete(id);
        else open.add(id);
        renderFaq();
      }
    });
  }
}

export function addEntry(prefill = {}) {
  if (!ctx || !ctx.state.config) return;
  syncFromDom();
  const entry = {
    id: uid(),
    question: prefill.question || '',
    answer: prefill.answer || '',
    aliases: prefill.aliases || '',
    mode: prefill.mode || 'exact',
  };
  ctx.state.config.faqEntries = [entry, ...(ctx.state.config.faqEntries || [])];
  open.clear();
  open.add(entry.id);
  search = '';
  if ($('faqSearch')) $('faqSearch').value = '';
  ctx.markDirty();
  renderFaq();
  const el = document.querySelector(`[data-faq="${entry.id}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const target = el.querySelector(prefill.question ? '.a-input' : '.q-input');
    if (target) target.focus();
  }
  return entry;
}

export function syncFromDom() {
  if (!ctx || !ctx.state.config) return;
  const rows = document.querySelectorAll('[data-faq]');
  if (!rows.length) return;
  const byId = {};
  rows.forEach((row) => {
    const q = row.querySelector('.q-input');
    if (!q) return; // collapsed row
    byId[row.dataset.faq] = {
      question: q.value.trim(),
      answer: (row.querySelector('.a-input')?.value || '').trim(),
      aliases: (row.querySelector('.al-input')?.value || '').trim(),
    };
  });
  ctx.state.config.faqEntries = (ctx.state.config.faqEntries || []).map((f) =>
    byId[f.id] ? { ...f, ...byId[f.id] } : f
  );
}

export function collectFaqs() {
  syncFromDom();
  return (ctx.state.config.faqEntries || []).filter((f) => f.question || f.answer);
}

function entryHTML(f) {
  const isOpen = open.has(f.id);
  const aliasCount = String(f.aliases || '').split('\n').filter((s) => s.trim()).length;
  const incomplete = !f.question || !f.answer;
  return `
  <div class="faq-card" data-faq="${f.id}">
    <div class="faq-head">
      <i data-lucide="${isOpen ? 'chevron-down' : 'chevron-right'}" class="h-4 w-4 flex-none text-slate-400"></i>
      <span class="faq-q">${esc(f.question || 'New question')}</span>
      ${incomplete ? '<span class="pill pill-warn">Incomplete</span>' : ''}
      ${f.mode === 'exact' ? '<span class="pill pill-ok">Exact</span>' : ''}
      ${aliasCount ? `<span class="hidden text-[11px] text-slate-400 sm:inline">+${aliasCount} variant${aliasCount > 1 ? 's' : ''}</span>` : ''}
      <button class="faq-del flex-none rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
        <i data-lucide="trash-2" class="h-4 w-4"></i>
      </button>
    </div>
    ${isOpen ? `
    <div class="faq-body">
      <label class="field"><span>Client question</span>
        <input class="inp q-input" value="${esc(f.question)}" placeholder="What time do you open?">
      </label>
      <label class="field mt-4"><span>Your preferred answer</span>
        <textarea class="inp a-input" rows="3" placeholder="We're open every day from 8 AM to 10 PM.">${esc(f.answer)}</textarea>
      </label>
      <label class="field mt-4"><span>Other ways clients ask it <span class="text-slate-400">(one per line)</span></span>
        <textarea class="inp al-input" rows="2" placeholder="are you open now?&#10;what are your hours?">${esc(f.aliases)}</textarea>
      </label>
      <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        <span class="mr-1 text-xs font-medium text-slate-500">Reply style:</span>
        <button type="button" class="mode-btn ${f.mode !== 'exact' ? 'active' : ''}" data-mode="guide">Natural wording</button>
        <button type="button" class="mode-btn ${f.mode === 'exact' ? 'active' : ''}" data-mode="exact">Send word for word</button>
        <button type="button" class="faq-test ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
          <i data-lucide="play" class="h-3.5 w-3.5"></i> Test in chat
        </button>
      </div>
    </div>` : ''}
  </div>`;
}

const STARTERS = [
  { question: 'What are your opening hours?', answer: '', aliases: 'are you open now?\nwhat time do you close?' },
  { question: 'Where are you located?', answer: '', aliases: 'what is your address?\nhow do I get to you?' },
  { question: 'Do you deliver?', answer: '', aliases: 'how much is delivery?\ndo you ship?' },
  { question: 'What payment methods do you accept?', answer: '', aliases: 'do you take card?\ncan I pay with instapay?' },
];

export function renderFaq() {
  const all = (ctx && ctx.state.config && ctx.state.config.faqEntries) || [];
  const q = search.toLowerCase();
  const list = q
    ? all.filter((f) => (f.question + ' ' + f.answer + ' ' + (f.aliases || '')).toLowerCase().includes(q))
    : all;

  const host = $('faqList');
  if (!host) return;

  if (!all.length) {
    host.innerHTML = `
    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i data-lucide="book-open-check" class="mx-auto h-6 w-6 text-slate-300"></i>
      <p class="mt-3 text-sm font-medium text-slate-700">No FAQ answers yet</p>
      <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">Add the questions clients ask most, with the exact answer you'd give. Your bot will reuse your wording every single time instead of improvising.</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        ${STARTERS.map((s, i) => `<button type="button" class="chip" data-starter="${i}">${esc(s.question)}</button>`).join('')}
      </div>
    </div>`;
  } else if (!list.length) {
    host.innerHTML = '<p class="px-1 py-8 text-center text-sm text-slate-500">No questions match your search.</p>';
  } else {
    host.innerHTML = list.map(entryHTML).join('');
  }

  host.querySelectorAll('[data-starter]').forEach((b) => b.addEventListener('click', () => {
    addEntry(STARTERS[Number(b.dataset.starter)]);
  }));

  updateStats();
  refreshIcons();
}

function updateStats() {
  const all = (ctx && ctx.state.config && ctx.state.config.faqEntries) || [];
  const ready = all.filter((f) => f.question && f.answer).length;
  const exact = all.filter((f) => f.mode === 'exact').length;
  const statsEl = $('faqStats');
  if (statsEl) {
    statsEl.textContent = all.length
      ? `${ready} of ${all.length} ready · ${exact} sent word for word`
      : '';
  }
  const badge = $('faqCount');
  if (badge) badge.textContent = String(ready);
}

/* ---------- AI suggestions from the saved business info ---------- */

async function suggest() {
  const btn = $('suggestFaqBtn');
  const cfg = (ctx && ctx.state.config) || {};
  const b = cfg.business || {};
  const hasInfo = b.hours || b.location || b.delivery || b.payment || (cfg.products || []).length;
  if (!hasInfo) {
    toast('Add your hours, location or products first.', 'err');
    if (ctx && ctx.goto) ctx.goto('business');
    return;
  }

  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader" class="h-4 w-4 animate-spin"></i> Generating…';
  refreshIcons();

  try {
    const res = await api.suggestFaq();
    const suggestions = res.suggestions || [];
    syncFromDom();
    let added = 0;
    suggestions.forEach((item) => {
      if (!item || !item.question || !item.answer) return;
      const dup = (ctx.state.config.faqEntries || []).some((f) =>
        f.question.trim().toLowerCase() === String(item.question).trim().toLowerCase()
      );
      if (dup) return;
      ctx.state.config.faqEntries.push({
        id: uid(),
        question: String(item.question).trim(),
        answer: String(item.answer).trim(),
        aliases: String(item.aliases || '').trim(),
        mode: item.mode || 'exact',
      });
      added++;
    });
    ctx.markDirty();
    renderFaq();
    toast(added ? `Added ${added} draft answer${added > 1 ? 's' : ''} — review and save.` : 'No new suggestions found.');
  } catch (e) {
    toast('Could not generate suggestions: ' + (e.message || ''), 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    refreshIcons();
  }
}
