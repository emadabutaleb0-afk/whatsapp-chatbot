// Bookings & Reservations management controller

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let reservations = [];

export function initReservations() {
  $('refreshResBtn')?.addEventListener('click', loadReservations);

  const resList = $('reservationsList');
  if (resList) {
    resList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-res-status]');
      if (!btn) return;
      const resCard = btn.closest('[data-res-id]');
      const resId = resCard.dataset.resId;
      const newStatus = btn.dataset.resStatus;

      btn.disabled = true;
      try {
        await api.updateReservationStatus(resId, newStatus);
        toast(`Reservation updated to ${newStatus}`);
        await loadReservations();
      } catch (err) {
        toast('Could not update reservation: ' + err.message, 'err');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function resBadge(s) {
  if (s === 'confirmed') return '<span class="pill pill-ok">Confirmed</span>';
  if (s === 'completed') return '<span class="pill bg-slate-100 text-slate-700">Completed</span>';
  if (s === 'cancelled') return '<span class="pill pill-err">Cancelled</span>';
  return '<span class="pill pill-warn">Pending</span>';
}

function reservationCardHTML(r) {
  return `
  <div class="card" data-res-id="${r.id}">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-sm text-slate-900">${esc(r.clientName)}</span>
        ${resBadge(r.status)}
      </div>
      <span class="text-xs text-slate-400 font-mono">+${esc(r.clientPhone)}</span>
    </div>

    <div class="grid gap-3 sm:grid-cols-3 mb-3">
      <div class="bg-slate-50 rounded-lg p-2.5">
        <p class="text-[11px] font-semibold uppercase text-slate-400">Attendees / Guests</p>
        <p class="text-sm font-semibold text-slate-900 mt-0.5">${r.partySize || 1} Person(s)</p>
      </div>
      <div class="bg-slate-50 rounded-lg p-2.5">
        <p class="text-[11px] font-semibold uppercase text-slate-400">Drive Date & Time</p>
        <p class="text-sm font-semibold text-slate-900 mt-0.5">${esc(r.date || r.time)}</p>
      </div>
      <div class="bg-slate-50 rounded-lg p-2.5">
        <p class="text-[11px] font-semibold uppercase text-slate-400">Booked At</p>
        <p class="text-xs text-slate-600 mt-1">${new Date(r.at).toLocaleDateString()}</p>
      </div>
    </div>

    ${r.notes ? `<p class="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/50 rounded-lg p-2 mb-3">Note: ${esc(r.notes)}</p>` : ''}

    <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
      <button class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" data-res-status="confirmed">Confirm</button>
      <button class="rounded-lg bg-[#128C7E] px-3 py-1 text-xs font-medium text-white hover:bg-[#0f7a6e]" data-res-status="completed">Mark Completed</button>
      <button class="rounded-lg border border-rose-200 text-rose-600 px-3 py-1 text-xs font-medium hover:bg-rose-50 ml-auto" data-res-status="cancelled">Cancel</button>
    </div>
  </div>`;
}

export async function loadReservations() {
  const host = $('reservationsList');
  if (!host) return;

  host.innerHTML = '<p class="text-sm text-slate-500 py-4">Loading reservations…</p>';
  try {
    const res = await api.getReservations();
    reservations = res.reservations || [];
    renderReservations();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4">Could not load reservations: ${esc(err.message)}</p>`;
  }
}

function renderReservations() {
  const host = $('reservationsList');
  if (!host) return;

  if (!reservations.length) {
    host.innerHTML = `
    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i data-lucide="gauge" class="mx-auto h-6 w-6 text-slate-300"></i>
      <p class="mt-3 text-sm font-medium text-slate-700">No test drive appointments scheduled yet</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">When clients ask to schedule a test drive or vehicle viewing on WhatsApp (e.g. "حجز تجربة قيادة لتويوتا كورولا بكره"), appointments appear here.</p>
    </div>`;
  } else {
    host.innerHTML = reservations.map(reservationCardHTML).join('');
  }
  refreshIcons();
}
