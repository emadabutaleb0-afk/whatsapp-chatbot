import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDB,
  getConfig,
  saveConfig,
  getLogs,
  addLog,
  clearLogs,
  getMetrics,
  seedDemoData,
  clearMetrics,
  clearUnanswered,
  recordUnanswered,
  getOrders,
  createOrder,
  updateOrderStatus,
  getReservations,
  createReservation,
  updateReservationStatus,
  getCustomer,
  updateCustomer,
  getAllCustomers,
  setHumanTakeover,
  isCustomerInTakeover,
  getCustomerConversations,
  getCampaigns,
  createCampaign,
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
  getTemplates,
  updateTemplate,
  addTemplate,
  deleteTemplate,
  renderTemplate,
  getArticles,
  addArticle,
  updateArticle,
  deleteArticle,
  learnFromPastChats,
  getHandoffTickets,
  createHandoffTicket,
  resolveHandoffTicket,
  getKnowledgeGaps,
  addressKnowledgeGap,
  addKnowledgeGap,
  getUnifiedCustomerContext
} from './db.js';
import {
  answerQuestion,
  generateCopilotDraft,
  improveCopilotDraft,
  translateContent
} from './ai.js';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
// Gracefully catch malformed JSON payloads from external requests/webhooks
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  next(err);
});
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const processedMessageIds = new Set();

/* ==========================================================================
   META WHATSAPP GRAPH API SENDER HELPERS
   ========================================================================== */

async function sendWhatsAppMessage(phoneId, token, payload) {
  if (!phoneId || !token) {
    console.warn('[WhatsApp] Credentials missing. Message simulation mode.');
    return { ok: true, simulated: true };
  }

  const graphUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to send WhatsApp message');
  }
  return { ok: true, data };
}

async function sendWhatsAppText(phoneId, token, to, text) {
  return sendWhatsAppMessage(phoneId, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text }
  });
}

async function sendWhatsAppLocation(phoneId, token, to, lat, lng, name, address) {
  return sendWhatsAppMessage(phoneId, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'location',
    location: {
      latitude: lat,
      longitude: lng,
      name,
      address
    }
  });
}

async function sendWhatsAppImage(phoneId, token, to, imageUrl, caption) {
  return sendWhatsAppMessage(phoneId, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption || ''
    }
  });
}

async function sendWhatsAppButtons(phoneId, token, to, bodyText, buttons = []) {
  return sendWhatsAppMessage(phoneId, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b, i) => ({
          type: 'reply',
          reply: { id: b.id || `btn_${i}`, title: b.title.slice(0, 20) }
        }))
      }
    }
  });
}

