import React, { useState, useEffect } from 'react';
import { authAPI } from './api';
import HomePage from './HomePage';
import OwnerDashboard from './OwnerDashboard';
import ChatBotWidget from './ChatBotWidget';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'login' | 'register' | 'profile' | 'owner-dashboard'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Registration state
  const [regStep, setRegStep] = useState(1); // 1 = form, 2 = OTP verification
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'BUYER',
  });
  const [otp, setOtp] = useState('');

  // Login state
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter OTP and new passwords
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    otp: '',
    new_password: '',
    confirm_password: '',
  });

  // Profile edit state
  const [profileData, setProfileData] = useState({
    phone_number: '',
    bio: '',
    city: '',
    address: '',
  });

  // Check auth state on mount
  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      fetchProfile();
    }
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 6000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await authAPI.getProfile();
      setUser(data);
      setProfileData({
        phone_number: data.phone_number || '',
        bio: data.bio || '',
        city: data.city || '',
        address: data.address || '',
      });
      // Navigate Seller to Owner Dashboard, otherwise Profile
      const isSeller = data.role === 'SELLER' || data.role === 'ADMIN';
      setActiveTab(isSeller ? 'owner-dashboard' : 'profile');
    } catch (err) {
      console.error(err);
      authAPI.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit Register Form
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.register(regData);
      showAlert('success', res.message || 'OTP sent! Please check your email.');
      setRegStep(2);
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        JSON.stringify(err.response?.data) ||
        'Registration failed. Please check your details.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.verifyEmail(regData.email, otp);
      showAlert('success', res.message || 'Account verified and created successfully!');
      setUser(res.user);
      const isSeller = res.user?.role === 'SELLER' || res.user?.role === 'ADMIN';
      setActiveTab(isSeller ? 'owner-dashboard' : 'profile');
      setRegStep(1);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid or expired OTP.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await authAPI.resendOTP(regData.email);
      showAlert('success', res.message || 'A new OTP has been sent to your email.');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to resend OTP.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.login(loginData.username, loginData.password);
      showAlert('success', 'Logged in successfully!');
      await fetchProfile();
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Invalid username or password.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request Password Reset OTP
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      showAlert('success', res.message || 'Reset code sent! Check your email inbox.');
      setForgotStep(2);
    } catch (err) {
      const errMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.error ||
        'Failed to process password reset request.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP & Set New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (resetData.new_password !== resetData.confirm_password) {
      showAlert('error', 'New password and confirm password do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        email: forgotEmail,
        otp: resetData.otp,
        new_password: resetData.new_password,
        confirm_password: resetData.confirm_password,
      });
      showAlert('success', res.message || 'Password reset successfully! Please sign in.');
      setForgotStep(1);
      setForgotEmail('');
      setResetData({ otp: '', new_password: '', confirm_password: '' });
      setActiveTab('login');
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.confirm_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        'Failed to reset password. Please check your verification code.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await authAPI.updateProfile(profileData);
      setUser(updated);
      showAlert('success', 'Profile updated successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update profile.';
      showAlert('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setActiveTab('home');
    showAlert('info', 'Logged out successfully.');
  };

  // If activeTab is home, render the Public Home Page
  if (activeTab === 'home') {
    return (
      <>
        <HomePage
          user={user}
          onNavigateAuth={(tab) => setActiveTab(tab)}
          onNavigateDashboard={(tab) => setActiveTab(tab)}
          onLogout={handleLogout}
        />
        <ChatBotWidget user={user} />
      </>
    );
  }

  // If user is Seller and on owner-dashboard, render full-featured Owner Dashboard
  if (user && activeTab === 'owner-dashboard') {
    return (
      <div className="owner-app-container">
        <div className="top-quick-bar">
          <span className="quick-welcome">
            👋 Welcome, <strong>{user.first_name || user.username}</strong> &bull; Role: <span className="badge role-badge">{user.role}</span>
          </span>
          <div className="top-quick-links">
            <button
              className="quick-nav-btn"
              onClick={() => setActiveTab('home')}
            >
              🏡 Home Page
            </button>
            <button
              className="quick-nav-btn active"
              onClick={() => setActiveTab('owner-dashboard')}
            >
              🏢 Owner Dashboard
            </button>
            <button
              className="quick-nav-btn"
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile & Account
            </button>
            <button className="quick-nav-btn btn-logout-quick" onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </div>
        <OwnerDashboard user={user} onLogout={handleLogout} />
        <ChatBotWidget user={user} />
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="container">
        {/* Back to Home Button */}
        <div className="back-home-bar">
          <button className="back-home-btn" onClick={() => setActiveTab('home')}>
            &larr; Back to Home Page
          </button>
        </div>

        <header className="header">
          <h1>HomeQuest Real Estate</h1>
          <div className="auth-badge">
            {user ? (
              <span className="badge logged-in">
                Logged in as: <strong>{user.username}</strong> ({user.role})
              </span>
            ) : (
              <span className="badge not-logged-in">Not Logged In</span>
            )}
          </div>
        </header>

        {alert.message && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        <nav className="tab-nav">
          {!user && (
            <>
              <button
                className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button
                className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register (with Email OTP)
              </button>
            </>
          )}
          {user && (
            <>
              <button
                className="tab-btn"
                onClick={() => setActiveTab('home')}
              >
                🏡 Home
              </button>
              {(user.role === 'SELLER' || user.role === 'ADMIN') && (
                <button
                  className={`tab-btn ${activeTab === 'owner-dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('owner-dashboard')}
                >
                  🏢 Owner Dashboard
                </button>
              )}
              <button
                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                My Profile
              </button>
              <button className="tab-btn logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </nav>

      <main className="card">
        {/* LOGIN TAB */}
        {activeTab === 'login' && !user && (
          <section>
            <h2>User Login</h2>
            <p className="subtitle">Sign in to your account with JWT</p>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <div className="label-with-action">
                  <label>Password</label>
                  <button
                    type="button"
                    className="forgot-link-btn"
                    onClick={() => {
                      setForgotStep(1);
                      setActiveTab('forgot-password');
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          </section>
        )}

        {/* FORGOT PASSWORD TAB */}
        {activeTab === 'forgot-password' && !user && (
          <section className="forgot-password-card">
            {forgotStep === 1 ? (
              <>
                <h2>Reset Your Password</h2>
                <p className="subtitle">
                  Enter your registered email address. We will send you a 6-digit OTP code to verify and reset your password.
                </p>
                <form onSubmit={handleForgotPasswordSubmit}>
                  <div className="form-group">
                    <label>Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending Reset Code...' : 'Send 6-Digit Reset Code'}
                  </button>

                  <div className="auth-back-action">
                    <button
                      type="button"
                      className="link-btn-back"
                      onClick={() => setActiveTab('login')}
                    >
                      &larr; Remember your password? Back to Login
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2>Set New Password</h2>
                <p className="subtitle">
                  Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong> and enter your new password.
                </p>
                <form onSubmit={handleResetPasswordSubmit}>
                  <div className="form-group">
                    <label>6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      placeholder="123456"
                      value={resetData.otp}
                      onChange={(e) =>
                        setResetData({ ...resetData, otp: e.target.value })
                      }
                      className="otp-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password (min 8 characters)</label>
                    <input
                      type="password"
                      required
                      minLength="8"
                      placeholder="Enter new strong password"
                      value={resetData.new_password}
                      onChange={(e) =>
                        setResetData({ ...resetData, new_password: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength="8"
                      placeholder="Re-enter new password"
                      value={resetData.confirm_password}
                      onChange={(e) =>
                        setResetData({ ...resetData, confirm_password: e.target.value })
                      }
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password & Sign In'}
                  </button>

                  <div className="auth-step-actions">
                    <button
                      type="button"
                      className="link-btn-back"
                      onClick={() => setForgotStep(1)}
                    >
                      Change Email
                    </button>
                    <button
                      type="button"
                      className="link-btn-back"
                      onClick={() => setActiveTab('login')}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {/* REGISTER TAB */}
        {activeTab === 'register' && !user && (
          <section>
            {regStep === 1 ? (
              <>
                <h2>Create Account</h2>
                <p className="subtitle">
                  Step 1: Fill in your details. We will email a 6-digit OTP.
                </p>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        required
                        placeholder="johndoe"
                        value={regData.username}
                        onChange={(e) =>
                          setRegData({ ...regData, username: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={regData.email}
                        onChange={(e) =>
                          setRegData({ ...regData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 8 characters"
                      value={regData.password}
                      onChange={(e) =>
                        setRegData({ ...regData, password: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        value={regData.first_name}
                        onChange={(e) =>
                          setRegData({ ...regData, first_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={regData.last_name}
                        onChange={(e) =>
                          setRegData({ ...regData, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1234567890"
                        value={regData.phone_number}
                        onChange={(e) =>
                          setRegData({ ...regData, phone_number: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={regData.role}
                        onChange={(e) =>
                          setRegData({ ...regData, role: e.target.value })
                        }
                      >
                        <option value="BUYER">BUYER</option>
                        <option value="SELLER">SELLER</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending Verification Code...' : 'Send OTP to Email'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>Verify 6-Digit OTP</h2>
                <p className="subtitle">
                  Step 2: Enter the 6-digit verification code sent to{' '}
                  <strong>{regData.email}</strong>
                </p>
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <label>6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength="6"
                      required
                      placeholder="123456"
                      className="otp-input"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP & Complete Registration'}
                  </button>

                  <div className="otp-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleResendOtp}
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setRegStep(1)}
                    >
                      Back to edit details
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {/* PROFILE TAB (PROTECTED) */}
        {activeTab === 'profile' && user && (
          <section>
            <h2>User Profile (Protected)</h2>
            <p className="subtitle">Data fetched securely via JWT Bearer Token</p>

            <div className="profile-card">
              <div className="profile-item">
                <span className="label">Username:</span>
                <span className="value">{user.username}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email:</span>
                <span className="value">{user.email}</span>
              </div>
              <div className="profile-item">
                <span className="label">Role:</span>
                <span className="value badge role-badge">{user.role}</span>
              </div>
              <div className="profile-item">
                <span className="label">Status:</span>
                <span className="value">
                  {user.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>

            <hr className="divider" />

            <h3>Update Profile</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone_number}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone_number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) =>
                      setProfileData({ ...profileData, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) =>
                    setProfileData({ ...profileData, address: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  rows="3"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </section>
        )}
      </main>
      <ChatBotWidget user={user} />
    </div>
  </div>
  );
}

export default App;
