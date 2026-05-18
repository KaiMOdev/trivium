// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// AI features are not part of the OSS build. This stub returns an inert
// shape so call sites continue to compile and render nothing.

export default function useAISummary() {
  return {
    summary: null,
    loading: false,
    error: null,
    remaining: null,
    fetchSummary: () => {},
    clearError: () => {},
    reset: () => {},
  };
}
