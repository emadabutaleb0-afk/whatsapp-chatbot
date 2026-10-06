// Data Exporter for CSV and PDF reports

import { esc } from './ui.js';

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/* ================= Messages / Conversations Export ================= */

export function exportLogsCSV(logs = []) {
  if (!logs || !logs.length) {
    alert('No messages to export.');
    return;
  }

  const headers = ['Date & Time', 'Customer Name', 'Phone Number', 'Customer Message', 'Bot/Staff Reply', 'Status', 'Response Time (ms)'];
  const rows = logs.map(l => [
    new Date(l.at).toLocaleString(),
    `"${String(l.name || 'Client').replace(/"/g, '""')}"`,
    `"+${String(l.from || '').replace(/"/g, '""')}"`,
    `"${String(l.incoming || '').replace(/"/g, '""')}"`,
    `"${String(l.reply || '').replace(/"/g, '""')}"`,
    l.status || 'sent',
    l.responseTimeMs || ''
  ]);

  // Include UTF-8 BOM for Arabic text support in Microsoft Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `clientbot_messages_${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportLogsPDF(logs = [], businessName = 'Al-Fares Motors') {
  if (!logs || !logs.length) {
    alert('No messages to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export as PDF.');
    return;
  }

  const rowsHTML = logs.slice(0, 150).map((l, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; color: #64748b;">${new Date(l.at).toLocaleString()}</td>
      <td style="padding: 8px; font-weight: 600; color: #0f172a;">${esc(l.name || 'Client')}<br><span style="font-weight: normal; color: #94a3b8;">+${esc(l.from || '')}</span></td>
      <td style="padding: 8px; color: #334155; max-width: 250px;">${esc(l.incoming || '—')}</td>
      <td style="padding: 8px; color: #0f766e; max-width: 250px;">${esc(l.reply || '—')}</td>
      <td style="padding: 8px;"><span style="background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 9999px; font-weight: 600; font-size: 10px;">${esc(l.status)}</span></td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ClientBot Conversation History - ${dateStamp()}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 30px; color: #0f172a; }
        .header { border-bottom: 2px solid #128C7E; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { margin: 0; font-size: 20px; color: #128C7E; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background: #f8fafc; padding: 8px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
        @media print {
          body { margin: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>ClientBot — WhatsApp Messages Audit</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Business: <strong>${esc(businessName)}</strong> · Generated on ${new Date().toLocaleString()}</p>
        </div>
        <div class="no-print">
          <button onclick="window.print()" style="background: #128C7E; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Client</th>
            <th>Customer Question</th>
            <th>Bot / Staff Reply</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/* ================= Dashboard Metrics Export ================= */

export function exportMetricsCSV(metrics) {
  if (!metrics || !metrics.series) {
    alert('No metrics available to export.');
    return;
  }

  const series = metrics.series || [];
  const b = metrics.business || {};
  const t = metrics.totals || {};
  const autoRate = b.autoRate ?? (t.messages ? Math.round(((t.messages - (t.fallbacks || 0)) / t.messages) * 100) : 92);

  const headers = ['Date', 'Total Messages', 'FAQ Hits', 'Unanswered/Fallbacks', 'Positive Reactions', 'Negative Reactions', 'Avg Response Time (s)'];
  const rows = series.map(d => [
    d.date,
    d.messages || 0,
    d.faqHits || 0,
    d.fallbacks || 0,
    d.pos || 0,
    d.neg || 0,
    d.msCount ? (d.msTotal / d.msCount / 1000).toFixed(2) : '0'
  ]);

  const csvContent = '\uFEFF' + [
    `"ClientBot Executive Business & Bot Metrics Export - ${metrics.days} Days"`,
    `"Total Handled Messages",${t.messages || 0}`,
    `"Automation Rate",${autoRate}%`,
    `"Client Satisfaction Rating",${t.pos + t.neg ? Math.round((t.pos / (t.pos + t.neg)) * 100) : 100}%`,
    `"Average Response Time",${(metrics.avgMs / 1000).toFixed(2)}s`,
    `"Car Purchase Bookings",${b.totalOrders || 0}`,
    `"Total Revenue (EGP)",${b.totalRevenue || 0}`,
    `"Test Drives & Viewings",${b.totalReservations || 0} (${b.totalGuests || 0} guests)`,
    `"Active Customer Profiles",${b.totalCustomers || 0} (${b.repeatRate || 0}% repeat rate)`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  downloadFile(csvContent, `alfares_analytics_${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportMetricsPDF(metrics, businessName = 'Al-Fares Motors') {
  if (!metrics || !metrics.totals) {
    alert('No metrics available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export as PDF.');
    return;
  }

  const t = metrics.totals || {};
  const b = metrics.business || {};
  const sat = t.pos + t.neg ? Math.round((t.pos / (t.pos + t.neg)) * 100) : 100;
  const autoRate = b.autoRate ?? (t.messages ? Math.round(((t.messages - (t.fallbacks || 0)) / t.messages) * 100) : 92);

  const topicsHTML = (metrics.topics || []).map(tp => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
      <span>${esc(tp.label)}</span>
      <span style="font-weight: 600;">${tp.count} questions</span>
    </div>
  `).join('');

  const topQHTML = (metrics.topQuestions || []).slice(0, 6).map((q, i) => `
    <div style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
      <span style="color: #94a3b8; font-weight: 600; margin-right: 6px;">#${i + 1}</span>
      <span style="color: #1e293b;">${esc(q.question)}</span>
      <span style="float: right; font-weight: 600; color: #0f766e; background: #ecfdf5; padding: 1px 6px; border-radius: 999px;">${q.count}×</span>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ClientBot Executive Analytics Report - ${dateStamp()}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 30px; color: #0f172a; }
        .header { border-bottom: 2px solid #128C7E; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { margin: 0; font-size: 20px; color: #128C7E; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
        .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa; }
        .kpi-title { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin: 0; }
        .kpi-val { font-size: 20px; font-weight: 700; color: #0f172a; margin: 6px 0 0 0; }
        .kpi-sub { font-size: 10px; color: #94a3b8; margin: 4px 0 0 0; }
        .sec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .sec-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #0f172a; }
        @media print {
          body { margin: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>ClientBot — WhatsApp Business Executive Report</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Business: <strong>${esc(businessName)}</strong> · Period: Last ${metrics.days} Days · Generated on ${new Date().toLocaleString()}</p>
        </div>
        <div class="no-print">
          <button onclick="window.print()" style="background: #128C7E; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-title">Messages Handled</p>
          <p class="kpi-val">${(t.messages || 0).toLocaleString()}</p>
          <p class="kpi-sub">${(t.faqHits || 0).toLocaleString()} automated hits</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Automation Rate</p>
          <p class="kpi-val">${autoRate}%</p>
          <p class="kpi-sub">${t.fallbacks || 0} escalated</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Avg. Response Time</p>
          <p class="kpi-val">${((metrics.avgMs || 1200) / 1000).toFixed(1)}s</p>
          <p class="kpi-sub">Instant AI replies</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Satisfaction (CSAT)</p>
          <p class="kpi-val">${sat}%</p>
          <p class="kpi-sub">${(t.pos || 0).toLocaleString()} positive signals</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">WhatsApp Orders</p>
          <p class="kpi-val">${b.totalOrders || 0}</p>
          <p class="kpi-sub">Via cart checkout</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Direct Sales Volume</p>
          <p class="kpi-val">${(b.totalRevenue || 0).toLocaleString()} EGP</p>
          <p class="kpi-sub">WhatsApp generated</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Table Reservations</p>
          <p class="kpi-val">${b.totalReservations || 0}</p>
          <p class="kpi-sub">${b.totalGuests || 0} covers booked</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Active Clients</p>
          <p class="kpi-val">${b.totalCustomers || 0}</p>
          <p class="kpi-sub">${b.repeatRate || 0}% repeat rate</p>
        </div>
      </div>

      <div class="sec-grid">
        <div class="sec-box">
          <h3>Top Customer Inquiry Topics</h3>
          ${topicsHTML}
        </div>
        <div class="sec-box">
          <h3>Most Common Client Questions</h3>
          ${topQHTML}
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
