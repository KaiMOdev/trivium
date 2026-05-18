// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { Component } from "react";
import { theme } from "../config/theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: theme.dangerGlow,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 20,
          }}>!</div>
          <h2 style={{
            fontFamily: theme.fontDisplay,
            fontSize: 22, fontWeight: 700,
            color: theme.text, margin: "0 0 8px",
          }}>Something went wrong</h2>
          <p style={{
            color: theme.textMuted, fontSize: 14,
            maxWidth: 400, lineHeight: 1.6, margin: "0 0 24px",
          }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: `1px solid ${theme.accent}44`,
                background: theme.accentGlow,
                color: theme.accent,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: theme.fontBody,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: `1px solid ${theme.cardBorder}`,
                background: "transparent",
                color: theme.textMuted,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: theme.fontBody,
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
