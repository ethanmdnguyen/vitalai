// Vite configuration for VitalAI frontend.
// Uses the React plugin for JSX and fast refresh support.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
