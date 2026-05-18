// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import ErrorBoundary from './components/ErrorBoundary'
import SiteAuditApp from './SiteAuditApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <SiteAuditApp />
    </ErrorBoundary>
  </StrictMode>,
)
