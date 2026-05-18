// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function usePageAudit() {
  const [discovering, setDiscovering] = useState(false);
  const [pages, setPages] = useState([]); // array of scan results per page
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [selectedPage, setSelectedPage] = useState(null); // full scan result for selected page
  const [error, setError] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [primaryResult, setPrimaryResult] = useState(null);
  const [primaryUrl, setPrimaryUrl] = useState(null);
  const abortRef = useRef(null);

  const startDiscover = useCallback(async (url, token, maxDepth, { includePaths, excludePaths } = {}) => {
    setDiscovering(true);
    setPages([]);
    setProgress({ completed: 0, total: 0 });
    setSelectedPage(null);
    setError(null);
    setAggregate(null);
    setPrimaryResult(null);
    setPrimaryUrl(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = { url, maxDepth };
      if (includePaths && includePaths.length > 0) body.includePaths = includePaths;
      if (excludePaths && excludePaths.length > 0) body.excludePaths = excludePaths;

      const res = await fetch(`${API_URL}/api/audit/discover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "discovery") {
              setProgress((p) => ({ ...p, total: event.total }));
            } else if (event.type === "page") {
              setProgress({ completed: event.completed, total: event.total });
              if (event.result) {
                setPages((prev) => [...prev, event.result]);
              } else if (event.url) {
                // Include failed pages with minimal data so they appear in the list
                setPages((prev) => [...prev, {
                  url: event.url,
                  scanError: event.error || "Scan failed",
                  scores: { seo: 0, llm: 0, marketing: 0, performance: 0 },
                  seo: [], llm: [], marketing: [],
                  meta: { title: event.url },
                }]);
              }
            } else if (event.type === "complete") {
              setAggregate(event.aggregate);
              setPrimaryResult(event.primary || null);
              setPrimaryUrl(event.primaryUrl || event.primary?.url || event.primary?.finalUrl || null);
            } else if (event.type === "error") {
              setError(event.message);
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setDiscovering(false);
      abortRef.current = null;
    }
  }, []);

  const stopDiscover = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const requestFix = useCallback(async (url, checks, pageContext, token) => {
    try {
      const res = await fetch(`${API_URL}/api/audit/fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, checks, pageContext }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setDiscovering(false);
    setPages([]);
    setProgress({ completed: 0, total: 0 });
    setSelectedPage(null);
    setError(null);
    setAggregate(null);
    setPrimaryResult(null);
    setPrimaryUrl(null);
  }, []);

  return {
    discovering,
    pages,
    progress,
    selectedPage,
    setSelectedPage,
    error,
    aggregate,
    primaryResult,
    primaryUrl,
    startDiscover,
    stopDiscover,
    requestFix,
    reset,
  };
}
