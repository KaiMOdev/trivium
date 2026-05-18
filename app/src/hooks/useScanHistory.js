// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS build: no scan history persistence. Returns an empty hook shape.

export default function useScanHistory() {
  return {
    history: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 0,
    setPage: () => {},
    refresh: () => {},
  };
}
