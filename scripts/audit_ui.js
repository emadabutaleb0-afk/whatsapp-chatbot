import fs from 'fs';
import path from 'path';

const html = fs.readFileSync('public/index.html', 'utf8');

// Find all buttons in index.html
const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
let match;
const buttons = [];
while ((match = btnRegex.exec(html)) !== null) {
  const attrs = match[1];
  const content = match[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  const idMatch = attrs.match(/id=["']([^"']+)["']/i);
  const dataViewMatch = attrs.match(/data-view=["']([^"']+)["']/i);
  const dataNavMatch = attrs.match(/data-nav=["']([^"']+)["']/i);
  const dataActionMatch = attrs.match(/data-action=["']([^"']+)["']/i);
  const dataModalMatch = attrs.match(/data-modal=["']([^"']+)["']/i);
  const dataDismissMatch = attrs.match(/data-dismiss=["']([^"']+)["']/i);
  const dataFilterMatch = attrs.match(/data-filter=["']([^"']+)["']/i);
  const dataStatTabMatch = attrs.match(/data-stat-tab=["']([^"']+)["']/i);
  const dataTabMatch = attrs.match(/data-tab=["']([^"']+)["']/i);
  const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
  const onclickMatch = attrs.match(/onclick=["']([^"']+)["']/i);
  buttons.push({
    id: idMatch ? idMatch[1] : null,
    dataView: dataViewMatch ? dataViewMatch[1] : null,
    dataNav: dataNavMatch ? dataNavMatch[1] : null,
    dataAction: dataActionMatch ? dataActionMatch[1] : null,
    dataModal: dataModalMatch ? dataModalMatch[1] : null,
    dataDismiss: dataDismissMatch ? dataDismissMatch[1] : null,
    dataFilter: dataFilterMatch ? dataFilterMatch[1] : null,
    dataStatTab: dataStatTabMatch ? dataStatTabMatch[1] : null,
    dataTab: dataTabMatch ? dataTabMatch[1] : null,
    onclick: onclickMatch ? onclickMatch[1] : null,
    type: typeMatch ? typeMatch[1] : null,
    attrs: attrs.trim(),
    text: content.slice(0, 40)
  });
}

console.log('=== BUTTON AUDIT IN public/index.html ===');
console.log('Total buttons found:', buttons.length);

// Also find all links <a>
const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const links = [];
while ((match = linkRegex.exec(html)) !== null) {
  const attrs = match[1];
  const content = match[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
  const idMatch = attrs.match(/id=["']([^"']+)["']/i);
  const dataNavMatch = attrs.match(/data-nav=["']([^"']+)["']/i);
  const dataViewMatch = attrs.match(/data-view=["']([^"']+)["']/i);
  links.push({
    href: hrefMatch ? hrefMatch[1] : null,
    id: idMatch ? idMatch[1] : null,
    dataNav: dataNavMatch ? dataNavMatch[1] : null,
    dataView: dataViewMatch ? dataViewMatch[1] : null,
    text: content.slice(0, 40),
    attrs: attrs.trim()
  });
}

console.log('Total links <a> found:', links.length);
links.forEach(l => {
  console.log(`Link: href="${l.href}" text="${l.text}" dataNav="${l.dataNav}" dataView="${l.dataView}"`);
});

// Scan JS files for event listeners
const jsFiles = fs.readdirSync('public/js').filter(f => f.endsWith('.js'));
const jsContents = {};
for (const f of jsFiles) {
  jsContents[f] = fs.readFileSync(path.join('public/js', f), 'utf8');
}

console.log('\nChecking buttons with IDs...');
const buttonsWithId = buttons.filter(b => b.id);
const unreferencedIds = [];
for (const b of buttonsWithId) {
  let referenced = false;
  for (const [f, content] of Object.entries(jsContents)) {
    if (content.includes(`'${b.id}'`) || content.includes(`"${b.id}"`) || content.includes(`#${b.id}`)) {
      referenced = true;
      break;
    }
  }
  if (!referenced) {
    unreferencedIds.push(b);
  }
}

console.log(`Buttons with ID: ${buttonsWithId.length}`);
console.log(`Unreferenced Button IDs in JS: ${unreferencedIds.length}`);
unreferencedIds.forEach(b => {
  console.log(`- ID: #${b.id} | text: "${b.text}" | onclick: ${b.onclick}`);
});

console.log('\nChecking buttons WITHOUT ID, data-view, data-nav, data-action, data-modal, data-tab, data-filter, data-stat-tab, onclick, or submit:');
const orphanedButtons = buttons.filter(b => 
  !b.id && !b.dataView && !b.dataNav && !b.dataAction && !b.dataModal && 
  !b.dataDismiss && !b.dataFilter && !b.dataStatTab && !b.dataTab && 
  !b.onclick && b.type !== 'submit'
);
console.log(`Orphaned buttons count: ${orphanedButtons.length}`);
orphanedButtons.forEach(b => {
  console.log(`- text: "${b.text}" | attrs: ${b.attrs}`);
});
