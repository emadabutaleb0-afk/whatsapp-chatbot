// API client connecting frontend to backend server endpoints

async function call(path, options = {}) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  status: () => call('/api/status'),
  getConfig: () => call('/api/config'),
  saveConfig: (payload) => call('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  logs: () => call('/api/logs'),
  clearLogs: () => call('/api/logs', { method: 'DELETE' }),
  metrics: (days = 30) => call('/api/metrics?days=' + days),
  clearMetrics: () => call('/api/metrics', { method: 'DELETE' }),
  seedDemo: () => call('/api/metrics/demo', { method: 'POST' }),
  clearUnanswered: () => call('/api/unanswered', { method: 'DELETE' }),
  testSend: (to, text) => call('/api/test-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, text })
  }),
  chat: (message, history) => call('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  }),
  suggestFaq: () => call('/api/faq/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }),
  // Orders
  getOrders: () => call('/api/orders'),
  updateOrderStatus: (id, status) => call(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }),
  // Bookings & Reservations
  getReservations: () => call('/api/reservations'),
  updateReservationStatus: (id, status) => call(`/api/reservations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }),
  // Live Chat & Human Handover
  getConversations: () => call('/api/conversations'),
  replyConversation: (to, text) => call('/api/conversations/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, text })
  }),
  toggleTakeover: (phone, isTakeover) => call('/api/conversations/takeover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, isTakeover })
  }),
  // Campaigns & Customers
  getCustomers: () => call('/api/customers'),
  getCampaigns: () => call('/api/campaigns'),
  sendCampaign: (payload) => call('/api/campaigns/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  // Team & Permissions (RBAC)
  callTeamList: () => call('/api/team'),
  callTeamInvite: (payload) => call('/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  callTeamDelete: (id) => call(`/api/team/${id}`, { method: 'DELETE' }),
  // Templates Library
  callGetTemplates: () => call('/api/templates'),
  callUpdateTemplate: (id, payload) => call(`/api/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  // Help Center & Knowledge Base
  getHelpArticles: () => call('/api/helpcenter'),
  addHelpArticle: (payload) => call('/api/helpcenter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  updateHelpArticle: (id, payload) => call(`/api/helpcenter/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  deleteHelpArticle: (id) => call(`/api/helpcenter/${id}`, { method: 'DELETE' }),
  autoLearnFromChats: () => call('/api/helpcenter/auto-learn', { method: 'POST' }),
  // Smart Handoffs
  getHandoffTickets: () => call('/api/handoffs'),
  resolveHandoffTicket: (id) => call(`/api/handoffs/${id}/resolve`, { method: 'POST' }),
  // AI Copilot & Real-Time Translation
  callCopilotDraft: (payload) => call('/api/copilot/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  callCopilotImprove: (payload) => call('/api/copilot/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  callCopilotTranslate: (payload) => call('/api/copilot/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  // Knowledge Base Gaps
  callGetKnowledgeGaps: () => call('/api/knowledge-gaps'),
  callAddressKnowledgeGap: (id, articleId) => call(`/api/knowledge-gaps/${id}/address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId })
  }),
  // Unified Customer Context
  callGetUnifiedCustomer: (phone) => call(`/api/customers/${phone}/unified`)
};

/* Conversation Local Storage for In-App Live Simulator */
const INDEX_KEY = 'clientbot_conversations_index';
const CONV_KEY = (id) => 'clientbot_conv_' + id;

export async function loadConvIndex() {
  try {
    const item = localStorage.getItem(INDEX_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    return [];
  }
}

export async function saveConvIndex(list) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

export async function loadConversation(id) {
  try {
    const item = localStorage.getItem(CONV_KEY(id));
    return item ? JSON.parse(item) : [];
  } catch (e) {
    return [];
  }
}

export async function saveConversation(id, messages) {
  try {
    localStorage.setItem(CONV_KEY(id), JSON.stringify(messages.slice(-100)));
  } catch (e) {}
}

export async function deleteConversation(id) {
  try {
    localStorage.removeItem(CONV_KEY(id));
    const list = (await loadConvIndex()).filter(c => c.id !== id);
    await saveConvIndex(list);
    return list;
  } catch (e) {
    return [];
  }
}

export async function touchConversation(id, title) {
  const list = await loadConvIndex();
  const i = list.findIndex(c => c.id === id);
  const entry = { id, title: title || 'New conversation', updated: Date.now() };
  if (i >= 0) list[i] = { ...list[i], ...entry };
  else list.unshift(entry);
  list.sort((a, b) => b.updated - a.updated);
  await saveConvIndex(list);
  return list;
}
