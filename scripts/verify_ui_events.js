import fs from 'fs';

const html = fs.readFileSync('public/index.html', 'utf8');

// Find all buttons
const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
let match;
let total = 0;
let buttonTypes = {
  withDataView: 0,
  withDataNav: 0,
  withDataAction: 0,
  withDataStatus: 0,
  withDataClass: 0,
  withDataCat: 0,
  withDataStatTab: 0,
  withId: 0,
  withTypeSubmit: 0,
  withOnclick: 0,
  withCopy: 0,
  withCanned: 0,
  withVar: 0,
  withPreset: 0
};

while ((match = btnRegex.exec(html)) !== null) {
  total++;
  const attrs = match[1];
  if (attrs.includes('data-view=')) buttonTypes.withDataView++;
  if (attrs.includes('data-nav=')) buttonTypes.withDataNav++;
  if (attrs.includes('data-action=')) buttonTypes.withDataAction++;
  if (attrs.includes('data-status=')) buttonTypes.withDataStatus++;
  if (attrs.includes('data-class=')) buttonTypes.withDataClass++;
  if (attrs.includes('data-cat=')) buttonTypes.withDataCat++;
  if (attrs.includes('data-stat-tab=')) buttonTypes.withDataStatTab++;
  if (attrs.includes('id=')) buttonTypes.withId++;
  if (attrs.includes('type="submit"') || attrs.includes("type='submit'")) buttonTypes.withTypeSubmit++;
  if (attrs.includes('onclick=')) buttonTypes.withOnclick++;
  if (attrs.includes('data-copy=')) buttonTypes.withCopy++;
  if (attrs.includes('data-canned=')) buttonTypes.withCanned++;
  if (attrs.includes('data-var=')) buttonTypes.withVar++;
  if (attrs.includes('data-pct=') || attrs.includes('data-budget=')) buttonTypes.withPreset++;
}

console.log('Total buttons inspected:', total);
console.log('Button attributes breakdown:', buttonTypes);
