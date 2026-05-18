// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useCallback, useRef, useEffect } from "react";

export default function useAISuggestions(session) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const resultsRef = useRef({});
  const loadingRef = useRef(null);

  useEffect(() => { resultsRef.current = results; }, [results]);

  const clearError = useCallback(() => setError(null), []);

  const fetchSuggestion = useCallback(async (check, meta, classification = null) => {
    if (resultsRef.current[check.label]) return;
    if (loadingRef.current === check.label) return;

    setLoading(check.label);
    loadingRef.current = check.label;
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "/api";
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${apiUrl}/ai/suggestions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ check, meta, classification }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setError("Upgrade to Pro to use AI suggestions");
        } else if (res.status === 429) {
          const resetsAt = data.resetsAt
            ? new Date(data.resetsAt).toLocaleTimeString()
            : "midnight UTC";
          setError(`Daily limit reached. Resets at ${resetsAt}.`);
        } else {
          setError(data.error || "AI service unavailable. Try again later.");
        }
        return;
      }

      const data = await res.json();
      let suggestions = data.suggestions || [];
      // Guard against string responses — try to parse if needed
      if (typeof suggestions === "string") {
        try { suggestions = JSON.parse(suggestions); } catch { suggestions = []; }
      }
      if (!Array.isArray(suggestions)) suggestions = [];
      setResults(prev => ({ ...prev, [check.label]: suggestions }));
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (err) {
      console.error("[AI Suggestions] Fetch error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(null);
      loadingRef.current = null;
    }
  }, [session]);

  return { results, loading, error, remaining, fetchSuggestion, clearError };
}
