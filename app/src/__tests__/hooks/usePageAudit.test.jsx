import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePageAudit from "../../hooks/usePageAudit";

// Mock fetch
global.fetch = vi.fn();

describe("usePageAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function streamEvents(events) {
    const encoder = new TextEncoder();
    const chunks = events.map((event) => encoder.encode(`${JSON.stringify(event)}\n`));
    let index = 0;

    return {
      ok: true,
      body: {
        getReader() {
          return {
            async read() {
              if (index >= chunks.length) {
                return { done: true, value: undefined };
              }
              const value = chunks[index];
              index += 1;
              return { done: false, value };
            },
          };
        },
      },
    };
  }

  it("starts in idle state", () => {
    const { result } = renderHook(() => usePageAudit());
    expect(result.current.discovering).toBe(false);
    expect(result.current.pages).toEqual([]);
    expect(result.current.selectedPage).toBeNull();
  });

  it("reset clears all state", () => {
    const { result } = renderHook(() => usePageAudit());
    act(() => result.current.reset());
    expect(result.current.pages).toEqual([]);
    expect(result.current.selectedPage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("captures the backend primary page for PDF export", async () => {
    const primary = {
      url: "https://example.com/landing",
      finalUrl: "https://example.com/landing",
      scores: { seo: 91, llm: 82, marketing: 77, performance: 64 },
      seo: [],
      llm: [],
      marketing: [],
    };
    global.fetch.mockResolvedValue(
      streamEvents([
        { type: "page", completed: 1, total: 2, result: { url: "https://example.com/blog", scores: { seo: 50 } } },
        { type: "complete", aggregate: { scores: { seo: 71 } }, primary, primaryUrl: primary.url },
      ])
    );

    const { result } = renderHook(() => usePageAudit());

    await act(async () => {
      await result.current.startDiscover("https://example.com", "token", 2);
    });

    expect(result.current.aggregate).toEqual({ scores: { seo: 71 } });
    expect(result.current.primaryResult).toEqual(primary);
    expect(result.current.primaryUrl).toBe("https://example.com/landing");
  });
});
