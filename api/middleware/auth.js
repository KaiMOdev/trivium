// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS auth stub: no users, no tiers, no Supabase.
// All "requireAuth" / "requireAdmin" / "resolveTier" middleware are pass-through.
// Integrations (GSC, GA4, etc.) use a single OSS_USER_ID so token storage still works.

const OSS_USER_ID = "local";

function attachLocalUser(req, _res, next) {
  if (!req.user) req.user = { id: OSS_USER_ID, email: "local@localhost" };
  next();
}

module.exports = {
  requireAuth: attachLocalUser,
  optionalAuth: attachLocalUser,
  requireAdmin: attachLocalUser,
  resolveTier: (req, _res, next) => { req.userTier = null; next(); },
  requireTier: () => (_req, _res, next) => next(),
  isAdmin: () => false,
  invalidateTierCache: () => {},
  requireAffiliate: (_req, res) => res.status(404).end(),
  invalidateAffiliateCache: () => {},
  supabase: null,
  OSS_USER_ID,
};
