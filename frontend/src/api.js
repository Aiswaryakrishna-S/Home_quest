import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT access token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Automatically refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          if (res.data?.access) {
            localStorage.setItem('access_token', res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Token refresh failed or expired -> log user out
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.reload();
          return Promise.reject(refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API helper methods
export const authAPI = {
  // Step 1: Register (Sends 6-digit OTP to user's email)
  register: async (userData) => {
    const response = await api.post('/api/auth/register/', userData);
    return response.data;
  },

  // Step 2: Verify OTP & finalize registration
  verifyEmail: async (email, otp) => {
    const response = await api.post('/api/auth/verify-email/', { email, otp });
    if (response.data?.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access);
      localStorage.setItem('refresh_token', response.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Resend OTP
  resendOTP: async (email) => {
    const response = await api.post('/api/auth/resend-otp/', { email });
    return response.data;
  },

  // Login
  login: async (username, password) => {
    const response = await api.post('/api/auth/login/', { username, password });
    if (response.data?.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  // Get User Profile (Protected)
  getProfile: async () => {
    const response = await api.get('/api/auth/profile/');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  // Update User Profile (Protected)
  updateProfile: async (profileData) => {
    const response = await api.patch('/api/auth/profile/', profileData);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};

export default api;
