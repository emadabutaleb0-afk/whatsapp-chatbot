// Message Templates Library controller

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let templates = [];
let editingTplId = null;

export function initTemplates() {
  $('refreshTemplatesBtn')?.addEventListener('click', loadTemplates);

  const tplList = $('templatesList');
  if (tplList) {
    tplList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-tpl]');
      if (editBtn) {
        openEditModal(editBtn.dataset.editTpl);
        return;
      }

      const toggleBtn = e.target.closest('[data-toggle-tpl]');
      if (toggleBtn) {
        const id = toggleBtn.dataset.toggleTpl;
        const tpl = templates.find(t => t.id === id);
        if (tpl) {
          api.callUpdateTemplate(id, { enabled: !tpl.enabled })
            .then(() => {
              toast(`Template ${!tpl.enabled ? 'enabled' : 'disabled'}`);
              loadTemplates();
            })
            .catch(err => toast('Failed to toggle template: ' + err.message, 'err'));
        }
      }
    });
  }

  $('closeTplModal')?.addEventListener('click', () => {
    $('editTplModal')?.classList.add('hidden');
  });

  // Insert variable chip into template textarea
  $('tplVarChips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-var]');
    if (!chip) return;
    const varTag = chip.dataset.var;
    const txt = $('editTplContent');
    if (!txt) return;

    const start = txt.selectionStart;
    const end = txt.selectionEnd;
    txt.value = txt.value.substring(0, start) + varTag + txt.value.substring(end);
    txt.focus();
    txt.selectionStart = txt.selectionEnd = start + varTag.length;
  });

  $('editTplForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingTplId) return;
    const content = $('editTplContent')?.value.trim();
    if (!content) {
      toast('Template content cannot be empty', 'err');
      return;
    }

    try {
      await api.callUpdateTemplate(editingTplId, { content });
      toast('Template updated successfully!');
      $('editTplModal')?.classList.add('hidden');
      await loadTemplates();
    } catch (err) {
      toast('Failed to update template: ' + err.message, 'err');
    }
  });
}

function openEditModal(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  editingTplId = id;

  const titleEl = $('editTplTitle');
  const descEl = $('editTplDesc');
  const contentEl = $('editTplContent');

  if (titleEl) titleEl.textContent = tpl.name;
  if (descEl) descEl.textContent = tpl.description;
  if (contentEl) contentEl.value = tpl.content;

  $('editTplModal')?.classList.remove('hidden');
  contentEl?.focus();
}

export async function loadTemplates() {
  const host = $('templatesList');
  if (!host) return;

  host.innerHTML = '<p class="text-sm text-slate-500 py-4">Loading templates…</p>';
  try {
    const res = await api.callGetTemplates();
    templates = res.templates || [];
    renderTemplates();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4">Could not load templates: ${esc(err.message)}</p>`;
  }
}

function renderTemplates() {
  const host = $('templatesList');
  if (!host) return;

  host.innerHTML = templates.map(t => `
    <div class="card p-4 mb-3 border-l-4 ${t.enabled ? 'border-l-[#128C7E]' : 'border-l-slate-300 opacity-75'}">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          <p class="text-sm font-semibold text-slate-900">${esc(t.name)}</p>
          <span class="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Scenario: ${esc(t.scenario)}</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 save-sensitive" data-toggle-tpl="${t.id}">
            ${t.enabled ? 'Active' : 'Disabled'}
          </button>
          <button class="rounded-lg bg-[#128C7E] px-3 py-1 text-xs font-medium text-white hover:bg-[#0f7a6e] save-sensitive" data-edit-tpl="${t.id}">
            Edit Template
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-500 mb-2">${esc(t.description)}</p>
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">${esc(t.content)}</div>
    </div>
  `).join('');

  refreshIcons();
}
