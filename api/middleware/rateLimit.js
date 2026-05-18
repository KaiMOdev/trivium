// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS rate-limit stubs.
// IP-based request limiting is handled by express-rate-limit in api/index.js.
// This file exists only to keep the call sites in routes/ai.js working.

function checkAILimit() {
  return (_req, _res, next) => next();
}

async function recordAIUsage() {
  return -1;
}

module.exports = { checkAILimit, recordAIUsage };
