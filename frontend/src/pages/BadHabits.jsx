// BadHabits — "I've Been Bad 😈" accountability and recovery page.
// Users log unhealthy habits and get AI-powered recovery advice.

import { useState, useEffect } from "react";
import { logHabits, getHabitHistory } from "../api/habits";
import { ChevronDown, ChevronUp } from "lucide-react";

// ── Parsing helpers ────────────────────────────────────────────────────────────

function parseAnalysisSections(text) {
  if (!text) return {};
  const sections = {};
  // Match headers that may be wrapped in markdown bold (**BODY:**) and case-insensitive.
  // Each entry: [canonical key, regex pattern]
  const sectionDefs = [
    ["BODY",          /\*{0,2}BODY\*{0,2}\s*:/i],
    ["GOALS",         /\*{0,2}GOALS?\*{0,2}\s*:/i],
    ["RECOVERY",      /\*{0,2}RECOVERY\*{0,2}\s*:/i],
    ["ADJUSTED PLAN", /\*{0,2}ADJUSTED\s+(?:PLAN|WORKOUT(?:\s+PLAN)?)\*{0,2}\s*:/i],
  ];

  sectionDefs.forEach(([name, regex], idx) => {
    const match = text.match(regex);
    if (!match) return;
    const contentStart = match.index + match[0].length;
    // Find where the next section starts
    let contentEnd = text.length;
    for (let j = idx + 1; j < sectionDefs.length; j++) {
      const nextMatch = text.slice(contentStart).match(sectionDefs[j][1]);
      if (nextMatch) {
        contentEnd = contentStart + nextMatch.index;
        break;
      }
    }
    sections[name] = text.slice(contentStart, contentEnd).trim();
  });
  return sections;
}

// ── Habit card components ──────────────────────────────────────────────────────

