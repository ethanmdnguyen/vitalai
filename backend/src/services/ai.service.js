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
  const prompt = `You are an expert personal trainer and nutritionist. Create a detailed, personalized weekly plan for this user:
- Age: ${profile.age}, Weight: ${profile.weight_kg}kg, Height: ${profile.height_cm}cm
- Goal: ${profile.goal}, Diet type: ${profile.diet_type}
- Workout days per week: ${profile.workout_days_per_week}
- Preferences/limitations: ${profile.workout_preferences || "None"}

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
      throw new Error("Failed to parse Gemini response as JSON. Please try again.");
    }
    throw new Error(`AI plan generation failed: ${err.message}`);
  }
}

async function generateWeeklyReview(profile, plan, logs) {
  const prompt = `You are an expert personal trainer and nutritionist. Write a concise weekly progress review for this user.

User profile:
- Age: ${profile.age}, Weight: ${profile.weight_kg}kg, Goal: ${profile.goal}, Diet: ${profile.diet_type}

This week's plan:
${JSON.stringify(plan, null, 2)}

This week's daily logs:
${JSON.stringify(logs, null, 2)}

Return ONLY a valid JSON object with NO extra text, markdown, or backticks:
{
  "summary": "string (2-3 sentence overall summary)",
  "wins": ["string"],
  "improvements": ["string"],
  "nextWeekFocus": "string"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const review = JSON.parse(extractJson(result.response.text()));
    return review;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("Failed to parse Gemini review response as JSON. Please try again.");
    }
    throw new Error(`AI review generation failed: ${err.message}`);
  }
}

module.exports = { generateWeeklyPlan, generateWeeklyReview };
