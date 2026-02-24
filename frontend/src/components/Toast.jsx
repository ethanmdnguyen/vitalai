// Toast — success/error notification that auto-dismisses after 3 seconds.
// Usage: const { toast, showToast } = useToast(); then <Toast toast={toast} />
//        showToast("Logged!", "success") or showToast("Failed", "error")

import { useState, useCallback, useRef } from "react";

export default function Toast({ toast }) {
  if (!toast.visible) return null;

  return (
    <div
      className={`fixed bottom-20 right-4 md:bottom-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-none ${
        toast.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return { toast, showToast };
}
