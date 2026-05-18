// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { theme } from "../config/theme";

const PURPOSE_LABELS = {
  "sell-products": "Selling Products",
  "generate-leads": "Lead Generation",
  "inform-educate": "Inform & Educate",
  "provide-service": "Service Provider",
  "entertain": "Entertainment",
  "build-community": "Community",
  "other": "General",
};

const MODEL_LABELS = {
  "b2b": "B2B",
  "b2c": "B2C",
  "marketplace": "Marketplace",
  "nonprofit": "Nonprofit",
  "personal": "Personal",
  "other": "General",
};

function formatIndustry(industry) {
  if (!industry) return "Unknown";
  return industry
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function ClassificationCard({ classification }) {
  if (!classification) return null;

  const pills = [
    MODEL_LABELS[classification.businessModel] || classification.businessModel,
    formatIndustry(classification.industry),
    PURPOSE_LABELS[classification.sitePurpose] || classification.sitePurpose,
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        marginBottom: 16,
        borderRadius: 10,
        background: theme.violetGlow,
        border: `1px solid ${theme.violet}22`,
      }}
      title="AI-detected website profile — influences how checks are scored"
    >
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: theme.violet,
        fontFamily: theme.fontMono, whiteSpace: "nowrap",
      }}>
        AI Profile
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {pills.map((pill, i) => (
          <span key={i} style={{
            fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 6,
            background: theme.surface,
            border: `1px solid ${theme.cardBorder}`,
            color: theme.text,
            fontFamily: theme.fontBody,
          }}>
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
}
