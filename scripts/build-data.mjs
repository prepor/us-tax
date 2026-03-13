import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STATE_DIR = join(__dirname, "..", "state-taxes");
const OUTPUT_DIR = join(__dirname, "..", "src", "data");
const OUTPUT = join(OUTPUT_DIR, "states.json");

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

const NO_TAX_STATES = ["DE", "MT", "NH", "OR"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a section of the markdown by heading name (## Heading). */
function getSection(md, heading) {
  // Find the heading line
  const headingRe = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "mi");
  const headingMatch = headingRe.exec(md);
  if (!headingMatch) return "";

  // Skip to end of the heading line
  const lineEnd = md.indexOf("\n", headingMatch.index);
  const startIdx = lineEnd === -1 ? md.length : lineEnd + 1;
  // Find the next ## heading
  const nextHeading = md.indexOf("\n## ", startIdx);
  const content = nextHeading === -1
    ? md.slice(startIdx)
    : md.slice(startIdx, nextHeading);
  return content.trim();
}

/** Parse a percentage string like "4.0%" or "~8.04%" into a number. */
function parseRate(str) {
  if (!str) return 0;
  const m = str.match(/([\d.]+)%/);
  return m ? parseFloat(m[1]) / 100 : 0;
}

/** Round to avoid floating-point noise. */
function round(n, d = 6) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

/** Strip markdown link syntax, keeping the text. */
function stripLinks(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** Clean a note string. */
function cleanNote(text) {
  return text
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\n/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Truncate a string. */
function truncate(str, max = 300) {
  if (str.length > max) return str.slice(0, max - 3) + "...";
  return str;
}

// ---------------------------------------------------------------------------
// Tax type
// ---------------------------------------------------------------------------
function getTaxType(abbr) {
  if (NO_TAX_STATES.includes(abbr)) return "none";
  if (abbr === "AK") return "local_only";
  if (abbr === "HI") return "get";
  if (abbr === "NM") return "grt";
  if (abbr === "AZ") return "tpt";
  return "sales";
}

// ---------------------------------------------------------------------------
// State rate
// ---------------------------------------------------------------------------
function getStateRate(abbr, overview, md) {
  if (NO_TAX_STATES.includes(abbr) || abbr === "AK") return { str: "0%", num: 0 };

  // Try to match patterns like "State-level sales tax rate: 6.25%"
  // Also handle GET, GRT, TPT variants and "Sales tax rate:" for DC
  const ratePatterns = [
    /\*\*(?:State-level\s+)?(?:sales|GET|GRT|TPT|Sales)\s+(?:tax\s+)?rate:?\*\*\s*(\d+(?:\.\d+)?%)/i,
    /\*\*State-level\s+\w+\s+rate:?\*\*\s*(\d+(?:\.\d+)?%)/i,
    /\*\*Sales\s+tax\s+rate:?\*\*\s*(\d+(?:\.\d+)?%)/i,
    /\*\*State-level\s+(?:sales\s+)?(?:tax\s+)?rate:?\*\*\s*(\d+(?:\.\d+)?%)/i,
    /\*\*State-level\s+TPT\s+rate:?\*\*\s*(\d+(?:\.\d+)?%)/i,
  ];

  for (const pat of ratePatterns) {
    const m = overview.match(pat);
    if (m) {
      const str = m[1];
      return { str, num: round(parseRate(str)) };
    }
  }

  // Fallback: look for a percentage on any "rate" line in overview
  const fallback = overview.match(/rate.*?(\d+(?:\.\d+)?%)/i);
  if (fallback) {
    return { str: fallback[1], num: round(parseRate(fallback[1])) };
  }

  // Last resort: search full markdown for state-level rate
  for (const pat of ratePatterns) {
    const m = md.match(pat);
    if (m) {
      const str = m[1];
      return { str, num: round(parseRate(str)) };
    }
  }
  const mdFallback = md.match(/\*\*State-level\s+\w+\s+rate:?\*\*\s*(\d+(?:\.\d+)?%)/i);
  if (mdFallback) {
    return { str: mdFallback[1], num: round(parseRate(mdFallback[1])) };
  }

  return { str: "0%", num: 0 };
}

// ---------------------------------------------------------------------------
// Combined average rate
// ---------------------------------------------------------------------------
function getCombinedAvgRate(abbr, overview) {
  if (NO_TAX_STATES.includes(abbr)) return "0%";

  // Match "Combined average rate" or "Combined rate" or "Combined maximum rate" lines
  const patterns = [
    /\*\*Combined\s+(?:average\s+)?rate\s*\([^)]*\):?\*\*\s*(.*)/i,
    /\*\*Combined\s+(?:average|maximum)\s+rate\s*\([^)]*\):?\*\*\s*(.*)/i,
    /\*\*Combined\s+(?:average\s+)?rate:?\*\*\s*(.*)/i,
  ];

  for (const pat of patterns) {
    const m = overview.match(pat);
    if (m) {
      const line = m[1];
      // If the line starts with "Varies", return descriptive text
      if (/^varies/i.test(line.trim())) {
        // Try to extract the range as the "average"
        const rangeMatch = line.match(/between\s+~?([\d.]+%)\s*(?:and|to|-)\s*~?([\d.]+%)/i);
        if (rangeMatch) return `${rangeMatch[1]} - ${rangeMatch[2]}`;
        return line.split(/[;(]/)[0].trim();
      }
      const pctMatch = line.match(/~?([\d.]+%)/);
      if (pctMatch) {
        const approx = line.includes("~") || line.toLowerCase().includes("approx");
        return approx ? `~${pctMatch[1]}` : pctMatch[1];
      }
      return line.split(/[.(]/)[0].trim();
    }
  }

  // AK special case
  if (abbr === "AK") {
    const avgMatch = overview.match(/average\s+local\s+rate.*?(~?[\d.]+%)/i);
    if (avgMatch) return avgMatch[1];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Combined rate range
// ---------------------------------------------------------------------------
function getCombinedRateRange(abbr, overview) {
  if (NO_TAX_STATES.includes(abbr)) return null;

  // Look for explicit "Combined rate range" line
  const rangeLineMatch = overview.match(/\*\*Combined\s+rate\s+range.*?\*\*\s*(.*)/i);
  if (rangeLineMatch) {
    const m = rangeLineMatch[1].match(/(\d+(?:\.\d+)?%)\s*(?:to|[-\u2013])\s*~?(\d+(?:\.\d+)?%)/);
    if (m) return `${m[1]} - ${m[2]}`;
  }

  // Look for range patterns anywhere in overview
  const rangePatterns = [
    /(?:range|rates?\s+range).*?(\d+(?:\.\d+)?%)\s*(?:to|[-\u2013])\s*~?(\d+(?:\.\d+)?%)/i,
    /(\d+(?:\.\d+)?%)\s*(?:to|[-\u2013])\s*~?(\d+(?:\.\d+)?%)\s*(?:depending|range)/i,
  ];

  for (const pat of rangePatterns) {
    const m = overview.match(pat);
    if (m) return `${m[1]} - ${m[2]}`;
  }

  // AK: local rate range
  if (abbr === "AK") {
    const m = overview.match(/(\d+(?:\.\d+)?%)\s*(?:to|[-\u2013])\s*~?(\d+(?:\.\d+)?%)/);
    if (m) return `${m[1]} - ${m[2]}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Economic nexus
// ---------------------------------------------------------------------------
function parseNexus(abbr, md) {
  if (NO_TAX_STATES.includes(abbr)) {
    return {
      revenueThreshold: null,
      transactionThreshold: null,
      bothRequired: false,
      effectiveDate: null,
      note: "No sales tax",
    };
  }

  const section = getSection(md, "Economic Nexus Thresholds");

  // Revenue threshold
  let revenueThreshold = null;
  const revMatch = section.match(
    /\*\*Revenue\s+threshold:?\*\*\s*(?:More\s+than\s+)?(\$[\d,]+)/i
  );
  if (revMatch) revenueThreshold = revMatch[1];

  // Transaction threshold
  let transactionThreshold = null;
  // Pattern: "200 or more separate transactions"
  const txnPatterns = [
    /\*\*Transaction\s+threshold:?\*\*\s*(?:More\s+than\s+)?([\d,]+)\s+(?:or\s+more\s+)?(?:separate\s+)?(?:retail\s+)?transactions/i,
    /\*\*Transaction\s+threshold:?\*\*\s*(?:More\s+than\s+)?([\d,]+)\s+(?:or\s+more\s+)?(?:separate\s+)?(?:retail\s+)?sales/i,
  ];
  for (const pat of txnPatterns) {
    const m = section.match(pat);
    if (m) {
      transactionThreshold = `${m[1]} transactions`;
      break;
    }
  }

  // Both required (only NY uses AND logic)
  const bothRequired = abbr === "NY";

  // Effective date
  let effectiveDate = null;
  const datePatterns = [
    // Direct date after heading keyword
    /\*\*(?:Effective\s+date|When\s+the\s+law\s+took\s+effect):?\*\*\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    // Date embedded in text on the same line
    /\*\*(?:Effective\s+date|When\s+the\s+law\s+took\s+effect):?\*\*\s*.*?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const pat of datePatterns) {
    const m = section.match(pat);
    if (m) {
      effectiveDate = m[1];
      break;
    }
  }
  // Fallback: look for "took effect" or "effective" with a date anywhere in section
  if (!effectiveDate) {
    const fallback = section.match(/(?:took\s+effect|effective)\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
    if (fallback) effectiveDate = fallback[1];
  }

  // Note - extract any important notes
  let note = "";
  const noteMatch = section.match(/\*\*(?:Important\s+)?note:?\*\*\s*(.*)/i);
  if (noteMatch) note = stripLinks(noteMatch[1]).replace(/\*\*/g, "").trim();

  return {
    revenueThreshold,
    transactionThreshold,
    bothRequired,
    effectiveDate,
    note,
  };
}

// ---------------------------------------------------------------------------
// Exemptions
// ---------------------------------------------------------------------------
function parseExemptions(abbr, md) {
  if (NO_TAX_STATES.includes(abbr)) {
    return {
      groceries: "n/a",
      groceryNote: "No sales tax",
      clothing: "n/a",
      clothingNote: "No sales tax",
      prescriptionDrugs: "n/a",
      prescriptionNote: "No sales tax",
    };
  }

  const section = getSection(md, "Taxable Goods");

  // ---- GROCERIES ----
  let groceries = "taxable";
  let groceryNote = "";

  // Extract the food/grocery bullet text
  const groceryPatterns = [
    /\*\*(?:Food\/[Gg]roceries|Food.*?groceries|Groceries\/[Ff]ood|Food\s+and\s+food\s+ingredients[^*]*|Food\s*\([^)]*\)|Groceries\s*\/?\s*unprepared\s+food|Food\s+for\s+home\s+consumption[^*]*|Food\s+products|Food|Groceries):?\*\*\s*(.*?)(?=\n\s*(?:-\s+)?\*\*[A-Z]|\n\s*-\s+\*\*[A-Z]|$)/is,
  ];

  let groceryText = "";
  for (const pat of groceryPatterns) {
    const m = section.match(pat);
    if (m) {
      groceryText = m[1].trim();
      break;
    }
  }

  // Also check the overview for food rate info
  const overview = getSection(md, "Overview");

  if (groceryText) {
    const gt = groceryText.toLowerCase();
    if (/exempt/i.test(groceryText) && !/not\s+exempt/i.test(groceryText)) {
      groceries = "exempt";
    }
    if (/deduct(?:ible|ion|ed)/i.test(groceryText)) {
      groceries = "exempt";
    }
    if (/not\s+(?:subject|taxable)/i.test(groceryText) && !/not\s+(?:subject|taxable)\s+to\s+(?:local|city)/i.test(groceryText)) {
      groceries = "exempt";
    }
    // Check for reduced rate
    if (/reduced/i.test(groceryText) || /lower\s+rate/i.test(groceryText)) {
      groceries = "reduced";
    }
    // Taxable but at reduced rate pattern
    if (/taxable.*?reduced/i.test(groceryText)) {
      groceries = "reduced";
    }
    // NOT exempt overrides back to taxable (unless reduced)
    if (/NOT\s+exempt/i.test(groceryText)) {
      if (!/reduced/i.test(groceryText)) groceries = "taxable";
    }
    // "Generally taxable at the full" => taxable
    if (/generally\s+taxable\s+at\s+the\s+full/i.test(groceryText)) {
      groceries = "taxable";
    }

    groceryNote = truncate(cleanNote(groceryText));
  }

  // Check overview for reduced grocery rate patterns
  if (/grocery\s+food\s+rate|reduced\s+rate\s+on\s+food|food.*?reduced.*?rate/i.test(overview)) {
    if (groceries !== "exempt") groceries = "reduced";
  }

  // If we found "2% reduced rate on food" in overview (AL pattern)
  if (/reduced\s+rate\s+on\s+food/i.test(overview)) {
    groceries = "reduced";
  }

  // HI: GET applies to groceries at full rate
  if (abbr === "HI") groceries = "taxable";

  // ---- CLOTHING ----
  let clothing = "taxable";
  let clothingNote = "";

  const clothingMatch = section.match(
    /\*\*Clothing(?:\s+and\s+footwear)?:?\*\*\s*(.*?)(?=\n\s*(?:-\s+)?\*\*[A-Z]|\n\s*-\s+\*\*(?:Over|Prescription|Medicine|SNAP|Other|Sales|Textbook|Dietary|Restaurant|Costum|Sports|Vitamin|Durable|Medical|Notable)|$)/is
  );

  if (clothingMatch) {
    const cText = clothingMatch[1].trim();
    // Get just the first sentence/line for primary classification
    const firstLine = cText.split(/\n/)[0].trim();

    // Priority 1: Check if explicitly taxable at start
    if (/^(?:Generally\s+)?(?:\*\*)?taxable/i.test(firstLine) ||
        /^NOT\s+exempt/i.test(firstLine) ||
        /no\s+(?:general\s+)?(?:clothing\s+)?exemption/i.test(firstLine) ||
        /no\s+exemption/i.test(firstLine)) {
      clothing = "taxable";
    }
    // Priority 2: Check for partial exemption with threshold
    else {
      const threshMatch = cText.match(/(?:under|less\s+than|priced\s+at|sold\s+for)\s+\$(\d+)/i);
      const threshMatch2 = cText.match(/\$(\d+)\s+or\s+less/i);
      const threshold = threshMatch ? threshMatch[1] : (threshMatch2 ? threshMatch2[1] : null);

      if (threshold && /exempt/i.test(cText)) {
        clothing = "partial";
        clothingNote = `Items $${threshold} or less exempt`;
      }
      // Priority 3: Full exemption
      else if (/^(?:\*\*)?exempt/i.test(firstLine)) {
        clothing = "exempt";
      }
      // Priority 4: Text contains "exempt" but not at start — likely context-dependent
      else if (/exempt/i.test(cText) && !/not\s+exempt/i.test(cText) && !/taxable/i.test(firstLine)) {
        // Only if the word "taxable" doesn't also appear
        if (!/taxable/i.test(cText)) {
          clothing = "exempt";
        }
      }
    }

    if (!clothingNote) {
      clothingNote = truncate(cleanNote(cText));
    }
  }

  // If no explicit clothing section found, check broader text
  if (!clothingMatch) {
    if (/clothing.*?exempt/i.test(section) && !/clothing.*?(?:not\s+exempt|NOT\s+exempt)/i.test(section)) {
      clothing = "exempt";
    }
    if (/clothing.*?(?:taxable|NOT\s+exempt)/i.test(section)) {
      clothing = "taxable";
    }
  }

  // AK special case
  if (abbr === "AK") {
    clothing = "taxable";
    clothingNote = "Generally taxable; varies by local jurisdiction";
  }

  // ---- PRESCRIPTION DRUGS ----
  let prescriptionDrugs = "exempt";
  let prescriptionNote = "";

  const rxPatterns = [
    /\*\*(?:Prescription\s+(?:drugs?|medicine)|Prescription\s+and\s+(?:non-prescription|over-the-counter)\s+drugs?(?:\/medicine)?|Medicine\/drugs|Prescription\s+drugs?\/medicine):?\*\*\s*(.*?)(?=\n\s*(?:-\s+)?\*\*[A-Z]|\n\s*-\s+\*\*(?:Over|Sales|Other|Textbook|Notable|SNAP|Clothing|Costum|Sports|Restaurant|Vitamin|Durable|Medical)|$)/is,
  ];

  for (const pat of rxPatterns) {
    const m = section.match(pat);
    if (m) {
      const rxText = m[1].trim();
      if (/exempt/i.test(rxText) || /deductible/i.test(rxText)) {
        prescriptionDrugs = "exempt";
      }
      prescriptionNote = truncate(cleanNote(rxText));
      break;
    }
  }

  // Also match "Prescription drugs" in a list with just "Exempt" after
  if (!prescriptionNote) {
    if (/prescription\s+drugs?\s*(?:are\s+)?exempt/i.test(section) ||
        /prescription.*?medicine.*?exempt/i.test(section) ||
        /prescription.*?exempt/i.test(section)) {
      prescriptionDrugs = "exempt";
      prescriptionNote = "Exempt";
    }
  }

  // AK - varies by jurisdiction
  if (abbr === "AK") {
    prescriptionDrugs = "exempt";
    prescriptionNote = "May vary by local jurisdiction";
  }

  return {
    groceries,
    groceryNote,
    clothing,
    clothingNote,
    prescriptionDrugs,
    prescriptionNote,
  };
}

// ---------------------------------------------------------------------------
// Local tax
// ---------------------------------------------------------------------------
function parseLocalTax(abbr, md) {
  if (NO_TAX_STATES.includes(abbr)) {
    return { hasLocalTax: false, localTaxRange: null };
  }

  // DC - single jurisdiction
  if (abbr === "DC") return { hasLocalTax: false, localTaxRange: null };

  // AK - only local taxes
  if (abbr === "AK") return { hasLocalTax: true, localTaxRange: "1% - 7.5%" };

  const section = getSection(md, "Local Taxes");

  // Check for "Yes" at the start of first bullet
  const firstBullet = section.match(/^\s*-\s*\*\*[^*]+\*\*\s*(.*)/m);
  const firstAnswer = firstBullet ? firstBullet[1].trim().toLowerCase() : "";

  const yesLocal = firstAnswer.startsWith("yes") ||
    /\byes\b/i.test(firstAnswer) ||
    /only\s+\w+\s+jurisdictions?\s+impose/i.test(firstAnswer);

  const noLocal =
    /no\s+local\s+sales\s+tax/i.test(section) ||
    /does\s+not\s+(?:allow|have|permit)\s+local/i.test(section) ||
    /uniform\s+statewide/i.test(section) ||
    /no\s+additional\s+local/i.test(section) ||
    firstAnswer.startsWith("no");

  const hasLocalTax = yesLocal && !noLocal;

  // Extract range
  let localTaxRange = null;
  if (hasLocalTax) {
    // Look for percentage range in the section
    const rangeMatch = section.match(
      /(\d+(?:\.\d+)?%)\s*(?:to|[-\u2013])\s*~?(\d+(?:\.\d+)?%)/
    );
    if (rangeMatch) {
      localTaxRange = `${rangeMatch[1]} - ${rangeMatch[2]}`;
    }

    // PA special case
    if (abbr === "PA") localTaxRange = "1% - 2%";
  }

  return { hasLocalTax, localTaxRange };
}

// ---------------------------------------------------------------------------
// Filing
// ---------------------------------------------------------------------------
function parseFiling(abbr, md) {
  if (NO_TAX_STATES.includes(abbr)) {
    return { filingFrequency: null, filingDeadline: null };
  }

  const section = getSection(md, "Filing Requirements");
  if (!section || /^-?\s*\*\*Not\s+applicable/im.test(section)) {
    return { filingFrequency: null, filingDeadline: null };
  }

  // Filing frequency - collect from the text
  let filingFrequency = null;
  const freqs = [];
  if (/monthly/i.test(section)) freqs.push("Monthly");
  if (/quarterly/i.test(section)) freqs.push("Quarterly");
  if (/semi-?annual/i.test(section)) freqs.push("Semi-annually");
  if (/\bannual(?:ly)?\b/i.test(section) && !/semi-?annual/i.test(section)) freqs.push("Annually");

  if (freqs.length > 0) {
    // Deduplicate
    filingFrequency = [...new Set(freqs)].join(", ");
  }

  // Filing deadline
  let filingDeadline = null;
  const deadlineMatch = section.match(
    /\*\*Filing\s+deadline[s]?:?\*\*\s*(.*?)(?=\n\s*(?:-\s+)?\*\*[A-Z]|\n\s*-\s+\*\*(?:Filing|Late|E-filing|Zero|Seller|Official|Discount|Annual|Prepay)|$)/is
  );
  if (deadlineMatch) {
    let text = deadlineMatch[1].trim().split("\n")[0];
    text = stripLinks(text).replace(/\*\*/g, "").trim();
    if (text.length > 200) text = text.slice(0, 197) + "...";
    filingDeadline = text;
  }

  // Fallback: look for "due" patterns
  if (!filingDeadline) {
    const dueMatch = section.match(/(?:returns?\s+(?:are\s+)?)?due\s+(?:on\s+)?(?:or\s+before\s+)?(?:the\s+)?(?:no\s+later\s+than\s+)?(?:by\s+)?(?:the\s+)?(\d+(?:th|st|nd|rd)?\s+(?:day\s+)?(?:of\s+the\s+month|after)[^.]*)/i);
    if (dueMatch) {
      filingDeadline = dueMatch[0].replace(/\*\*/g, "").trim();
      if (filingDeadline.length > 200) filingDeadline = filingDeadline.slice(0, 197) + "...";
    }
  }

  return { filingFrequency, filingDeadline };
}

// ---------------------------------------------------------------------------
// Official links
// ---------------------------------------------------------------------------
function parseOfficialLinks(abbr, md) {
  const section = getSection(md, "Official Resources");
  const regSection = getSection(md, "Tax Registration");

  let officialWebsite = null;
  let salesTaxPage = null;
  let registrationUrl = null;
  let contactPhone = null;

  // Website - try markdown link format first, then bare URL
  const websitePatterns = [
    /\*\*(?:Website|ARSSTC\s+website):?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i,
    /\*\*(?:Website|ARSSTC\s+website):?\*\*\s*(https?:\/\/[^\s)\n]+)/i,
  ];
  for (const pat of websitePatterns) {
    const m = section.match(pat);
    if (m) {
      officialWebsite = m[1].replace(/\)$/, "");
      break;
    }
  }

  // Sales tax page
  const stpPatterns = [
    /\*\*Main\s+(?:sales|GET|GRT|TPT)\s+(?:tax\s+)?page:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i,
    /\*\*Main\s+(?:sales|GET|GRT|TPT)\s+(?:tax\s+)?page:?\*\*\s*(https?:\/\/[^\s)\n]+)/i,
    /\*\*(?:Sales\s+tax|GET|GRT)\s+(?:information\s+)?page:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i,
    /\*\*(?:Sales\s+tax|GET|GRT)\s+(?:information\s+)?page:?\*\*\s*(https?:\/\/[^\s)\n]+)/i,
    /\*\*(?:Sales\s+tax\s+FAQ|Sales\s+tax\s+guidance\s+page):?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i,
    /\*\*(?:Sales\s+tax\s+FAQ|Sales\s+tax\s+guidance\s+page):?\*\*\s*(https?:\/\/[^\s)\n]+)/i,
  ];
  for (const pat of stpPatterns) {
    const m = section.match(pat);
    if (m) {
      salesTaxPage = m[1].replace(/\)$/, "");
      break;
    }
  }

  // Registration URL from Tax Registration section
  const regPatterns = [
    /\*\*(?:Registration|Official\s+registration|Online\s+registration)\s+portal:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i,
    /\*\*(?:Registration|Official\s+registration|Online\s+registration)\s+portal:?\*\*\s*(https?:\/\/[^\s)\n]+)/i,
  ];
  for (const pat of regPatterns) {
    const m = regSection.match(pat);
    if (m) {
      registrationUrl = m[1].replace(/\)$/, "");
      break;
    }
  }

  // Contact phone - search in Official Resources section and Filing Requirements
  const filingSection = getSection(md, "Filing Requirements");
  const allContactText = section + "\n" + filingSection;
  const phonePatterns = [
    /(?:Phone|Call|Contact|Customer\s+Service)[^:\n]*?:?\s*(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i,
    /(\d-\d{3}-\d{3}-\d{4})/,
  ];
  for (const pat of phonePatterns) {
    const m = allContactText.match(pat);
    if (m) {
      contactPhone = m[1].trim();
      break;
    }
  }

  // Fallback: look for any phone number in official resources
  if (!contactPhone) {
    const anyPhone = section.match(/(\(\d{3}\)\s*\d{3}-\d{4})/);
    if (anyPhone) contactPhone = anyPhone[1];
  }

  // Broad fallback: if section extraction failed, search full markdown
  if (!officialWebsite) {
    const m = md.match(/\*\*Website:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i) ||
              md.match(/\*\*Website:?\*\*\s*(https?:\/\/[^\s)\n]+)/i);
    if (m) officialWebsite = m[1].replace(/\)$/, "");
  }
  if (!salesTaxPage) {
    const m = md.match(/\*\*Main\s+\w+\s+(?:tax\s+)?page:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i) ||
              md.match(/\*\*Main\s+\w+\s+(?:tax\s+)?page:?\*\*\s*(https?:\/\/[^\s)\n]+)/i);
    if (m) salesTaxPage = m[1].replace(/\)$/, "");
  }
  if (!registrationUrl) {
    const m = md.match(/\*\*(?:Registration|Official\s+registration|Online\s+registration)\s+portal:?\*\*\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i);
    if (m) registrationUrl = m[1].replace(/\)$/, "");
  }
  if (!contactPhone) {
    const m = md.match(/(?:Phone|Call|Taxpayer\s+Services)[^:\n]*?:?\s*(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i);
    if (m) contactPhone = m[1].trim();
  }

  return { officialWebsite, salesTaxPage, registrationUrl, contactPhone };
}

// ---------------------------------------------------------------------------
// Has sales tax
// ---------------------------------------------------------------------------
function hasSalesTax(abbr) {
  if (NO_TAX_STATES.includes(abbr)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const files = (await readdir(STATE_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();

  console.log(`Found ${files.length} state files`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const states = [];

  for (const file of files) {
    const abbr = basename(file, ".md");
    const md = await readFile(join(STATE_DIR, file), "utf-8");
    const overview = getSection(md, "Overview");

    const taxType = getTaxType(abbr);
    const stateRate = getStateRate(abbr, overview, md);
    const combinedAvgRate = getCombinedAvgRate(abbr, overview || md);
    const combinedRateRange = getCombinedRateRange(abbr, overview || md);
    const nexus = parseNexus(abbr, md);
    const exemptions = parseExemptions(abbr, md);
    const { hasLocalTax, localTaxRange } = parseLocalTax(abbr, md);
    const { filingFrequency, filingDeadline } = parseFiling(abbr, md);
    const { officialWebsite, salesTaxPage, registrationUrl, contactPhone } =
      parseOfficialLinks(abbr, md);

    const entry = {
      abbreviation: abbr,
      name: STATE_NAMES[abbr] || abbr,
      hasSalesTax: hasSalesTax(abbr),
      stateRate: stateRate.str,
      stateRateNum: stateRate.num,
      combinedAvgRate,
      combinedRateRange,
      taxType,
      nexus,
      exemptions,
      hasLocalTax,
      localTaxRange,
      filingFrequency,
      filingDeadline,
      officialWebsite,
      salesTaxPage,
      registrationUrl,
      contactPhone,
      markdownContent: md,
    };

    states.push(entry);
  }

  // Sort alphabetically by abbreviation
  states.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));

  await writeFile(OUTPUT, JSON.stringify(states, null, 2), "utf-8");
  console.log(`Wrote ${states.length} states to ${OUTPUT}`);

  // Quick validation
  const noTax = states.filter((s) => !s.hasSalesTax);
  console.log(
    `\nNo-tax states: ${noTax.map((s) => s.abbreviation).join(", ")}`
  );

  const specialTypes = states.filter(
    (s) => s.taxType !== "sales" && s.taxType !== "none"
  );
  console.log(
    `Special tax types: ${specialTypes.map((s) => `${s.abbreviation}=${s.taxType}`).join(", ")}`
  );

  const reducedGrocery = states.filter(
    (s) => s.exemptions.groceries === "reduced"
  );
  console.log(
    `Reduced grocery rate: ${reducedGrocery.map((s) => s.abbreviation).join(", ")}`
  );

  const exemptClothing = states.filter(
    (s) => s.exemptions.clothing === "exempt" || s.exemptions.clothing === "partial"
  );
  console.log(
    `Exempt/partial clothing: ${exemptClothing.map((s) => `${s.abbreviation}=${s.exemptions.clothing}`).join(", ")}`
  );

  // Check for missing data
  const missingRate = states.filter(
    (s) => s.hasSalesTax && s.stateRateNum === 0 && s.taxType !== "local_only"
  );
  if (missingRate.length) {
    console.warn(
      `\nWARNING: States with sales tax but 0% rate: ${missingRate.map((s) => s.abbreviation).join(", ")}`
    );
  }

  const missingNexus = states.filter(
    (s) => s.hasSalesTax && !s.nexus.revenueThreshold
  );
  if (missingNexus.length) {
    console.warn(
      `WARNING: States with sales tax but no revenue threshold: ${missingNexus.map((s) => s.abbreviation).join(", ")}`
    );
  }

  const missingWebsite = states.filter(
    (s) => s.hasSalesTax && !s.officialWebsite
  );
  if (missingWebsite.length) {
    console.warn(
      `WARNING: States with sales tax but no official website: ${missingWebsite.map((s) => s.abbreviation).join(", ")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
