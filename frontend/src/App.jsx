import React, { useState, useEffect } from 'react';
import { authAPI } from './api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'profile'
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
      setActiveTab('profile');
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
      setActiveTab('profile');
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
    setActiveTab('login');
    showAlert('info', 'Logged out successfully.');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Django + React Authentication</h1>
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
                <label>Password</label>
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
    </div>
  );
}

export default App;
