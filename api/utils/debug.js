// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const enabled = !!process.env.DEBUG;

function debug(tag, ...args) {
  if (enabled) console.log(`[${tag}]`, ...args);
}

module.exports = { debug };
