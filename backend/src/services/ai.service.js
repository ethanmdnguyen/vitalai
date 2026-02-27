// AI service — wraps the Google Gemini API to generate personalised weekly plans and reviews.
// Instructs Gemini to return raw JSON only, then parses and returns the result.

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Strips markdown code fences in case the model wraps its JSON output.
function extractJson(raw) {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return text;
}

async function generateWeeklyPlan(profile) {
  // Build a rich goal summary from v2 fields, falling back to legacy `goal` field.
  const goalParts = [];
  if (profile.primary_goal || profile.goal) {
    goalParts.push(`Primary goal: ${profile.primary_goal || profile.goal}`);
  }
  if (profile.secondary_goals?.length) {
    goalParts.push(`Secondary goals: ${profile.secondary_goals.join(", ")}`);
  }
  if (profile.goal_intensity) {
    goalParts.push(profile.goal_intensity);
  }
  if (profile.event_type && profile.event_date) {
    goalParts.push(`Training for ${profile.event_type} on ${profile.event_date}`);
  } else if (profile.event_type) {
    goalParts.push(`Training for ${profile.event_type}`);
  }
  const goalSummary = goalParts.join(". ") || "General fitness";

  const workoutTypesStr = profile.workout_types?.length
    ? profile.workout_types.join(", ")
    : (profile.workout_preferences || "None");

  const dietaryRestrictionsStr = profile.dietary_restrictions?.length
    ? profile.dietary_restrictions.join(", ")
    : "None";

  const prompt = `You are an expert personal trainer and nutritionist. Create a detailed, personalized weekly plan for this user:

Body & Fitness:
- Age: ${profile.age}, Weight: ${profile.weight_kg}kg, Height: ${profile.height_cm}cm
- Fitness level: ${profile.fitness_level || "Not specified"}
- Body fat: ${profile.body_fat_percent ? profile.body_fat_percent + "%" : "Not specified"}
- Injuries/limitations: ${profile.injuries || "None"}
- Preferred workout types: ${workoutTypesStr}
- Workout days per week: ${profile.workout_days_per_week}

Goals:
- ${goalSummary}

Diet:
- Diet type: ${profile.diet_type || "standard"}
- Dietary restrictions: ${dietaryRestrictionsStr}
- Dietary notes: ${profile.dietary_notes || "None"}

Return ONLY a valid JSON object with NO extra text, markdown, or backticks. Use this exact structure:
{
  "workoutPlan": {
    "monday": { "focus": "string", "exercises": [{"name": "string", "sets": 0, "reps": "string", "notes": "string"}], "duration_minutes": 0 },
    "tuesday": null,
    "wednesday": { "focus": "string", "exercises": [{"name": "string", "sets": 0, "reps": "string", "notes": "string"}], "duration_minutes": 0 },
    "thursday": null,
    "friday": { "focus": "string", "exercises": [{"name": "string", "sets": 0, "reps": "string", "notes": "string"}], "duration_minutes": 0 },
    "saturday": null,
    "sunday": null
  },
  "mealPlan": {
    "dailyCalorieTarget": 0,
    "macros": { "protein_g": 0, "carbs_g": 0, "fat_g": 0 },
    "breakfast": { "name": "string", "ingredients": ["string"], "calories": 0 },
    "lunch": { "name": "string", "ingredients": ["string"], "calories": 0 },
    "dinner": { "name": "string", "ingredients": ["string"], "calories": 0 },
    "snack": { "name": "string", "ingredients": ["string"], "calories": 0 }
  },
  "notes": "string"
}
Set non-workout days to null. Distribute workout days based on workout_days_per_week.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const plan = JSON.parse(extractJson(result.response.text()));
    return plan;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("AI service temporarily unavailable. Please try again.");
    }
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

async function generateWeeklyReview(profile, plan, logs) {
  const mealPlan = plan.meal_plan;

  const logsText = logs
    .map((log) => {
      const date =
        log.log_date instanceof Date
          ? log.log_date.toISOString().split("T")[0]
          : String(log.log_date).split("T")[0];
      return `  - ${date}: workout=${log.workout_completed ? "yes" : "no"}, calories=${log.calories ?? "—"}, protein=${log.protein_g ?? "—"}g, carbs=${log.carbs_g ?? "—"}g, fat=${log.fat_g ?? "—"}g, water=${log.water_ml ?? "—"}ml, sleep=${log.sleep_hours ?? "—"}h, energy=${log.energy_level ?? "—"}/5, weight=${log.weight_kg ?? "—"}kg`;
    })
    .join("\n");

  const prompt = `You are a supportive personal trainer and nutritionist reviewing a client's week.

Client profile: ${profile.age} years old, goal: ${profile.goal}, diet: ${profile.diet_type}

Their plan this week:
- Workout days planned: ${profile.workout_days_per_week}
- Daily calorie target: ${mealPlan?.dailyCalorieTarget ?? "not set"}
- Macro targets: ${mealPlan?.macros?.protein_g ?? "—"}g protein, ${mealPlan?.macros?.carbs_g ?? "—"}g carbs, ${mealPlan?.macros?.fat_g ?? "—"}g fat

Their daily logs this week:
${logsText}

Please provide a weekly review with exactly these 5 sections:
1. OVERVIEW: 2 sentences summarizing how their week went overall
2. WINS: 2 specific positive highlights from their data
3. IMPROVE: 2 specific, kind, actionable areas to work on
4. NEXT WEEK: 3 concrete recommendations for next week
5. MOTIVATION: 1 encouraging closing sentence

Write in a warm, coach-like tone. Reference their actual numbers specifically.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

async function suggestExerciseAlternatives({ exerciseName, primaryMuscle, userWeightKg, customRequest }) {
  const focus = customRequest
    ? `The user specifically requests: ${customRequest}`
    : exerciseName
    ? `as a replacement for "${exerciseName}" targeting ${primaryMuscle || "the same muscle groups"}`
    : `targeting ${primaryMuscle || "general fitness"}`;

  const weightNote = userWeightKg ? ` The user weighs ${userWeightKg}kg.` : "";

  const prompt = `You are an expert personal trainer. Suggest 3 distinct exercise alternatives ${focus}.${weightNote}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no extra text, no backticks:
[
  {
    "name": "string",
    "sets": 3,
    "reps": "string",
    "notes": "string",
    "primary_muscles": ["string"],
    "secondary_muscles": ["string"]
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(extractJson(result.response.text()));
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

async function suggestMealAlternatives({ mealType, dietType, calorieTarget, restrictions, customRequest }) {
  const focus = customRequest
    ? `The user specifically requests: ${customRequest}`
    : `as a replacement${mealType ? ` for a ${mealType}` : ""} for someone following a ${dietType || "standard"} diet`;

  const calNote = calorieTarget ? ` Target calories: around ${calorieTarget} kcal.` : "";
  const restrictNote = restrictions?.length ? ` Dietary restrictions: ${restrictions.join(", ")}.` : "";

  const prompt = `You are an expert nutritionist. Suggest 3 distinct meal alternatives ${focus}.${calNote}${restrictNote}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no extra text, no backticks:
[
  {
    "name": "string",
    "calories": 0,
    "ingredients": ["string"],
    "macros": { "protein_g": 0, "carbs_g": 0, "fat_g": 0 }
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(extractJson(result.response.text()));
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

async function categorizeGroceries(ingredients) {
  const ingredientList = ingredients
    .map((i) => `- ${i.ingredient} (from ${i.meal_name}, ${i.meal_type})`)
    .join("\n");

  const prompt = `You are a grocery expert. Categorize these ingredients into groups: Produce, Proteins, Dairy & Eggs, Grains & Carbs, Pantry, Other.

Return ONLY a valid JSON array. No markdown, no extra text, no backticks. Each object must have exactly these fields:
[
  { "ingredient": "string", "meal_name": "string", "meal_type": "string", "category": "string" }
]

Ingredients to categorize:
${ingredientList}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(extractJson(result.response.text()));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

module.exports = {
  generateWeeklyPlan,
  generateWeeklyReview,
  suggestExerciseAlternatives,
  suggestMealAlternatives,
  categorizeGroceries,
};
