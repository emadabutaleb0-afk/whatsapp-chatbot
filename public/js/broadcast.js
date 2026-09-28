// Broadcast campaigns & customer CRM controller

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let campaigns = [];
let customers = [];

export function initBroadcast() {
  const form = $('broadcastForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = $('campTitle')?.value.trim();
      const message = $('campMessage')?.value.trim();
      const targetTag = $('campTag')?.value;

      if (!message) {
        toast('Please enter a message for the broadcast', 'err');
        return;
      }

      const btn = $('sendBroadcastBtn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="h-4 w-4 animate-spin"></i> Sending…';
      }

      try {
        const res = await api.sendCampaign({ title, message, targetTag });
        toast(`Broadcast dispatched to ${res.sentCount} recipients!`);
        if ($('campMessage')) $('campMessage').value = '';
        await loadBroadcast();
      } catch (err) {
        toast('Broadcast failed: ' + err.message, 'err');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="send" class="h-4 w-4"></i> Send Broadcast';
        }
        refreshIcons();
      }
    });
  }

  $('refreshBroadcastBtn')?.addEventListener('click', loadBroadcast);
}

export async function loadBroadcast() {
  try {
    const [campRes, custRes] = await Promise.all([
      api.getCampaigns(),
      api.getCustomers()
    ]);
    campaigns = campRes.campaigns || [];
    customers = custRes.customers || [];
    renderBroadcast();
  } catch (err) {
    console.error('Error loading broadcasts:', err);
  }
}

function renderBroadcast() {
  // Update audience stats
  const totalClients = customers.length;
  const buyerClients = customers.filter(c => (c.tags || []).includes('Buyer')).length;
  const regularClients = customers.filter(c => (c.tags || []).includes('Regular')).length;

  const totalEl = $('statTotalAudience');
  const buyersEl = $('statBuyers');
  const regularsEl = $('statRegulars');

  if (totalEl) totalEl.textContent = String(totalClients);
  if (buyersEl) buyersEl.textContent = String(buyerClients);
  if (regularsEl) regularsEl.textContent = String(regularClients);

  // Render Campaign history
  const historyHost = $('campaignsHistory');
  if (historyHost) {
    if (!campaigns.length) {
      historyHost.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No campaigns sent yet.</p>';
    } else {
      historyHost.innerHTML = campaigns.map(c => `
      <div class="card p-3 mb-2.5">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <p class="text-sm font-semibold text-slate-900">${esc(c.title)}</p>
          <span class="pill pill-ok text-[10px]">${c.sentCount} Sent</span>
        </div>
        <p class="text-xs text-slate-600 bg-slate-50 rounded p-2 mb-1 leading-relaxed">${esc(c.message)}</p>
        <div class="flex items-center justify-between text-[10px] text-slate-400">
          <span>Target: ${esc(c.targetTag || 'All')}</span>
          <span>${new Date(c.at).toLocaleDateString()}</span>
        </div>
      </div>`).join('');
    }
  }

  refreshIcons();
}
