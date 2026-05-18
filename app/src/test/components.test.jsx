// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import ScoreRing from "../components/ScoreRing";
import StatusBadge from "../components/StatusBadge";
import TierBadge from "../components/TierBadge";
import SectionHeader from "../components/SectionHeader";
import CheckRow from "../components/CheckRow";
import ScoreCard from "../components/ScoreCard";
import UpgradeBanner from "../components/UpgradeBanner";
import ProfileSection from "../components/account/ProfileSection";

vi.mock("../config/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: "test-token" } } }),
      updateUser: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ error: null }),
    },
  },
}));

describe("StatusBadge", () => {
  test("renders pass status", () => {
    render(<StatusBadge status="pass" />);
    expect(screen.getByText("pass")).toBeInTheDocument();
  });

  test("renders warn status", () => {
    render(<StatusBadge status="warn" />);
    expect(screen.getByText("warn")).toBeInTheDocument();
  });

  test("renders fail status", () => {
    render(<StatusBadge status="fail" />);
    expect(screen.getByText("fail")).toBeInTheDocument();
  });
});

describe("ScoreRing", () => {
  test("renders score value", () => {
    render(<ScoreRing score={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  test("renders SVG with correct size", () => {
    const { container } = render(<ScoreRing score={50} size={100} />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("width")).toBe("100");
    expect(svg.getAttribute("height")).toBe("100");
  });
});

describe("TierBadge", () => {
  test("renders nothing for free tier", () => {
    const { container } = render(<TierBadge tier="free" />);
    expect(container.innerHTML).toBe("");
  });

  test("renders PRO badge", () => {
    render(<TierBadge tier="pro" />);
    expect(screen.getByText("PRO")).toBeInTheDocument();
  });

  test("renders PREMIUM badge", () => {
    render(<TierBadge tier="premium" />);
    expect(screen.getByText("PREMIUM")).toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  test("renders title and icon", () => {
    render(<SectionHeader title="Test Title" icon="🔍" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("🔍")).toBeInTheDocument();
  });

  test("renders subtitle when provided", () => {
    render(<SectionHeader title="Title" icon="⚡" subtitle="A subtitle" />);
    expect(screen.getByText("A subtitle")).toBeInTheDocument();
  });

  test("does not render subtitle when not provided", () => {
    const { container } = render(<SectionHeader title="Title" icon="⚡" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });
});

describe("CheckRow", () => {
  const item = {
    label: "Title Tag",
    status: "pass",
    detail: "55 chars — optimal",
    score: 95,
  };

  test("renders label and detail", () => {
    render(<CheckRow item={item} index={0} blurred={false} />);
    expect(screen.getByText("Title Tag")).toBeInTheDocument();
    expect(screen.getByText("55 chars — optimal")).toBeInTheDocument();
  });

  test("renders score ring", () => {
    render(<CheckRow item={item} index={0} blurred={false} />);
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  test("renders status badge", () => {
    render(<CheckRow item={item} index={0} blurred={false} />);
    expect(screen.getByText("pass")).toBeInTheDocument();
  });

  test("derives status from score when not provided", () => {
    const noStatus = { label: "Test", detail: "detail", score: 30 };
    render(<CheckRow item={noStatus} index={0} blurred={false} />);
    expect(screen.getByText("fail")).toBeInTheDocument();
  });

  test("applies blur when blurred", () => {
    const { container } = render(<CheckRow item={item} index={0} blurred={true} />);
    const blurredDiv = container.querySelector("[style*='blur']");
    expect(blurredDiv).toBeTruthy();
  });
});

describe("ScoreCard", () => {
  const item = { label: "Content Clarity", score: 72, detail: "Main offering identifiable" };

  test("renders label and detail", () => {
    render(<ScoreCard item={item} blurred={false} />);
    expect(screen.getByText("Content Clarity")).toBeInTheDocument();
    expect(screen.getByText("Main offering identifiable")).toBeInTheDocument();
  });

  test("applies blur when blurred", () => {
    const { container } = render(<ScoreCard item={item} blurred={true} />);
    const blurredDiv = container.querySelector("[style*='blur']");
    expect(blurredDiv).toBeTruthy();
  });
});

describe("UpgradeBanner", () => {
  test("renders compact mode", () => {
    render(<UpgradeBanner requiredTier="pro" featureDesc="7 more checks" compact />);
    expect(screen.getByText(/7 more checks/)).toBeInTheDocument();
    expect(screen.getByText("Upgrade to PRO")).toBeInTheDocument();
  });

  test("renders overlay mode", () => {
    render(<UpgradeBanner requiredTier="premium" featureDesc="Unlock feature" />);
    expect(screen.getByText("PREMIUM Feature")).toBeInTheDocument();
    expect(screen.getByText("Unlock feature")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to PREMIUM")).toBeInTheDocument();
  });
});

describe("ProfileSection - business fields", () => {
  const mockUser = {
    email: "test@example.com",
    user_metadata: { full_name: "Test User" },
    app_metadata: { provider: "email" },
  };

  const mockProfile = {
    company_name: "Acme Corp",
    website_url: "https://acme.com",
    job_title: "SEO Lead",
    industry: "SaaS",
  };

  test("renders business info in read mode", () => {
    render(<ProfileSection user={mockUser} profile={mockProfile} />);
    expect(screen.getByText(/SEO Lead at Acme Corp/)).toBeInTheDocument();
  });

  test("shows business fields in edit mode", () => {
    render(<ProfileSection user={mockUser} profile={mockProfile} />);
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://acme.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SEO Lead")).toBeInTheDocument();
  });

  test("resets fields on cancel", () => {
    render(<ProfileSection user={mockUser} profile={mockProfile} />);
    fireEvent.click(screen.getByText("Edit Profile"));
    const companyInput = screen.getByDisplayValue("Acme Corp");
    fireEvent.change(companyInput, { target: { value: "Changed" } });
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText(/SEO Lead at Acme Corp/)).toBeInTheDocument();
  });
});
