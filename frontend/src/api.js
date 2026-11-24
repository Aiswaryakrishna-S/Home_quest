import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:8000';

// Curated high-resolution Kerala architecture sample photos by category
export const CATEGORY_SAMPLE_IMAGES = {
  BUILDING: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
  APARTMENT: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
  RENTAL: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
  PLOT: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
  REAL_ESTATE: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
};

// Preset gallery choices for sellers/owners to pick from
export const PRESET_PROPERTY_IMAGES = [
  { label: 'Kerala Luxury Villa', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80', type: 'BUILDING' },
  { label: 'Modern Waterfront Home', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', type: 'BUILDING' },
  { label: 'High-Rise City Apartment', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80', type: 'APARTMENT' },
  { label: 'Modern Skyline Condo', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80', type: 'APARTMENT' },
  { label: 'Green Residential Land', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80', type: 'PLOT' },
  { label: 'Furnished Rental Villa', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80', type: 'RENTAL' },
  { label: 'Commercial Business Hub', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80', type: 'REAL_ESTATE' },
];

/**
 * Resolves property image URL to an absolute working URL:
 * Handles:
 * - relative Django media path (e.g. /media/property_images/xxx.jpg)
 * - absolute URLs
 * - blob / data URLs from local file upload preview
 * - category-specific fallback if image is missing
 */
export const getPropertyImageUrl = (propertyOrUrl, propertyType = null) => {
  if (!propertyOrUrl) {
    const type = (propertyType || '').toUpperCase();
    return CATEGORY_SAMPLE_IMAGES[type] || CATEGORY_SAMPLE_IMAGES.DEFAULT;
  }

  let imgUrl = typeof propertyOrUrl === 'string' ? propertyOrUrl : propertyOrUrl.image;
  const pType = (propertyType || propertyOrUrl.property_type || '').toUpperCase();

  if (!imgUrl) {
    return CATEGORY_SAMPLE_IMAGES[pType] || CATEGORY_SAMPLE_IMAGES.DEFAULT;
  }

  if (
    imgUrl.startsWith('http://') ||
    imgUrl.startsWith('https://') ||
    imgUrl.startsWith('blob:') ||
    imgUrl.startsWith('data:')
  ) {
    return imgUrl;
  }

  // Prepend backend URL for relative media paths
  const cleanPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
  return `${API_BASE_URL}${cleanPath}`;
};

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

  // Forgot Password: Request 6-digit Reset OTP
  forgotPassword: async (email) => {
    const response = await api.post('/api/auth/forgot-password/', { email });
    return response.data;
  },

  // Reset Password: Submit OTP and new password
  resetPassword: async ({ email, otp, new_password, confirm_password }) => {
    const response = await api.post('/api/auth/reset-password/', {
      email,
      otp,
      new_password,
      confirm_password,
    });
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

// Properties API helper methods
export const propertyAPI = {
  // Fetch properties (mine=true fetches only properties owned by current seller)
  getMyProperties: async () => {
    const response = await api.get('/api/properties/?mine=true');
    return response.data;
  },

  getAllProperties: async (params = {}) => {
    const response = await api.get('/api/properties/', { params });
    return response.data;
  },

  // Fetch properties ordered by proximity to GPS coordinates
  getNearbyProperties: async (lat, lng, radius = 50) => {
    const response = await api.get('/api/properties/nearby/', {
      params: { lat, lng, radius },
    });
    return response.data;
  },

  getProperty: async (id) => {
    const response = await api.get(`/api/properties/${id}/`);
    return response.data;
  },

  createProperty: async (formData) => {
    const response = await api.post('/api/properties/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateProperty: async (id, formData) => {
    const response = await api.patch(`/api/properties/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteProperty: async (id) => {
    const response = await api.delete(`/api/properties/${id}/`);
    return response.data;
  },

  getPropertyEnquiries: async (id) => {
    const response = await api.get(`/api/properties/${id}/enquiries/`);
    return response.data;
  },

  // AI ML Property Price Valuation & Increment Engine
  predictPrice: async (payload) => {
    const response = await api.post('/api/properties/predict_price/', payload);
    return response.data;
  },

  // AI ML Personal Property Recommendations (Content-based vector profiling)
  getRecommendations: async (limit = 6) => {
    const response = await api.get('/api/properties/recommendations/', {
      params: { limit },
    });
    return response.data;
  },
};

// Enquiries API helper methods
export const enquiryAPI = {
  getMyEnquiries: async (params = {}) => {
    const response = await api.get('/api/properties/enquiries/', { params });
    return response.data;
  },

  updateEnquiryStatus: async (id, status) => {
    const response = await api.patch(`/api/properties/enquiries/${id}/`, { status });
    return response.data;
  },

  deleteEnquiry: async (id) => {
    const response = await api.delete(`/api/properties/enquiries/${id}/`);
    return response.data;
  },

  createEnquiry: async (enquiryData) => {
    const response = await api.post('/api/properties/enquiries/', enquiryData);
    return response.data;
  },
};

// AI RAG Chatbot API helper methods
export const chatbotAPI = {
  sendMessage: async (message, history = []) => {
    const response = await api.post('/api/chatbot/query/', { message, history });
    return response.data;
  },

  getSuggestions: async () => {
    const response = await api.get('/api/chatbot/suggestions/');
    return response.data;
  },

  draftInquiry: async (payload) => {
    const response = await api.post('/api/chatbot/draft_inquiry/', payload);
    return response.data;
  },

  autoSendInquiry: async (payload) => {
    const response = await api.post('/api/chatbot/auto_send_inquiry/', payload);
    return response.data;
  },
};

// Property Purchases & Sale Agreement API methods
export const purchaseAPI = {
  createPurchase: async (payload) => {
    const response = await api.post('/api/properties/purchases/', payload);
    return response.data;
  },

  getMyPurchases: async (params = {}) => {
    const response = await api.get('/api/properties/purchases/', { params });
    return response.data;
  },

  getPurchase: async (id) => {
    const response = await api.get(`/api/properties/purchases/${id}/`);
    return response.data;
  },

  signPurchase: async (id, role = 'BUYER') => {
    const response = await api.post(`/api/properties/purchases/${id}/sign/`, { role });
    return response.data;
  },
};

// User History API (Active ONLY after user login)
export const historyAPI = {
  recordView: async (propertyId) => {
    if (!authAPI.isAuthenticated()) return null;
    try {
      const response = await api.post('/api/auth/history/view/', { property_id: propertyId });
      return response.data;
    } catch {
      return null;
    }
  },

  recordSearch: async ({ query, city, propertyType, lat, lng, resultsCount }) => {
    if (!authAPI.isAuthenticated()) return null;
    if (!query && !city) return null;
    try {
      const response = await api.post('/api/auth/history/search/', {
        query: query || city,
        city: city || null,
        property_type: propertyType || 'ALL',
        latitude: lat ?? null,
        longitude: lng ?? null,
        results_count: resultsCount || 0,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  getHistory: async () => {
    if (!authAPI.isAuthenticated()) return { recent_properties: [], recent_searches: [] };
    const response = await api.get('/api/auth/history/');
    return response.data;
  },

  clearHistory: async (type = 'all') => {
    if (!authAPI.isAuthenticated()) return null;
    const response = await api.delete('/api/auth/history/', { data: { type } });
    return response.data;
  },

  deleteSearchItem: async (id) => {
    if (!authAPI.isAuthenticated()) return null;
    const response = await api.delete('/api/auth/history/', { data: { type: 'searches', id } });
    return response.data;
  },

  deleteViewItem: async (id) => {
    if (!authAPI.isAuthenticated()) return null;
    const response = await api.delete('/api/auth/history/', { data: { type: 'properties', id } });
    return response.data;
  },
};

// Tour & Visit Schedule Management API
export const tourAPI = {
  createTour: async (payload) => {
    const response = await api.post('/api/properties/tours/', payload);
    return response.data;
  },

  getMyTours: async (params = {}) => {
    const response = await api.get('/api/properties/tours/', { params });
    return response.data;
  },

  rescheduleTour: async (id, { new_date, new_time_slot, reason }) => {
    const response = await api.post(`/api/properties/tours/${id}/reschedule/`, {
      new_date,
      new_time_slot,
      reason,
    });
    return response.data;
  },

  updateTourStatus: async (id, status, notes = '') => {
    const response = await api.post(`/api/properties/tours/${id}/update_status/`, {
      status,
      notes,
    });
    return response.data;
  },

  updateChecklist: async (id, { role, item_key, checked }) => {
    const response = await api.patch(`/api/properties/tours/${id}/checklist/`, {
      role,
      item_key,
      checked,
    });
    return response.data;
  },
};

export default api;
