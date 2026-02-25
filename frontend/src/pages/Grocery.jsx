// Grocery page — displays a categorized, filterable grocery list generated from the meal plan.
// Supports check/uncheck items, copy to clipboard, clear checked, and regenerate.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  generateGroceryList,
  getGroceryList,
  toggleGroceryItem as toggleGroceryItemApi,
  uncheckAllItems,
  clearGroceryList,
} from "../api/grocery";
import { getCurrentPlan } from "../api/plans";
import Toast, { useToast } from "../components/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all",       label: "All Items"  },
  { key: "breakfast", label: "Breakfast"  },
  { key: "lunch",     label: "Lunch"      },
  { key: "dinner",    label: "Dinner"     },
  { key: "snack",     label: "Snack"      },
];

const CATEGORY_ORDER = ["Produce", "Proteins", "Dairy & Eggs", "Grains & Carbs", "Pantry", "Other"];

// ── Helper ────────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({ category, items, onToggle }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</h3>
        <span className="text-xs text-gray-400">
          ({items.length} item{items.length !== 1 ? "s" : ""})
        </span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => onToggle(item.id)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600"
            />
            <span
              className={`flex-1 text-sm transition-colors ${
                item.checked ? "line-through text-gray-300" : "text-gray-800"
              }`}
            >
              {item.ingredient}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              {item.meal_name}{item.meal_type ? ` · ${capitalize(item.meal_type)}` : ""}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Grocery() {
  const [grouped, setGrouped] = useState({});
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPlan, setHasPlan] = useState(true);
  const { toast, showToast } = useToast();

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getGroceryList(), getCurrentPlan().catch(() => null)])
      .then(([groceryData, planData]) => {
        setGrouped(groceryData || {});
        setHasPlan(!!planData);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // ── Filtered view ─────────────────────────────────────────────────────────

  const displayGrouped = useMemo(() => {
    if (filter === "all") return grouped;
    const result = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matching = items.filter((item) => item.meal_type === filter);
      if (matching.length > 0) result[cat] = matching;
    }
    return result;
  }, [grouped, filter]);

  // ── Derived counts ────────────────────────────────────────────────────────

  const hasItems = Object.keys(grouped).length > 0;
  const checkedCount = Object.values(grouped).flat().filter((i) => i.checked).length;

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const data = await generateGroceryList();
      setGrouped(data);
      setHasPlan(true);
      setFilter("all");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate grocery list.";
      if (msg.toLowerCase().includes("plan")) setHasPlan(false);
      showToast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggle(id) {
    // Optimistic update.
    setGrouped((prev) => {
      const next = {};
      for (const [cat, items] of Object.entries(prev)) {
        next[cat] = items.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        );
      }
      return next;
    });
    try {
      await toggleGroceryItemApi(id);
    } catch {
      // Revert on failure by re-fetching.
      getGroceryList().then(setGrouped).catch(() => {});
    }
  }

  async function handleUncheckAll() {
    try {
      const data = await uncheckAllItems();
      setGrouped(data);
    } catch {
      showToast("Failed to clear checked items.", "error");
    }
  }

  function handleCopy() {
    const lines = [];
    // Standard order first.
    for (const cat of CATEGORY_ORDER) {
      const items = displayGrouped[cat];
      if (!items) continue;
      const unchecked = items.filter((i) => !i.checked);
      if (unchecked.length > 0) {
        lines.push(cat);
        unchecked.forEach((i) => lines.push(`• ${i.ingredient}`));
        lines.push("");
      }
    }
    // Any non-standard categories.
    for (const [cat, items] of Object.entries(displayGrouped)) {
      if (CATEGORY_ORDER.includes(cat)) continue;
      const unchecked = items.filter((i) => !i.checked);
      if (unchecked.length > 0) {
        lines.push(cat);
        unchecked.forEach((i) => lines.push(`• ${i.ingredient}`));
        lines.push("");
      }
    }
    navigator.clipboard
      .writeText(lines.join("\n").trim())
      .then(() => showToast("Grocery list copied to clipboard!", "success"))
      .catch(() => showToast("Could not copy to clipboard.", "error"));
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No plan ───────────────────────────────────────────────────────────────

  if (!hasPlan) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Grocery List 🛒</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
          <p className="text-gray-500 mb-4">You need a meal plan first.</p>
          <Link
            to="/plan"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to My Plan →
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="pb-24">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grocery List 🛒</h1>
          <p className="text-sm text-gray-400 mt-1">For your current week's meal plan</p>
        </div>
        {!hasItems && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors text-sm"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gemini is sorting your groceries…
              </>
            ) : (
              "Generate Grocery List"
            )}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasItems && !isGenerating && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4 font-medium">
            No grocery list yet — generate one from your meal plan!
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Generate Grocery List
          </button>
        </div>
      )}

      {hasItems && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grocery items by category */}
          <div className="space-y-5">
            {CATEGORY_ORDER.filter((cat) => displayGrouped[cat]).map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                items={displayGrouped[cat]}
                onToggle={handleToggle}
              />
            ))}
            {Object.entries(displayGrouped)
              .filter(([cat]) => !CATEGORY_ORDER.includes(cat))
              .map(([cat, items]) => (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={items}
                  onToggle={handleToggle}
                />
              ))}
            {Object.keys(displayGrouped).length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">
                No items for this meal type.
              </p>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 md:left-56 bg-white border-t border-gray-200 px-4 md:px-8 py-3 flex flex-wrap gap-3 z-10">
            <button
              onClick={handleUncheckAll}
              disabled={checkedCount === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Clear Checked ✓
              {checkedCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {checkedCount}
                </span>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Copy List 📋
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors ml-auto"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                "Regenerate 🔄"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
