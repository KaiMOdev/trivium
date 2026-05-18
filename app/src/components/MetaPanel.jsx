// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import ScoreRing from "./ScoreRing";
import SectionHeader from "./SectionHeader";
import { getStatus } from "../utils/status";
import SeverityGroupedList from "./SeverityGroupedList";
import { theme } from "../config/theme";

export default function MetaPanel({ data, score }) {
  if (!data || !data.available) return null;

  const { page, pixel, checks = [] } = data;

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHeader title="Meta Business" icon="📘" />
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <ScoreRing score={score} size={80} label="Meta" />
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {page?.name && <Stat label="Page" value={page.name} />}
          {page?.followers != null && <Stat label="Followers" value={page.followers} />}
          {pixel && <Stat label="Pixel" value={pixel.active ? "Active" : "Inactive"} color={pixel.active ? "#4ade80" : "#fbbf24"} />}
        </div>
      </div>

      <SeverityGroupedList items={checks.map((c) => ({ ...c, status: c.status || getStatus(c) }))} />

      {pixel?.events?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: "#ccc", marginBottom: 10 }}>
            Pixel Events
          </h4>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888" }}>Event</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "#888" }}>Count</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "#888" }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {pixel.events.map((evt, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px 12px", color: "#fff" }}>{evt.event}</td>
                    <td style={{ padding: "8px 12px", color: "#fff", textAlign: "center" }}>
                      {(evt.count || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: evt.source === "server" ? "rgba(74,222,128,0.15)" : "rgba(91,141,239,0.15)",
                        color: evt.source === "server" ? "#4ade80" : "#5b8def",
                      }}>
                        {evt.source === "server" ? "server" : "browser"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: typeof value === "string" && value.length > 6 ? 16 : 22,
        fontWeight: 700,
        color: color || "#fff",
        fontFamily: theme.fontMono,
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{label}</div>
    </div>
  );
}
