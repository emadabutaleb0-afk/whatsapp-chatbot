import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTestSuite() {
  console.log('🧪 Starting Database Integrity & Functionality Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: initDB
    await db.initDB();
    assert(true, '1. initDB() initialized without errors');

    // Test 2: getConfig
    const cfg = db.getConfig();
    assert(cfg && cfg.business && cfg.business.name === 'Nour Coffee House', '2. getConfig() returns valid business profile');
    assert(typeof cfg.whatsapp?.hasAccessToken === 'boolean', '2b. getConfig() provides hasAccessToken boolean flag');

    // Test 3: saveConfig
    const updatedCfg = await db.saveConfig({ business: { tagline: 'Premium Specialty Coffee & Pastries' } });
    assert(updatedCfg.business.tagline === 'Premium Specialty Coffee & Pastries', '3. saveConfig() updates business configuration');

    // Test 4: Logs & Customer Auto-Creation
    const testPhone = '201099998888';
    const log = await db.addLog({
      from: testPhone,
      name: 'Test Customer',
      incoming: 'What are your hours?',
      reply: 'We are open 8 AM to 10 PM.',
      status: 'sent',
      responseTimeMs: 250
    });
    assert(log && log.id && log.at, '4. addLog() creates message log with id and timestamp');

    const logs = db.getLogs();
    assert(logs.some(l => l.from === testPhone), '4b. getLogs() returns the new log');

    // Test 5: Customer CRM
    const cust = db.getCustomer(testPhone);
    assert(cust && cust.phone === testPhone && cust.name === 'Test Customer', '5. getCustomer() retrieves customer auto-created from log');
    assert(cust.messageCount >= 1, '5b. Customer messageCount incremented');

    const updatedCust = await db.updateCustomer(testPhone, { tags: ['VIP', 'Special'] });
    assert(updatedCust.tags.includes('VIP'), '5c. updateCustomer() updates customer tags');

    const allCusts = db.getAllCustomers();
    assert(allCusts.some(c => c.phone === testPhone), '5d. getAllCustomers() lists the customer');

    // Test 6: Human Takeover
    const takeoverCust = await db.setHumanTakeover(testPhone, true, 30);
    assert(takeoverCust.isHumanTakeover === true, '6. setHumanTakeover() activates human takeover');
    assert(db.isCustomerInTakeover(testPhone) === true, '6b. isCustomerInTakeover() confirms takeover active');
    await db.setHumanTakeover(testPhone, false);
    assert(db.isCustomerInTakeover(testPhone) === false, '6c. setHumanTakeover(false) releases takeover');

    // Test 7: Customer Conversations grouping
    const convs = db.getCustomerConversations();
    assert(Array.isArray(convs) && convs.some(c => c.phone === testPhone), '7. getCustomerConversations() groups chats by phone');

    // Test 8: Orders & Revenue
    const order = await db.createOrder({
      clientPhone: testPhone,
      clientName: 'Test Customer',
      items: [{ name: 'Flat white', qty: 2, price: '65 EGP', subtotal: '130 EGP' }],
      total: '130 EGP',
      address: '10 Test St'
    });
    assert(order && order.orderNumber.startsWith('ORD-'), '8. createOrder() creates order with ORD- sequence');
    assert(db.parseOrderAmount(order.total) === 130, '8b. parseOrderAmount() correctly parses total');

    const updatedOrder = await db.updateOrderStatus(order.id, 'confirmed');
    assert(updatedOrder.status === 'confirmed', '8c. updateOrderStatus() updates order status');

    // Test 9: Reservations
    const res = await db.createReservation({
      clientPhone: testPhone,
      clientName: 'Test Customer',
      partySize: 3,
      date: 'Tomorrow',
      time: '6:00 PM'
    });
    assert(res && res.partySize === 3, '9. createReservation() creates booking with party size');
    const updatedRes = await db.updateReservationStatus(res.id, 'completed');
    assert(updatedRes.status === 'completed', '9b. updateReservationStatus() updates status');

    // Test 10: Broadcast Campaigns
    const camp = await db.createCampaign({
      title: 'Test Promo',
      message: 'Exclusive 20% off today!',
      targetTag: 'all',
      sentCount: 25
    });
    assert(camp && camp.title === 'Test Promo', '10. createCampaign() creates campaign');
    const camps = db.getCampaigns();
    assert(camps.some(c => c.id === camp.id), '10b. getCampaigns() lists campaign');

    // Test 11: Metrics & Unanswered Questions
    await db.recordUnanswered('Do you have cold brew on tap?');
    const metrics = await db.getMetrics(7);
    assert(metrics && metrics.days === 7, '11. getMetrics(7) returns 7-day metrics');
    assert(Array.isArray(metrics.hourly) && metrics.hourly.length === 24, '11b. Metrics include 24-hour distribution');
    assert(metrics.business && typeof metrics.business.totalRevenue === 'number', '11c. Business revenue calculated');

    // Test 12: Team RBAC
    const member = await db.inviteTeamMember({ name: 'Staff Member', email: 'staff@test.com', role: 'editor' });
    assert(member && member.role === 'editor', '12. inviteTeamMember() adds editor');
    const roleUpdated = await db.updateMemberRole(member.id, 'admin');
    assert(roleUpdated.role === 'admin', '12b. updateMemberRole() updates role to admin');
    await db.removeTeamMember(member.id);
    assert(!db.getTeamMembers().some(m => m.id === member.id), '12c. removeTeamMember() removes member');

    // Test 13: Message Templates
    const rendered = db.renderTemplate('welcome', { business_name: 'Nour Coffee' });
    assert(rendered.includes('Nour Coffee'), '13. renderTemplate() correctly replaces template variables');

    const newTpl = await db.addTemplate({ scenario: 'test_tpl', name: 'Test Template', content: 'Hi {name}!' });
    assert(db.renderTemplate('test_tpl', { name: 'Alex' }) === 'Hi Alex!', '13b. addTemplate() creates working template');
    await db.deleteTemplate(newTpl.id);

    // Test 14: Knowledge Base Articles
    const article = await db.addArticle({
      title: 'Specialty Roasting Guide',
      category: 'Coffee Education',
      tags: ['roast', 'beans'],
      content: 'We roast small batches weekly.'
    });
    assert(article && article.id, '14. addArticle() adds knowledge base article');
    await db.updateArticle(article.id, { title: 'Master Specialty Roasting Guide' });
    const arts = db.getArticles();
    assert(arts.some(a => a.title === 'Master Specialty Roasting Guide'), '14b. updateArticle() updates article');
    await db.deleteArticle(article.id);

    // Test 15: Knowledge Gaps
    const gapsData = db.getKnowledgeGaps();
    assert(gapsData && typeof gapsData.stats?.resolutionRate === 'number', '15. getKnowledgeGaps() returns gaps and resolution stats');

    // Test 16: Handoff Tickets
    const ticket = await db.createHandoffTicket({
      phone: testPhone,
      name: 'Test Customer',
      issueSummary: 'Need help with custom order',
      sentiment: 'Neutral'
    });
    assert(ticket && ticket.status === 'open', '16. createHandoffTicket() creates open ticket');
    const resolvedTicket = await db.resolveHandoffTicket(ticket.id);
    assert(resolvedTicket.status === 'resolved', '16b. resolveHandoffTicket() marks ticket resolved');

    // Test 17: Unified Customer Context (360° View)
    const context = db.getUnifiedCustomerContext(testPhone);
    assert(context && context.phone === testPhone, '17. getUnifiedCustomerContext() builds 360 customer profile');
    assert(context.totalOrders >= 1, '17b. Customer context tracks order count');
    assert(typeof context.totalSpend === 'string' && context.totalSpend.includes('EGP'), '17c. Customer context tracks total spend');
    assert(context.aiSummary && context.aiSummary.length > 10, '17d. Generates AI executive summary for customer');

    // Test 18: File Persistence to Disk
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    const fileContent = await fs.readFile(dbPath, 'utf-8');
    const diskParsed = JSON.parse(fileContent);
    assert(diskParsed && diskParsed.config && diskParsed.orders, '18. data/db.json file exists and is valid JSON');
    assert(diskParsed.orders.some(o => o.id === order.id), '18b. Orders correctly written and persisted to disk');

    console.log(`\n🎉 Results: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTestSuite();
