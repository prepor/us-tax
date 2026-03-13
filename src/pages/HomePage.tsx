import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import statesData from "../data/states.json";

interface StateEntry {
  abbreviation: string;
  name: string;
  hasSalesTax: boolean;
  stateRate: string;
  stateRateNum: number;
  taxType: string;
  hasLocalTax: boolean;
  nexus: {
    revenueThreshold: string | null;
  } | null;
}

const states = statesData as StateEntry[];

const taxTypeLabel: Record<string, string> = {
  sales: "Sales Tax",
  get: "GET",
  grt: "GRT",
  tpt: "TPT",
  none: "No Sales Tax",
  local_only: "Local Only",
};

function rateColor(rate: number): string {
  if (rate === 0) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (rate <= 0.05) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  if (rate <= 0.065) return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "tax" | "no-tax">("all");

  const filtered = useMemo(() => {
    return states.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.abbreviation.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "tax" && s.hasSalesTax) ||
        (filter === "no-tax" && !s.hasSalesTax);
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">US State Sales Tax Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sales tax rates, exemptions, and nexus thresholds for all 50 states + DC.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search states..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(["all", "tax", "no-tax"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "tax" ? "Has Tax" : "No Tax"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((state) => (
          <Link
            key={state.abbreviation}
            to={`/state/${state.abbreviation}`}
            className="group block p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {state.abbreviation}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{state.name}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${rateColor(state.stateRateNum)}`}>
                {state.hasSalesTax ? state.stateRate : "0%"}
              </span>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Type</span>
                <span className="font-medium">{taxTypeLabel[state.taxType] ?? state.taxType}</span>
              </div>
              {state.hasLocalTax && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Local taxes</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Yes</span>
                </div>
              )}
              {state.nexus?.revenueThreshold && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Nexus</span>
                  <span className="font-medium">{state.nexus.revenueThreshold}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">
          No states match your search.
        </p>
      )}
    </div>
  );
}
