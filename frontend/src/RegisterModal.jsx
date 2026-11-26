import React, { useState } from 'react';
import './RegisterModal.css';

export default function RegisterModal({
  isOpen = true,
  onClose,
  regStep = 1,
  setRegStep,
  regData,
  setRegData,
  otp,
  setOtp,
  onSubmit,
  onVerifyOtp,
  onResendOtp,
  loading,
  alert,
  onNavigateLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="hq-reg-modal-overlay" onClick={onClose}>
      <div
        className="hq-reg-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════
            LEFT PANEL: AI-POWERED REAL ESTATE INTELLIGENCE CONSOLE
            ══════════════════════════════════════════════════════════════════ */}
        <div className="hq-reg-left-panel">
          {/* Top Brand & Live Uptime */}
          <div className="hq-reg-left-top">
            <div className="hq-reg-brand-group">
              <div className="hq-reg-logo-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div className="hq-reg-brand-text">
                <span className="hq-reg-brand-title">
                  HomeQuest <span>AI</span>
                </span>
                <span className="hq-reg-brand-sub">
                  Find the right home, the smart way.
                </span>
              </div>
            </div>

            <div className="hq-reg-uptime-badge">
              <span className="hq-reg-pulse-dot" />
              <span>ALL SYSTEMS LIVE · 99.9% UPTIME</span>
            </div>
          </div>

          {/* Hero Headline & Subtext */}
          <div className="hq-reg-hero-section">
            <h1 className="hq-reg-hero-title">
              AI-Powered Real Estate
              <br />
              Intelligence & Management
              <br />
              Platform
            </h1>
            <p className="hq-reg-hero-desc">
              Centralized command console for property valuation fairness, automated deed
              verification, and real-time site audit queues.
            </p>
          </div>

          {/* Real Estate AI Cards Visual Display */}
          <div className="hq-reg-cards-grid">
            {/* Card 1: Main Villa Valuation Card */}
            <div className="hq-reg-card-villa">
              <div
                className="hq-reg-card-villa-banner"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80")',
                }}
              >
                <span className="hq-reg-card-badge-ai">
                  ● PROPERTY VALUATION · AI Verified
                </span>
              </div>
              <div className="hq-reg-card-villa-footer">
                <div>
                  <div className="hq-reg-card-villa-title">
                    Aluva Riverside Enclave · 4 BHK Luxury Villa
                  </div>
                  <div className="hq-reg-card-villa-price-row">
                    <span className="hq-reg-card-villa-price">₹85.4 Lakhs</span>
                    <span className="hq-reg-card-villa-match">94% Fair Score Match</span>
                  </div>
                </div>
                <div className="hq-reg-card-tier-tag">Tier-1 Verified</div>
              </div>
            </div>

            {/* Split Row for Land Analysis & Valuation Fairness */}
            <div className="hq-reg-card-row-bottom">
              {/* Card 2: Land Analysis */}
              <div className="hq-reg-card-land">
                <div>
                  <div className="hq-reg-card-land-top">
                    <span className="hq-reg-card-land-badge">🌿 LAND ANALYSIS</span>
                  </div>
                  <div
                    className="hq-reg-land-image-preview"
                    style={{
                      backgroundImage:
                        'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80")',
                    }}
                  />
                  <div className="hq-reg-land-stat-bold">
                    7.25 Cents Purayidam <span>Clear</span>
                  </div>
                  <div className="hq-reg-land-stat-sub">
                    Cadastral Boundary Geo-Locked
                  </div>
                </div>
              </div>

              {/* Card 3: Valuation & Fairness */}
              <div className="hq-reg-card-valuation">
                <div>
                  <div className="hq-reg-val-header">
                    <div className="hq-reg-val-header-left">
                      <div className="hq-reg-ai-mini-icon">AI</div>
                      <div className="hq-reg-val-titles">
                        <span className="hq-reg-val-main-title">Valuation & Fairness</span>
                        <span className="hq-reg-val-sub-title">32 Localized comps</span>
                      </div>
                    </div>
                    <span className="hq-reg-active-sync-pill">Active</span>
                  </div>

                  <div className="hq-reg-val-price-section">
                    <div className="hq-reg-val-price-label">Estimated Fair Price</div>
                    <div className="hq-reg-val-price-num">
                      ₹4,150 <span>/sq.ft</span>
                    </div>
                    <div className="hq-reg-val-confidence">
                      ✓ 94% High Confidence Match
                    </div>
                  </div>
                </div>

                <div className="hq-reg-val-market-insights">
                  ● MARKET INSIGHTS +3.2% vs Q3 Median
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="hq-reg-left-footer">
            <span>© 2025 HomeQuest AI Technologies Inc. All rights reserved.</span>
            <span>🛡️ 256-bit AES Document Vault · v2.4.8 Enterprise</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT PANEL: REGISTRATION / VERIFICATION FORM
            ══════════════════════════════════════════════════════════════════ */}
        <div className="hq-reg-right-panel">
          {/* Top Actions: Partner Portal & Dismiss Button */}
          <div className="hq-reg-right-top">
            <div className="hq-reg-partner-portal-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Partner Portal</span>
            </div>

            {onClose && (
              <button
                type="button"
                className="hq-reg-modal-close-btn"
                onClick={onClose}
                title="Close and return to Home"
              >
                ✕
              </button>
            )}
          </div>

          {/* Center Form Section */}
          <div className="hq-reg-form-wrapper">
            {regStep === 1 ? (
              <>
                <h2 className="hq-reg-heading">Create your account</h2>
                <p className="hq-reg-subheading">
                  Step 1 of 2: Fill in your details. We will email a 6-digit OTP.
                </p>

                {alert?.message && (
                  <div className={`hq-reg-form-alert ${alert.type || 'error'}`}>
                    <span>{alert.type === 'error' ? '⚠️' : '✓'}</span>
                    <span>{alert.message}</span>
                  </div>
                )}

                <form onSubmit={onSubmit}>
                  {/* Grid: Username & Email */}
                  <div className="hq-reg-form-grid-2">
                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">Username</label>
                      <div className="hq-reg-input-container">
                        <span className="hq-reg-input-icon-left">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="johndoe"
                          value={regData.username}
                          onChange={(e) =>
                            setRegData({ ...regData, username: e.target.value })
                          }
                          className="hq-reg-input-field"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">Email Address</label>
                      <div className="hq-reg-input-container">
                        <span className="hq-reg-input-icon-left">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                            />
                          </svg>
                        </span>
                        <input
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={regData.email}
                          onChange={(e) =>
                            setRegData({ ...regData, email: e.target.value })
                          }
                          className="hq-reg-input-field"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="hq-reg-form-group">
                    <label className="hq-reg-form-label">Password</label>
                    <div className="hq-reg-input-container">
                      <span className="hq-reg-input-icon-left">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                            strokeWidth="2"
                          />
                          <path
                            d="M7 11V7a5 5 0 0110 0v4"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Minimum 8 characters"
                        value={regData.password}
                        onChange={(e) =>
                          setRegData({ ...regData, password: e.target.value })
                        }
                        className="hq-reg-input-field"
                      />
                      <button
                        type="button"
                        className="hq-reg-toggle-pw-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Grid: First Name & Last Name */}
                  <div className="hq-reg-form-grid-2">
                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        value={regData.first_name}
                        onChange={(e) =>
                          setRegData({ ...regData, first_name: e.target.value })
                        }
                        className="hq-reg-input-field no-icon"
                      />
                    </div>
                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={regData.last_name}
                        onChange={(e) =>
                          setRegData({ ...regData, last_name: e.target.value })
                        }
                        className="hq-reg-input-field no-icon"
                      />
                    </div>
                  </div>

                  {/* Grid: Phone Number & Role */}
                  <div className="hq-reg-form-grid-2">
                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={regData.phone_number}
                        onChange={(e) =>
                          setRegData({ ...regData, phone_number: e.target.value })
                        }
                        className="hq-reg-input-field no-icon"
                      />
                    </div>
                    <div className="hq-reg-form-group">
                      <label className="hq-reg-form-label">Account Role</label>
                      <select
                        value={regData.role}
                        onChange={(e) =>
                          setRegData({ ...regData, role: e.target.value })
                        }
                        className="hq-reg-select-field"
                      >
                        <option value="BUYER">BUYER (Find / Buy Homes)</option>
                        <option value="SELLER">SELLER (Owner / Agent)</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="hq-reg-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="hq-reg-spinner" />
                    ) : (
                      <>
                        <span>Send OTP to Email</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.2"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="hq-reg-heading">Verify 6-Digit OTP</h2>
                <p className="hq-reg-subheading">
                  Step 2 of 2: Enter the 6-digit verification code sent to{' '}
                  <strong style={{ color: '#059669' }}>{regData.email}</strong>
                </p>

                {alert?.message && (
                  <div className={`hq-reg-form-alert ${alert.type || 'error'}`}>
                    <span>{alert.type === 'error' ? '⚠️' : '✓'}</span>
                    <span>{alert.message}</span>
                  </div>
                )}

                <form onSubmit={onVerifyOtp}>
                  <div className="hq-reg-form-group" style={{ margin: '1.5rem 0' }}>
                    <input
                      type="text"
                      maxLength="6"
                      required
                      placeholder="••••••"
                      className="hq-reg-otp-input"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="hq-reg-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="hq-reg-spinner" />
                    ) : (
                      <>
                        <span>Verify OTP & Complete Registration</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.2"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </>
                    )}
                  </button>

                  <div className="hq-reg-otp-actions">
                    <button
                      type="button"
                      className="hq-reg-secondary-btn"
                      onClick={onResendOtp}
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      className="hq-reg-back-btn"
                      onClick={() => setRegStep(1)}
                    >
                      ← Back to edit details
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Right Bottom Footer Link */}
          <div className="hq-reg-right-bottom">
            <span>Already have an account?</span>
            {onNavigateLogin && (
              <button
                type="button"
                className="hq-reg-signin-link"
                onClick={onNavigateLogin}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
