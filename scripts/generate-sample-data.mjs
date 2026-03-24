/**
 * Generate sample per-state JSON files for development.
 *
 * Creates representative tax data for 6 states (CA, NY, TX, FL, OR, PA)
 * with realistic ZIP codes, jurisdiction breakdowns, and taxability rules.
 * Uses the same output format as build-tax-data.mjs (matches StateTaxData).
 *
 * Usage: node scripts/generate-sample-data.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const TAXABILITY_PATH = join(ROOT, "data", "taxability.json");
const OUTPUT_DIR = join(ROOT, "public", "tax-data");

// ---------------------------------------------------------------------------
// Sample state definitions
// ---------------------------------------------------------------------------

const SAMPLE_STATES = [
  {
    abbr: "CA",
    name: "California",
    stateRate: 0.0725,
    hasSalesTax: true,
    zips: {
      "90001": [
        { region: "LOS ANGELES COUNTY", combined: 0.095, county: 0.0025, city: 0.0, special: 0.02 },
      ],
      "90012": [
        { region: "LOS ANGELES CITY", combined: 0.095, county: 0.0025, city: 0.0, special: 0.02 },
      ],
      "90210": [
        { region: "BEVERLY HILLS", combined: 0.095, county: 0.0025, city: 0.0, special: 0.02 },
      ],
      "90401": [
        { region: "SANTA MONICA", combined: 0.1025, county: 0.0025, city: 0.0, special: 0.0275 },
      ],
      "91101": [
        { region: "PASADENA", combined: 0.1025, county: 0.0025, city: 0.0075, special: 0.02 },
      ],
      "92101": [
        { region: "SAN DIEGO COUNTY", combined: 0.0775, county: 0.005, city: 0.0, special: 0.0 },
      ],
      "94102": [
        { region: "SAN FRANCISCO COUNTY", combined: 0.0875, county: 0.0, city: 0.0, special: 0.015 },
      ],
      "94301": [
        { region: "PALO ALTO", combined: 0.09375, county: 0.0025, city: 0.0, special: 0.01875 },
      ],
      "95101": [
        { region: "SAN JOSE", combined: 0.09375, county: 0.0025, city: 0.0, special: 0.01875 },
      ],
      "95814": [
        { region: "SACRAMENTO COUNTY", combined: 0.08625, county: 0.0, city: 0.0, special: 0.01375 },
      ],
      "90501": [
        { region: "TORRANCE", combined: 0.1025, county: 0.0025, city: 0.0, special: 0.0275 },
        { region: "UNINCORPORATED LA COUNTY", combined: 0.095, county: 0.0025, city: 0.0, special: 0.02 },
      ],
    },
  },
  {
    abbr: "NY",
    name: "New York",
    stateRate: 0.04,
    hasSalesTax: true,
    zips: {
      "10001": [
        { region: "NEW YORK CITY", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "10013": [
        { region: "NEW YORK CITY", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "10021": [
        { region: "NEW YORK CITY", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "10301": [
        { region: "NEW YORK CITY (STATEN ISLAND)", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "11201": [
        { region: "NEW YORK CITY (BROOKLYN)", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "11101": [
        { region: "NEW YORK CITY (QUEENS)", combined: 0.08875, county: 0.045, city: 0.0, special: 0.00375 },
      ],
      "10501": [
        { region: "WESTCHESTER COUNTY", combined: 0.08375, county: 0.04375, city: 0.0, special: 0.0 },
      ],
      "12201": [
        { region: "ALBANY COUNTY", combined: 0.08, county: 0.04, city: 0.0, special: 0.0 },
      ],
      "14201": [
        { region: "ERIE COUNTY (BUFFALO)", combined: 0.08, county: 0.04, city: 0.0, special: 0.0 },
      ],
      "13201": [
        { region: "ONEIDA COUNTY", combined: 0.08, county: 0.04, city: 0.0, special: 0.0 },
      ],
      "10601": [
        { region: "WESTCHESTER COUNTY (MT VERNON)", combined: 0.08375, county: 0.04375, city: 0.0, special: 0.0 },
        { region: "WESTCHESTER COUNTY (UNINCORPORATED)", combined: 0.08375, county: 0.03375, city: 0.01, special: 0.0 },
      ],
    },
  },
  {
    abbr: "TX",
    name: "Texas",
    stateRate: 0.0625,
    hasSalesTax: true,
    zips: {
      "75001": [
        { region: "DALLAS COUNTY", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "75201": [
        { region: "DALLAS CITY", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "77001": [
        { region: "HOUSTON", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "77002": [
        { region: "HOUSTON", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "78201": [
        { region: "SAN ANTONIO", combined: 0.08125, county: 0.0, city: 0.01375, special: 0.005 },
      ],
      "73301": [
        { region: "AUSTIN", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "76101": [
        { region: "FORT WORTH", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
      ],
      "79901": [
        { region: "EL PASO", combined: 0.08125, county: 0.005, city: 0.01375, special: 0.0 },
      ],
      "78501": [
        { region: "MCALLEN", combined: 0.0825, county: 0.005, city: 0.015, special: 0.0 },
      ],
      "76001": [
        { region: "ARLINGTON", combined: 0.0825, county: 0.0, city: 0.02, special: 0.0 },
        { region: "TARRANT COUNTY (UNINCORPORATED)", combined: 0.0725, county: 0.0, city: 0.01, special: 0.0 },
      ],
    },
  },
  {
    abbr: "FL",
    name: "Florida",
    stateRate: 0.06,
    hasSalesTax: true,
    zips: {
      "33101": [
        { region: "MIAMI-DADE COUNTY", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "33301": [
        { region: "BROWARD COUNTY", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "33401": [
        { region: "PALM BEACH COUNTY", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "32801": [
        { region: "ORANGE COUNTY (ORLANDO)", combined: 0.065, county: 0.005, city: 0.0, special: 0.0 },
      ],
      "33601": [
        { region: "HILLSBOROUGH COUNTY (TAMPA)", combined: 0.075, county: 0.015, city: 0.0, special: 0.0 },
      ],
      "32201": [
        { region: "DUVAL COUNTY (JACKSONVILLE)", combined: 0.075, county: 0.015, city: 0.0, special: 0.0 },
      ],
      "34101": [
        { region: "COLLIER COUNTY (NAPLES)", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "33901": [
        { region: "LEE COUNTY", combined: 0.065, county: 0.005, city: 0.0, special: 0.0 },
      ],
      "34201": [
        { region: "MANATEE COUNTY", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "32501": [
        { region: "ESCAMBIA COUNTY (PENSACOLA)", combined: 0.075, county: 0.015, city: 0.0, special: 0.0 },
        { region: "ESCAMBIA COUNTY (UNINCORPORATED)", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
    },
  },
  {
    abbr: "OR",
    name: "Oregon",
    stateRate: 0,
    hasSalesTax: false,
    zips: {
      "97001": [],
      "97201": [],
      "97301": [],
      "97401": [],
      "97501": [],
      "97601": [],
      "97701": [],
      "97801": [],
      "97901": [],
    },
  },
  {
    abbr: "PA",
    name: "Pennsylvania",
    stateRate: 0.06,
    hasSalesTax: true,
    zips: {
      "19101": [
        { region: "PHILADELPHIA", combined: 0.08, county: 0.02, city: 0.0, special: 0.0 },
      ],
      "19102": [
        { region: "PHILADELPHIA", combined: 0.08, county: 0.02, city: 0.0, special: 0.0 },
      ],
      "15201": [
        { region: "ALLEGHENY COUNTY (PITTSBURGH)", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "15101": [
        { region: "ALLEGHENY COUNTY", combined: 0.07, county: 0.01, city: 0.0, special: 0.0 },
      ],
      "17101": [
        { region: "DAUPHIN COUNTY (HARRISBURG)", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "18101": [
        { region: "LEHIGH COUNTY (ALLENTOWN)", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "16501": [
        { region: "ERIE COUNTY", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "19601": [
        { region: "BERKS COUNTY (READING)", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "18501": [
        { region: "LACKAWANNA COUNTY (SCRANTON)", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
      "19301": [
        { region: "CHESTER COUNTY", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
        { region: "DELAWARE COUNTY", combined: 0.06, county: 0.0, city: 0.0, special: 0.0 },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Taxability resolution (same logic as build-tax-data.mjs)
// ---------------------------------------------------------------------------

function resolveTaxability(taxabilityData, stateAbbr, hasSalesTax) {
  const categories = ["groceries", "clothing", "medicine", "candy", "prepared_food"];
  const result = {};

  if (!hasSalesTax) {
    for (const cat of categories) {
      result[cat] = { status: "exempt", note: "No state sales tax" };
    }
    return result;
  }

  for (const cat of categories) {
    const catData = taxabilityData[cat];
    const override = catData.overrides[stateAbbr];

    if (override) {
      result[cat] = { ...override };
    } else {
      result[cat] = {
        status: catData.default,
        note: catData.default === "exempt"
          ? `${cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")} exempt from sales tax`
          : `${cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")} taxable at the standard rate`,
      };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("generate-sample-data: Starting sample data generation...\n");

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

  const updated = `March 2026 (sample data)`;
  let totalZipCodes = 0;
  const stateList = [];

  for (const state of SAMPLE_STATES) {
    const taxability = resolveTaxability(taxabilityData, state.abbr, state.hasSalesTax);

    // Build zips record
    const zips = {};
    for (const [zip, regions] of Object.entries(state.zips)) {
      if (regions.length > 0) {
        zips[zip] = regions;
        totalZipCodes++;
      }
    }

    const stateJson = {
      state: state.abbr,
      stateName: state.name,
      stateRate: state.stateRate,
      hasSalesTax: state.hasSalesTax,
      updated,
      taxability,
      zips,
    };

    await writeFile(
      join(OUTPUT_DIR, `${state.abbr}.json`),
      JSON.stringify(stateJson, null, 2),
    );

    stateList.push(state.abbr);
    console.log(`  ${state.abbr}: ${Object.keys(zips).length} ZIPs`);
  }

  stateList.sort();

  // Write manifest
  const manifest = {
    generated: new Date().toISOString(),
    ratesAsOf: updated,
    stateCount: stateList.length,
    totalZipCodes,
    states: stateList,
  };

  await writeFile(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`\ngenerate-sample-data: Complete.`);
  console.log(`  States generated: ${stateList.length}`);
  console.log(`  Total ZIP codes:  ${totalZipCodes}`);
  console.log(`  Output:           ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("generate-sample-data: Fatal error:", err);
  process.exit(1);
});