/* ==========================================================================
   META WHATSAPP CLOUD API WEBHOOKS
   ========================================================================== */

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const config = getConfig();
  const expectedToken = config.whatsapp?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'my-secret-verify-token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('Webhook verified successfully by Meta!');
    return res.status(200).send(challenge);
  } else {
    console.warn(`Webhook verification failed. Provided: "${token}", Expected: "${expectedToken}"`);
    return res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const val = change.value;
        if (!val || !val.messages || !val.messages.length) continue;

        const config = getConfig();
        const contact = (val.contacts && val.contacts[0]) || {};
        const clientName = contact.profile?.name || 'Client';

        for (const msg of val.messages) {
          const msgId = msg.id;
          if (processedMessageIds.has(msgId)) continue;
          processedMessageIds.add(msgId);
          if (processedMessageIds.size > 1000) {
            const first = processedMessageIds.values().next().value;
            processedMessageIds.delete(first);
          }

          const fromPhone = msg.from;
          let incomingText = '';

          // Handle Voice Notes / Audio
          if (msg.type === 'audio' || msg.type === 'voice') {
            incomingText = '[Audio message / Voice note]';
            console.log(`[WhatsApp Voice Note] Received from: ${fromPhone}`);
          } else if (msg.type === 'text' && msg.text?.body) {
            incomingText = msg.text.body.trim();
          } else if (msg.type === 'interactive' && msg.interactive?.button_reply) {
            incomingText = msg.interactive.button_reply.title;
          } else {
            continue;
          }

          console.log(`[WhatsApp Incoming] ${fromPhone} (${clientName}): "${incomingText}"`);

          const waConfig = config.whatsapp || {};
          const autoReply = waConfig.autoReply !== false;
          const phoneId = waConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
          const token = waConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

          // Check if Client is in Human Takeover Mode
          if (isCustomerInTakeover(fromPhone)) {
            console.log(`[Human Takeover] Bot is paused for client: ${fromPhone}`);
            await addLog({
              from: fromPhone,
              name: clientName,
              incoming: incomingText,
              reply: null,
              status: 'human_takeover'
            });
            continue;
          }

          // If auto reply is disabled globally
          if (!autoReply) {
            await addLog({
              from: fromPhone,
              name: clientName,
              incoming: incomingText,
              reply: null,
              status: 'paused'
            });
            continue;
          }

          // Extract recent conversation history for this phone number
          const recentLogs = (getLogs() || []).filter(l => l.from === fromPhone).slice(-6);
          const history = recentLogs.map(l => {
            if (l.incoming) return { role: 'user', content: l.incoming };
            if (l.reply) return { role: 'assistant', content: l.reply };
            return null;
          }).filter(Boolean);

          // Generate response with Intent & Dialect reasoning
          const answer = await answerQuestion(incomingText, {
            ...config,
            templates: getTemplates(),
            articles: getArticles()
          }, history);
          const replyText = answer.reply;

          // Execute intent side-effects
          if (answer.intentType === 'HUMAN_TAKEOVER') {
            await setHumanTakeover(fromPhone, true, 60);
            if (answer.handoffBriefing) {
              await createHandoffTicket({
                phone: fromPhone,
                name: clientName,
                issueSummary: answer.handoffBriefing.issueSummary,
                sentiment: answer.handoffBriefing.sentiment,
                lastMessage: incomingText,
                intentType: 'HUMAN_TAKEOVER'
              });
            }
          } else if (answer.intentType === 'ORDER_CREATE' && answer.intentData) {
            await createOrder({
              clientPhone: fromPhone,
              clientName,
              items: answer.intentData.items,
              total: answer.intentData.total,
              address: answer.intentData.address
            });
          } else if (answer.intentType === 'BOOKING_CREATE' && answer.intentData) {
            await createReservation({
              clientPhone: fromPhone,
              clientName,
              partySize: answer.intentData.partySize,
              date: answer.intentData.time,
              time: answer.intentData.time
            });
          }

          if (answer.isFallback) {
            await recordUnanswered(incomingText);
          }

          let sendStatus = 'sent';
          let sendError = null;

          // Send via WhatsApp Graph API
          if (!phoneId || !token) {
            sendStatus = 'not_configured';
            sendError = 'WhatsApp Cloud API Phone ID or Access Token not configured.';
          } else {
            try {
              if (answer.intentType === 'SEND_LOCATION') {
                await sendWhatsAppLocation(
                  phoneId, token, fromPhone,
                  answer.intentData.lat, answer.intentData.lng,
                  answer.intentData.name, answer.intentData.address
                );
              } else if (answer.intentType === 'SEND_IMAGE') {
                await sendWhatsAppImage(phoneId, token, fromPhone, answer.intentData.imageUrl, answer.intentData.caption);
              } else {
                await sendWhatsAppText(phoneId, token, fromPhone, replyText);
              }
            } catch (err) {
              sendStatus = 'failed';
              sendError = err.message;
            }
          }

          await addLog({
            from: fromPhone,
            name: clientName,
            incoming: incomingText,
            reply: replyText,
            status: sendStatus,
            error: sendError,
            faqHit: answer.faqHit,
            isFallback: answer.isFallback,
            responseTimeMs: answer.durationMs,
            intent: answer.intentType
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in webhook processor:', err);
  }
});

/* ==========================================================================
   REST API ROUTES
   ========================================================================== */

app.get('/api/status', (req, res) => {
  const config = getConfig();
  const w = config.whatsapp || {};
  const b = config.business || {};
  const isConnected = !!(w.phoneNumberId && w.verifyToken && (w.hasAccessToken || w.accessToken));

  res.json({
    owner: 'business_owner',
    isOwner: true,
    configured: isConnected,
    autoReply: w.autoReply !== false,
    productCount: (config.products || []).length,
    faqCount: (config.faqEntries || []).filter(f => f.question && f.answer).length,
    businessName: b.name || '',
    ordersCount: getOrders().length,
    reservationsCount: getReservations().length,
    whatsapp: {
      phoneNumberId: w.phoneNumberId || '',
      verifyToken: w.verifyToken || 'my-secret-verify-token',
      hasAccessToken: !!w.hasAccessToken
    }
  });
});

app.get('/api/config', (req, res) => {
  res.json({ config: getConfig() });
});

app.post('/api/config', async (req, res) => {
  try {
    const updated = await saveConfig(req.body);
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const config = getConfig();
    const result = await answerQuestion(message, {
      ...config,
      templates: getTemplates(),
      articles: getArticles()
    }, history || []);

    if (result.intentType === 'HUMAN_TAKEOVER') {
      await setHumanTakeover('201012345678', true, 60);
      if (result.handoffBriefing) {
        await createHandoffTicket({
          phone: '201012345678',
          name: 'Preview Client',
          issueSummary: result.handoffBriefing.issueSummary,
          sentiment: result.handoffBriefing.sentiment,
          lastMessage: message,
          intentType: 'HUMAN_TAKEOVER'
        });
      }
    }

    // Create order or booking in db if intent triggered in simulator
    if (result.intentType === 'ORDER_CREATE' && result.intentData) {
      const order = await createOrder({
        clientPhone: '201012345678',
        clientName: 'Preview Client',
        items: result.intentData.items,
        total: result.intentData.total,
        address: result.intentData.address
      });
      result.order = order;
    } else if (result.intentType === 'BOOKING_CREATE' && result.intentData) {
      const reservation = await createReservation({
        clientPhone: '201012345678',
        clientName: 'Preview Client',
        partySize: result.intentData.partySize,
        date: result.intentData.time,
        time: result.intentData.time
      });
      result.reservation = reservation;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Orders API ================= */

app.get('/api/orders', (req, res) => {
  res.json({ orders: getOrders() });
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await updateOrderStatus(req.params.id, status);
    res.json({ ok: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Bookings & Reservations API ================= */

app.get('/api/reservations', (req, res) => {
  res.json({ reservations: getReservations() });
});

app.post('/api/reservations', async (req, res) => {
  try {
    const reservation = await createReservation(req.body);
    res.json({ ok: true, reservation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await updateReservationStatus(req.params.id, status);
    res.json({ ok: true, reservation: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Live Chat & Human Takeover API ================= */

app.get('/api/conversations', (req, res) => {
  res.json({ conversations: getCustomerConversations() });
});

app.post('/api/conversations/reply', async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'Recipient phone and text required' });

  const config = getConfig();
  const w = config.whatsapp || {};
  const phoneId = w.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = w.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  // Set customer to takeover mode so bot does not interrupt
  await setHumanTakeover(to, true, 60);

  let sendResult = { ok: true };
  if (phoneId && token) {
    try {
      await sendWhatsAppText(phoneId, token, to, text);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Add to log
  await addLog({
    from: to,
    name: 'Human Agent',
    incoming: null,
    reply: text,
    status: 'sent',
    isHuman: true
  });

  res.json({ ok: true });
});

app.post('/api/conversations/takeover', async (req, res) => {
  const { phone, isTakeover, durationMinutes } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  const cust = await setHumanTakeover(phone, isTakeover, durationMinutes || 60);
  res.json({ ok: true, customer: cust });
});

/* ================= Broadcast Campaigns & Customers API ================= */

app.get('/api/customers', (req, res) => {
  res.json({ customers: getAllCustomers() });
});

app.get('/api/campaigns', (req, res) => {
  res.json({ campaigns: getCampaigns() });
});

app.post('/api/campaigns/send', async (req, res) => {
  try {
    const { title, message, targetTag } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });

    const customers = getAllCustomers();
    const recipients = targetTag === 'all' || !targetTag
      ? customers
      : customers.filter(c => (c.tags || []).includes(targetTag));

    const config = getConfig();
    const w = config.whatsapp || {};
    const phoneId = w.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = w.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

    let sentCount = 0;
    if (phoneId && token) {
      for (const r of recipients) {
        try {
          await sendWhatsAppText(phoneId, token, r.phone, message);
          sentCount++;
        } catch (e) {}
      }
    } else {
      sentCount = recipients.length; // Simulated
    }

    const camp = await createCampaign({
      title: title || 'Broadcast',
      message,
      targetTag: targetTag || 'all',
      sentCount
    });

    res.json({ ok: true, campaign: camp, sentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Logs & Metrics API ================= */

app.get('/api/logs', (req, res) => {
  res.json({ logs: getLogs() });
});

app.delete('/api/logs', async (req, res) => {
  await clearLogs();
  res.json({ ok: true });
});

app.get('/api/metrics', async (req, res) => {
  const days = Number(req.query.days) || 30;
  res.json(await getMetrics(days));
});

app.post('/api/metrics/demo', async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const seeded = await seedDemoData(days);
    res.json({ ok: true, metrics: seeded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/metrics', async (req, res) => {
  await clearMetrics();
  res.json({ ok: true });
});

app.delete('/api/unanswered', async (req, res) => {
  await clearUnanswered();
  res.json({ ok: true });
});

app.post('/api/test-send', async (req, res) => {
  const { to, text } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient phone number is required' });

  const config = getConfig();
  const w = config.whatsapp || {};
  const phoneId = w.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = w.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    return res.json({
      ok: false,
      response: 'Phone Number ID or Access Token is missing. Enter your Meta credentials in the WhatsApp tab.'
    });
  }

  try {
    const r = await sendWhatsAppText(phoneId, token, to.replace(/[^\d]/g, ''), text || 'Hello! Test from ClientBot.');
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/faq/suggest', async (req, res) => {
  try {
    const config = getConfig();
    const b = config.business || {};
    const cars = config.products || [];

    const suggestions = [
      {
        question: `What are the opening hours for ${b.name || 'your showroom'}?`,
        answer: b.hours ? `Our showroom opening hours are:\n${b.hours}\nVisit us anytime or schedule a test drive in advance! 🚗` : 'We are open Saturday through Thursday 9 AM to 11 PM, Friday 1:30 PM to 11 PM.',
        aliases: 'مواعيد المعرض ايه\nفاتحين دلوقتي؟\nشغالين الجمعة؟\nare you open now?\nwhat time do you open?',
        mode: 'exact'
      },
      {
        question: `Where is ${b.name || 'your showroom'} located?`,
        answer: `We are located at ${b.location || 'our main showroom'}.${b.mapsUrl ? ' Google Maps link: ' + b.mapsUrl : ''}`,
        aliases: 'what is your showroom address?\nhow do I visit you?\nعنوان المعرض فين\nمكانكم فين بالضبط',
        mode: 'exact'
      },
      {
        question: 'Do you offer installment & auto financing plans?',
        answer: b.payment || 'Yes! We offer installment plans starting at 20% down payment with tenures up to 7 years in partnership with major banks.',
        aliases: 'في تقسيط؟\nنظام التقسيط ايه\nاقل مقدم كام\ncar finance\nauto loan',
        mode: 'exact'
      },
      {
        question: 'Can I trade in or exchange my current car?',
        answer: 'Yes! We offer direct trade-in (Trade-In). We appraise your current vehicle at fair market value and apply it as a down payment toward any new or used car from our showroom.',
        aliases: 'عايز ابدل عربيتي\nفي استبدال؟\ntrade in my car\ncar exchange',
        mode: 'exact'
      },
      {
        question: 'Can I book a test drive before buying?',
        answer: 'Yes! Complimentary test drives are available for all vehicles in our showroom. Just message us your preferred car model, day, and time to confirm your appointment.',
        aliases: 'حجز تجربة قيادة\nعايز اجرب العربية\ntest drive\nbook test drive',
        mode: 'exact'
      }
    ];

    if (cars.length > 0) {
      const c = cars[0];
      suggestions.push({
        question: `How much is the ${c.name}?`,
        answer: `The ${c.name} is ${c.price || 'available upon request'}.${c.description ? ' ' + c.description : ''}`,
        aliases: `price of ${c.name}\nhow much for ${c.name}\nبكام ${c.name}`,
        mode: 'exact'
      });
    }

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Team Members & RBAC API ================= */

app.get('/api/team', (req, res) => {
  res.json({ team: getTeamMembers() });
});

app.post('/api/team/invite', async (req, res) => {
  try {
    const member = await inviteTeamMember(req.body);
    res.json({ ok: true, member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/team/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const member = await updateMemberRole(req.params.id, role);
    res.json({ ok: true, member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/team/:id', async (req, res) => {
  try {
    await removeTeamMember(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= Message Templates Library API ================= */

app.get('/api/templates', (req, res) => {
  res.json({ templates: getTemplates() });
});

app.post('/api/templates', async (req, res) => {
  try {
    const tpl = await addTemplate(req.body);
    res.json({ ok: true, template: tpl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/templates/:id', async (req, res) => {
  try {
    const tpl = await updateTemplate(req.params.id, req.body);
    res.json({ ok: true, template: tpl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    await deleteTemplate(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= Help Center & Knowledge Base API ================= */

app.get('/api/helpcenter', (req, res) => {
  res.json({ articles: getArticles() });
});

app.post('/api/helpcenter', async (req, res) => {
  try {
    const article = await addArticle(req.body);
    res.json({ ok: true, article });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/helpcenter/:id', async (req, res) => {
  try {
    const article = await updateArticle(req.params.id, req.body);
    res.json({ ok: true, article });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/helpcenter/:id', async (req, res) => {
  try {
    await deleteArticle(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/helpcenter/auto-learn', (req, res) => {
  try {
    const insights = learnFromPastChats();
    res.json({ ok: true, insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Smart Agent Handoff API ================= */

app.get('/api/handoffs', (req, res) => {
  res.json({ tickets: getHandoffTickets() });
});

app.post('/api/handoffs/:id/resolve', async (req, res) => {
  try {
    const ticket = await resolveHandoffTicket(req.params.id);
    res.json({ ok: true, ticket });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= AI Agent Copilot & Translation API ================= */

app.post('/api/copilot/draft', async (req, res) => {
  try {
    const { customerName, lastMessage, history } = req.body;
    const config = getConfig();
    const articles = getArticles();
    const draft = await generateCopilotDraft({
      customerName,
      lastMessage,
      history: history || [],
      articles,
      businessName: (config.business && config.business.name) || 'Al-Fares Motors'
    });
    res.json({ ok: true, draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/copilot/improve', async (req, res) => {
  try {
    const { text, tone } = req.body;
    const improved = await improveCopilotDraft(text, tone || 'polite');
    res.json({ ok: true, improved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/copilot/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    const translated = await translateContent(text, targetLang || 'en');
    res.json({ ok: true, translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Puter.js Token Sync API ================= */

app.post('/api/puter/sync-token', (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      process.env.PUTER_AUTH_TOKEN = token;
      console.log('[Puter.js] Received and synced auth token from client browser.');
      return res.json({ ok: true, synced: true });
    }
    res.json({ ok: true, synced: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Knowledge Base Gaps API ================= */

app.get('/api/knowledge-gaps', (req, res) => {
  res.json(getKnowledgeGaps());
});

app.post('/api/knowledge-gaps', async (req, res) => {
  try {
    const gap = await addKnowledgeGap(req.body);
    res.json({ ok: true, gap });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/knowledge-gaps/:id/address', async (req, res) => {
  try {
    const gap = await addressKnowledgeGap(req.params.id, req.body.articleId);
    res.json({ ok: true, gap });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= Unified Customer Context API ================= */

app.get('/api/customers/:phone/unified', (req, res) => {
  try {
    const context = getUnifiedCustomerContext(req.params.phone);
    res.json({ ok: true, profile: context, context });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ClientBot Enterprise WhatsApp running on http://localhost:${PORT}`);
    console.log(`📱 Webhook Verification URL: http://localhost:${PORT}/webhook`);
    console.log(`⚙️  API Status: http://localhost:${PORT}/api/status`);
    console.log(`====================================================`);
  });
});
