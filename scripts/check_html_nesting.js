import fs from 'fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split('\n');

let currentPane = null;
let divStack = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('<section data-pane=')) {
    const paneName = line.split('data-pane=')[1].split(' ')[0].replace(/['"]/g, '');
    console.log(`Line ${i + 1}: START pane ${paneName} (current div depth: ${divStack})`);
    currentPane = paneName;
  }

  // Count open divs (rough estimate)
  const opens = (line.match(/<div(\s|>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  divStack += (opens - closes);

  if (line.includes('</section>')) {
    console.log(`Line ${i + 1}: END pane ${currentPane} (div depth at end: ${divStack})`);
    currentPane = null;
  }
}
