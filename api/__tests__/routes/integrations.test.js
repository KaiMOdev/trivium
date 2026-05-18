const express = require("express");
const request = require("supertest");

jest.mock("../../middleware/auth", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: "user-123", email: "test@example.com" };
    next();
  },
}));

const mockGsc = {
  getGscAuthUrl: jest.fn(),
  handleGscCallback: jest.fn(),
  getGscStatus: jest.fn(),
  setGscProperty: jest.fn(),
  disconnectGsc: jest.fn(),
  verifyState: jest.fn(),
};

const mockGa4 = {
  getGa4AuthUrl: jest.fn(),
  handleGa4Callback: jest.fn(),
  getGa4Status: jest.fn(),
  setGa4Property: jest.fn(),
  disconnectGa4: jest.fn(),
  verifyState: jest.fn(),
};

const mockAdobe = {
  getAdobeAuthUrl: jest.fn(),
  handleAdobeCallback: jest.fn(),
  getAdobeAnalyticsStatus: jest.fn(),
  setAdobeAnalyticsReportSuite: jest.fn(),
  disconnectAdobeAnalytics: jest.fn(),
  verifyState: jest.fn(),
};

const mockMeta = {
  getMetaAuthUrl: jest.fn(),
  handleMetaCallback: jest.fn(),
  getMetaStatus: jest.fn(),
  setMetaPage: jest.fn(),
  disconnectMeta: jest.fn(),
  verifyState: jest.fn(),
};

jest.mock("../../plugins/gsc", () => mockGsc);
jest.mock("../../plugins/ga4", () => mockGa4);
jest.mock("../../plugins/adobe-analytics", () => mockAdobe);
jest.mock("../../plugins/meta", () => mockMeta);

const { createIntegrationsRouter } = require("../../routes/integrations");

function buildApp() {
  const app = express();
  app.use("/api/integrations", createIntegrationsRouter({
    oauthLimiter: (_req, _res, next) => next(),
  }));
  return app;
}

describe("Integrations routes", () => {
  let app;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    app = buildApp();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const providers = [
    {
      name: "GSC",
      statusPath: "/gsc/status",
      statusMock: () => mockGsc.getGscStatus,
      statusValue: { connected: true, property: "https://example.com/", properties: ["https://example.com/"] },
      fallbackValue: { connected: false, property: null, properties: [] },
      setterPath: "/gsc/property",
      setterMock: () => mockGsc.setGscProperty,
      setterDenied: "You do not have access to this property in Google Search Console",
      setterFailure: "Failed to update property",
      deletePath: "/gsc",
      deleteMock: () => mockGsc.disconnectGsc,
    },
    {
      name: "GA4",
      statusPath: "/ga4/status",
      statusMock: () => mockGa4.getGa4Status,
      statusValue: {
        connected: true,
        property: "properties/123456789",
        properties: [{ id: "properties/123456789", name: "Main Property", account: "Account A" }],
      },
      fallbackValue: { connected: false, property: null, properties: [] },
      setterPath: "/ga4/property",
      setterMock: () => mockGa4.setGa4Property,
      setterDenied: "You do not have access to this property in Google Analytics",
      setterFailure: "Failed to update property",
      deletePath: "/ga4",
      deleteMock: () => mockGa4.disconnectGa4,
    },
    {
      name: "Adobe Analytics",
      statusPath: "/adobe-analytics/status",
      statusMock: () => mockAdobe.getAdobeAnalyticsStatus,
      statusValue: {
        connected: true,
        property: "main-rsid",
        properties: [{ id: "main-rsid", name: "Main Report Suite" }],
      },
      fallbackValue: { connected: false, property: null, properties: [] },
      setterPath: "/adobe-analytics/property",
      setterMock: () => mockAdobe.setAdobeAnalyticsReportSuite,
      setterDenied: "You do not have access to this report suite in Adobe Analytics",
      setterFailure: "Failed to update report suite",
      deletePath: "/adobe-analytics",
      deleteMock: () => mockAdobe.disconnectAdobeAnalytics,
    },
    {
      name: "Meta",
      statusPath: "/meta/status",
      statusMock: () => mockMeta.getMetaStatus,
      statusValue: {
        connected: true,
        page: "page-123",
        pages: [{ id: "page-123", name: "Example Page", followers: 42 }],
      },
      fallbackValue: { connected: false, page: null, pages: [] },
      setterPath: "/meta/property",
      setterMock: () => mockMeta.setMetaPage,
      setterDenied: "You do not have access to this Facebook Page",
      setterFailure: "Failed to update Facebook Page",
      deletePath: "/meta",
      deleteMock: () => mockMeta.disconnectMeta,
    },
  ];

  describe.each(providers)("$name", ({
    statusPath,
    statusMock,
    statusValue,
    fallbackValue,
    setterPath,
    setterMock,
    setterDenied,
    setterFailure,
    deletePath,
    deleteMock,
  }) => {
    test("GET status returns provider status", async () => {
      statusMock().mockResolvedValue(statusValue);

      const res = await request(app).get(`/api/integrations${statusPath}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(statusValue);
      expect(statusMock()).toHaveBeenCalledWith("user-123");
    });

    test("GET status falls back to disconnected shape on provider error", async () => {
      statusMock().mockRejectedValue(new Error("boom"));

      const res = await request(app).get(`/api/integrations${statusPath}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(fallbackValue);
    });

    test("PUT property rejects missing property", async () => {
      const res = await request(app)
        .put(`/api/integrations${setterPath}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("property is required");
      expect(setterMock()).not.toHaveBeenCalled();
    });

    test("PUT property persists selection", async () => {
      setterMock().mockResolvedValue(undefined);

      const res = await request(app)
        .put(`/api/integrations${setterPath}`)
        .send({ property: "selected-value" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, property: "selected-value" });
      expect(setterMock()).toHaveBeenCalledWith("user-123", "selected-value");
    });

    test("PUT property maps access errors to 403", async () => {
      setterMock().mockRejectedValue(new Error(setterDenied));

      const res = await request(app)
        .put(`/api/integrations${setterPath}`)
        .send({ property: "selected-value" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(setterDenied);
    });

    test("PUT property maps unexpected errors to 500", async () => {
      setterMock().mockRejectedValue(new Error("unexpected"));

      const res = await request(app)
        .put(`/api/integrations${setterPath}`)
        .send({ property: "selected-value" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe(setterFailure);
    });

    test("DELETE disconnects provider", async () => {
      deleteMock().mockResolvedValue(undefined);

      const res = await request(app).delete(`/api/integrations${deletePath}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(deleteMock()).toHaveBeenCalledWith("user-123");
    });

    test("DELETE returns 500 when disconnect fails", async () => {
      deleteMock().mockRejectedValue(new Error("disconnect failed"));

      const res = await request(app).delete(`/api/integrations${deletePath}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to disconnect");
    });
  });
});
