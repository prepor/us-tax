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

export default function CalculatorPage() {
  const [buyerZip, setBuyerZip] = useState("");
  const [sellerZip, setSellerZip] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ProductCategory>("general");
  const [result, setResult] = useState<TaxBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    setError(null);
    setResult(null);

    if (!isValidZip(buyerZip)) {
      setError("Please enter a valid 5-digit ZIP code for the buyer.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid purchase amount greater than zero.");
      return;
    }

    if (sellerZip && !isValidZip(sellerZip)) {
      setError("Please enter a valid 5-digit ZIP code for the seller.");
      return;
    }

    setLoading(true);
    try {
      const res = await calculateFullTax({
        buyerZip,
        sellerZip: sellerZip || undefined,
        amount: parsedAmount,
        category,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tax Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a ZIP code and purchase details to calculate exact sales tax with full jurisdiction breakdown.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        {/* Input Form */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-5 self-start">
          {/* Buyer ZIP */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Buyer ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 90210"
              value={buyerZip}
              onChange={(e) => setBuyerZip(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
          </div>

          {/* Seller ZIP */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Seller ZIP Code{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 94102"
              value={sellerZip}
              onChange={(e) => setSellerZip(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              For origin-based states (AZ, CA, IL, MS, MO, OH, PA, TN, TX, UT, VA), in-state sellers use their local rate.
            </p>
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

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Calculating..." : "Calculate Tax"}
          </button>
        </div>

        {/* Results */}
        <div className="min-h-[200px]">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-500 dark:text-gray-400 text-sm">Calculating...</div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Header card with combined rate */}
              <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-4xl font-bold tabular-nums">
                      {formatPercent(result.combinedRate)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Combined tax rate
                    </div>
                    <div className="text-sm font-medium mt-2">
                      {result.stateName} ({result.stateAbbr})
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      result.sourcingRule === "origin"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {result.sourcingRule === "origin" ? "Origin-based" : "Destination-based"}
                  </span>
                </div>
              </div>

              {/* Jurisdiction Breakdown Table */}
              {result.jurisdictions.length > 0 && (
                <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <h2 className="text-lg font-semibold mb-4">Jurisdiction Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Jurisdiction</th>
                          <th className="pb-3 px-4">Name</th>
                          <th className="pb-3 px-4 text-right">Rate</th>
                          <th className="pb-3 pl-4 text-right">Tax Amount</th>
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
                              <td className="py-3 pr-4 text-sm font-medium">{j.jurisdiction}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                {j.name}
                              </td>
                              <td className="py-3 px-4 text-sm text-right tabular-nums">
                                {formatPercent(j.rate)}
                              </td>
                              <td className="py-3 pl-4 text-sm text-right tabular-nums">
                                {formatCurrency(j.taxAmount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                          <td className="pt-3 pr-4 text-sm font-semibold" colSpan={2}>
                            Total
                          </td>
                          <td className="pt-3 px-4 text-sm text-right font-semibold tabular-nums">
                            {formatPercent(result.combinedRate)}
                          </td>
                          <td className="pt-3 pl-4 text-sm text-right font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                            {formatCurrency(result.totalTax)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-2">
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
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-lg font-bold tabular-nums">
                      {formatCurrency(result.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {result.notes.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    Notes
                  </h3>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    {result.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
              Enter a ZIP code and amount, then click Calculate Tax to see results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
