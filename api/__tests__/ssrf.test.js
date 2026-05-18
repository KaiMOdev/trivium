const { isPrivateIPv4, isPrivateIPv6, isPrivateHostname, validateUrlSafety } = require("../middleware/ssrf");

describe("SSRF protection", () => {
  describe("isPrivateIPv4", () => {
    test.each([
      "127.0.0.1", "127.0.0.2", "10.0.0.1", "10.255.255.255",
      "172.16.0.1", "172.31.255.255", "192.168.0.1", "192.168.1.100",
      "169.254.169.254", "0.0.0.0",
    ])("blocks private IP %s", (ip) => {
      expect(isPrivateIPv4(ip)).toBe(true);
    });

    test.each([
      "8.8.8.8", "1.1.1.1", "172.32.0.1", "172.15.255.255",
      "192.167.1.1", "11.0.0.1", "169.255.0.1",
    ])("allows public IP %s", (ip) => {
      expect(isPrivateIPv4(ip)).toBe(false);
    });
  });

  describe("isPrivateIPv6", () => {
    test.each([
      "::1", "::", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
      "::ffff:7f00:1", "fe80::1", "fc00::1", "fd00::1",
    ])("blocks private IPv6 %s", (ip) => {
      expect(isPrivateIPv6(ip)).toBe(true);
    });

    test.each([
      "2001:4860:4860::8888", "::ffff:8.8.8.8",
    ])("allows public IPv6 %s", (ip) => {
      expect(isPrivateIPv6(ip)).toBe(false);
    });
  });

  describe("isPrivateHostname", () => {
    test("blocks localhost", () => {
      expect(isPrivateHostname("localhost")).toBe(true);
      expect(isPrivateHostname("LOCALHOST")).toBe(true);
    });

    test("blocks cloud metadata endpoints", () => {
      expect(isPrivateHostname("metadata.google.internal")).toBe(true);
      expect(isPrivateHostname("instance-data")).toBe(true);
    });

    test("blocks decimal-encoded private IPs", () => {
      // 2130706433 = 127.0.0.1
      expect(isPrivateHostname("2130706433")).toBe(true);
    });

    test("blocks hex-encoded private IPs", () => {
      // 0x7f000001 = 127.0.0.1
      expect(isPrivateHostname("0x7f000001")).toBe(true);
    });

    test("allows normal hostnames", () => {
      expect(isPrivateHostname("example.com")).toBe(false);
      expect(isPrivateHostname("google.com")).toBe(false);
    });
  });

  describe("validateUrlSafety", () => {
    test("rejects non-HTTP protocols", async () => {
      await expect(validateUrlSafety("ftp://example.com")).rejects.toThrow("Only HTTP and HTTPS");
      await expect(validateUrlSafety("file:///etc/passwd")).rejects.toThrow("Only HTTP and HTTPS");
      await expect(validateUrlSafety("javascript:alert(1)")).rejects.toThrow();
    });

    test("rejects invalid URLs", async () => {
      await expect(validateUrlSafety("not-a-url")).rejects.toThrow("Invalid URL");
    });

    test("rejects localhost URLs", async () => {
      await expect(validateUrlSafety("http://localhost/api")).rejects.toThrow("private");
    });

    test("rejects private IP URLs", async () => {
      await expect(validateUrlSafety("http://127.0.0.1/")).rejects.toThrow("private");
      await expect(validateUrlSafety("http://10.0.0.1/")).rejects.toThrow("private");
      await expect(validateUrlSafety("http://192.168.1.1/")).rejects.toThrow("private");
    });

    test("rejects metadata endpoint", async () => {
      await expect(validateUrlSafety("http://169.254.169.254/latest/meta-data/")).rejects.toThrow("private");
    });

    test("allows public URLs", async () => {
      await expect(validateUrlSafety("https://example.com")).resolves.toBeUndefined();
    });
  });
});
