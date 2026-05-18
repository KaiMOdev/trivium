// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS build: no Supabase client. This stub exists because legacy imports
// in hook files still reference `supabase.auth.getSession()`. The stub
// resolves with no session so requests go out unauthenticated.

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    signInWithOAuth: async () => ({ error: { message: "Auth is disabled in the OSS build" } }),
    signOut: async () => ({}),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
};
