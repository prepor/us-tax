import { useParams, Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import statesData from "../data/states.json";
import type { StateEntry, StateTaxData } from "../data/types";
import { loadStateData } from "../lib/rateLookup";
import { ORIGIN_STATES } from "../lib/taxCalculator";
import { formatPercent } from "../lib/formatters";

const states = statesData as StateEntry[];

const taxTypeLabels: Record<string, string> = {
  sales: "Sales Tax",
  get: "General Excise Tax (GET)",
  grt: "Gross Receipts Tax (GRT)",
  tpt: "Transaction Privilege Tax (TPT)",
  none: "No Sales Tax",
  local_only: "No State Tax (Local Only)",
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function exemptionBadge(status: string) {
  switch (status) {
    case "exempt":
      return <Badge color="green">Exempt</Badge>;
    case "taxable":
      return <Badge color="red">Taxable</Badge>;
    case "reduced":
      return <Badge color="yellow">Reduced Rate</Badge>;
    case "partial":
      return <Badge color="yellow">Partial Exemption</Badge>;
    case "n/a":
      return <Badge color="gray">N/A</Badge>;
    default:
      return <Badge color="gray">{status}</Badge>;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex justify-between items-start gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{value}</span>
      </div>
      {note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

// Convert "LOS ANGELES COUNTY" to "Los Angeles County"
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Determine if a region name represents a county or city
function jurisdictionType(regionName: string): "County" | "City" {
  const upper = regionName.toUpperCase();
  if (upper.includes("COUNTY") || upper.includes("UNINCORPORATED")) {
    return "County";
  }
  return "City";
}

// Compute rate stats from Avalara ZIP data
function computeRateStats(data: StateTaxData): {
  localMin: number; localMax: number;
  combinedMin: number; combinedMax: number;
  combinedAvg: number;
} | null {
  let localMin = Infinity, localMax = -Infinity;
  let combinedMin = Infinity, combinedMax = -Infinity;
  let combinedSum = 0, count = 0;
  for (const entries of Object.values(data.zips)) {
    for (const entry of entries) {
      const localRate = entry.county + entry.city + entry.special;
      if (localRate < localMin) localMin = localRate;
      if (localRate > localMax) localMax = localRate;
      if (entry.combined < combinedMin) combinedMin = entry.combined;
      if (entry.combined > combinedMax) combinedMax = entry.combined;
      combinedSum += entry.combined;
      count++;
    }
  }
  if (count === 0) return null;
  return { localMin, localMax, combinedMin, combinedMax, combinedAvg: combinedSum / count };
}

// Extract top jurisdictions by combined rate from per-state ZIP data
function extractTopJurisdictions(
  data: StateTaxData,
  limit = 10,
): { name: string; type: "County" | "City"; localRate: number; combinedRate: number }[] {
  // Collect all entries, deduplicate by region keeping the highest combined rate
  const byRegion = new Map<string, { combined: number; localRate: number }>();

  for (const entries of Object.values(data.zips)) {
    for (const entry of entries) {
      const existing = byRegion.get(entry.region);
      const localRate = entry.county + entry.city + entry.special;
      if (!existing || entry.combined > existing.combined) {
        byRegion.set(entry.region, { combined: entry.combined, localRate });
      }
    }
  }

  // Convert to array, sort by combined rate descending, take top N
  return Array.from(byRegion.entries())
    .map(([region, { combined, localRate }]) => ({
      name: region,
      type: jurisdictionType(region),
      localRate,
      combinedRate: combined,
    }))
    .sort((a, b) => b.localRate - a.localRate)
    .slice(0, limit);
}

export default function StatePage() {
  const { abbr } = useParams<{ abbr: string }>();
  const state = useMemo(
    () => states.find((s) => s.abbreviation === abbr?.toUpperCase()),
    [abbr]
  );

  const [stateData, setStateData] = useState<StateTaxData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Reset state when navigating between states
    setStateData(null);
    setLoadError(false);

    // Skip loading for no-tax states or if state not found
    if (!state || !state.hasSalesTax) return;

    loadStateData(state.abbreviation)
      .then(setStateData)
      .catch(() => setLoadError(true));
  }, [state]);

  if (!state) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">State not found</h1>
        <Link to="/" className="text-blue-600 hover:underline">
          Back to all states
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All States
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {state.abbreviation}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{state.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-600 dark:text-gray-400">
              {taxTypeLabels[state.taxType] ?? state.taxType}
            </span>
            {state.hasSalesTax ? (
              <Badge color="blue">{state.stateRate} state rate</Badge>
            ) : (
              <Badge color="green">No Sales Tax</Badge>
            )}
            {state.hasSalesTax && (
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  ORIGIN_STATES.has(state.abbreviation)
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                {ORIGIN_STATES.has(state.abbreviation) ? "Origin-Based" : "Destination-Based"}
              </span>
            )}
          </div>
          {state.hasSalesTax && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {ORIGIN_STATES.has(state.abbreviation)
                ? "Tax is calculated based on the seller's location"
                : "Tax is calculated based on the buyer's location"}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Rates */}
        <Section title="Tax Rates">
          <InfoRow label="State rate" value={state.hasSalesTax ? state.stateRate : "0%"} />
          {(() => {
            const stats = stateData ? computeRateStats(stateData) : null;
            return (
              <>
                <InfoRow
                  label="Combined average"
                  value={stats ? formatPercent(stats.combinedAvg) : (state.combinedAvgRate || "—")}
                />
                <InfoRow
                  label="Combined range"
                  value={stats ? `${formatPercent(stats.combinedMin)} – ${formatPercent(stats.combinedMax)}` : (state.combinedRateRange || "—")}
                />
                <InfoRow
                  label="Local taxes"
                  value={state.hasLocalTax ? "Yes" : "No"}
                  note={state.hasLocalTax ? (
                    stats
                      ? `Local rate range: ${formatPercent(stats.localMin)} – ${formatPercent(stats.localMax)}`
                      : `Local rate range: ${state.localTaxRange}`
                  ) : undefined}
                />
              </>
            );
          })()}
        </Section>

        {/* Economic Nexus */}
        <Section title="Economic Nexus">
          {state.nexus ? (
            <>
              <InfoRow
                label="Revenue threshold"
                value={state.nexus.revenueThreshold ?? "None"}
              />
              <InfoRow
                label="Transaction threshold"
                value={state.nexus.transactionThreshold ?? "None"}
              />
              {state.nexus.bothRequired && (
                <InfoRow
                  label="Logic"
                  value={<Badge color="yellow">Both Required (AND)</Badge>}
                  note="Both thresholds must be met to trigger nexus"
                />
              )}
              <InfoRow label="Effective date" value={state.nexus.effectiveDate} />
              {state.nexus.note && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{state.nexus.note}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No economic nexus thresholds (no sales tax).
            </p>
          )}
        </Section>

        {/* Exemptions */}
        <Section title="Tax Exemptions">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Groceries</span>
                {exemptionBadge(state.exemptions.groceries)}
              </div>
              {state.exemptions.groceryNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{state.exemptions.groceryNote}</p>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Clothing</span>
                {exemptionBadge(state.exemptions.clothing)}
              </div>
              {state.exemptions.clothingNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{state.exemptions.clothingNote}</p>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Prescription Drugs</span>
                {exemptionBadge(state.exemptions.prescriptionDrugs)}
              </div>
              {state.exemptions.prescriptionNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{state.exemptions.prescriptionNote}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Filing */}
        <Section title="Filing Requirements">
          <InfoRow label="Filing frequency" value={state.filingFrequency || "See state website"} />
          <InfoRow label="Filing deadline" value={state.filingDeadline || "See state website"} />
          {state.registrationUrl && (
            <InfoRow
              label="Registration"
              value={
                <a
                  href={state.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Register online
                </a>
              }
            />
          )}
        </Section>

        {/* Official Resources */}
        <Section title="Official Resources">
          {state.officialWebsite && (
            <InfoRow
              label="Tax authority"
              value={
                <a href={state.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Official website
                </a>
              }
            />
          )}
          {state.salesTaxPage && (
            <InfoRow
              label="Sales tax page"
              value={
                <a href={state.salesTaxPage} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  View details
                </a>
              }
            />
          )}
          {state.contactPhone && (
            <InfoRow label="Phone" value={state.contactPhone} />
          )}
        </Section>

        {/* Calculator link */}
        <div className="p-6 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            See how {state.name}'s tax rules apply to a sample order
          </p>
          <Link
            to={`/calculator?state=${state.abbreviation}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Open Tax Calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Local Tax Rates -- full width below the grid */}
      {state.hasSalesTax && (
        <div className="mt-6">
          <Section title="Local Tax Rates">
            {stateData ? (
              (() => {
                const jurisdictions = extractTopJurisdictions(stateData);
                if (jurisdictions.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No local jurisdiction data available for this state.
                    </p>
                  );
                }
                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Jurisdiction</th>
                            <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                            <th className="text-right py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Local Rate</th>
                            <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Combined Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jurisdictions.map((j) => (
                            <tr key={j.name} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <td className="py-2 pr-4 font-medium">{toTitleCase(j.name)}</td>
                              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{j.type}</td>
                              <td className="py-2 pr-4 text-right">{formatPercent(j.localRate)}</td>
                              <td className="py-2 text-right font-medium">{formatPercent(j.combinedRate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Top 10 jurisdictions by local tax rate. Combined rate = state rate ({formatPercent(stateData.stateRate)}) + local rate.
                    </p>
                  </>
                );
              })()
            ) : loadError ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Local rate data is not yet available for this state.
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Loading local rates...
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
