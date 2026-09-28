import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';

export const $ = (id) => document.getElementById(id);

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function refreshIcons() {
  try {
    createIcons({ icons });
  } catch (e) {
    /* ignore */
  }
}

let toastTimer = null;
export function toast(msg, kind = 'ok') {
  const t = $('toast');
  if (!t) return;
  const icon = kind === 'err'
    ? '<svg class="h-4 w-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
    : '<svg class="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  t.innerHTML = icon + '<span>' + esc(msg) + '</span>';
  t.className = 'fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg transition-all toast-enhanced flex items-center gap-2.5 ' +
    (kind === 'err' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800');
  clearTimeout(toastTimer);
  t.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(24px)';
    setTimeout(() => { t.classList.add('hidden'); t.style.opacity = ''; t.style.transform = ''; }, 300);
  }, 3500);
}

export function fmtText(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline text-[#128C7E]">$1</a>');
}

export function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return Math.round(ms) + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
