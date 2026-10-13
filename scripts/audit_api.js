import fs from 'fs';

const apiCode = fs.readFileSync('public/js/api.js', 'utf8');
const serverCode = fs.readFileSync('server.js', 'utf8');

const regex = /call\((?:'([^']+)'|`([^`]+)`)/g;
let match;
const endpoints = [];
while ((match = regex.exec(apiCode)) !== null) {
  const url = match[1] || match[2];
  endpoints.push(url);
}

console.log(`Found ${endpoints.length} API endpoints called in api.js:`);
let missingCount = 0;
endpoints.forEach(ep => {
  const clean = ep.split('${')[0].split('?')[0];
  const exists = serverCode.includes(clean);
  if (!exists) {
    console.log(`❌ Potential mismatch: ${ep} (looking for prefix: ${clean})`);
    missingCount++;
  } else {
    console.log(`✅ Matches: ${ep}`);
  }
});

console.log(`\nTotal checked: ${endpoints.length}. Potential missing: ${missingCount}`);
