// ClientBot AI - Help Center Knowledge Base & Conversational Learning Controller

import { $, esc, refreshIcons, toast, fmtText } from './ui.js';
import { api } from './api.js';

let articles = [];
let editingArticleId = null;
let activeCategory = 'all';
let searchQuery = '';
let learnedInsights = null;
let knowledgeGaps = [];
let gapsFilter = 'open';
let resolvingGapId = null;

export function initHelpCenter(context) {
  // Add Article button
  $('addArticleBtn')?.addEventListener('click', () => {
    openArticleModal(null);
  });

  // Close Article Modal
  $('closeArticleModal')?.addEventListener('click', () => {
    resolvingGapId = null;
    $('articleModal')?.classList.add('hidden');
  });

  // Auto-Learn button
  $('autoLearnBtn')?.addEventListener('click', handleAutoLearn);

  // Close Auto-Learn Modal
  $('closeAutoLearnModal')?.addEventListener('click', () => {
    $('autoLearnModal')?.classList.add('hidden');
  });

  // Search input
  $('helpSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderArticles();
  });

  // Toggle Gaps Filter (Open vs All)
  $('toggleGapsFilter')?.addEventListener('click', () => {
    gapsFilter = gapsFilter === 'open' ? 'all' : 'open';
    const filterBtn = $('toggleGapsFilter');
    if (filterBtn) {
      filterBtn.textContent = gapsFilter === 'open' ? 'Filter: Open Gaps' : 'Filter: All Gaps';
    }
    renderKnowledgeGaps();
  });

  // Knowledge Gaps Resolution Listener
  $('knowledgeGapsContainer')?.addEventListener('click', async (e) => {
    const resolveBtn = e.target.closest('[data-resolve-gap]');
    if (resolveBtn) {
      const gapId = resolveBtn.dataset.resolveGap;
      const gap = knowledgeGaps.find(g => g.id === gapId);
      if (gap) {
        openArticleModal(null, {
          title: gap.suggestedTitle,
          category: gap.category,
          tags: gap.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          content: gap.suggestedDraft
        }, gap.id);
      }
    }
  });

  // Category filter
  $('helpCategoryFilter')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-help-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.helpCat;
    document.querySelectorAll('[data-help-cat]').forEach(b => {
      b.classList.toggle('active', b.dataset.helpCat === activeCategory);
      b.classList.toggle('bg-[#128C7E]', b.dataset.helpCat === activeCategory);
      b.classList.toggle('text-white', b.dataset.helpCat === activeCategory);
      b.classList.toggle('bg-slate-100', b.dataset.helpCat !== activeCategory);
      b.classList.toggle('text-slate-600', b.dataset.helpCat !== activeCategory);
    });
    renderArticles();
  });

  // Article form submit
  $('articleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('artTitle')?.value.trim();
    const category = $('artCategory')?.value.trim();
    const tags = $('artTags')?.value.trim();
    const content = $('artContent')?.value.trim();

    if (!title || !content) {
      toast('Title and content are required', 'err');
      return;
    }

    try {
      if (editingArticleId) {
        await api.updateHelpArticle(editingArticleId, { title, category, tags, content });
        toast('Article updated successfully!');
      } else {
        const res = await api.addHelpArticle({ title, category, tags, content });
        if (resolvingGapId && res?.article?.id) {
          await api.callAddressKnowledgeGap(resolvingGapId, res.article.id).catch(() => {});
          resolvingGapId = null;
        }
        toast('Help Center article created!');
      }
      $('articleModal')?.classList.add('hidden');
      await loadHelpCenter();
    } catch (err) {
      toast('Failed to save article: ' + err.message, 'err');
    }
  });

  // Articles list actions (Edit & Delete)
  $('articlesList')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit-art]');
    if (editBtn) {
      const id = editBtn.dataset.editArt;
      openArticleModal(id);
      return;
    }

    const delBtn = e.target.closest('[data-del-art]');
    if (delBtn) {
      const id = delBtn.dataset.delArt;
      if (!confirm('Are you sure you want to delete this help center article?')) return;
      try {
        await api.deleteHelpArticle(id);
        toast('Article deleted');
        await loadHelpCenter();
      } catch (err) {
        toast('Failed to delete article: ' + err.message, 'err');
      }
    }
  });

  // Auto-Learn list actions: 1-click promote to Article or FAQ
  $('autoLearnList')?.addEventListener('click', async (e) => {
    const promoteFaqBtn = e.target.closest('[data-promote-faq]');
    if (promoteFaqBtn) {
      const candidateId = promoteFaqBtn.dataset.promoteFaq;
      const candidate = (learnedInsights?.candidates || []).find(c => c.id === candidateId);
      if (candidate && context?.createFaqFrom) {
        $('autoLearnModal')?.classList.add('hidden');
        context.createFaqFrom(candidate.question);
        toast('Promoted to FAQ! Edit and save your approved answer.');
      }
      return;
    }

    const promoteArtBtn = e.target.closest('[data-promote-art]');
    if (promoteArtBtn) {
      const candidateId = promoteArtBtn.dataset.promoteArt;
      const candidate = (learnedInsights?.candidates || []).find(c => c.id === candidateId);
      if (candidate) {
        $('autoLearnModal')?.classList.add('hidden');
        openArticleModal(null, {
          title: candidate.question,
          category: candidate.category,
          tags: (candidate.tags || []).join(', '),
          content: candidate.suggestedAnswer
        });
      }
    }
  });
}

