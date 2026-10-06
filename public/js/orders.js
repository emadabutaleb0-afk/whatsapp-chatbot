// Orders management controller

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let orders = [];

export function initOrders() {
  $('refreshOrdersBtn')?.addEventListener('click', loadOrders);

  const orderList = $('ordersList');
  if (orderList) {
    orderList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-order-status]');
      if (!btn) return;
      const orderCard = btn.closest('[data-order-id]');
      const orderId = orderCard.dataset.orderId;
      const newStatus = btn.dataset.orderStatus;

      btn.disabled = true;
      try {
        await api.updateOrderStatus(orderId, newStatus);
        toast(`Order updated to ${newStatus}`);
        await loadOrders();
      } catch (err) {
        toast('Could not update order: ' + err.message, 'err');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function orderStatusBadge(s) {
  if (s === 'delivered') return '<span class="pill pill-ok">Delivered</span>';
  if (s === 'preparing') return '<span class="pill bg-blue-50 text-blue-700 border border-blue-200">Preparing</span>';
  if (s === 'confirmed') return '<span class="pill bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>';
  if (s === 'cancelled') return '<span class="pill pill-err">Cancelled</span>';
  return '<span class="pill pill-warn">Pending</span>';
}

function orderCardHTML(o) {
  const itemsHTML = (o.items || []).map(it => `
    <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
      <span class="text-slate-800 font-medium">${it.qty}× ${esc(it.name)}</span>
      <span class="text-slate-500">${esc(it.subtotal || it.price)}</span>
    </div>
  `).join('');

  return `
  <div class="card" data-order-id="${o.id}">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
      <div class="flex items-center gap-2">
        <span class="font-mono text-sm font-bold text-slate-900">${esc(o.orderNumber || o.id)}</span>
        ${orderStatusBadge(o.status)}
      </div>
      <span class="text-xs text-slate-400">${new Date(o.at).toLocaleString()}</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2 mb-3">
      <div>
        <p class="text-xs text-slate-400 font-medium">Customer</p>
        <p class="text-sm font-medium text-slate-900">${esc(o.clientName)}</p>
        <p class="text-xs text-slate-500 font-mono">+${esc(o.clientPhone)}</p>
      </div>
      <div>
        <p class="text-xs text-slate-400 font-medium">Delivery Address</p>
        <p class="text-xs text-slate-700 leading-relaxed">${esc(o.address || 'Pickup')}</p>
        ${o.notes ? `<p class="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">Note: ${esc(o.notes)}</p>` : ''}
      </div>
    </div>

    <div class="bg-slate-50 rounded-lg p-2.5 mb-3">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Items</p>
      ${itemsHTML || '<p class="text-xs text-slate-400">No items specified</p>'}
      <div class="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between font-semibold text-sm text-slate-900">
        <span>Total:</span>
        <span class="text-[#0f766e]">${esc(o.total)}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 pt-2">
      <span class="text-xs font-medium text-slate-400 mr-1">Update Status:</span>
      <button class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" data-order-status="confirmed">Confirm</button>
      <button class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" data-order-status="preparing">Preparing</button>
      <button class="rounded-lg bg-[#128C7E] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0f7a6e]" data-order-status="delivered">Delivered</button>
      <button class="rounded-lg border border-rose-200 text-rose-600 px-2.5 py-1 text-xs font-medium hover:bg-rose-50 ml-auto" data-order-status="cancelled">Cancel</button>
    </div>
  </div>`;
}

export async function loadOrders() {
  const host = $('ordersList');
  if (!host) return;

  host.innerHTML = '<p class="text-sm text-slate-500 py-4">Loading orders…</p>';
  try {
    const res = await api.getOrders();
    orders = res.orders || [];
    renderOrders();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4">Could not load orders: ${esc(err.message)}</p>`;
  }
}

function renderOrders() {
  const host = $('ordersList');
  if (!host) return;

  const badge = $('ordersCountBadge');
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
  if (badge) {
    badge.textContent = String(pendingCount);
    badge.classList.toggle('hidden', pendingCount === 0);
  }

  if (!orders.length) {
    host.innerHTML = `
    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i data-lucide="car" class="mx-auto h-6 w-6 text-slate-300"></i>
      <p class="mt-3 text-sm font-medium text-slate-700">No car purchase bookings yet</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">When clients request to purchase or reserve a car via WhatsApp (e.g. "عايز احجز مرسيدس C200 زيرو"), bookings appear here in real-time.</p>
    </div>`;
  } else {
    host.innerHTML = orders.map(orderCardHTML).join('');
  }
  refreshIcons();
}
