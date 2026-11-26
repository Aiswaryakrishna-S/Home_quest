import React, { useState } from 'react';
import './LoginModal.css';

export default function LoginModal({
  isOpen = true,
  onClose,
  loginData,
  setLoginData,
  onSubmit,
  loading,
  alert,
  onForgotPassword,
  onRequestAccess,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="hq-login-page-root" onClick={onClose}>
      <main
        className="hq-login-split-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════
            LEFT SHOWCASE PANEL (DEEP BURGUNDY)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="hq-burgundy-showcase-panel">
          {/* Top Header: Brand Logo & System Status */}
          <header className="hq-showcase-header">
            {/* Brand Identity */}
            <div className="hq-showcase-brand">
              <div className="hq-showcase-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="hq-showcase-brand-title">
                  HomeQuest <span className="hq-brand-ai">AI</span>
                </div>
                <p className="hq-showcase-brand-sub">Find the right home, the smart way.</p>
              </div>
            </div>

            {/* System Status Pill */}
            <div className="hq-showcase-status-badge">
              <span className="hq-status-dot" />
              <span>ALL SYSTEMS LIVE • 99.9% UPTIME</span>
            </div>
          </header>

          {/* Hero Copy & Feature Cards */}
          <div className="hq-showcase-center-body">
            {/* Hero Heading & Subheading */}
            <div className="hq-showcase-hero-copy">
              <h1 className="hq-showcase-h1">
                AI-Powered Real Estate Intelligence &amp; Management Platform
              </h1>
              <p className="hq-showcase-desc">
                Centralized command console for property valuation fairness, automated deed
                verification, and real-time site audit queues.
              </p>
            </div>

            {/* Featured Property Valuation Card */}
            <article className="hq-showcase-villa-card">
              <div className="hq-villa-img-wrap">
                <img
                  alt="Aluva Riverside Enclave 4 BHK Luxury Villa"
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
                  className="hq-villa-img"
                />
                <div className="hq-villa-gradient-overlay" />
                <div className="hq-villa-tag">
                  <span className="hq-villa-dot" />
                  <span>PROPERTY VALUATION • AI Verified</span>
                </div>
              </div>

              <div className="hq-villa-footer">
                <div className="hq-villa-meta-left">
                  <h2 className="hq-villa-title">
                    Aluva Riverside Enclave • 4 BHK Luxury Villa
                  </h2>
                  <div className="hq-villa-price-row">
                    <span className="hq-villa-price">₹85.4 Lakhs</span>
                    <span className="hq-villa-fair-score">94% Fair Score Match</span>
                  </div>
                </div>
                <span className="hq-villa-tier-badge">Tier-1 Verified</span>
              </div>
            </article>

            {/* Bottom Analytics Mini-Cards */}
            <div className="hq-showcase-bottom-cards">
              {/* Land Analysis Card */}
              <div className="hq-land-analysis-card">
                <div className="hq-land-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>LAND ANALYSIS</span>
                </div>
              </div>

              {/* Valuation & Fairness Card */}
              <div className="hq-fairness-card">
                <div className="hq-fairness-left">
                  <div className="hq-fairness-ai-icon">AI</div>
                  <div>
                    <div className="hq-fairness-title">Valuation &amp; Fairness</div>
                    <div className="hq-fairness-sub">32 Localized comps synced</div>
                  </div>
                </div>
                <span className="hq-fairness-sync-tag">Active Sync</span>
              </div>
            </div>
          </div>

          <div className="hq-showcase-spacer" />
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT LOGIN PANEL (CLEAN WHITE EDITORIAL)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="hq-white-login-panel">
          {/* Top-Right Utility Controls */}
          <div className="hq-login-top-bar">
            <button
              type="button"
              className="hq-partner-portal-btn"
              onClick={() => {}}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Partner Portal</span>
            </button>

            {onClose && (
              <button
                type="button"
                aria-label="Close"
                className="hq-close-circle-btn"
                onClick={onClose}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Centered Login Form Container */}
          <div className="hq-login-form-center">
            <div className="hq-login-header-text">
              <h2 className="hq-login-title">Welcome back</h2>
              <p className="hq-login-sub">
                Sign in to HomeQuest AI Operations &amp; Verification Console.
              </p>
            </div>

            {/* Alert Box */}
            {alert?.message && (
              <div className={`hq-login-alert-banner alert-${alert.type || 'error'}`}>
                {alert.message}
              </div>
            )}

            <form className="hq-login-form-element" onSubmit={onSubmit}>
              {/* Work Email / Username Field */}
              <div className="hq-input-group">
                <label className="hq-field-label" htmlFor="work-email">
                  Work Email or Username
                </label>
                <div className="hq-field-wrapper hq-field-focused-burgundy">
                  <div className="hq-field-icon-left">
                    <span className="hq-at-symbol">@</span>
                  </div>
                  <input
                    id="work-email"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Username or registered email address"
                    value={loginData.username}
                    onChange={(e) =>
                      setLoginData({ ...loginData, username: e.target.value })
                    }
                    className="hq-clean-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="hq-input-group">
                <div className="hq-password-label-row">
                  <label className="hq-field-label" htmlFor="password">
                    Password
                  </label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      className="hq-forgot-pw-link"
                      onClick={onForgotPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="hq-field-wrapper">
                  <div className="hq-field-icon-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    className="hq-clean-input hq-clean-input-pw"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    className="hq-field-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remember Device Checkbox */}
              <div className="hq-remember-row">
                <input
                  id="remember-device"
                  name="remember-device"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hq-remember-checkbox"
                />
                <label htmlFor="remember-device" className="hq-remember-label">
                  Remember this device for 30 days
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="hq-primary-submit-btn"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Operations Portal</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Registration Link Footer */}
            <p className="hq-register-footer">
              Don't have an account?{' '}
              {onRequestAccess && (
                <button
                  type="button"
                  className="hq-register-link-btn"
                  onClick={onRequestAccess}
                >
                  Register new account
                </button>
              )}
            </p>
          </div>

          <div className="hq-login-spacer" />
        </section>
      </main>
    </div>
  );
}