function openArticleModal(id, prefill = null, fromGapId = null) {
  editingArticleId = id;
  resolvingGapId = fromGapId;
  const modal = $('articleModal');
  if (!modal) return;

  const modalTitle = $('articleModalTitle');
  const titleInp = $('artTitle');
  const catInp = $('artCategory');
  const tagsInp = $('artTags');
  const contentInp = $('artContent');

  if (id) {
    const art = articles.find(a => a.id === id);
    if (!art) return;
    if (modalTitle) modalTitle.textContent = 'Edit Knowledge Base Article';
    if (titleInp) titleInp.value = art.title;
    if (catInp) catInp.value = art.category;
    if (tagsInp) tagsInp.value = (art.tags || []).join(', ');
    if (contentInp) contentInp.value = art.content;
  } else if (prefill) {
    if (modalTitle) modalTitle.textContent = 'Add Learned Article to Knowledge Base';
    if (titleInp) titleInp.value = prefill.title || '';
    if (catInp) catInp.value = prefill.category || 'General';
    if (tagsInp) tagsInp.value = prefill.tags || '';
    if (contentInp) contentInp.value = prefill.content || '';
  } else {
    if (modalTitle) modalTitle.textContent = 'New Knowledge Base Article';
    if (titleInp) titleInp.value = '';
    if (catInp) catInp.value = 'General';
    if (tagsInp) tagsInp.value = '';
    if (contentInp) contentInp.value = '';
  }

  modal.classList.remove('hidden');
  titleInp?.focus();
}

async function handleAutoLearn() {
  const btn = $('autoLearnBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> Analyzing past chats…';
  }
  refreshIcons();

  try {
    const res = await api.autoLearnFromChats();
    learnedInsights = res.insights || {};
    renderAutoLearnModal();
    $('autoLearnModal')?.classList.remove('hidden');
  } catch (err) {
    toast('Auto-learning failed: ' + err.message, 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="sparkles" class="h-4 w-4 text-amber-500"></i> Auto-Learn from Past Chats';
      refreshIcons();
    }
  }
}

function renderAutoLearnModal() {
  const metaEl = $('autoLearnMeta');
  if (metaEl && learnedInsights) {
    metaEl.textContent = `Analyzed ${learnedInsights.analyzedChatsCount || 30}+ interactions • Discovered ${learnedInsights.newInsightsFound || 5} recurring customer needs`;
  }

  const listEl = $('autoLearnList');
  if (!listEl) return;

  const candidates = (learnedInsights && learnedInsights.candidates) || [];
  if (!candidates.length) {
    listEl.innerHTML = '<p class="text-sm text-slate-500 py-6 text-center">No new recurring question patterns found yet. Chat more with customers to train the AI!</p>';
    return;
  }

  listEl.innerHTML = candidates.map(c => `
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#128C7E]/40 transition">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          <span class="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">${esc(c.category || 'General')}</span>
          <span class="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 font-mono">${Math.round(c.confidence * 100)}% Confidence</span>
          <span class="text-xs text-slate-400">Asked ${c.frequency}×</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" data-promote-faq="${c.id}" title="Turn into exact FAQ match">
            + Add to FAQ
          </button>
          <button class="rounded-lg bg-[#128C7E] px-3 py-1 text-xs font-medium text-white hover:bg-[#0f7a6e] shadow-sm" data-promote-art="${c.id}" title="Save as Help Center Article">
            + Save as Article
          </button>
        </div>
      </div>
      <p class="text-sm font-semibold text-slate-900 mb-1">${esc(c.question)}</p>
      <div class="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 leading-relaxed border border-slate-100">${esc(c.suggestedAnswer)}</div>
    </div>
  `).join('');

  refreshIcons();
}

export async function loadHelpCenter() {
  const host = $('articlesList');
  if (!host) return;

  host.innerHTML = '<p class="text-sm text-slate-500 py-6">Loading Help Center articles…</p>';
  try {
    const [res] = await Promise.all([
      api.getHelpArticles(),
      loadKnowledgeGaps()
    ]);
    articles = res.articles || [];
    renderCategoriesFilter();
    renderArticles();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4">Could not load articles: ${esc(err.message)}</p>`;
  }
}

