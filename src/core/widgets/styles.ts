/**
 * Premium Minimal Aesthetic - Refined Design System.
 *
 * @remarks
 * Design Principles:
 * - Sans-serif for prose, monospace for code/technical elements
 * - Layered elevation via multi-shadow system
 * - Rounded modern controls (7-10px radius)
 * - Spring-like easing (expo-out curves)
 * - High contrast text with OKLCH precision
 * - Page-only dark mode (follows host page theme classes, no OS preference fallback)
 */

/**
 * Generates the complete CSS styles for the FillKit widget system.
 *
 * @remarks
 * Returns a string containing all necessary CSS variables, component styles,
 * animations, and responsive adjustments. The styles use OKLCH color space
 * for precise color manipulation and support both light and dark modes.
 *
 * @returns A string containing the full CSS stylesheet.
 */
export function generateStyles(): string {
  return `
    /* ===================================
       COLOR SYSTEM - OKLCH Precision
       All styles use .fillkit-* class prefix
       for namespace isolation from host pages.
       =================================== */

    /* Light Mode (default) */
    :root {
      --fk-bg: oklch(0.968 0.004 260);           /* Nearly white with subtle violet */
      --fk-fg: oklch(0.23 0 0);                  /* Deep black text */
      --fk-primary: oklch(0.45 0.15 260);        /* Deep purple/violet */
      --fk-border: oklch(0.90 0.003 260);        /* Light gray borders */
      --fk-muted: oklch(0.955 0.003 260);        /* Subtle background */
      --fk-card: oklch(0.985 0.003 260);         /* Elevated surface */
      --fk-muted-fg: oklch(0.44 0.005 260);      /* Medium gray text */
      --fk-error: oklch(0.55 0.22 25);           /* Error red */

      /* Widget and button-specific colors */
      --fk-widget-border: oklch(0.55 0.12 260);       /* Muted primary - always visible */
      --fk-btn-fill-bg: oklch(0.92 0.1 150);          /* Fill button: distinct green */
      --fk-btn-fill-border: oklch(0.80 0.12 150);
      --fk-btn-fill-hover: oklch(0.90 0.12 150);
      --fk-btn-clear-bg: oklch(0.92 0.1 50);          /* Clear button: distinct amber */
      --fk-btn-clear-border: oklch(0.80 0.12 50);
      --fk-btn-clear-hover: oklch(0.90 0.12 50);
      --fk-btn-danger-bg: oklch(0.92 0.1 25);         /* Danger button: Red */
      --fk-btn-danger-border: oklch(0.80 0.12 25);
      --fk-btn-danger-hover: oklch(0.90 0.12 25);
      --fk-btn-warning-bg: oklch(0.92 0.1 85);        /* Warning button: Yellow */
      --fk-btn-warning-border: oklch(0.80 0.12 85);
      --fk-btn-warning-hover: oklch(0.90 0.12 85);

      /* Feedback type colors */
      --fk-feedback-loading: oklch(0.55 0.15 255);
      --fk-feedback-success: oklch(0.55 0.15 155);
      --fk-feedback-error: oklch(0.55 0.22 25);
      --fk-feedback-warning: oklch(0.60 0.16 70);
      --fk-feedback-info: oklch(0.50 0.005 260);

      /* Status dot colors */
      --fk-status-cloud: oklch(0.60 0.15 155);
      --fk-status-degraded: oklch(0.65 0.16 70);
      --fk-status-local: oklch(0.55 0.01 260);

      /* Safe area insets */
      --fk-safe-top: env(safe-area-inset-top, 0px);
      --fk-safe-bottom: env(safe-area-inset-bottom, 0px);
      --fk-safe-left: env(safe-area-inset-left, 0px);
      --fk-safe-right: env(safe-area-inset-right, 0px);

      /* Typography */
      --fk-font-sans: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      --fk-font-mono: ui-monospace, 'Geist Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
    }

    /* Dark Mode - follows host page theme classes only */
    html.dark,
    html[data-theme="dark"],
    html[data-mode="dark"] {
      --fk-bg: oklch(0.18 0.012 260);          /* Very dark violet-tinted */
      --fk-fg: oklch(0.92 0.005 260);          /* Nearly white */
      --fk-primary: oklch(0.70 0.18 260);      /* Bright purple */
      --fk-border: oklch(0.32 0.015 260);      /* Dark borders */
      --fk-muted: oklch(0.28 0.015 260);       /* Dark gray */
      --fk-card: oklch(0.22 0.010 260);        /* Slightly lighter than bg */
      --fk-muted-fg: oklch(0.60 0.008 260);    /* Light gray text */
      --fk-error: oklch(0.65 0.20 25);         /* Brighter error for dark mode */

      /* Widget and button-specific colors (dark mode) */
      --fk-widget-border: oklch(0.60 0.15 260);       /* Muted primary for dark mode */
      --fk-btn-fill-bg: oklch(0.30 0.1 150);
      --fk-btn-fill-border: oklch(0.40 0.12 150);
      --fk-btn-fill-hover: oklch(0.35 0.12 150);
      --fk-btn-clear-bg: oklch(0.30 0.1 50);
      --fk-btn-clear-border: oklch(0.40 0.12 50);
      --fk-btn-clear-hover: oklch(0.35 0.12 50);
      --fk-btn-danger-bg: oklch(0.30 0.1 25);
      --fk-btn-danger-border: oklch(0.40 0.12 25);
      --fk-btn-danger-hover: oklch(0.35 0.12 25);
      --fk-btn-warning-bg: oklch(0.30 0.1 85);
      --fk-btn-warning-border: oklch(0.40 0.12 85);
      --fk-btn-warning-hover: oklch(0.35 0.12 85);

      /* Feedback type colors (dark mode) */
      --fk-feedback-loading: oklch(0.65 0.15 255);
      --fk-feedback-success: oklch(0.65 0.15 155);
      --fk-feedback-error: oklch(0.65 0.20 25);
      --fk-feedback-warning: oklch(0.70 0.16 70);
      --fk-feedback-info: oklch(0.60 0.008 260);

      /* Status dot colors (dark mode) */
      --fk-status-cloud: oklch(0.65 0.15 155);
      --fk-status-degraded: oklch(0.70 0.16 70);
      --fk-status-local: oklch(0.55 0.01 260);
    }

    /* Dark mode badge variants */
    html.dark .fillkit-badge-warning,
    html[data-theme="dark"] .fillkit-badge-warning,
    html[data-mode="dark"] .fillkit-badge-warning {
      background: oklch(0.25 0.08 80);
      border-color: oklch(0.35 0.12 80);
      color: oklch(0.75 0.08 80);
    }

    /* ===================================
       CURRENT FORM INDICATOR
       =================================== */

    form.fillkit-current-form {
      outline: none;
      border-radius: 6px;
      box-shadow:
        0 0 0 2px oklch(from var(--fk-primary) l c h / 0.4),
        0 0 0 4px oklch(from var(--fk-primary) l c h / 0.15);
      animation: fk-form-ring 2s ease-in-out infinite;
    }

    @keyframes fk-form-ring {
      0%, 100% { box-shadow: 0 0 0 2px oklch(from var(--fk-primary) l c h / 0.4), 0 0 0 4px oklch(from var(--fk-primary) l c h / 0.15); }
      50% { box-shadow: 0 0 0 2px oklch(from var(--fk-primary) l c h / 0.25), 0 0 0 6px oklch(from var(--fk-primary) l c h / 0.08); }
    }

    /* ===================================
       WIDGET CONTAINER - Positioning
       =================================== */

    .fillkit-widget-container {
      position: fixed;
      z-index: 2147483647; /* Max z-index */
      font-family: var(--fk-font-sans);
      pointer-events: none;
      font-size: 14px;
      letter-spacing: -0.011em; /* Optical adjustment */
    }

    /* Position variants */
    .fillkit-widget-container.bottom-center {
      bottom: calc(0px + var(--fk-safe-bottom));
      left: 50%;
      transform: translateX(-50%);
    }

    .fillkit-widget-container.top-center {
      top: calc(0px + var(--fk-safe-top));
      left: 50%;
      transform: translateX(-50%);
    }

    .fillkit-widget-container.left-center {
      left: calc(0px + var(--fk-safe-left));
      top: 50%;
      transform: translateY(-50%);
    }

    .fillkit-widget-container.right-center {
      right: calc(0px + var(--fk-safe-right));
      top: 50%;
      transform: translateY(-50%);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .fillkit-widget-container {
        font-size: 13px;
      }
    }

    /* ===================================
       MAIN WIDGET - Layered Elevation
       =================================== */

    .fillkit-widget {
      background: var(--fk-card);
      border: 1px solid var(--fk-widget-border);
      border-radius: 10px;
      padding: 8px;
      box-shadow:
        0 0 0 1px oklch(from var(--fk-primary) l c h / 0.06),
        0px 1px 2px 0px oklch(0 0 0 / 0.07),
        0px 2px 4px -1px oklch(0 0 0 / 0.07),
        0px 4px 8px -2px oklch(0 0 0 / 0.06);
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      pointer-events: auto;
      cursor: grab;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      position: relative;
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
    }

    /* Keyboard focus indicator for repositioning (a11y) */
    .fillkit-widget:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }
    .fillkit-widget:focus:not(:focus-visible) {
      outline: none;
    }

    /* Backdrop-filter fallback */
    @supports not (backdrop-filter: blur(1px)) {
      .fillkit-widget {
        background: var(--fk-bg);
      }
    }

    .fillkit-widget:active {
      cursor: grabbing;
    }

    .fillkit-widget-buttons {
      display: flex;
      flex-direction: row;
      gap: 6px;
      align-items: center;
    }

    .fillkit-widget.dragging {
      cursor: grabbing;
      box-shadow:
        0 0 0 1px oklch(from var(--fk-primary) l c h / 0.1),
        0px 4px 8px 0px oklch(0 0 0 / 0.12),
        0px 8px 16px -2px oklch(0 0 0 / 0.12),
        0px 16px 32px -4px oklch(0 0 0 / 0.10);
      transform: scale(1.02);
    }

    .fillkit-widget:hover:not(.dragging) {
      box-shadow:
        0 0 0 1px oklch(from var(--fk-primary) l c h / 0.1),
        0px 2px 4px 0px oklch(0 0 0 / 0.10),
        0px 4px 8px -1px oklch(0 0 0 / 0.10),
        0px 8px 16px -2px oklch(0 0 0 / 0.08);
      transform: translateY(-1px);
    }

    /* Edge-attached widgets (no border on attached edge) */
    .fillkit-widget-container.bottom-center .fillkit-widget {
      border-radius: 10px 10px 0 0;
      border-bottom: none;
    }

    .fillkit-widget-container.top-center .fillkit-widget {
      border-radius: 0 0 10px 10px;
      border-top: none;
    }

    .fillkit-widget-container.left-center .fillkit-widget {
      border-radius: 0 10px 10px 0;
      border-left: none;
      flex-direction: row;
    }

    .fillkit-widget-container.right-center .fillkit-widget {
      border-radius: 10px 0 0 10px;
      border-right: none;
      flex-direction: row;
    }

    /* Custom-positioned widget (dragged) — override edge-attached styles */
    .fillkit-widget-container.custom-position .fillkit-widget {
      border-radius: 10px;
      border: 1px solid var(--fk-widget-border);
    }

    /* Vertical layouts - buttons stack */
    .fillkit-widget-container.left-center .fillkit-widget-buttons,
    .fillkit-widget-container.right-center .fillkit-widget-buttons {
      flex-direction: column;
    }

    /* ===================================
       WIDGET BUTTONS - Hierarchy System
       =================================== */

    .fillkit-widget-btn {
      background: transparent;
      color: var(--fk-fg);
      border: 1px solid transparent;
      border-radius: 7px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      font-family: var(--fk-font-mono);
      letter-spacing: 0.01em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      user-select: none;
      outline: none;
      white-space: nowrap;
      min-height: 32px;
      box-shadow: none;
    }

    .fillkit-widget-btn:hover {
      background: var(--fk-muted);
      border-color: var(--fk-border);
      transform: scale(1.02);
      box-shadow: 0px 2px 4px 0px oklch(0 0 0 / 0.08);
    }

    .fillkit-widget-btn:active {
      transform: scale(0.98);
      box-shadow: inset 0 1px 2px oklch(0 0 0 / 0.10);
    }

    .fillkit-widget-btn:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    .fillkit-widget-icon {
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fillkit-widget-btn-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: capitalize;
    }

    /* Hide labels in vertical layouts */
    .fillkit-widget-container.left-center .fillkit-widget-btn .fillkit-widget-btn-label,
    .fillkit-widget-container.right-center .fillkit-widget-btn .fillkit-widget-btn-label {
      display: none;
    }

    /* ===================================
       BUTTON DIFFERENTIATION - Visual Hierarchy
       =================================== */

    /* Fill All - Secondary Green */
    .fillkit-widget-btn[data-fillkit-event="fillAll"] {
      background: oklch(from var(--fk-btn-fill-bg) l c h / 0.4);
      border-color: var(--fk-btn-fill-border);
      color: var(--fk-fg);
    }

    .fillkit-widget-btn[data-fillkit-event="fillAll"]:hover {
      background: var(--fk-btn-fill-hover);
      border-color: var(--fk-btn-fill-border);
    }

    /* Fill Current - Primary (Purple) — solid, prominent */
    .fillkit-widget-btn[data-fillkit-event="fillCurrent"] {
      background: var(--fk-primary);
      color: white;
      border-color: var(--fk-primary);
      box-shadow: 0 1px 3px oklch(from var(--fk-primary) l c h / 0.3);
    }

    .fillkit-widget-btn[data-fillkit-event="fillCurrent"]:hover {
      background: oklch(from var(--fk-primary) calc(l * 0.92) c h);
      border-color: var(--fk-primary);
      box-shadow: 0 2px 6px oklch(from var(--fk-primary) l c h / 0.35);
    }

    /* Clear All - Danger (red-tinted) */
    .fillkit-widget-btn[data-fillkit-event="clearAll"] {
      background: oklch(from var(--fk-btn-danger-bg) l c h / 0.4);
      border-color: var(--fk-btn-danger-border);
      color: var(--fk-fg);
    }

    .fillkit-widget-btn[data-fillkit-event="clearAll"]:hover {
      background: var(--fk-btn-danger-hover);
      border-color: var(--fk-btn-danger-border);
    }

    /* Clear Current - Amber */
    .fillkit-widget-btn[data-fillkit-event="clearCurrent"] {
      background: oklch(from var(--fk-btn-clear-bg) l c h / 0.4);
      border-color: var(--fk-btn-clear-border);
      color: var(--fk-fg);
    }

    .fillkit-widget-btn[data-fillkit-event="clearCurrent"]:hover {
      background: var(--fk-btn-clear-hover);
      border-color: var(--fk-btn-clear-border);
    }

    /* ===================================
       WIDGET INFO TEXT
       =================================== */

    .fillkit-widget-meta {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      order: -1;
      width: 100%;
    }

    .fillkit-widget-info {
      font-size: 11px;
      font-family: var(--fk-font-sans);
      letter-spacing: -0.01em;
      color: var(--fk-muted-fg);
      text-align: center;
      padding: 4px 8px;
      border-radius: 4px;
      background: transparent;
      border: none;
      margin: 0;
      opacity: 0.6;
      transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .fillkit-widget:hover .fillkit-widget-info {
      opacity: 1;
    }

    /* Hide in vertical layouts */
    .fillkit-widget-container.left-center .fillkit-widget-info,
    .fillkit-widget-container.right-center .fillkit-widget-info {
      display: none;
    }

    /* ===================================
       STATUS INDICATOR
       =================================== */

    .fillkit-widget-status {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
    }

    .fillkit-widget-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      font-size: 10px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .fillkit-widget-status-badge:hover {
      opacity: 1;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .fillkit-widget-brand-icon {
      display: flex;
      align-items: center;
    }

    .fillkit-widget-brand-icon svg {
      width: 16px;
      height: 12px;
    }

    .fillkit-widget-status-dot {
      display: block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 0 1px var(--fk-card);
      flex-shrink: 0;
    }

    .fillkit-status-local {
      background: var(--fk-status-local);
    }

    .fillkit-status-cloud {
      background: var(--fk-status-cloud);
      animation: fk-pulse 2s infinite;
    }

    .fillkit-status-cloud-degraded {
      background: var(--fk-status-degraded);
      animation: fk-pulse 1.2s infinite;
    }

    .fillkit-widget-status-label {
      font-size: 10px;
      white-space: nowrap;
    }

    .fillkit-widget-error-badge {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 14px;
      height: 14px;
      padding: 0 3px;
      background: var(--fk-error);
      color: white;
      border-radius: 7px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
    }

    .fillkit-widget-error-badge.visible {
      display: flex;
    }

    @keyframes fk-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* ===================================
       OPTIONS SHEET - Left Slide Panel
       =================================== */

    .fillkit-options-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: oklch(0 0 0 / 0.5);
      backdrop-filter: blur(4px);
      z-index: 2147483645;
      opacity: 0;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    .fillkit-options-overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .fillkit-options-sheet {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      background: var(--fk-bg);
      color: var(--fk-fg);
      border-right: 1px solid var(--fk-border);
      box-shadow:
        4px 0 8px 0px oklch(0 0 0 / 0.08),
        8px 0 16px -2px oklch(0 0 0 / 0.08),
        16px 0 32px -4px oklch(0 0 0 / 0.06);
      z-index: 2147483646;
      padding: calc(24px + var(--fk-safe-top)) 24px calc(24px + var(--fk-safe-bottom));
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
      max-width: 480px;
      overflow-y: auto;
      font-family: var(--fk-font-sans);
      transform: translateX(-100%);
    }

    .fillkit-options-sheet.visible {
      transform: translateX(0);
    }

    @media (max-width: 640px) {
      .fillkit-options-sheet {
        max-width: 100vw;
        padding: 16px;
      }
    }

    /* Sticky header in landscape / short viewports */
    @media (max-height: 500px) {
      .fillkit-options-header {
        position: sticky;
        top: 0;
        background: var(--fk-bg);
        z-index: 1;
      }
    }

    /* Header */
    .fillkit-options-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--fk-border);
      margin-bottom: 16px;
    }

    .fillkit-options-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Shared brand logo in sheet headers (OptionsSheet + HelpSheet) */
    .fillkit-sheet-brand {
      display: flex;
      align-items: center;
    }

    .fillkit-sheet-brand svg {
      width: 90px;
      height: auto;
    }

    .fillkit-options-title {
      font-size: 16px;
      font-family: var(--fk-font-sans);
      font-weight: 700;
      text-transform: none;
      letter-spacing: -0.02em;
      color: var(--fk-fg);
      margin: 0;
    }

    .fillkit-options-subtitle {
      font-size: 12px;
      font-family: var(--fk-font-sans);
      color: var(--fk-muted-fg);
      margin: 0;
      letter-spacing: 0;
    }

    /* Shared close button for both sheets */
    .fillkit-sheet-close {
      background: transparent;
      border: 1px solid var(--fk-border);
      border-radius: 7px;
      font-size: 20px;
      cursor: pointer;
      color: var(--fk-muted-fg);
      padding: 6px;
      line-height: 1;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }

    .fillkit-sheet-close:hover {
      color: var(--fk-fg);
      background: var(--fk-muted);
      border-color: var(--fk-primary);
    }

    .fillkit-sheet-close:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    /* Legacy close buttons (kept for backward compat) */
    .fillkit-options-close {
      background: transparent;
      border: 1px solid var(--fk-border);
      border-radius: 7px;
      font-size: 20px;
      cursor: pointer;
      color: var(--fk-muted-fg);
      padding: 6px;
      line-height: 1;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }

    .fillkit-options-close:hover {
      color: var(--fk-fg);
      background: var(--fk-muted);
      border-color: var(--fk-primary);
    }

    .fillkit-options-close:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    /* Form Controls */
    .fillkit-options-group {
      margin-bottom: 0;
    }

    .fillkit-section-spacer {
      height: 24px;
    }

    .fillkit-options-group-title {
      font-size: 12px;
      font-family: var(--fk-font-sans);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fk-muted-fg);
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--fk-border);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .fillkit-options-group-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .fillkit-options-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--fk-fg);
      margin-bottom: 6px;
    }

    .fillkit-options-section {
      margin-bottom: 12px;
    }

    .fillkit-options-section:last-child {
      margin-bottom: 0;
    }

    .fillkit-options-input,
    .fillkit-options-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--fk-border);
      border-radius: 7px;
      font-size: 14px;
      transition: all 0.15s ease;
      background: var(--fk-bg);
      color: var(--fk-fg);
      font-family: var(--fk-font-sans);
      min-height: 36px;
    }

    .fillkit-options-input:focus,
    .fillkit-options-select:focus {
      outline: none;
      border-color: var(--fk-primary);
      box-shadow: 0 0 0 3px oklch(from var(--fk-primary) l c h / 0.15);
    }

    .fillkit-options-textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--fk-border);
      border-radius: 7px;
      font-size: 13px;
      font-family: var(--fk-font-mono);
      transition: all 0.15s ease;
      background: var(--fk-bg);
      color: var(--fk-fg);
      resize: vertical;
      min-height: 72px;
      line-height: 1.5;
    }

    .fillkit-options-textarea:focus {
      outline: none;
      border-color: var(--fk-primary);
      box-shadow: 0 0 0 3px oklch(from var(--fk-primary) l c h / 0.15);
    }

    .fillkit-options-field-desc {
      font-size: 12px;
      color: var(--fk-muted-fg);
      margin-top: 4px;
      line-height: 1.4;
    }

    .fillkit-options-error {
      font-size: 11px;
      color: var(--fk-error);
      margin-top: 4px;
      display: none;
    }

    .fillkit-options-checkbox-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--fk-border);
      cursor: pointer;
      transition: all 0.15s ease;
      background: transparent;
    }

    .fillkit-options-checkbox-wrapper:hover {
      border-color: var(--fk-primary);
      background: var(--fk-muted);
    }

    .fillkit-options-checkbox-wrapper:has(input:checked) {
      border-left: 3px solid var(--fk-primary);
      padding-left: 10px; /* 12 - 2 to compensate for wider border */
    }

    .fillkit-options-checkbox-wrapper input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--fk-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .fillkit-options-checkbox-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: var(--fk-fg);
      cursor: pointer;
      line-height: 1.4;
    }

    .fillkit-options-checkbox-desc {
      font-size: 12px;
      color: var(--fk-muted-fg);
      margin-top: 3px;
      line-height: 1.3;
    }

    /* Buttons */
    .fillkit-btn {
      padding: 8px 16px;
      border-radius: 7px;
      border: 1px solid var(--fk-border);
      font-size: 13px;
      font-weight: 600;
      font-family: var(--fk-font-sans);
      text-transform: none;
      letter-spacing: 0;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
    }

    .fillkit-btn:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    .fillkit-btn-primary {
      background: var(--fk-primary);
      color: white;
      border-color: var(--fk-primary);
      box-shadow: 0px 1px 2px 0px oklch(0 0 0 / 0.10);
    }

    .fillkit-btn-primary:hover {
      background: oklch(from var(--fk-primary) calc(l * 0.92) c h);
      box-shadow: 0px 2px 4px 0px oklch(0 0 0 / 0.15);
    }

    .fillkit-btn-secondary {
      background: var(--fk-bg);
      color: var(--fk-fg);
    }

    .fillkit-btn-secondary:hover {
      background: var(--fk-muted);
      border-color: var(--fk-primary);
    }

    .fillkit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Cloud Status */
    .fillkit-cloud-status {
      margin-top: 12px;
      padding: 12px;
      border-radius: 7px;
      border: 1px solid var(--fk-border);
      background: var(--fk-card);
      font-size: 13px;
    }

    .fillkit-status-message {
      color: var(--fk-fg);
      line-height: 1.4;
    }

    .fillkit-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 10px;
      font-family: var(--fk-font-mono);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid var(--fk-border);
      background: var(--fk-muted);
    }

    .fillkit-badge-success {
      background: oklch(from var(--fk-primary) l c h / 0.1);
      border-color: var(--fk-primary);
      color: var(--fk-primary);
    }

    .fillkit-badge-warning {
      background: oklch(0.95 0.08 80 / 0.8);
      border-color: oklch(0.85 0.12 80);
      color: oklch(0.40 0.12 80);
    }

    .fillkit-badge-default {
      background: var(--fk-muted);
      border-color: var(--fk-border);
      color: var(--fk-muted-fg);
    }

    /* Cloud status badge (appears in section title) */
    .fillkit-cloud-status-badge {
      font-size: 10px;
      padding: 2px 6px;
      line-height: 1.2;
    }

    /* Text link for 'Click here to change API key' */
    .fillkit-text-link {
      color: var(--fk-primary);
      font-size: 11px;
      font-family: var(--fk-font-sans);
      text-decoration: underline;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-left: auto;
    }

    .fillkit-text-link:hover {
      text-decoration: underline;
      opacity: 1;
    }

    /* Status rows (for provider/dataset stats) */
    .fillkit-status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 12px;
      font-family: var(--fk-font-mono);
      border-bottom: 1px solid var(--fk-border);
    }

    .fillkit-status-row:last-child {
      border-bottom: none;
    }

    .fillkit-status-row > span:first-child {
      color: var(--fk-muted-fg);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 10px;
    }

    .fillkit-status-row > span:last-child {
      color: var(--fk-fg);
      font-weight: 600;
    }

    /* Status cards (provider/dataset info boxes) */
    .fillkit-status-card {
      margin: 12px 0;
      padding: 12px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      border-radius: 7px;
    }

    .fillkit-status-card-title {
      font-family: var(--fk-font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fk-fg);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--fk-border);
    }

    /* Input with button (inline button next to input) */
    .fillkit-input-with-button {
      display: flex;
      gap: 6px;
      align-items: stretch;
    }

    .fillkit-input-with-button select,
    .fillkit-input-with-button input {
      flex: 1;
    }

    .fillkit-input-with-button .fillkit-btn {
      flex-shrink: 0;
      min-width: 36px;
    }

    /* Alert/notification boxes */
    .fillkit-alert {
      padding: 12px;
      border-radius: 7px;
      border: 1px solid var(--fk-border);
      background: var(--fk-card);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 12px;
    }

    .fillkit-alert-success {
      background: oklch(from var(--fk-primary) l c h / 0.05);
      border-color: var(--fk-primary);
    }

    .fillkit-alert-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    .fillkit-alert-content {
      flex: 1;
      font-family: var(--fk-font-sans);
      font-weight: 500;
      color: var(--fk-fg);
    }

    /* Cloud-specific sections */
    .fillkit-cloud-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--fk-border);
    }

    .fillkit-scan-section {
      margin: 16px 0;
      padding: 12px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      border-radius: 7px;
    }

    .fillkit-scan-section > * {
      margin-bottom: 8px;
    }

    .fillkit-scan-section > *:last-child {
      margin-bottom: 0;
    }

    /* Progress bar (cloud scan) */
    .fillkit-scan-progress-track {
      background: var(--fk-border);
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
    }

    .fillkit-scan-progress-fill {
      background: var(--fk-primary);
      height: 100%;
      transition: width 0.3s ease;
    }

    /* Inline groups for side-by-side layouts */
    .fillkit-inline-group {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }

    .fillkit-inline-group > * {
      flex: 1;
    }

    /* Dataset pills container */
    .fillkit-dataset-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .fillkit-dataset-pills .fillkit-badge {
      flex: 0 1 auto;
      min-width: fit-content;
    }

    /* ===================================
       FEEDBACK DISPLAY
       =================================== */

    .fillkit-feedback-display {
      display: none;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;
      border-bottom: 1px solid var(--fk-border);
    }

    .fillkit-feedback-message {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 7px;
      font-size: 13px;
      line-height: 1.4;
    }

    .fillkit-feedback-loading {
      background: oklch(from var(--fk-feedback-loading) l c h / 0.1);
      border-left: 3px solid var(--fk-feedback-loading);
    }

    .fillkit-feedback-success {
      background: oklch(from var(--fk-feedback-success) l c h / 0.1);
      border-left: 3px solid var(--fk-feedback-success);
    }

    .fillkit-feedback-error {
      background: oklch(from var(--fk-feedback-error) l c h / 0.1);
      border-left: 3px solid var(--fk-feedback-error);
    }

    .fillkit-feedback-warning {
      background: oklch(from var(--fk-feedback-warning) l c h / 0.1);
      border-left: 3px solid var(--fk-feedback-warning);
    }

    .fillkit-feedback-info {
      background: oklch(from var(--fk-feedback-info) l c h / 0.1);
      border-left: 3px solid var(--fk-feedback-info);
    }

    .fillkit-feedback-icon {
      flex-shrink: 0;
      font-size: 16px;
      line-height: 1;
      margin-top: 1px;
    }

    .fillkit-feedback-content {
      flex: 1;
      min-width: 0;
    }

    .fillkit-feedback-text {
      color: var(--fk-fg);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .fillkit-feedback-progress-label {
      font-size: 11px;
      color: var(--fk-muted-fg);
      margin-bottom: 4px;
    }

    .fillkit-feedback-progress-track {
      height: 6px;
      background: var(--fk-border);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }

    .fillkit-feedback-progress-fill {
      height: 100%;
      background: var(--fk-primary);
      transition: width 0.3s ease;
    }

    .fillkit-feedback-action {
      margin-top: 8px;
      padding: 6px 12px;
      background: var(--fk-muted);
      border: 1px solid var(--fk-border);
      border-radius: 5px;
      color: var(--fk-fg);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .fillkit-feedback-action:hover {
      background: var(--fk-border);
    }

    .fillkit-feedback-dismiss {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--fk-muted-fg);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      transition: color 0.2s;
      font-weight: 400;
    }

    .fillkit-feedback-dismiss:hover {
      color: var(--fk-fg);
    }

    /* ===================================
       HELP SHEET - Right Slide Panel
       =================================== */

    .fillkit-help-sheet {
      position: fixed;
      top: 0;
      bottom: 0;
      right: 0;
      background: var(--fk-bg);
      color: var(--fk-fg);
      border-left: 1px solid var(--fk-border);
      box-shadow:
        -4px 0 8px 0px oklch(0 0 0 / 0.08),
        -8px 0 16px -2px oklch(0 0 0 / 0.08),
        -16px 0 32px -4px oklch(0 0 0 / 0.06);
      z-index: 2147483647;
      padding: calc(24px + var(--fk-safe-top)) 24px calc(24px + var(--fk-safe-bottom));
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
      max-width: 380px;
      overflow-y: auto;
      font-family: var(--fk-font-sans);
      transform: translateX(100%);
    }

    .fillkit-help-sheet.visible {
      transform: translateX(0);
    }

    @media (max-width: 640px) {
      .fillkit-help-sheet {
        max-width: 100vw;
        padding: 16px;
      }
    }

    /* Sticky header in landscape / short viewports */
    @media (max-height: 500px) {
      .fillkit-help-header {
        position: sticky;
        top: 0;
        background: var(--fk-bg);
        z-index: 1;
      }
    }

    /* Header */
    .fillkit-help-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--fk-border);
      margin-bottom: 16px;
    }

    .fillkit-help-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .fillkit-help-title {
      font-size: 16px;
      font-family: var(--fk-font-sans);
      font-weight: 700;
      text-transform: none;
      letter-spacing: -0.02em;
      color: var(--fk-fg);
      margin: 0;
    }

    .fillkit-help-subtitle {
      font-size: 12px;
      font-family: var(--fk-font-sans);
      color: var(--fk-muted-fg);
      margin: 0;
      letter-spacing: 0;
    }

    .fillkit-help-close {
      background: transparent;
      border: 1px solid var(--fk-border);
      border-radius: 7px;
      font-size: 20px;
      cursor: pointer;
      color: var(--fk-muted-fg);
      padding: 6px;
      line-height: 1;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }

    .fillkit-help-close:hover {
      color: var(--fk-fg);
      background: var(--fk-muted);
      border-color: var(--fk-primary);
    }

    .fillkit-help-close:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    /* Grid Layout */
    .fillkit-help-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    @media (max-width: 640px) {
      .fillkit-help-grid {
        grid-template-columns: 1fr;
      }
    }

    .fillkit-help-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      border-radius: 7px;
    }

    .fillkit-help-label {
      font-family: var(--fk-font-sans);
      font-size: 12px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: var(--fk-muted-fg);
      flex: 1;
    }

    /* Kbd Badge */
    .fillkit-kbd {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px 5px;
      background: transparent;
      border: none;
      border-radius: 3px;
      font-family: var(--fk-font-mono);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1;
    }

    .fillkit-kbd-key {
      padding: 2px 4px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      border-radius: 3px;
      color: var(--fk-primary);
      box-shadow: inset 0 -1px 0 var(--fk-border);
    }

    .fillkit-kbd-sep {
      opacity: 0.5;
      font-size: 9px;
      padding: 0 1px;
    }

    /* Footer */
    .fillkit-help-footer {
      padding-top: 14px;
      border-top: 1px solid var(--fk-border);
      text-align: center;
    }

    .fillkit-help-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--fk-font-sans);
      font-size: 12px;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0;
      color: var(--fk-primary);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .fillkit-help-link:hover {
      text-decoration: underline;
      opacity: 1;
    }

    /* ===================================
       MOBILE OPTIMIZATIONS
       =================================== */

    @media (max-width: 480px) {
      .fillkit-widget {
        padding: 6px;
        gap: 6px;
      }

      .fillkit-widget-btn {
        padding: 6px 10px;
        font-size: 12px;
        min-height: 44px;
      }

      /* Larger touch targets for close buttons */
      .fillkit-options-close,
      .fillkit-help-close,
      .fillkit-sheet-close {
        min-width: 44px;
        min-height: 44px;
      }

      /* Stack meta row on small screens */
      .fillkit-widget-meta {
        flex-direction: column;
        gap: 4px;
      }

      /* Hide button labels on very small screens */
      .fillkit-widget-container.bottom-center .fillkit-widget-btn .fillkit-widget-btn-label,
      .fillkit-widget-container.top-center .fillkit-widget-btn .fillkit-widget-btn-label {
        display: none;
      }
    }

    /* ===================================
       ACCESSIBILITY
       =================================== */

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .fillkit-widget,
      .fillkit-widget-btn,
      .fillkit-options-sheet,
      .fillkit-help-sheet,
      .fillkit-options-overlay,
      form.fillkit-current-form {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .fillkit-widget,
      .fillkit-options-sheet,
      .fillkit-help-sheet {
        border-width: 2px;
      }
    }

    /* ===================================
       FAB (Floating Action Button)
       Minimized state when main widget is hidden
       =================================== */

    .fillkit-fab-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: auto;
    }

    .fillkit-fab {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      backdrop-filter: blur(8px) saturate(180%);
      -webkit-backdrop-filter: blur(8px) saturate(180%);
      box-shadow: 0 1px 3px oklch(0 0 0 / 0.08);
      border-radius: 50%;
      cursor: pointer;
      padding: 0;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.2s ease;
      opacity: 0.8;
    }

    .fillkit-fab svg {
      width: 38px;
      height: 38px;
    }

    .fillkit-fab:hover {
      transform: scale(1.1);
      opacity: 1;
    }

    .fillkit-fab:active {
      transform: scale(0.95);
    }

    .fillkit-fab:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .fillkit-fab {
        transition-duration: 0.01ms !important;
      }
    }

    /* ===================================
       INLINE FILL INDICATOR
       Per-field fill icon (flyweight pattern)
       =================================== */

    .fillkit-inline-fill-btn {
      position: fixed;
      z-index: 2147483644; /* Below overlay (…645), sheet (…646), widget (…647) */
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--fk-card);
      border: 1px solid var(--fk-border);
      backdrop-filter: blur(8px) saturate(180%);
      -webkit-backdrop-filter: blur(8px) saturate(180%);
      box-shadow: 0 1px 2px oklch(0 0 0 / 0.06);
      cursor: pointer;
      padding: 0;
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
      will-change: opacity, transform;
      transition: opacity 0.15s ease,
                  transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .fillkit-inline-fill-btn svg {
      width: 22px;
      height: 22px;
    }

    .fillkit-inline-fill-btn.visible {
      opacity: 0.75;
      transform: scale(1);
      pointer-events: auto;
    }

    .fillkit-inline-fill-btn:hover {
      opacity: 1;
      transform: scale(1.15);
    }

    .fillkit-inline-fill-btn:active {
      transform: scale(0.95);
    }

    .fillkit-inline-fill-btn:focus-visible {
      outline: 2px solid var(--fk-primary);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .fillkit-inline-fill-btn {
        transition-duration: 0.01ms !important;
      }
    }

  `;
}
