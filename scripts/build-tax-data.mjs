/**
 * Avalara CSV -> per-state JSON build pipeline.
 *
 * Reads Avalara free rate CSV files from data/avalara/, merges
 * taxability rules from data/taxability.json, validates the data,
 * and writes per-state JSON files + manifest to public/tax-data/.
 *
 * Usage: node scripts/build-tax-data.mjs
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const AVALARA_DIR = join(ROOT, "data", "avalara");
const TAXABILITY_PATH = join(ROOT, "data", "taxability.json");
const OUTPUT_DIR = join(ROOT, "public", "tax-data");

// ---------------------------------------------------------------------------
// State names lookup
// ---------------------------------------------------------------------------

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// States with no state sales tax
const NO_TAX_STATES = new Set(["DE", "MT", "NH", "OR"]);

// Alaska has no state sales tax but may have local taxes
const ALASKA = "AK";

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

/**
 * Parse an Avalara CSV file into an array of row objects.
 * Columns: State, ZipCode, TaxRegionName, EstimatedCombinedRate,
 *          StateRate, EstimatedCountyRate, EstimatedCityRate,
 *          SpecialRate, RiskLevel
 */
function parseCsv(content) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(",");
    if (fields.length < 8) continue;

    rows.push({
      state: fields[0].trim(),
      zipCode: fields[1].trim().padStart(5, "0"),
      regionName: fields[2].trim(),
      combinedRate: parseFloat(fields[3]) || 0,
      stateRate: parseFloat(fields[4]) || 0,
      countyRate: parseFloat(fields[5]) || 0,
      cityRate: parseFloat(fields[6]) || 0,
      specialRate: parseFloat(fields[7]) || 0,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Taxability resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the taxability rule for a given state and category.
 * If the state has an override, use it; otherwise use the category default.
 */
function resolveTaxability(taxabilityData, stateAbbr) {
  const categories = ["groceries", "clothing", "medicine", "candy", "prepared_food"];
  const result = {};

  for (const cat of categories) {
    const catData = taxabilityData[cat];
    const override = catData.overrides[stateAbbr];

    if (override) {
      result[cat] = { ...override };
    } else {
      result[cat] = {
        status: catData.default,
        note: catData.default === "exempt"
          ? `${cat.charAt(0).toUpperCase() + cat.slice(1)} exempt from sales tax`
          : `${cat.charAt(0).toUpperCase() + cat.slice(1)} taxable at the standard rate`,
      };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(stateData, warnings) {
  const errors = [];

  // Check minimum state count (45 taxable states + DC = 46 minimum)
  const stateCount = Object.keys(stateData).length;
  if (stateCount < 46) {
    errors.push(
      `Missing states: only ${stateCount} states found (need at least 46). ` +
      `Found: ${Object.keys(stateData).sort().join(", ")}`
    );
  }

  for (const [abbr, data] of Object.entries(stateData)) {
    // Rate anomaly checks
    for (const [zip, regions] of Object.entries(data.zips)) {
      for (const region of regions) {
        if (region.combined < 0) {
          errors.push(`${abbr} ZIP ${zip}: negative combined rate ${region.combined}`);
        }
        if (region.combined > 0.25) {
          errors.push(`${abbr} ZIP ${zip}: combined rate ${region.combined} exceeds 25%`);
        }
        if (region.county < 0 || region.city < 0 || region.special < 0) {
          errors.push(`${abbr} ZIP ${zip}: negative component rate`);
        }
      }

      // Duplicate ZIP + region name check
      const regionNames = regions.map((r) => r.region);
      const uniqueNames = new Set(regionNames);
      if (uniqueNames.size < regionNames.length) {
        errors.push(`${abbr} ZIP ${zip}: duplicate region names found`);
      }
    }

    // State rate consistency check (warning, not error)
    if (Object.keys(data.zips).length > 0) {
      const stateRates = new Set();
      for (const regions of Object.values(data.zips)) {
        for (const region of regions) {
          // State rate is combined - county - city - special
          const impliedStateRate = Math.round((region.combined - region.county - region.city - region.special) * 10000) / 10000;
          stateRates.add(impliedStateRate);
        }
      }
      if (stateRates.size > 1) {
        warnings.push(`${abbr}: state rate varies across ZIPs: ${[...stateRates].sort().join(", ")}`);
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Filename date extraction
// ---------------------------------------------------------------------------

/**
 * Extract a date string from Avalara CSV filenames.
 * E.g., "TAXRATES_ZIP5_AL202603.csv" -> "March 2026"
 * Falls back to current month/year.
 */
function extractRatesAsOf(filenames) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  for (const name of filenames) {
    const match = name.match(/(\d{4})(\d{2})\.csv$/);
    if (match) {
      const year = match[1];
      const monthNum = parseInt(match[2], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        return `${months[monthNum - 1]} ${year}`;
      }
    }
  }

  // Fallback to current date
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// No-tax state file generation
// ---------------------------------------------------------------------------

function createNoTaxStateData(abbr, taxabilityData, updated) {
  return {
    state: abbr,
    stateName: STATE_NAMES[abbr] || abbr,
    stateRate: 0,
    hasSalesTax: false,
    updated,
    taxability: {
      groceries: { status: "exempt", note: "No state sales tax" },
      clothing: { status: "exempt", note: "No state sales tax" },
      medicine: { status: "exempt", note: "No state sales tax" },
      candy: { status: "exempt", note: "No state sales tax" },
      prepared_food: { status: "exempt", note: "No state sales tax" },
    },
    zips: {},
  };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log("build-tax-data: Starting Avalara CSV pipeline...\n");

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Read taxability rules
  let taxabilityData;
  try {
    const raw = await readFile(TAXABILITY_PATH, "utf8");
    taxabilityData = JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading taxability.json: ${err.message}`);
    process.exit(1);
  }

  // List CSV files
  let csvFiles = [];
  try {
    const allFiles = await readdir(AVALARA_DIR);
    csvFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".csv"));
  } catch {
    // Directory might not exist or be empty
  }

  if (csvFiles.length === 0) {
    console.warn(
      "build-tax-data: WARNING - No Avalara CSV files found in data/avalara/.\n" +
      "  Download CSV files from https://www.avalara.com/taxrates/en/download-tax-tables.html\n" +
      "  and place them in data/avalara/ before building.\n" +
      "  Creating empty manifest with 0 states.\n"
    );

    // Write empty manifest
    const manifest = {
      generated: new Date().toISOString(),
      ratesAsOf: "No data",
      stateCount: 0,
      totalZipCodes: 0,
      states: [],
    };
    await writeFile(join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log("build-tax-data: Wrote empty manifest.json");
    return;
  }

  // Parse all CSV files
  const stateData = {};
  const warnings = [];
  const skippedAbbrs = new Set();
  let totalZipCodes = 0;

  for (const csvFile of csvFiles) {
    const content = await readFile(join(AVALARA_DIR, csvFile), "utf8");
    const rows = parseCsv(content);

    for (const row of rows) {
      const abbr = row.state;
      if (!STATE_NAMES[abbr]) {
        if (!skippedAbbrs.has(abbr)) {
          skippedAbbrs.add(abbr);
          warnings.push(`Skipping territory/non-state: ${abbr} (${csvFile})`);
        }
        continue;
      }

      if (!stateData[abbr]) {
        stateData[abbr] = {
          stateRate: row.stateRate,
          zips: {},
        };
      }

      if (!stateData[abbr].zips[row.zipCode]) {
        stateData[abbr].zips[row.zipCode] = [];
      }

      stateData[abbr].zips[row.zipCode].push({
        region: row.regionName,
        combined: row.combinedRate,
        county: row.countyRate,
        city: row.cityRate,
        special: row.specialRate,
      });
    }
  }

  // Determine the state rate for each state (most common rate from CSV)
  for (const [abbr, data] of Object.entries(stateData)) {
    const rateCounts = {};
    for (const regions of Object.values(data.zips)) {
      for (const region of regions) {
        const sr = Math.round(
          (region.combined - region.county - region.city - region.special) * 10000
        ) / 10000;
        rateCounts[sr] = (rateCounts[sr] || 0) + 1;
      }
    }
    // Use the most frequent state rate
    let maxCount = 0;
    let bestRate = data.stateRate;
    for (const [rate, count] of Object.entries(rateCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestRate = parseFloat(rate);
      }
    }
    data.stateRate = bestRate;
  }

  // Add no-tax states that might not have CSV files
  const ratesAsOf = extractRatesAsOf(csvFiles);

  for (const abbr of NO_TAX_STATES) {
    if (!stateData[abbr]) {
      // No CSV file for this no-tax state; create a stub entry for validation
      stateData[abbr] = { stateRate: 0, zips: {} };
    }
  }

  // Handle Alaska specially: no state tax but may have local taxes
  if (stateData[ALASKA]) {
    stateData[ALASKA].stateRate = 0;
  }

  // Validate
  const errors = validate(stateData, warnings);

  if (warnings.length > 0) {
    console.warn("build-tax-data: Warnings:");
    for (const w of warnings) {
      console.warn(`  - ${w}`);
    }
    console.warn("");
  }

  if (errors.length > 0) {
    console.error("build-tax-data: VALIDATION FAILED:");
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  // Write per-state JSON files
  const stateList = [];

  for (const [abbr, data] of Object.entries(stateData)) {
    const isNoTax = NO_TAX_STATES.has(abbr);
    const isAlaska = abbr === ALASKA;
    const hasSalesTax = !isNoTax && !isAlaska;

    const taxability = (isNoTax || isAlaska)
      ? {
          groceries: { status: "exempt", note: "No state sales tax" },
          clothing: { status: "exempt", note: "No state sales tax" },
          medicine: { status: "exempt", note: "No state sales tax" },
          candy: { status: "exempt", note: "No state sales tax" },
          prepared_food: { status: "exempt", note: "No state sales tax" },
        }
      : resolveTaxability(taxabilityData, abbr);

    // Count ZIP codes
    const zipCount = Object.keys(data.zips).length;
    totalZipCodes += zipCount;

    const stateJson = {
      state: abbr,
      stateName: STATE_NAMES[abbr] || abbr,
      stateRate: isNoTax || isAlaska ? 0 : data.stateRate,
      hasSalesTax,
      updated: ratesAsOf,
      taxability,
      zips: data.zips,
    };

    await writeFile(
      join(OUTPUT_DIR, `${abbr}.json`),
      JSON.stringify(stateJson, null, 2)
    );

    stateList.push(abbr);
  }

  // Also write files for no-tax states that had no CSV data
  for (const abbr of NO_TAX_STATES) {
    if (!stateList.includes(abbr)) {
      const stateJson = createNoTaxStateData(abbr, taxabilityData, ratesAsOf);
      await writeFile(
        join(OUTPUT_DIR, `${abbr}.json`),
        JSON.stringify(stateJson, null, 2)
      );
      stateList.push(abbr);
    }
  }

  stateList.sort();

  // Write manifest
  const manifest = {
    generated: new Date().toISOString(),
    ratesAsOf,
    stateCount: stateList.length,
    totalZipCodes,
    states: stateList,
  };

  await writeFile(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Summary
  console.log(`build-tax-data: Complete.`);
  console.log(`  States processed: ${stateList.length}`);
  console.log(`  Total ZIP codes:  ${totalZipCodes}`);
  console.log(`  Rates as of:      ${ratesAsOf}`);
  console.log(`  Output:           ${OUTPUT_DIR}/`);
  if (warnings.length > 0) {
    console.log(`  Warnings:         ${warnings.length}`);
  }
}

main().catch((err) => {
  console.error("build-tax-data: Fatal error:", err);
  process.exit(1);
});