async function loadKnowledgeGaps() {
  try {
    const res = await api.callGetKnowledgeGaps();
    knowledgeGaps = res.gaps || [];
    renderKnowledgeGaps();
  } catch (err) {
    console.error('Failed to load knowledge gaps:', err);
  }
}

function renderKnowledgeGaps() {
  const container = $('knowledgeGapsContainer');
  const rateEl = $('gapsResolutionRate');
  if (!container) return;

  const total = knowledgeGaps.length;
  const addressed = knowledgeGaps.filter(g => g.status === 'addressed').length;
  const rate = total ? Math.round((addressed / total) * 100) : 100;

  if (rateEl) {
    rateEl.textContent = `${rate}% Addressed (${addressed}/${total})`;
  }

  let list = knowledgeGaps;
  if (gapsFilter === 'open') {
    list = list.filter(g => g.status === 'open');
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-center">
        <p class="text-xs text-slate-500 font-medium">🎉 No open knowledge gaps! Your self-service knowledge base covers all common inquiries.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(gap => {
    const isAddressed = gap.status === 'addressed';
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border ${isAddressed ? 'border-emerald-200 bg-emerald-50/40' : 'border-indigo-100 bg-white'} p-3.5 shadow-xs hover:border-indigo-300 transition">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold">${esc(gap.category)}</span>
            <span class="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium font-mono">Inquired ${gap.frequency}×</span>
            ${isAddressed ?
              '<span class="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase">Addressed</span>' :
              '<span class="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">Open Gap</span>'}
          </div>
          <p class="text-xs font-semibold text-slate-900 leading-snug">${esc(gap.question)}</p>
          <p class="text-[11px] text-slate-500 mt-1"><span class="font-medium text-slate-700">AI Suggested Article:</span> "${esc(gap.suggestedTitle)}"</p>
        </div>
        <div class="shrink-0">
          ${isAddressed ?
            `<span class="text-xs text-emerald-700 font-medium flex items-center gap-1"><i data-lucide="check-circle" class="h-3.5 w-3.5"></i> Resolved</span>` :
            `<button type="button" class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 shadow-xs" data-resolve-gap="${gap.id}">
               <i data-lucide="sparkles" class="h-3.5 w-3.5 text-indigo-200"></i>
               <span>Create Article</span>
             </button>`}
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function renderCategoriesFilter() {
  const filterHost = $('helpCategoryFilter');
  if (!filterHost) return;

  const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))];
  filterHost.innerHTML = categories.map(cat => {
    const label = cat === 'all' ? 'All Articles' : cat;
    const isActive = cat === activeCategory;
    return `
      <button data-help-cat="${esc(cat)}" class="rounded-full px-3 py-1 text-xs font-medium transition ${isActive ? 'bg-[#128C7E] text-white active' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        ${esc(label)}
      </button>
    `;
  }).join('');
}

function renderArticles() {
  const host = $('articlesList');
  if (!host) return;

  let filtered = articles;

  if (activeCategory !== 'all') {
    filtered = filtered.filter(a => a.category === activeCategory);
  }

  if (searchQuery) {
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(searchQuery) ||
      a.content.toLowerCase().includes(searchQuery) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(searchQuery)))
    );
  }

  const countBadge = $('articlesCountBadge');
  if (countBadge) countBadge.textContent = String(filtered.length);

  if (!filtered.length) {
    host.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <i data-lucide="book-open" class="mx-auto h-8 w-8 text-slate-300"></i>
        <p class="mt-3 text-sm font-semibold text-slate-700">No articles found</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-slate-500">Add knowledge base articles or click "Auto-Learn from Past Chats" to let ClientBot AI synthesize insights.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  host.innerHTML = filtered.map(a => `
    <div class="card p-5 border-l-4 border-l-[#128C7E] shadow-sm hover:shadow transition">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 border border-emerald-200">${esc(a.category || 'General')}</span>
            <span class="text-xs text-slate-400">Updated ${new Date(a.updatedAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <h3 class="text-base font-semibold text-slate-900">${esc(a.title)}</h3>
        </div>
        <div class="flex items-center gap-1.5 save-sensitive">
          <button class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" data-edit-art="${a.id}">
            Edit
          </button>
          <button class="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" data-del-art="${a.id}" title="Delete article">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">${esc(a.content)}</p>
      ${a.tags && a.tags.length ? `
        <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span class="text-[10px] uppercase font-bold text-slate-400 mr-1">Tags:</span>
          ${a.tags.map(t => `<span class="rounded bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5">#${esc(t)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  refreshIcons();
}
