import { useState } from "react";
import type { ProductCategory, TaxBreakdownResult } from "../data/types";
import { calculateFullTax } from "../lib/taxCalculator";
import { isValidZip } from "../lib/zipUtils";
import { formatCurrency, formatPercent } from "../lib/formatters";

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "groceries", label: "Groceries" },
  { value: "clothing", label: "Clothing" },
  { value: "medicine", label: "Medicine" },
  { value: "prepared_food", label: "Prepared Food" },
];

function formatDelta(leftRate: number, rightRate: number): string {
  const diff = rightRate - leftRate;
  if (Math.abs(diff) < 0.00005) return "Same rate";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${(diff * 100).toFixed(2)}%`;
}

function ResultColumn({
  label,
  result,
  error,
  rateColor,
}: {
  label: string;
  result: TaxBreakdownResult | null;
  error: string | null;
  rateColor?: string;
}) {
  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</h3>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{label}</h3>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className={`text-3xl font-bold tabular-nums ${rateColor || ""}`}>
              {formatPercent(result.combinedRate)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Combined rate</div>
            <div className="text-sm font-medium mt-1">
              {result.stateName} ({result.stateAbbr})
            </div>
          </div>
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
              result.sourcingRule === "origin"
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            }`}
          >
            {result.sourcingRule === "origin" ? "Origin-based" : "Destination-based"}
          </span>
        </div>
      </div>

      {/* Jurisdiction Breakdown */}
      {result.jurisdictions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Jurisdiction Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-3">Jurisdiction</th>
                  <th className="pb-2 px-3">Name</th>
                  <th className="pb-2 px-3 text-right">Rate</th>
                  <th className="pb-2 pl-3 text-right">Tax</th>
                </tr>
              </thead>
              <tbody>
                {result.jurisdictions
                  .filter((j) => j.rate > 0)
                  .map((j) => (
                    <tr
                      key={j.jurisdiction}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 pr-3 text-sm font-medium">{j.jurisdiction}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                        {j.name}
                      </td>
                      <td className="py-2 px-3 text-sm text-right tabular-nums">
                        {formatPercent(j.rate)}
                      </td>
                      <td className="py-2 pl-3 text-sm text-right tabular-nums">
                        {formatCurrency(j.taxAmount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                  <td className="pt-2 pr-3 text-sm font-semibold" colSpan={2}>
                    Total
                  </td>
                  <td className="pt-2 px-3 text-sm text-right font-semibold tabular-nums">
                    {formatPercent(result.combinedRate)}
                  </td>
                  <td className="pt-2 pl-3 text-sm text-right font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {formatCurrency(result.totalTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="tabular-nums">{formatCurrency(result.subtotal)}</span>
        </div>
        {result.taxableAmount !== result.subtotal && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Taxable Amount</span>
            <span className="tabular-nums">{formatCurrency(result.taxableAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Tax</span>
          <span className="tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrency(result.totalTax)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="font-bold">Total</span>
          <span className="font-bold tabular-nums">{formatCurrency(result.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
            {result.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [leftZip, setLeftZip] = useState("");
  const [rightZip, setRightZip] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ProductCategory>("general");
  const [leftResult, setLeftResult] = useState<TaxBreakdownResult | null>(null);
  const [rightResult, setRightResult] = useState<TaxBreakdownResult | null>(null);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    setError(null);
    setLeftError(null);
    setRightError(null);
    setLeftResult(null);
    setRightResult(null);

    if (!isValidZip(leftZip) || !isValidZip(rightZip)) {
      setError("Please enter valid 5-digit ZIP codes for both locations.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid purchase amount greater than zero.");
      return;
    }

    setLoading(true);

    const [leftRes, rightRes] = await Promise.allSettled([
      calculateFullTax({ buyerZip: leftZip, amount: parsedAmount, category }),
      calculateFullTax({ buyerZip: rightZip, amount: parsedAmount, category }),
    ]);

    if (leftRes.status === "fulfilled") {
      setLeftResult(leftRes.value);
    } else {
      setLeftError(leftRes.reason instanceof Error ? leftRes.reason.message : "Calculation failed");
    }

    if (rightRes.status === "fulfilled") {
      setRightResult(rightRes.value);
    } else {
      setRightError(rightRes.reason instanceof Error ? rightRes.reason.message : "Calculation failed");
    }

    setLoading(false);
  }

  // Determine rate colors for delta highlighting
  let leftRateColor = "";
  let rightRateColor = "";
  if (leftResult && rightResult) {
    const diff = leftResult.combinedRate - rightResult.combinedRate;
    if (Math.abs(diff) >= 0.00005) {
      if (diff < 0) {
        // Left is cheaper
        leftRateColor = "text-green-600 dark:text-green-400";
        rightRateColor = "text-red-600 dark:text-red-400";
      } else {
        // Right is cheaper
        leftRateColor = "text-red-600 dark:text-red-400";
        rightRateColor = "text-green-600 dark:text-green-400";
      }
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compare Tax Rates</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compare sales tax rates for two ZIP codes side-by-side.
        </p>
      </div>

      {/* Shared Inputs */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Left ZIP */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Location A ZIP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 90210"
              value={leftZip}
              onChange={(e) => setLeftZip(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
          </div>

          {/* Right ZIP */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Location B ZIP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 10001"
              value={rightZip}
              onChange={(e) => setRightZip(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
          </div>

          {/* Purchase Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Purchase Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          {/* Product Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Product Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          disabled={loading}
          className={`mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {/* Shared validation error */}
      {error && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Delta Display */}
      {leftResult && rightResult && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {Math.abs(leftResult.combinedRate - rightResult.combinedRate) < 0.00005 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Both locations have the same tax rate.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
              <span className="font-medium">
                {leftResult.combinedRate < rightResult.combinedRate
                  ? `Location A is ${formatDelta(leftResult.combinedRate, rightResult.combinedRate)} lower`
                  : `Location B is ${formatDelta(rightResult.combinedRate, leftResult.combinedRate)} lower`}
              </span>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <span className="text-gray-500 dark:text-gray-400">
                Difference: {formatPercent(Math.abs(leftResult.combinedRate - rightResult.combinedRate))} rate
                {" "}({formatCurrency(Math.abs(leftResult.totalTax - rightResult.totalTax))} on this purchase)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500 dark:text-gray-400 text-sm">Comparing...</div>
        </div>
      )}

      {/* Results Side-by-Side */}
      {(leftResult || rightResult || leftError || rightError) && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResultColumn
            label="Location A"
            result={leftResult}
            error={leftError}
            rateColor={leftRateColor}
          />
          <ResultColumn
            label="Location B"
            result={rightResult}
            error={rightError}
            rateColor={rightRateColor}
          />
        </div>
      )}

      {/* Empty state */}
      {!leftResult && !rightResult && !leftError && !rightError && !loading && !error && (
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
          Enter two ZIP codes and an amount, then click Compare to see results side-by-side.
        </div>
      )}
    </div>
  );
}
