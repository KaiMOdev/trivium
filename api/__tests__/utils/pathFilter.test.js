const { matchesPathFilter } = require("../../utils/pathFilter");

describe("matchesPathFilter", () => {
  describe("no filters (pass everything)", () => {
    it("returns true when both arrays are empty", () => {
      expect(matchesPathFilter("https://example.com/blog/post", [], [])).toBe(true);
    });

    it("returns true when both arrays are undefined", () => {
      expect(matchesPathFilter("https://example.com/about")).toBe(true);
    });
  });

  describe("includePaths only", () => {
    it("includes URLs matching a wildcard pattern", () => {
      expect(matchesPathFilter("https://example.com/blog/my-post", ["/blog/*"], [])).toBe(true);
    });

    it("includes URLs matching an exact pattern", () => {
      expect(matchesPathFilter("https://example.com/about", ["/about"], [])).toBe(true);
    });

    it("excludes URLs not matching any include pattern", () => {
      expect(matchesPathFilter("https://example.com/contact", ["/blog/*"], [])).toBe(false);
    });

    it("matches if any include pattern matches", () => {
      expect(matchesPathFilter("https://example.com/products/shoes", ["/blog/*", "/products/*"], [])).toBe(true);
    });

    it("matches nested paths with wildcard", () => {
      expect(matchesPathFilter("https://example.com/blog/2024/01/recap", ["/blog/*"], [])).toBe(true);
    });

    it("matches root path with wildcard", () => {
      expect(matchesPathFilter("https://example.com/blog/", ["/blog/*"], [])).toBe(true);
    });

    it("matches section root without trailing slash", () => {
      expect(matchesPathFilter("https://example.com/blog", ["/blog/*"], [])).toBe(true);
    });
  });

  describe("excludePaths only", () => {
    it("excludes URLs matching an exclude pattern", () => {
      expect(matchesPathFilter("https://example.com/legal/privacy", [], ["/legal/*"])).toBe(false);
    });

    it("allows URLs not matching any exclude pattern", () => {
      expect(matchesPathFilter("https://example.com/blog/post", [], ["/legal/*"])).toBe(true);
    });

    it("excludes exact path match", () => {
      expect(matchesPathFilter("https://example.com/tag", [], ["/tag"])).toBe(false);
    });

    it("excludes sub-paths when pattern ends with /", () => {
      expect(matchesPathFilter("https://example.com/nl/aanbod/4340912/appartement", [], ["/nl/aanbod/"])).toBe(false);
    });

    it("excludes the directory itself when pattern ends with /", () => {
      expect(matchesPathFilter("https://example.com/nl/aanbod/", [], ["/nl/aanbod/"])).toBe(false);
    });

    it("allows non-matching paths when pattern ends with /", () => {
      expect(matchesPathFilter("https://example.com/nl/contact", [], ["/nl/aanbod/"])).toBe(true);
    });
  });

  describe("combined include + exclude (exclude wins)", () => {
    it("excludes even when URL matches an include pattern", () => {
      expect(matchesPathFilter(
        "https://example.com/blog/sponsored",
        ["/blog/*"],
        ["/blog/sponsored"]
      )).toBe(false);
    });

    it("includes URL matching include but not exclude", () => {
      expect(matchesPathFilter(
        "https://example.com/blog/real-post",
        ["/blog/*"],
        ["/blog/sponsored"]
      )).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("strips query strings before matching", () => {
      expect(matchesPathFilter("https://example.com/blog/post?page=2", ["/blog/*"], [])).toBe(true);
    });

    it("handles trailing slashes on the URL", () => {
      expect(matchesPathFilter("https://example.com/about/", ["/about"], [])).toBe(true);
    });

    it("handles patterns with special regex characters", () => {
      expect(matchesPathFilter("https://example.com/c++/guide", ["/c++/*"], [])).toBe(true);
    });

    it("returns true for root path with no filters", () => {
      expect(matchesPathFilter("https://example.com/", [], [])).toBe(true);
    });
  });
});
