import React from 'react';
import './ForgotPasswordModal.css';

export default function ForgotPasswordModal({
  isOpen = true,
  onClose,
  forgotStep,
  setForgotStep,
  forgotEmail,
  setForgotEmail,
  resetData,
  setResetData,
  onSubmitEmail,
  onSubmitReset,
  loading,
  alert,
  onNavigateLogin,
}) {
  if (!isOpen) return null;

  return (
    <div className="hq-fp-modal-root" onClick={onClose}>
      <main
        className="hq-fp-split-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════
            LEFT SHOWCASE PANEL (DEEP BURGUNDY)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="hq-fp-showcase-panel">
          <header className="hq-fp-showcase-header">
            <div className="hq-fp-showcase-brand">
              <div className="hq-fp-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="hq-fp-brand-title">
                  HomeQuest <span className="hq-fp-brand-ai">AI</span>
                </div>
                <p className="hq-fp-brand-sub">Find the right home, the smart way.</p>
              </div>
            </div>

            <div className="hq-fp-status-badge">
              <span className="hq-fp-status-dot" />
              <span>SECURE RECOVERY • 256-BIT ENCRYPTION</span>
            </div>
          </header>

          <div className="hq-fp-center-body">
            <div className="hq-fp-hero-copy">
              <h1 className="hq-fp-h1">
                Account Recovery &amp; Security Console
              </h1>
              <p className="hq-fp-desc">
                Identity verification using multi-factor 6-digit cryptographic security tokens
                delivered to your registered agency work email.
              </p>
            </div>

            <div className="hq-fp-security-callout">
              <div className="hq-fp-sec-badge">ENCRYPTION ACTIVE</div>
              <h3 className="hq-fp-sec-title">Two-Step Verification Protocol</h3>
              <p className="hq-fp-sec-sub">
                1. Request 6-digit one-time passcode to verified email address.<br />
                2. Enter passcode and establish your new encrypted credentials.
              </p>
            </div>
          </div>

          <div className="hq-fp-footer-note">
            <span>HomeQuest AI Security Infrastructure</span>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT FORM PANEL (CLEAN WHITE)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="hq-fp-form-panel">
          <div className="hq-fp-top-bar">
            {onClose && (
              <button
                type="button"
                aria-label="Close"
                className="hq-fp-close-btn"
                onClick={onClose}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="hq-fp-form-center">
            {/* Step 1: Enter email */}
            {forgotStep === 1 ? (
              <>
                <div className="hq-fp-header-text">
                  <h2 className="hq-fp-title">Reset Your Password</h2>
                  <p className="hq-fp-sub">
                    Enter your registered email address. We will send you a 6-digit verification code.
                  </p>
                </div>

                {alert?.message && (
                  <div className={`hq-fp-alert alert-${alert.type || 'error'}`}>
                    {alert.message}
                  </div>
                )}

                <form className="hq-fp-form" onSubmit={onSubmitEmail}>
                  <div className="hq-fp-group">
                    <label className="hq-fp-label" htmlFor="fp-email">
                      Registered Email Address
                    </label>
                    <div className="hq-fp-input-wrap">
                      <div className="hq-fp-icon-left">
                        <span>@</span>
                      </div>
                      <input
                        id="fp-email"
                        type="email"
                        required
                        autoFocus
                        placeholder="e.g. name@homequest.ai or agency email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="hq-fp-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="hq-fp-submit-btn"
                  >
                    {loading ? 'Sending Verification Code...' : 'Send 6-Digit Reset Code'}
                  </button>

                  <div className="hq-fp-nav-row">
                    <button
                      type="button"
                      className="hq-fp-back-link"
                      onClick={onNavigateLogin}
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Step 2: Enter OTP & New Password */
              <>
                <div className="hq-fp-header-text">
                  <h2 className="hq-fp-title">Set New Password</h2>
                  <p className="hq-fp-sub">
                    Enter the 6-digit verification code sent to <strong>{forgotEmail}</strong> and enter your new password.
                  </p>
                </div>

                {alert?.message && (
                  <div className={`hq-fp-alert alert-${alert.type || 'error'}`}>
                    {alert.message}
                  </div>
                )}

                <form className="hq-fp-form" onSubmit={onSubmitReset}>
                  <div className="hq-fp-group">
                    <label className="hq-fp-label" htmlFor="reset-otp">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="reset-otp"
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      placeholder="123456"
                      value={resetData.otp}
                      onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                      className="hq-fp-input hq-fp-otp-input"
                    />
                  </div>

                  <div className="hq-fp-group">
                    <label className="hq-fp-label" htmlFor="new-pw">
                      New Password (min 8 characters)
                    </label>
                    <input
                      id="new-pw"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Enter new strong password"
                      value={resetData.new_password}
                      onChange={(e) =>
                        setResetData({ ...resetData, new_password: e.target.value })
                      }
                      className="hq-fp-input"
                    />
                  </div>

                  <div className="hq-fp-group">
                    <label className="hq-fp-label" htmlFor="confirm-pw">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-pw"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Re-enter new password"
                      value={resetData.confirm_password}
                      onChange={(e) =>
                        setResetData({ ...resetData, confirm_password: e.target.value })
                      }
                      className="hq-fp-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="hq-fp-submit-btn"
                  >
                    {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
                  </button>

                  <div className="hq-fp-actions-split">
                    <button
                      type="button"
                      className="hq-fp-link-btn"
                      onClick={() => setForgotStep(1)}
                    >
                      Change Email
                    </button>
                    <button
                      type="button"
                      className="hq-fp-link-btn"
                      onClick={onNavigateLogin}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
