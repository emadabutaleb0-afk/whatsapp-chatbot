import fs from 'fs';
import path from 'path';

const html = fs.readFileSync('public/index.html', 'utf8');
const jsFiles = fs.readdirSync('public/js').filter(f => f.endsWith('.js'));
const jsContents = jsFiles.map(f => ({ name: f, code: fs.readFileSync(path.join('public/js', f), 'utf8') }));

const modalIds = [
  'inviteModal',
  'editTplModal',
  'articleModal',
  'autoLearnModal',
  'reminderModal',
  'translateModal',
  'insertKnowledgeModal',
  'installmentModal',
  'compareCarsModal',
  'addTradeInModal',
  'addOrderModal',
  'customerModal',
  'matchmakerModal'
];

modalIds.forEach(id => {
  console.log(`\n=================== MODAL: #${id} ===================`);
  
  // Find modal markup
  const modalIdx = html.indexOf(`id="${id}"`);
  if (modalIdx === -1) {
    console.log('NOT FOUND in HTML!');
    return;
  }
  const modalChunk = html.slice(modalIdx, modalIdx + 3000);
  
  // Find all buttons inside this modal
  const btnMatches = [...modalChunk.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  console.log(`Buttons inside #${id}:`, btnMatches.length);
  btnMatches.forEach(bm => {
    const attrs = bm[1];
    const text = bm[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    const idM = attrs.match(/id=["']([^"']+)["']/i);
    console.log(`  - ID: ${idM ? '#' + idM[1] : 'none'} | Text: "${text.slice(0, 30)}" | onclick: ${attrs.includes('onclick') ? 'yes' : 'no'}`);
  });

  // Find references to this modal in JS
  const refs = jsContents.filter(f => f.code.includes(`'${id}'`) || f.code.includes(`"${id}"`) || f.code.includes(`#${id}`));
  console.log(`Referenced in JS files: ${refs.map(r => r.name).join(', ') || 'NONE'}`);
});
