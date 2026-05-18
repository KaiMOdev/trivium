// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { memo, useMemo, useState } from "react";
import { marked } from "marked";
import { theme } from "../../config/theme";

const impactColors = {
  high: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  medium: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  low: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
};

export default memo(function TodoCard({ todo, loading }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: "1rem", background: theme.card, borderRadius: 8, marginTop: "0.5rem", border: `1px solid ${theme.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: theme.textMuted }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
          Generating fix suggestion...
        </div>
      </div>
    );
  }

  if (!todo) return null;

  const impact = impactColors[todo.estimatedImpact] || impactColors.medium;

  const parseMetaTags = (html) => {
    const tags = [];
    const re = /<(meta|link)\s+([^>]*?)\s*\/?>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = {};
      const attrRe = /([\w-]+)="([^"]*)"/g;
      let a;
      while ((a = attrRe.exec(m[2])) !== null) attrs[a[1]] = a[2];
      tags.push({ tag: m[1].toLowerCase(), attrs });
    }
    return tags;
  };

  const isHeadContent = (html) => {
    const stripped = html.replace(/<(meta|link)\s+[^>]*\/?>/gi, "").trim();
    return stripped.length === 0;
  };

  const isHtml = (text) => /<[a-z][\s\S]*?>/i.test(text);

  const getContentType = (text) => {
    if (!text) return "empty";
    if (isHeadContent(text)) return "head";
    if (isHtml(text)) return "html";
    return "markdown";
  };

  const renderedMarkdown = useMemo(() => {
    if (!todo?.fixContent || getContentType(todo.fixContent) !== "markdown") return "";
    return marked.parse(todo.fixContent, { breaks: true });
  }, [todo?.fixContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(todo.fixContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      padding: "1rem",
      background: theme.card,
      borderRadius: 8,
      marginTop: "0.5rem",
      border: `1px solid ${theme.cardBorder}`,
    }}>
      {/* Impact badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{
          fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
          padding: "2px 8px", borderRadius: 4,
          background: impact.bg, color: impact.text, border: `1px solid ${impact.border}`,
        }}>
          {todo.estimatedImpact} impact
        </span>
      </div>

      {/* Problem */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Problem
        </div>
        <div style={{ fontSize: "0.85rem", color: theme.text, lineHeight: 1.5 }}>
          {todo.problem}
        </div>
      </div>

      {/* How to fix */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          How to Fix
        </div>
        {(() => {
          const text = todo.howToFix || "";
          const steps = text.split(/\n/).map(s => s.trim()).filter(Boolean);
          const hasNumberedSteps = steps.length > 1 && steps.some(s => /^\d+[\.\)]\s/.test(s));
          if (hasNumberedSteps) {
            return (
              <ol style={{ fontSize: "0.85rem", color: theme.text, lineHeight: 1.7, margin: 0, paddingLeft: "1.2rem" }}>
                {steps.map((step, i) => {
                  const cleaned = step.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•]\s*/, "").trim();
                  return cleaned ? <li key={i} style={{ marginBottom: "0.3rem" }}>{cleaned}</li> : null;
                })}
              </ol>
            );
          }
          return (
            <div style={{ fontSize: "0.85rem", color: theme.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {text}
            </div>
          );
        })()}
      </div>

      {/* Fix content with copy */}
      {todo.fixContent && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Copy-Paste Fix
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setShowPreview(true)}
                style={{
                  background: "transparent", border: `1px solid ${theme.cardBorder}`,
                  color: theme.textMuted,
                  fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                }}
              >
                Preview
              </button>
              <button
                onClick={handleCopy}
                style={{
                  background: "transparent", border: `1px solid ${theme.cardBorder}`,
                  color: copied ? "#22c55e" : theme.textMuted,
                  fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <pre style={{
            background: theme.bg, padding: "0.75rem", borderRadius: 6,
            fontSize: "0.8rem", fontFamily: "'Fira Code', monospace",
            color: theme.text, overflow: "auto", maxHeight: 200,
            border: `1px solid ${theme.cardBorder}`, whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {todo.fixContent}
          </pre>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 8, padding: "1.5rem",
              maxWidth: 700, width: "90%", maxHeight: "80vh", overflow: "auto",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <style>{`
                .preview-markdown h1, .preview-markdown h2, .preview-markdown h3 { margin: 0.8em 0 0.4em; color: #111; }
                .preview-markdown h1 { font-size: 1.3rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
                .preview-markdown h2 { font-size: 1.1rem; }
                .preview-markdown h3 { font-size: 0.95rem; }
                .preview-markdown p { margin: 0.5em 0; }
                .preview-markdown ul, .preview-markdown ol { padding-left: 1.5em; margin: 0.5em 0; }
                .preview-markdown li { margin: 0.3em 0; }
                .preview-markdown hr { border: none; border-top: 1px solid #e5e7eb; margin: 1em 0; }
                .preview-markdown strong { color: #111; }
                .preview-markdown code { background: #f3f4f6; padding: 2px 5px; border-radius: 3px; font-size: 0.85em; }
                .preview-markdown pre { background: #f3f4f6; padding: 0.75rem; border-radius: 6px; overflow: auto; }
                .preview-markdown pre code { background: none; padding: 0; }
              `}</style>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>Preview</span>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: "transparent", border: "none", fontSize: "1.2rem",
                  cursor: "pointer", color: "#666", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            {(() => {
              const type = getContentType(todo.fixContent);
              if (type === "head") {
                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Tag</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Property / Rel</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseMetaTags(todo.fixContent).map((t, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "6px 8px", color: "#888", fontFamily: "'Fira Code', monospace" }}>
                            {"<"}{t.tag}{">"}
                          </td>
                          <td style={{ padding: "6px 8px", color: "#333", fontWeight: 500 }}>
                            {t.attrs.property || t.attrs.name || t.attrs.rel || t.attrs.charset || "—"}
                          </td>
                          <td style={{ padding: "6px 8px", color: "#222", wordBreak: "break-word" }}>
                            {t.attrs.content || t.attrs.href || t.attrs.value || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
              if (type === "markdown") {
                return (
                  <div
                    className="preview-markdown"
                    style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#222" }}
                    dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                  />
                );
              }
              return (
                <div
                  style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#222" }}
                  dangerouslySetInnerHTML={{ __html: todo.fixContent }}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});
