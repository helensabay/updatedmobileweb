import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';

// --------------------
// Constants
// --------------------
export const ACCESS_TOKEN_KEY = '@sanaol/auth/accessToken';
export const REFRESH_TOKEN_KEY = '@sanaol/auth/refreshToken';
export const USER_CACHE_KEY = '@sanaol/auth/user';

// Separate base URLs
export const BASE_URL_ORDERS = `${BASE_URL}/orders`; // ✅ added

export const BASE_URLFEEDBACK = `http://192.168.1.6:8000`;
export const BASE_URL = `http://192.168.1.6:8000/api`; // main API
export const BASE_URL_MENU = `http://192.168.1.6:8000/menu`; // menu endpoints

// --------------------
// Axios instances
// --------------------
const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' },
});

const authlessApi = axios.create({
  baseURL: BASE_URL,
  timeout: API_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' },
});

// --------------------
// Tokens
// --------------------
export async function storeTokens({ accessToken, refreshToken }) {
  const entries = [];
  if (accessToken) entries.push([ACCESS_TOKEN_KEY, accessToken]);
  if (refreshToken) entries.push([REFRESH_TOKEN_KEY, refreshToken]);
  if (entries.length) await AsyncStorage.multiSet(entries);
}

export async function clearStoredTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_CACHE_KEY]);
}

// --------------------
// Auth
// --------------------
export const sendFeedback = async ({ category, message }) => {
  try {
    const response = await axios.post(`${BASE_URLFEEDBACK}/api/feedback/`, { category, message });
    return response.data;
  } catch (error) {
    console.error('Error sending feedback:', error.response || error.message);
    throw error;
  }
};

export const login = async ({ email, password }) => {
  try {
    const response = await fetch(`${BASE_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.detail || data.non_field_errors?.[0] || 'Incorrect email or password';
      return { success: false, message };
    }

    // Store tokens
    if (data.access && data.refresh) {
      await storeTokens({ accessToken: data.access, refreshToken: data.refresh });
    }

    return { success: true, data };
  } catch (error) {
    console.error('API login error:', error);
    return { success: false, message: 'Network or server error' };
  }
};

// --------------------
// Menu endpoints
// --------------------
export const fetchMenuItems = async (category = '') => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await axios.get(`${BASE_URL_MENU}/menu-items/`, {
      params: category ? { category } : undefined,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    // Log for debugging
    console.log('Menu items response:', response.data);
    return response.data || [];
  } catch (error) {
    console.error('fetchMenuItems error:', error.response?.data || error.message);
    return [];
  }
};

// Optional: Fetch menu items by category
export async function fetchMenuItemsByCategory(category) {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const url = `${BASE_URL_MENU}/menu-items/?category=${category}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchMenuItemsByCategory error:', err);
    return [];
  }
};
export const fetchNotifications = async () => {
  try {
    // Get the stored access token
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

    if (!token) {
      console.warn('No access token found. User is not logged in.');
      return []; // return empty array if user is not authenticated
    }

    // Send request with token
    const response = await axios.get(`${BASE_URL}/notifications/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data || [];
  } catch (error) {
    console.error(
      'fetchNotifications error:',
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      console.warn('User token invalid or expired. Returning empty notifications.');
    }

    return [];
  }
};

// --------------------
// Register
// --------------------
export const registerAccount = async (data) => {
  try {
    const response = await fetch(`${BASE_URL}/accounts/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.status === 201) return { success: true, message: result.message };
    if (response.status === 400) return { success: false, errors: result.errors || {} };
    return { success: false, message: result.message || 'Registration failed' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Network error' };
  }
};

// --------------------
// Current user info
// --------------------
export async function getCurrentUser() {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) throw new Error('No token stored');

    const response = await api.get('/users/me/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.warn('⚠️ Failed to fetch user:', error.response?.data || error.message);
    return null;
  }
}

// --------------------
// Cart
// --------------------
export const addItemToCart = async (itemId, quantity = 1) => {
  try {
    const token = await AsyncStorage.getItem('@sanaol/auth/accessToken');
    const response = await axios.post(
      `${BASE_URL}/cart/`,
      { itemId, quantity },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error adding item to cart:', err);
    throw err;
  }
};

export const updateCartItem = async (itemId, quantity) => {
  const response = await api.put(`/cart/update/${itemId}/`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId) => {
  const response = await api.delete(`/cart/remove/${itemId}/`);
  return response.data;
};

// --------------------
// Global interceptor for logging
// --------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🌐 API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
export const fetchOrderStatus = async (orderId) => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await axios.get(
      `${BASE_URL_ORDERS}/orders/${orderId}/status/`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    return response.data.status_index; // 0, 1, 2, 3...
  } catch (error) {
    console.error("Fetch order status error:", error.response?.data || error);
    throw error;
  }
};
export const getGcashLink = async (orderId, total) => {
  try {
    const res = await axios.post(`${API_URL}${orderId}/gcash_link/`, { total });
    return res.data;
  } catch (err) {
    console.error('Error fetching GCash link:', err);
    throw err;
  }
};

// ✅ Confirm payment
export const confirmPayment = async (orderId, method) => {
  try {
    const res = await axios.post(`${API_URL}${orderId}/confirm_payment/`, { method });
    return res.data;
  } catch (err) {
    console.error('Error confirming payment:', err);
    throw err;
  }
};
export const createOrder = async (type, total, pickup_time, items) => {
  const token = await AsyncStorage.getItem('access_token');
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {}; // no header if not logged in

  try {
    const res = await axios.post(
      `${BASE_URL}/create_order/`,
      { type, total, pickup_time, items },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error('Create order error:', err.response?.data || err.message);
    throw err;
  }
};

// Get order status
export const getOrderStatus = async (orderId, token) => {
  try {
    const response = await axios.get(`${BASE_URL_ORDERS}/${orderId}/status/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data;
  } catch (error) {
    console.log('Get order status error:', error.message);
    throw error;
  }
};

export default api;
