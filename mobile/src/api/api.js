 import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';

// --------------------
// Constants
// --------------------
export const ACCESS_TOKEN_KEY = '@sanaol/auth/accessToken';
export const REFRESH_TOKEN_KEY = '@sanaol/auth/refreshToken';
export const USER_CACHE_KEY = '@sanaol/auth/user';

// Base URLs
export const BASE_URL = `http://192.168.1.11:8000/api`;
export const BASE_URL_MENU = `http://192.168.1.11:8000/api/menu`;
export const BASE_URL_FEEDBACK = `http://192.168.1.11:8000`;
const API_BASE = `http://192.168.1.11:8000/api/accounts`;


// Helper to get token
async function getTokenHeader() {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}


// Refresh token function
export async function refreshAccessToken() {
  const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) throw new Error('No refresh token available');

  try {
    const res = await axios.post(`${API_BASE}/token/refresh/`, { refresh });
    const newAccess = res.data.access;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
    return newAccess;
  } catch (err) {
    console.error('Failed to refresh token', err.response?.data || err.message);
    throw err;
  }
}

// --------------------
// Axios instances
// --------------------
export async function getValidToken() {
  let token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  if (!token && refreshToken) {
    try {
      const res = await axios.post(`${BASE_URL}/accounts/token/refresh/`, { refresh: refreshToken });
      token = res.data.access;
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (err) {
      console.error('Refresh token invalid or expired', err.response?.data || err.message);
      await clearStoredTokens(); // clean invalid tokens
      return null;
    }
  }

  return token;
}


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

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired?
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed", err);
      }
    }

    return Promise.reject(error);
  }
);

