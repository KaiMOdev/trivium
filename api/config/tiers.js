// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS configuration: a single set of scan limits, env-tunable.
// There is no tier model; every request gets the same limits.

const PAGE_LIMIT = Number(process.env.PAGE_LIMIT || 200);
const AUDIT_PAGE_LIMIT = Number(process.env.AUDIT_PAGE_LIMIT || 5000);
const AUDIT_DEPTH_LIMIT = Number(process.env.AUDIT_DEPTH_LIMIT || 10);
const CONCURRENCY = Number(process.env.SCAN_CONCURRENCY || 3);
const CRAWL_DELAY_MS = Number(process.env.CRAWL_DELAY_MS || 300);

function getPageLimit() { return PAGE_LIMIT; }
function getAuditPageLimit() { return AUDIT_PAGE_LIMIT; }
function getAuditDepthLimit() { return AUDIT_DEPTH_LIMIT; }

module.exports = {
  PAGE_LIMIT,
  AUDIT_PAGE_LIMIT,
  AUDIT_DEPTH_LIMIT,
  CONCURRENCY,
  CRAWL_DELAY_MS,
  getPageLimit,
  getAuditPageLimit,
  getAuditDepthLimit,
};
