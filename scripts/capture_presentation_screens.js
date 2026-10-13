import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/presentation_assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function capture() {
  console.log('Launching Edge for presentation screenshots...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for loader to disappear
  await new Promise(r => setTimeout(r, 2000));

  const switchView = async (v) => {
    await page.evaluate((viewName) => {
      const btn = document.querySelector(`button[data-view="${viewName}"]`);
      if (btn) btn.click();
    }, v);
    await new Promise(r => setTimeout(r, 1200));
  };

  console.log('1. Capturing Dashboard...');
  await switchView('dashboard');
  await page.screenshot({ path: path.join(outDir, '01_dashboard.png') });

  console.log('2. Capturing Cars Inventory...');
  await switchView('products');
  await page.screenshot({ path: path.join(outDir, '02_inventory_cars.png') });

  console.log('3. Capturing Trade-ins & Appraisal...');
  await switchView('tradeins');
  await page.screenshot({ path: path.join(outDir, '03_tradeins.png') });

  console.log('4. Capturing Customers CRM...');
  await switchView('customers');
  await page.screenshot({ path: path.join(outDir, '04_customers_crm.png') });

  console.log('5. Capturing AI Assistant Chat Simulator with Live Conversation...');
  await switchView('chat');
  await new Promise(r => setTimeout(r, 1000));

  // Send a realistic query in chat simulator
  await page.evaluate(() => {
    const inp = document.getElementById('input');
    const comp = document.getElementById('composer');
    if (inp && comp) {
      inp.value = 'قارن بين كيا سبورتاج وهيونداي توسان';
      comp.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(outDir, '05_smart_chat.png') });

  console.log('6. Capturing Orders (حجوزات السيارات)...');
  await switchView('orders');
  await page.screenshot({ path: path.join(outDir, '06_orders.png') });

  console.log('7. Capturing Test Drive Reservations (تجارب القيادة)...');
  await switchView('reservations');
  await page.screenshot({ path: path.join(outDir, '07_reservations.png') });

  console.log('8. Capturing AI Brain Control Center (لوحة الذكاء الاصطناعي)...');
  await switchView('admin-ai');
  await page.screenshot({ path: path.join(outDir, '08_admin_ai.png') });

  console.log('9. Capturing FAQ Knowledge Base (الأسئلة الشائعة)...');
  await switchView('faq');
  await page.screenshot({ path: path.join(outDir, '09_faq.png') });

  await browser.close();
  console.log('🎉 All 9 screenshots captured successfully in:', outDir);
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