// --------------------
// Token management
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
// Auth APIs
// --------------------
export const login = async ({ email, password }) => {
  try {
    const response = await fetch(`${API_BASE}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email.trim().toLowerCase(), password }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.detail || 'Incorrect email or password' };
    }

    if (data.access && data.refresh) {
      await storeTokens({ accessToken: data.access, refreshToken: data.refresh });
    }

    return { success: true, data };
  } catch (error) {
    console.error('API login error:', error);
    return { success: false, message: 'Network or server error' };
  }
};

export const registerAccount = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/accounts/register/`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Network error or server unavailable' };
  }
};

// --------------------
// Feedback API
// --------------------
export const sendFeedback = async ({ category, message }) => {
  try {
    const response = await axios.post(`${BASE_URL_FEEDBACK}/api/feedback/`, { category, message });
    return response.data;
  } catch (error) {
    console.error('Error sending feedback:', error.response || error.message);
    throw error;
  }
};

// --------------------
// Menu APIs
// --------------------
export const fetchMenuItems = async (category = '') => {
  try {
    let token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = category ? { category } : undefined;

    let response;
    try {
      response = await axios.get(`${BASE_URL_MENU}/menu-items/`, { headers, params });
    } catch (err) {
      if (err.response?.data?.code === 'token_not_valid') {
        token = await refreshAccessToken();
        const newHeaders = { Authorization: `Bearer ${token}` };
        response = await axios.get(`${BASE_URL_MENU}/menu-items/`, { headers: newHeaders, params });
      } else {
        throw err;
      }
    }

    return response.data || [];
  } catch (error) {
    console.error('fetchMenuItems error:', error.response?.data || error.message);
    return [];
  }
};

export const fetchMenuItemsByCategory = async (category) => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const res = await fetch(`${BASE_URL_MENU}/menu-items/?category=${category}`, {
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

// --------------------
// Notifications
// --------------------
export const fetchNotifications = async () => {
  let token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error('No access token found');

  const fetchWithToken = async (jwt) => {
    const res = await fetch(`${BASE_URL}/notifications/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        const err = new Error('Failed to fetch notifications');
        err.data = data;
        err.status = res.status;
        throw err;
      }
      return data;
    } else {
      const text = await res.text();
      const err = new Error(`Unexpected response: ${res.status}`);
      err.data = text;
      err.status = res.status;
      throw err;
    }
  };

  try {
    return await fetchWithToken(token);
  } catch (err) {
    if (err.status === 401) {
      try {
        const newToken = await refreshAccessToken();
        return await fetchWithToken(newToken);
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr);
        throw refreshErr;
      }
    } else {
      console.error('Fetch notifications failed:', err.data || err.message);
      throw err;
    }
  }
};

// --------------------
// ORDER APIs (✅ Added / Updated Section)
// --------------------
// --------------------
// Order APIs
// --------------------
// --------------------
// Create order API
// --------------------
// api.js — createOrder
export const createOrder = async (payload) => {
try {
const token = await getValidToken();
if (!token) throw new Error('No valid token found. Please log in again.');

const response = await axios.post(`http://192.168.1.11:8000/api/create_order/`, payload, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

return response.data; // { success: true, order_number: ..., total, credit_points_used }

} catch (err) {
console.error('CreateOrder API error:', err.response?.data || err.message);

if (err.response) {
  const { status, data } = err.response;
  if (status === 400) return { success: false, message: data?.message || 'Bad request.' };
  if (status === 409) return { success: false, message: data?.message || 'Duplicate order.' };
  if (status === 401) return { success: false, message: 'Unauthorized. Please log in again.' };
  return { success: false, message: data?.message || `Error ${status}` };
}

return { success: false, message: err.message || 'Network or server error.' };

}
};


export const fetchGcashQR = async (orderId) => {
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}/gcash_qr/`);
    return res.data; // { success: true, qr_url: "..." }
  } catch (err) {
    console.log('Error fetching GCash QR', err);
    return { success: false };
  }
};
const changePassword = async () => {
  try {
    const token = await getValidToken();
    await api.patch('/accounts/change-password/', 
      { password: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPasswordModal(false);
    setNewPassword('');
    Alert.alert('Success', 'Password changed successfully!');
  } catch (err) {
    console.error(err.response?.data || err.message);
    Alert.alert('Error', 'Failed to change password.');
  }
};
const pickImage = async () => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: [ImagePicker.MediaType.image],
    base64: true,
    quality: 0.7,
  });

  if (!result.canceled) {
    const token = await AsyncStorage.getItem('token');

    const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

    try {
      await axios.patch(
        `http://your-ip:8000/api/accounts/update-avatar/`,
        { avatar: base64Image },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      alert('Avatar updated successfully!');
    } catch (error) {
      console.log(error);
      alert('Failed to update avatar');
    }
  }
};
export async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories/`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return await res.json();
}

// --------------------
// Place order safely
// --------------------
export const placeOrder = async (profile, cartItems, creditPointsToUse = 0) => {
try {
if (!profile) throw new Error('User profile not found');
if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

// Calculate total
const totalAmount = cartItems.reduce(
  (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
  0
);

// Ensure credit points don't exceed total
const creditPointsUsed = Math.min(totalAmount, creditPointsToUse);

// Build payload
const payload = {
  customer_name: profile.name,
  total_amount: totalAmount,
  credit_points_used: creditPointsUsed,
  items: cartItems.map(item => ({
    name: item.name || 'Unnamed Item',
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
  })),
};

console.log('Order payload:', payload); // ✅ debug

const result = await createOrder(payload);

if (result.success) {
  console.log('Order placed successfully:', result.order_number);
  return {
    success: true,
    orderNumber: result.order_number,
    total: result.total, // backend-calculated final total
    creditPointsUsed: result.credit_points_used,
  };
} else {
  console.warn('Failed to place order:', result.message);
  return { success: false, message: result.message };
}

} catch (err) {
console.error('placeOrder error:', err.response?.data || err.message);
return { success: false, message: err.response?.data?.message || err.message };
}
};
// api.js
export const confirmPayment = async (orderNumber, method) => {
  try {
    const response = await api.post(`/orders/${orderNumber}/confirm_payment/`, {
      method,
    });
    return response.data;
  } catch (err) {
    console.log('confirmPayment error:', err.response?.data || err.message);
    throw err;
  }
};

export const fetchOrderStatus = async (orderId) => {
  try {
    const token = await getValidToken();
    const res = await api.get(`/orders/order-status/${orderId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // returns status index, total, and credit points
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const submitFeedback = async ({ category, message }) => {
  try {
    if (!message) {
      throw new Error('Message is required for feedback');
    }

    const response = await axios.post(`${BASE_URL_FEEDBACK}/api/feedback/`, {
      category,
      message,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (err) {
    console.error('Error submitting feedback:', err.response?.data || err.message);
    return null;
  }
};

export const fetchFeedback = async () => {
  try {
    const response = await axios.get(`${BASE_URL_FEEDBACK}/api/feedback/`);
    return response.data;
  } catch (err) {
    console.error('Error fetching feedback:', err.response?.data || err.message);
    return [];
  }
};

export const getGcashLink = async (orderNumber) => {
  try {
    const response = await api.get(`/orders/${orderNumber}/gcash_link/`);
    return response.data;
  } catch (err) {
    console.log('getGcashLink error:', err.response?.data || err.message);
    throw err;
  }
};
// --------------------
// Current user
// --------------------
export async function getCurrentUser() {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) throw new Error('No token stored');

    const response = await api.get('/accounts/profile/', {  // ✅ updated endpoint
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch user:', error.response?.data || error.message);
    return null;
  }
}

// --------------------
// Cart APIs
// --------------------
export const addItemToCart = async (itemId, quantity = 1) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const response = await axios.post(`${BASE_URL}/cart/`, { itemId, quantity }, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const updateCartItem = async (itemId, quantity) => {
  const response = await api.put(`/cart/update/${itemId}/`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId) => {
  const response = await api.delete(`/cart/remove/${itemId}/`);
  return response.data;
};
// Fetch orders for a specific user
// api/api.js
export const fetchUserOrders = async () => {
  try {
    const res = await api.get(`/orders/`);
    if (res.data.success) {
      return res.data.orders || [];
    }
    return [];
  } catch (err) {
    console.error('fetchUserOrders error:', err.response?.data || err.message);
    return [];
  }
};
export const getCreditPoints = async () => {
try {
const res = await api.get('/orders/user-credit-points/');
return res.data.credit_points ?? 0;
} catch (err) {
console.error('Credit points fetch failed', err.response?.data || err.message);
throw err;
}
};
// Axios interceptor to automatically refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await getValidToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
// --------------------
// Fetch order details (status + items)
// --------------------
export const fetchOrderDetails = async (orderId) => {
  try {
    const res = await api.get(`/orders/${orderId}/status/`);
    return {
      status: res.data.status,
      items: res.data.items || [],
    };
  } catch (err) {
    console.error('fetchOrderDetails error:', err.response?.data || err.message);
    throw err;
  }
};

// --------------------
// Local menu notifications
// --------------------
export const checkNewMenuNotifications = async () => {
  try {
    const storedLastCount = await AsyncStorage.getItem('lastMenuCount');
    const menuItems = await fetchMenuItems();
    const newCount = menuItems.length;

    if (storedLastCount && parseInt(storedLastCount) < newCount) {
      sendLocalNotification('🆕 New Menu Item Added', 'Check out the latest addition to the menu!');
    }

    await AsyncStorage.setItem('lastMenuCount', newCount.toString());
  } catch (error) {
    console.error('Notification check error:', error.message);
  }
};

const sendLocalNotification = (title, body) => {
  console.log(`Notification: ${title} - ${body}`);
};

// --------------------
// Axios global interceptor
// --------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await getValidToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        // Token invalid, force logout or alert
        console.warn('User must login again: no valid token');
      }
    }
    return Promise.reject(error);
  }
);

export default api; 