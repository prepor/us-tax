import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import statesData from "../data/states.json";
import { demoProducts, type Product } from "../data/products";
import { calculateTax, type StateData, type TaxLineItem } from "../lib/taxRules";
import { formatCurrency, formatPercent } from "../lib/formatters";

const states = (statesData as StateData[]).slice().sort((a, b) => a.name.localeCompare(b.name));

interface CartItem {
  product: Product;
  quantity: number;
}

function TaxLineItemRow({ item }: { item: TaxLineItem }) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{item.product.image}</span>
          <div>
            <div className="font-medium text-sm">{item.product.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.quantity} x {formatCurrency(item.product.price)}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right text-sm tabular-nums">
        {formatCurrency(item.subtotal)}
      </td>
      <td className="py-3 px-4 text-right text-sm">
        {item.isExempt ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Exempt
          </span>
        ) : (
          <span className="tabular-nums">{formatPercent(item.taxRate)}</span>
        )}
      </td>
      <td className="py-3 px-4 text-right text-sm tabular-nums font-medium">
        {item.isExempt ? "--" : formatCurrency(item.taxAmount)}
      </td>
      <td className="py-3 pl-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
        {item.explanation}
      </td>
    </tr>
  );
}

export default function CalculatorPage() {
  const [searchParams] = useSearchParams();
  const initialState = searchParams.get("state")?.toUpperCase() || "CA";
  const [selectedState, setSelectedState] = useState(initialState);
  const [cart, setCart] = useState<CartItem[]>(
    demoProducts.map((p) => ({ product: p, quantity: 1 }))
  );

  const state = states.find((s) => s.abbreviation === selectedState)!;

  const result = useMemo(() => {
    if (!state) return null;
    const activeItems = cart.filter((i) => i.quantity > 0);
    return calculateTax(activeItems, state);
  }, [cart, state]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tax Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Demo cart with sample products. Select a state to see how sales tax is calculated with
          item-by-item explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Sidebar: state selector + cart */}
        <div className="space-y-6">
          {/* State selector */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <label className="block text-sm font-medium mb-2">Shipping State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {states.map((s) => (
                <option key={s.abbreviation} value={s.abbreviation}>
                  {s.name} ({s.abbreviation}) — {s.hasSalesTax ? s.stateRate : "No tax"}
                </option>
              ))}
            </select>

            {state && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">State rate</span>
                  <span className="font-medium">{state.hasSalesTax ? state.stateRate : "0%"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Local taxes</span>
                  <span className="font-medium">{state.hasLocalTax ? "Yes" : "No"}</span>
                </div>
                {state.hasLocalTax && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Local taxes vary by address and are not included in this demo calculation.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h2 className="text-sm font-medium mb-3">Demo Cart</h2>
            <div className="space-y-3">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{product.image}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{product.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {result && (
            <>
              <h2 className="text-lg font-semibold mb-4">
                Tax Breakdown for {state.name}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Item</th>
                      <th className="pb-3 px-4 text-right">Subtotal</th>
                      <th className="pb-3 px-4 text-right">Tax Rate</th>
                      <th className="pb-3 px-4 text-right">Tax</th>
                      <th className="pb-3 pl-4">Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item) => (
                      <TaxLineItemRow key={item.product.id} item={item} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="pt-4 pr-4 font-semibold">Total</td>
                      <td className="pt-4 px-4 text-right font-semibold tabular-nums">
                        {formatCurrency(result.subtotal)}
                      </td>
                      <td className="pt-4 px-4 text-right text-sm text-gray-500 dark:text-gray-400">
                        Eff. {formatPercent(result.effectiveRate)}
                      </td>
                      <td className="pt-4 px-4 text-right font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                        {formatCurrency(result.totalTax)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="pt-2 pr-4 text-lg font-bold" colSpan={3}>
                        Order Total
                      </td>
                      <td className="pt-2 px-4 text-right text-lg font-bold tabular-nums">
                        {formatCurrency(result.total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {result.notes.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
