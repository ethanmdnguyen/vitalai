// Progress page — displays AI weekly reviews generated from the user's log data.
// Parses Gemini's free-text response into 5 labelled sections for clean display.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { generateReview, getReviews } from "../api/reviews";

// Format "YYYY-MM-DD" → "Feb 23, 2026" without timezone issues.
function formatWeekStart(dateStr) {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Week of ${months[parseInt(monthStr, 10) - 1]} ${parseInt(dayStr, 10)}, ${yearStr}`;
}

// Splits the raw review text into the 5 named sections.
function parseReview(text) {
  const keys = ["OVERVIEW", "WINS", "IMPROVE", "NEXT WEEK", "MOTIVATION"];
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const start = new RegExp(`(?:\\d+\\.\\s*)?${keys[i]}:\\s*`, "i");
    const end = i < keys.length - 1
      ? new RegExp(`(?:\\d+\\.\\s*)?${keys[i + 1]}:`, "i")
      : null;
    const startMatch = text.search(start);
    if (startMatch === -1) { result[keys[i]] = ""; continue; }
    const contentStart = startMatch + text.slice(startMatch).match(start)[0].length;
    const endMatch = end ? text.slice(contentStart).search(end) : -1;
    result[keys[i]] = endMatch === -1
      ? text.slice(contentStart).trim()
      : text.slice(contentStart, contentStart + endMatch).trim();
  }
  return result;
}

function SectionCard({ emoji, title, content, className = "" }) {
  return (
    <div className={`rounded-lg p-4 ${className}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {emoji} {title}
      </p>
      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}

function ReviewCard({ review, weekStart }) {
  const sections = parseReview(review);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <SectionCard emoji="📊" title="Overview"    content={sections["OVERVIEW"]}   className="bg-gray-50" />
      <SectionCard emoji="✅" title="Wins"        content={sections["WINS"]}       className="border-l-4 border-green-400 bg-green-50" />
      <SectionCard emoji="📈" title="Areas to Improve" content={sections["IMPROVE"]} className="border-l-4 border-yellow-400 bg-yellow-50" />
      <SectionCard emoji="🎯" title="Next Week"   content={sections["NEXT WEEK"]}  className="border-l-4 border-blue-400 bg-blue-50" />
      <SectionCard emoji="💪" title="Motivation"  content={sections["MOTIVATION"]} className="bg-purple-50" />
    </div>
  );
}

export default function Progress() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [openPast, setOpenPast] = useState(false);

  useEffect(() => {
    getReviews()
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateReview();
      // Prepend new review so it shows at the top.
      setReviews((prev) => [
        { review_text: data.review, week_start: data.weekStart, id: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      const msg = err.response?.data?.error ?? "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  const [latest, ...past] = reviews;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Progress</h1>
      <p className="text-sm text-gray-500 mb-6">
        Get an AI-powered summary of your week based on your logs.
      </p>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mb-6 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Gemini is analyzing your week...
          </>
        ) : (
          "Get My Weekly Review"
        )}
      </button>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.includes("3 days") ? (
            <>
              {error}{" "}
              <Link to="/log" className="font-medium underline hover:text-red-900">
                Log today →
              </Link>
            </>
          ) : (
            error
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : latest ? (
        <>
          {/* Most recent review */}
          <div className="mb-2">
            <p className="text-xs text-gray-400 font-medium mb-2">
              {formatWeekStart(
                latest.week_start instanceof Date
                  ? latest.week_start.toISOString().split("T")[0]
                  : String(latest.week_start).split("T")[0]
              )}
            </p>
            <ReviewCard review={latest.review_text} weekStart={latest.week_start} />
          </div>

          {/* Past reviews */}
          {past.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setOpenPast((v) => !v)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                <span>{openPast ? "▾" : "▸"}</span>
                Past reviews ({past.length})
              </button>
              {openPast && (
                <div className="mt-3 space-y-4">
                  {past.map((r) => {
                    const dateStr =
                      r.week_start instanceof Date
                        ? r.week_start.toISOString().split("T")[0]
                        : String(r.week_start).split("T")[0];
                    return (
                      <div key={r.id}>
                        <p className="text-xs text-gray-400 font-medium mb-2">
                          {formatWeekStart(dateStr)}
                        </p>
                        <ReviewCard review={r.review_text} weekStart={r.week_start} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* No reviews yet */
        !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium mb-2">
              Log at least 3 days to unlock your weekly AI review 🧠
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Once you have 3 days of logs, hit "Get My Weekly Review" above.
            </p>
            <Link
              to="/log"
              className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Log Today →
            </Link>
          </div>
        )
      )}
    </div>
  );
}
