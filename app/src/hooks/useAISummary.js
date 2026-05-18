// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useCallback, useRef, useEffect } from "react";

export default function useAISummary(session) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const lastUrlRef = useRef(null);
  const summaryRef = useRef(null);

  useEffect(() => { summaryRef.current = summary; }, [summary]);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setSummary(null);
    summaryRef.current = null;
    lastUrlRef.current = null;
    setError(null);
    setRemaining(null);
  }, []);

  const fetchSummary = useCallback(async (scores, checks, meta, classification = null) => {
    // Reset cache if URL changed
    if (lastUrlRef.current && lastUrlRef.current !== meta.url) {
      setSummary(null);
      summaryRef.current = null;
    }
    // Already cached for this URL (use ref to avoid stale closure)
    if (summaryRef.current && lastUrlRef.current === meta.url) return;

    lastUrlRef.current = meta.url;
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "/api";
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${apiUrl}/ai/summary`, {
        method: "POST",
        headers,
        body: JSON.stringify({ scores, checks, meta, classification }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setError("Upgrade to Pro to use AI summaries");
        } else if (res.status === 429) {
          const resetsAt = data.resetsAt
            ? new Date(data.resetsAt).toLocaleTimeString()
            : "midnight UTC";
          setError(`Daily summary limit reached. Resets at ${resetsAt}.`);
        } else {
          setError(data.error || "AI service unavailable. Try again later.");
        }
        return;
      }

      const data = await res.json();
      setSummary(data.summary || null);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (err) {
      console.error("[AI Summary] Fetch error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { summary, loading, error, remaining, fetchSummary, clearError, reset };
}
