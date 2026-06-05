#!/usr/bin/env node
// Scan a DBPR CSV and report stats WITHOUT staging anything.
// Usage: node scripts/scan-csv.js [path-to-csv]

const fs = require('fs');
const path = require('path');

const CSV_PATH = process.argv[2];
if (!CSV_PATH) { console.error('Usage: node scan-csv.js <path-to-csv>'); process.exit(1); }
if (!fs.existsSync(CSV_PATH)) { console.error('File not found:', CSV_PATH); process.exit(1); }

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        let field = '';
        i++;
        while (i < len) {
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { field += text[i++]; }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') field += text[i++];
        row.push(field.trim());
      }
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

function extractLicenses(services) {
  if (!services) return [];
  const licenses = [];
  const regex = /([A-Za-z][A-Za-z0-9 &\/]*?)\s*\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(services)) !== null) {
    const licenseType = m[1].trim();
    const licenseNumber = m[2].trim().toUpperCase().replace(/\s+/g, '');
    if (licenseNumber.length >= 3 && /[A-Z]/.test(licenseNumber)) {
      licenses.push({ licenseType, licenseNumber });
    }
  }
  return licenses;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const raw = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
const header = raw[0];
const rows = raw.slice(1);

const col = (kw) => header.findIndex(h => h.toLowerCase().includes(kw.toLowerCase()));
const IDX = {
  name:     col('business name'),
  services: col('services'),
  verified: col('license verified'),
  cityZip:  col('city state'),
};

let totalRows = rows.length;
let notVerified = 0;
let noName = 0;
let noLicense = 0;
let hasLicense = 0;
let multiLicense = 0;

const licenseMap = new Map();
const licenseTypeCount = {};
const licenseTypeExamples = {};
const stateCount = {};
const verifiedSamples = [];
const notVerifiedSamples = [];

for (const row of rows) {
  const verifiedField = (row[IDX.verified] ?? '').trim();
  const businessName  = (row[IDX.name] ?? '').trim();
  const services      = (row[IDX.services] ?? '').trim();

  if (!verifiedField.toLowerCase().includes('verified')) {
    notVerified++;
    if (notVerifiedSamples.length < 5) notVerifiedSamples.push({ name: businessName, verified: verifiedField, services: services.substring(0, 60) });
    continue;
  }

  if (!businessName || businessName.length < 2) { noName++; continue; }

  const licenses = extractLicenses(services);
  if (licenses.length === 0) {
    noLicense++;
    // Categorize what services these unlicensed entries have
    const tradeTypes = services.split(',').map(s => s.trim()).filter(s => !s.includes('('));
    for (const t of tradeTypes) {
      licenseTypeCount[`[UNLICENSED] ${t}`] = (licenseTypeCount[`[UNLICENSED] ${t}`] || 0) + 1;
    }
    continue;
  }

  hasLicense++;
  if (licenses.length > 1) multiLicense++;

  if (verifiedSamples.length < 3) verifiedSamples.push({ name: businessName, services: services.substring(0, 80), licenses: licenses.length });

  for (const { licenseType, licenseNumber } of licenses) {
    const key = `${licenseNumber}:FL`;
    if (!licenseMap.has(key)) {
      licenseMap.set(key, { businessName, licenseType, licenseNumber });
      licenseTypeCount[licenseType] = (licenseTypeCount[licenseType] || 0) + 1;
      if (!licenseTypeExamples[licenseType]) licenseTypeExamples[licenseType] = licenseNumber;
    }
  }

  // State from city/zip field
  const cityZip = (row[IDX.cityZip] ?? '').trim();
  const stateMatch = cityZip.match(/\b([A-Z]{2})\s+\d{5}/);
  if (stateMatch) {
    const st = stateMatch[1];
    stateCount[st] = (stateCount[st] || 0) + 1;
  }
}

const uniqueLicenses = licenseMap.size;
const promotable = [...licenseMap.values()].length; // all would qualify

// Sort license types
const sortedTypes = Object.entries(licenseTypeCount)
  .filter(([k]) => !k.startsWith('[UNLICENSED]'))
  .sort((a, b) => b[1] - a[1]);

const sortedUnlicensed = Object.entries(licenseTypeCount)
  .filter(([k]) => k.startsWith('[UNLICENSED]'))
  .sort((a, b) => b[1] - a[1]);

const sortedStates = Object.entries(stateCount).sort((a, b) => b[1] - a[1]);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  SCAN REPORT — No data staged');
console.log(`  File: ${path.basename(CSV_PATH)}`);
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📂 Raw rows:              ${totalRows.toLocaleString()}`);
console.log(`   Not verified:          ${notVerified.toLocaleString()}  (${((notVerified/totalRows)*100).toFixed(1)}%)`);
console.log(`   No business name:      ${noName.toLocaleString()}`);
console.log(`   Verified, no license:  ${noLicense.toLocaleString()}  (unlicensed trades)`);
console.log(`   Has license(s):        ${hasLicense.toLocaleString()}  (${((hasLicense/totalRows)*100).toFixed(1)}%)`);
console.log(`   Multi-license rows:    ${multiLicense.toLocaleString()}`);
console.log(`\n✅ Unique license keys after dedup: ${uniqueLicenses.toLocaleString()}\n`);

console.log('📊 Licensed trade types (top 25):');
for (const [type, count] of sortedTypes.slice(0, 25)) {
  const ex = licenseTypeExamples[type] || '';
  console.log(`   ${type.padEnd(40)} ${String(count).padStart(5)}   e.g. ${ex}`);
}
if (sortedTypes.length > 25) console.log(`   ... and ${sortedTypes.length - 25} more license types`);

console.log('\n⚠️  Verified but NO license number (top 10 trade types):');
for (const [type, count] of sortedUnlicensed.slice(0, 10)) {
  console.log(`   ${type.replace('[UNLICENSED] ', '').padEnd(40)} ${String(count).padStart(5)}`);
}

if (sortedStates.length > 1) {
  console.log('\n🗺️  Contractor state breakdown (top 10):');
  for (const [st, count] of sortedStates.slice(0, 10)) {
    console.log(`   ${st}  ${count.toLocaleString()}`);
  }
}

console.log('\n📋 Sample verified entries:');
for (const s of verifiedSamples) {
  console.log(`   "${s.name}" — ${s.licenses} license(s) — ${s.services}`);
}

if (notVerifiedSamples.length > 0) {
  console.log('\n📋 Sample NOT-verified entries:');
  for (const s of notVerifiedSamples) {
    console.log(`   "${s.name}" — verified="${s.verified}" — ${s.services}`);
  }
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(`  WOULD STAGE: ${uniqueLicenses.toLocaleString()} unique licensed records`);
console.log('  Current staging: UNTOUCHED — run import-florida.js to proceed');
console.log('═══════════════════════════════════════════════════════════\n');
