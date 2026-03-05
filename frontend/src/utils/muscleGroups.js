// Muscle group utilities — maps specific muscle names to broad groups with consistent hex colors.
// Used throughout the Plan page for color-coded muscle tags.

export const MUSCLE_GROUP_MAP = {
  // Chest
  "Pectoralis Major":    { group: "Chest",     color: "#ef4444" },
  "Pectoralis Minor":    { group: "Chest",     color: "#ef4444" },
  "Chest":               { group: "Chest",     color: "#ef4444" },
  // Shoulders
  "Anterior Deltoid":    { group: "Shoulders", color: "#f97316" },
  "Lateral Deltoid":     { group: "Shoulders", color: "#f97316" },
  "Posterior Deltoid":   { group: "Shoulders", color: "#f97316" },
  "Deltoid":             { group: "Shoulders", color: "#f97316" },
  "Shoulders":           { group: "Shoulders", color: "#f97316" },
  // Triceps
  "Triceps Brachii":     { group: "Triceps",   color: "#a855f7" },
  "Triceps":             { group: "Triceps",   color: "#a855f7" },
  // Biceps
  "Biceps Brachii":      { group: "Biceps",    color: "#3b82f6" },
  "Biceps":              { group: "Biceps",    color: "#3b82f6" },
  // Back
  "Latissimus Dorsi":    { group: "Back",      color: "#22c55e" },
  "Trapezius":           { group: "Back",      color: "#22c55e" },
  "Rhomboids":           { group: "Back",      color: "#22c55e" },
  "Erector Spinae":      { group: "Back",      color: "#22c55e" },
  "Back":                { group: "Back",      color: "#22c55e" },
  // Core
  "Rectus Abdominis":    { group: "Core",      color: "#14b8a6" },
  "Obliques":            { group: "Core",      color: "#14b8a6" },
  "Transverse Abdominis":{ group: "Core",      color: "#14b8a6" },
  "Abdominals":          { group: "Core",      color: "#14b8a6" },
  "Core":                { group: "Core",      color: "#14b8a6" },
  // Legs
  "Quadriceps":          { group: "Legs",      color: "#eab308" },
  "Hamstrings":          { group: "Legs",      color: "#eab308" },
  "Calves":              { group: "Legs",      color: "#eab308" },
  "Gastrocnemius":       { group: "Legs",      color: "#eab308" },
  "Quads":               { group: "Legs",      color: "#eab308" },
  "Legs":                { group: "Legs",      color: "#eab308" },
  // Glutes
  "Gluteus Maximus":     { group: "Glutes",    color: "#ec4899" },
  "Gluteus Medius":      { group: "Glutes",    color: "#ec4899" },
  "Glutes":              { group: "Glutes",    color: "#ec4899" },
  // Misc
  "Full Body":           { group: "Full Body", color: "#64748b" },
  "Cardio":              { group: "Cardio",    color: "#f43f5e" },
};

const FALLBACK = { group: "Full Body", color: "#64748b" };

// Get broad group info for a specific muscle name (exact → case-insensitive partial → fallback).
export function getMuscleGroupInfo(muscleName) {
  if (!muscleName) return FALLBACK;
  if (MUSCLE_GROUP_MAP[muscleName]) return MUSCLE_GROUP_MAP[muscleName];
  const lower = muscleName.toLowerCase();
  for (const [key, val] of Object.entries(MUSCLE_GROUP_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return val;
  }
  return FALLBACK;
}

// Returns an inline-style object for a muscle tag span.
export function getMuscleTagStyle(muscleName) {
  const { color } = getMuscleGroupInfo(muscleName);
  return {
    backgroundColor: `${color}1a`, // ~10% opacity
    color,
    border: `1px solid ${color}40`, // ~25% opacity border
  };
}

// Deduplicate and return unique broad groups from an array of specific muscle names.
export function getBroadGroups(muscleNames) {
  const seen = new Set();
  return (muscleNames || []).reduce((acc, name) => {
    const info = getMuscleGroupInfo(name);
    if (!seen.has(info.group)) {
      seen.add(info.group);
      acc.push({ group: info.group, color: info.color });
    }
    return acc;
  }, []);
}

// Return unique broad groups covered by a list of exercises.
export function getBroadGroupsForExercises(exercises) {
  const muscles = (exercises || []).flatMap((ex) => [
    ...(ex.primary_muscles || []),
    ...(ex.secondary_muscles || []),
  ]);
  return getBroadGroups(muscles);
}

// Format a stored kg weight value to the user's display unit.
// Returns null if weightKg is null/undefined/0.
export function formatWeight(weightKg, unit) {
  if (weightKg == null || weightKg === 0) return null;
  if (unit === "imperial") return `${Math.round(weightKg * 2.205)} lb`;
  return `${weightKg} kg`;
}
