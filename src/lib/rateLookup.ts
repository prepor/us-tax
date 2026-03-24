/**
 * Lazy-loading per-state tax data with Promise-based cache.
 *
 * Each state's rate data (~8KB gzipped) is fetched on demand from
 * public/tax-data/{STATE}.json and cached as a Promise. Storing the
 * Promise (not the resolved value) prevents duplicate concurrent
 * fetches when multiple lookups fire before the first response returns.
 */

import type { StateTaxData, ZipEntry } from "../data/types";

const cache = new Map<string, Promise<StateTaxData>>();

/**
 * Fetches and caches per-state tax data JSON.
 *
 * Uses import.meta.env.BASE_URL to resolve the correct path on both
 * localhost (/) and GitHub Pages (/us-tax/).
 */
export function loadStateData(stateAbbr: string): Promise<StateTaxData> {
  const key = stateAbbr.toUpperCase();
  if (!cache.has(key)) {
    const url = `${import.meta.env.BASE_URL}tax-data/${key}.json`;
    cache.set(
      key,
      fetch(url).then((r) => {
        if (!r.ok) {
          throw new Error(`Tax data not available for ${key} (HTTP ${r.status})`);
        }
        return r.json() as Promise<StateTaxData>;
      }),
    );
  }
  return cache.get(key)!;
}

/**
 * Returns the primary ZipEntry for a given ZIP code within loaded state data.
 *
 * A single ZIP can map to multiple tax jurisdictions (e.g., a ZIP that
 * spans county lines). This returns the first entry, which represents
 * the primary/most-common jurisdiction for that ZIP.
 *
 * Returns null if the ZIP is not found in the state data.
 */
export function lookupZip(
  stateData: StateTaxData,
  zip: string,
): ZipEntry | null {
  const entries = stateData.zips[zip];
  if (!entries || entries.length === 0) return null;
  return entries[0];
}

/**
 * Returns true when a ZIP code spans multiple tax jurisdictions.
 *
 * When true, the calculator should display a note explaining that the
 * shown rate is the primary jurisdiction and actual rates may vary.
 */
export function hasMultipleJurisdictions(
  stateData: StateTaxData,
  zip: string,
): boolean {
  const entries = stateData.zips[zip];
  return !!entries && entries.length > 1;
}