function HabitCard({ emoji, title, enabled, onToggle, children }) {
  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        enabled ? "border-rose-300 bg-rose-50" : "border-gray-100 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl">{emoji}</span>
        <span className="font-semibold text-gray-800 flex-1">{title}</span>
        <div
          className={`w-10 h-5 rounded-full transition-colors flex items-center ${
            enabled ? "bg-rose-500 justify-end" : "bg-gray-200 justify-start"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white mx-0.5 shadow" />
        </div>
      </button>
      {enabled && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            value === opt
              ? "bg-rose-500 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, min, max }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
      />
    </div>
  );
}

// ── Analysis display ───────────────────────────────────────────────────────────

function AnalysisSection({ icon, label, content, colorClasses }) {
  if (!content) return null;
  return (
    <div className={`rounded-xl p-4 border ${colorClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-70">
        {icon} {label}
      </p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

// ── History item ───────────────────────────────────────────────────────────────

function HistoryItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const habits = typeof log.habits === "string" ? JSON.parse(log.habits) : log.habits;

  const dateStr = (() => {
    const [, mm, dd] = String(log.log_date).split("T")[0].split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`;
  })();

  const activeHabits = Object.entries(habits || {})
    .filter(([, v]) => v?.enabled)
    .map(([k]) => ({
      alcohol: "🍺", sleep: "😴", smoking: "🚬", cannabis: "🌿",
      substances: "💊", junkFood: "🍕", medication: "💊",
    }[k] || "•"));

  const sections = parseAnalysisSections(log.analysis);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 w-14 shrink-0">{dateStr}</span>
        <span className="flex gap-1 flex-wrap flex-1">
          {activeHabits.map((e, i) => (
            <span key={i} className="text-base">{e}</span>
          ))}
          {activeHabits.length === 0 && (
            <span className="text-xs text-gray-400">No habits logged</span>
          )}
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        )}
      </button>
      {expanded && log.analysis && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <AnalysisSection icon="🧬" label="Body" content={sections["BODY"]} colorClasses="bg-gray-50 border-gray-200" />
          <AnalysisSection icon="🎯" label="Goals" content={sections["GOALS"]} colorClasses="bg-yellow-50 border-yellow-200" />
          <AnalysisSection icon="💧" label="Recovery" content={sections["RECOVERY"]} colorClasses="bg-green-50 border-green-200" />
          <AnalysisSection icon="🏋️" label="Adjusted Plan" content={sections["ADJUSTED PLAN"]} colorClasses="bg-blue-50 border-blue-200" />
          {!sections["BODY"] && !sections["GOALS"] && !sections["RECOVERY"] && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{log.analysis}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const DEFAULT_HABITS = {
  alcohol:    { enabled: false, drinks: "", type: "", hoursAgo: "" },
  sleep:      { enabled: false, bedTime: "", wakeTime: "", hours: "" },
  smoking:    { enabled: false, count: "", method: "cigarettes" },
  cannabis:   { enabled: false, sessions: "", method: "" },
  substances: { enabled: false, description: "" },
  junkFood:   { enabled: false, description: "", calories: "" },
  medication: { enabled: false, description: "" },
};

function calcSleepHours(bed, wake) {
  if (!bed || !wake) return "";
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return (mins / 60).toFixed(1);
}

export default function BadHabits() {
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  function updateHabit(key, patch) {
    setHabits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function toggleHabit(key) {
    setHabits((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const anyEnabled = Object.values(habits).some((h) => h.enabled);
    if (!anyEnabled) {
      setError("Toggle at least one habit to get your recovery plan.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setAnalysis(null);
    try {
      const result = await logHabits(habits);
      setAnalysis(result.analysis);
      // Refresh history so new entry appears
      loadHistory();
    } catch (err) {
      const detail = err?.response?.data?.details || err?.response?.data?.error;
      setError(detail || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const logs = await getHabitHistory();
      setHistory(logs);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const sections = parseAnalysisSections(analysis);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">I've Been Bad 😈</h1>
        <p className="text-gray-500 mt-1">
          No judgment. Confess your sins and get a realistic recovery plan from your AI coach.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Form ── */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Alcohol */}
            <HabitCard emoji="🍺" title="Alcohol" enabled={habits.alcohol.enabled} onToggle={() => toggleHabit("alcohol")}>
              <InputField
                label="How many drinks?"
                type="number"
                value={habits.alcohol.drinks}
                onChange={(v) => updateHabit("alcohol", { drinks: v })}
                placeholder="0"
                min="0"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <PillSelector
                  options={["beer", "wine", "spirits", "cocktails", "mixed"]}
                  value={habits.alcohol.type}
                  onChange={(v) => updateHabit("alcohol", { type: v })}
                />
              </div>
              <InputField
                label="Hours since last drink?"
                type="number"
                value={habits.alcohol.hoursAgo}
                onChange={(v) => updateHabit("alcohol", { hoursAgo: v })}
                placeholder="e.g. 8"
                min="0"
              />
            </HabitCard>

            {/* Sleep */}
            <HabitCard emoji="😴" title="Poor Sleep" enabled={habits.sleep.enabled} onToggle={() => toggleHabit("sleep")}>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Bed time"
                  type="time"
                  value={habits.sleep.bedTime}
                  onChange={(v) => {
                    const hours = calcSleepHours(v, habits.sleep.wakeTime);
                    updateHabit("sleep", { bedTime: v, hours });
                  }}
                />
                <InputField
                  label="Wake time"
                  type="time"
                  value={habits.sleep.wakeTime}
                  onChange={(v) => {
                    const hours = calcSleepHours(habits.sleep.bedTime, v);
                    updateHabit("sleep", { wakeTime: v, hours });
                  }}
                />
              </div>
              {habits.sleep.hours && (
                <p className="text-sm font-medium text-rose-600">
                  That's {habits.sleep.hours} hours of sleep
                </p>
              )}
            </HabitCard>

            {/* Smoking */}
            <HabitCard emoji="🚬" title="Smoking / Nicotine" enabled={habits.smoking.enabled} onToggle={() => toggleHabit("smoking")}>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Method</label>
                <PillSelector
                  options={["cigarettes", "vape", "cigars", "nicotine patch", "other"]}
                  value={habits.smoking.method}
                  onChange={(v) => updateHabit("smoking", { method: v })}
                />
              </div>
              <InputField
                label={habits.smoking.method === "vape" ? "Sessions?" : "How many cigarettes?"}
                type="number"
                value={habits.smoking.count}
                onChange={(v) => updateHabit("smoking", { count: v })}
                placeholder="0"
                min="0"
              />
            </HabitCard>

            {/* Cannabis */}
            <HabitCard emoji="🌿" title="Cannabis" enabled={habits.cannabis.enabled} onToggle={() => toggleHabit("cannabis")}>
              <InputField
                label="Sessions?"
                type="number"
                value={habits.cannabis.sessions}
                onChange={(v) => updateHabit("cannabis", { sessions: v })}
                placeholder="0"
                min="0"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Method</label>
                <PillSelector
                  options={["smoked", "vaporized", "edibles", "other"]}
                  value={habits.cannabis.method}
                  onChange={(v) => updateHabit("cannabis", { method: v })}
                />
              </div>
            </HabitCard>

            {/* Other substances */}
            <HabitCard emoji="💊" title="Other Substances" enabled={habits.substances.enabled} onToggle={() => toggleHabit("substances")}>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Brief description (optional)</label>
                <textarea
                  value={habits.substances.description}
                  onChange={(e) => updateHabit("substances", { description: e.target.value })}
                  placeholder="e.g. caffeine overload, pre-workout overdose..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white resize-none"
                />
              </div>
            </HabitCard>

            {/* Junk food */}
            <HabitCard emoji="🍕" title="Junk Food Binge" enabled={habits.junkFood.enabled} onToggle={() => toggleHabit("junkFood")}>
              <div>
                <label className="block text-xs text-gray-500 mb-1">What did you eat?</label>
                <textarea
                  value={habits.junkFood.description}
                  onChange={(e) => updateHabit("junkFood", { description: e.target.value })}
                  placeholder="e.g. large pizza, half a tub of ice cream..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white resize-none"
                />
              </div>
              <InputField
                label="Approx. extra calories (optional)"
                type="number"
                value={habits.junkFood.calories}
                onChange={(v) => updateHabit("junkFood", { calories: v })}
                placeholder="e.g. 1500"
                min="0"
              />
            </HabitCard>

            {/* Skipped medication */}
            <HabitCard emoji="🩺" title="Skipped Medication" enabled={habits.medication.enabled} onToggle={() => toggleHabit("medication")}>
              <InputField
                label="Which medication? (optional)"
                value={habits.medication.description}
                onChange={(v) => updateHabit("medication", { description: v })}
                placeholder="e.g. metformin, antidepressants..."
              />
            </HabitCard>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
            >
              {isLoading ? "Gemini is analyzing your night... 🤔" : "Analyze & Get Recovery Plan 🔍"}
            </button>
          </form>
        </div>

        {/* ── Right: Analysis ── */}
        <div className="space-y-4">
          {!analysis && !isLoading && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-4xl mb-3">🔮</p>
              <p className="text-gray-500 font-medium mb-1">Your recovery plan will appear here</p>
              <p className="text-sm text-gray-400">
                Toggle your habits on the left and click Analyze to get personalized advice.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              </div>
              <p className="text-gray-500 text-sm">Gemini is analyzing your night...</p>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-800">Your Recovery Plan</h2>
              {/* Structured sections (parsed from Gemini's response) */}
              <AnalysisSection
                icon="🧬"
                label="What's Happening in Your Body"
                content={sections["BODY"]}
                colorClasses="bg-gray-50 border-gray-200"
              />
              <AnalysisSection
                icon="🎯"
                label="Impact on Your Goals"
                content={sections["GOALS"]}
                colorClasses="bg-yellow-50 border-yellow-200"
              />
              <AnalysisSection
                icon="💧"
                label="Recovery Steps"
                content={sections["RECOVERY"]}
                colorClasses="bg-green-50 border-green-200"
              />
              <AnalysisSection
                icon="🏋️"
                label="Adjusted Workout Plan"
                content={sections["ADJUSTED PLAN"]}
                colorClasses="bg-blue-50 border-blue-200"
              />
              {/* Fallback: show raw text if Gemini used an unexpected format */}
              {!sections["BODY"] && !sections["GOALS"] && !sections["RECOVERY"] && (
                <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setHistoryOpen((p) => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Past Confessions
          {history.length > 0 && (
            <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>

        {historyOpen && (
          <div className="mt-3 space-y-2">
            {historyLoading && (
              <p className="text-sm text-gray-400 py-4 text-center">Loading history...</p>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No past confessions yet.</p>
            )}
            {!historyLoading && history.map((log) => (
              <HistoryItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
