// Team members & RBAC controller

import { $, esc, refreshIcons, toast } from './ui.js';
import { api } from './api.js';

let teamMembers = [];
export let currentRole = localStorage.getItem('clientbot_active_role') || 'admin';

export function initTeam(onRoleChanged) {
  $('inviteMemberBtn')?.addEventListener('click', () => {
    $('inviteModal')?.classList.remove('hidden');
  });

  $('closeInviteModal')?.addEventListener('click', () => {
    $('inviteModal')?.classList.add('hidden');
  });

  const inviteForm = $('inviteMemberForm');
  if (inviteForm) {
    inviteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('invName')?.value.trim();
      const email = $('invEmail')?.value.trim();
      const role = $('invRole')?.value;

      if (!name || !email) {
        toast('Please enter name and email', 'err');
        return;
      }

      try {
        await api.callTeamInvite({ name, email, role });
        toast(`Invited ${name} as ${role}!`);
        $('inviteModal')?.classList.add('hidden');
        if ($('invName')) $('invName').value = '';
        if ($('invEmail')) $('invEmail').value = '';
        await loadTeam();
      } catch (err) {
        toast('Failed to invite member: ' + err.message, 'err');
      }
    });
  }

  const teamList = $('teamMemberList');
  if (teamList) {
    teamList.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-del-member]');
      if (delBtn) {
        const id = delBtn.dataset.delMember;
        if (!confirm('Are you sure you want to remove this team member?')) return;
        try {
          await api.callTeamDelete(id);
          toast('Team member removed');
          await loadTeam();
        } catch (err) {
          toast('Failed to remove member: ' + err.message, 'err');
        }
      }
    });
  }

  // Active Role Switcher
  const roleSelect = $('activeRoleSelect');
  if (roleSelect) {
    roleSelect.value = currentRole;
    roleSelect.addEventListener('change', (e) => {
      currentRole = e.target.value;
      localStorage.setItem('clientbot_active_role', currentRole);
      toast(`Switched view to ${currentRole.toUpperCase()}`);
      if (onRoleChanged) onRoleChanged(currentRole);
      applyPermissions(currentRole);
    });
  }

  applyPermissions(currentRole);
}

export function applyPermissions(role) {
  const isViewer = role === 'viewer';
  const isEditor = role === 'editor';
  const isAdmin = role === 'admin';

  // Update badge in sidebar footer
  const badge = $('userRoleBadge');
  if (badge) {
    badge.textContent = role.toUpperCase();
    badge.className = 'text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ' +
      (isAdmin ? 'bg-emerald-100 text-emerald-800' : isEditor ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600');
  }

  // If Viewer: disable inputs, hide save button, hide delete buttons
  document.querySelectorAll('.save-sensitive, #saveBar, #addProductBtn, #addFaqBtn, #inviteMemberBtn').forEach(el => {
    el.classList.toggle('hidden', isViewer);
  });

  // If Editor: cannot edit WhatsApp credentials or business identity
  const waInputs = document.querySelectorAll('#f_phoneId, #f_verify, #f_token, #f_name, #f_tagline');
  waInputs.forEach(inp => {
    inp.disabled = isEditor || isViewer;
  });

  // Viewers cannot reply in live chat
  const replyForm = $('liveReplyForm');
  if (replyForm) {
    replyForm.style.display = isViewer ? 'none' : 'flex';
  }
}

export async function loadTeam() {
  const host = $('teamMemberList');
  if (!host) return;

  host.innerHTML = '<p class="text-sm text-slate-500 py-4">Loading team members…</p>';
  try {
    const res = await api.callTeamList();
    teamMembers = res.team || [];
    renderTeam();
  } catch (err) {
    host.innerHTML = `<p class="text-sm text-rose-600 py-4">Could not load team: ${esc(err.message)}</p>`;
  }
}

function roleBadge(r) {
  if (r === 'admin') return '<span class="pill bg-emerald-50 text-emerald-700 border border-emerald-200">Full Admin</span>';
  if (r === 'editor') return '<span class="pill bg-blue-50 text-blue-700 border border-blue-200">Manage FAQ &amp; Support</span>';
  return '<span class="pill bg-slate-100 text-slate-700">View-Only</span>';
}

function renderTeam() {
  const host = $('teamMemberList');
  if (!host) return;

  host.innerHTML = teamMembers.map(m => `
    <div class="card p-3.5 flex items-center justify-between gap-3 mb-2.5">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
          ${esc(m.name.slice(0, 2).toUpperCase())}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">${esc(m.name)}</p>
          <p class="text-xs text-slate-500 font-mono">${esc(m.email)}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        ${roleBadge(m.role)}
        ${m.role !== 'admin' ? `
          <button class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 save-sensitive" data-del-member="${m.id}" title="Remove member">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        ` : '<span class="text-xs text-slate-400 font-medium px-2">Owner</span>'}
      </div>
    </div>
  `).join('');

  refreshIcons();
}
