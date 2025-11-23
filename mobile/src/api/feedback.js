import Constants from 'expo-constants';

/**
 * 🌐 API Configuration
 * Make sure your backend runs using:
 *    python manage.py runserver 0.0.0.0:8000
 * and your phone + PC are on the same Wi-Fi network.
 */

const LOCAL_IP = '192.168.1.6'; // Your PC LAN IP
const DEV_API_PREFIX = '/api/v1'; // Django REST API prefix

// Base URLs
export const BASE_URL = `http://${LOCAL_IP}:8000${DEV_API_PREFIX}`; // For normal REST API calls
export const BASE_URL_MENU = `http://${LOCAL_IP}:8000/menu`; // For menu endpoints

// Optional: timeout config
export const API_CONFIG = {
  timeout: 15000,
};

console.log('🔗 Using BASE_URL (REST):', BASE_URL);
console.log('🔗 Using BASE_URL_MENU (menu):', BASE_URL_MENU);