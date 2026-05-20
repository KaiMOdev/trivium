import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import useScanHistory from "../../hooks/useScanHistory";

describe("useScanHistory (OSS stub)", () => {
  it("returns the empty hook shape", () => {
    const { result } = renderHook(() => useScanHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(0);
  });

  it("exposes every consumer-called member as a callable no-op", () => {
    // SiteAuditApp calls scanHistory.recordScan() in a post-scan useEffect.
    // A missing stub here crashed the app in dev mode (forced premium tier)
    // with "TypeError: recordScan is not a function".
    const { result } = renderHook(() => useScanHistory());
    for (const fn of ["setPage", "refresh", "recordScan"]) {
      expect(typeof result.current[fn]).toBe("function");
      expect(() => result.current[fn]("https://example.com", {}, {})).not.toThrow();
    }
  });
});
