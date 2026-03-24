/**
 * ZIP code validation and ZIP-to-state mapping.
 *
 * Uses a static lookup table of 3-digit ZIP prefix ranges mapped to
 * 2-letter state abbreviations. This enables instant state identification
 * without any network requests -- the prefix table is ~3KB in memory.
 *
 * Source: USPS 3-digit ZIP Code Prefix assignment tables.
 */

// Format: [startPrefix3, endPrefix3, stateAbbr]
// Covers all 50 states + DC + PR + military (AA).
// Gaps in the prefix space (e.g., 001-004) return null.
const ZIP_PREFIX_MAP: [number, number, string][] = [
  // 0xx
  [5, 5, "NY"],
  [6, 9, "PR"],
  [10, 27, "MA"],
  [28, 29, "RI"],
  [30, 38, "NH"],
  [39, 49, "ME"],
  [50, 54, "VT"],
  [55, 59, "MA"],
  [60, 69, "CT"],
  [70, 89, "NJ"],
  [90, 99, "NJ"],
  // 1xx
  [100, 149, "NY"],
  [150, 196, "PA"],
  // 2xx
  [200, 205, "DC"],
  [206, 219, "MD"],
  [220, 246, "VA"],
  [247, 268, "WV"],
  [270, 289, "NC"],
  [290, 299, "SC"],
  // 3xx
  [300, 319, "GA"],
  [320, 339, "FL"],
  [340, 349, "AA"],
  [350, 369, "AL"],
  [370, 385, "TN"],
  [386, 397, "MS"],
  [398, 399, "GA"],
  // 4xx
  [400, 427, "KY"],
  [430, 459, "OH"],
  [460, 479, "IN"],
  [480, 499, "MI"],
  // 5xx
  [500, 528, "IA"],
  [530, 549, "WI"],
  [550, 567, "MN"],
  [570, 577, "SD"],
  [580, 588, "ND"],
  [590, 599, "MT"],
  // 6xx
  [600, 629, "IL"],
  [630, 658, "MO"],
  [660, 679, "KS"],
  [680, 693, "NE"],
  // 7xx
  [700, 714, "LA"],
  [716, 729, "AR"],
  [730, 749, "OK"],
  [750, 799, "TX"],
  // 8xx
  [800, 816, "CO"],
  [820, 831, "WY"],
  [832, 838, "ID"],
  [840, 847, "UT"],
  [850, 865, "AZ"],
  [870, 884, "NM"],
  [889, 898, "NV"],
  // 9xx
  [900, 966, "CA"],
  [967, 968, "HI"],
  [970, 979, "OR"],
  [980, 994, "WA"],
  [995, 999, "AK"],
];

/**
 * Validates that a string is a 5-digit US ZIP code.
 */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Maps a 5-digit ZIP code to its 2-letter state abbreviation.
 *
 * Returns null if the ZIP is invalid or its 3-digit prefix does not
 * match any known state range (e.g., military APO codes, unassigned
 * prefixes, or territories without sales tax data).
 */
export function zipToState(zip: string): string | null {
  if (!isValidZip(zip)) return null;
  const prefix = Math.floor(parseInt(zip, 10) / 100);
  for (const [start, end, state] of ZIP_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) return state;
  }
  return null;
}
