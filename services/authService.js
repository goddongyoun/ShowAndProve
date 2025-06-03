import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://219.254.146.234:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Request Token (Auth Service):', token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('No token found in AsyncStorage (Auth Service)');
      }
    } catch (error) {
      console.error('AsyncStorage Error in Auth Service:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error (Auth Service):', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    console.error('Response Interceptor Error (Auth Service):', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

export const registerUser = async (email, password, name) => {
  try {
    const response = await api.post('/register', { email, password, name });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`회원가입 실패: ${errorMessage}`);
  }
};

export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    console.log('Login Response:', response.data);
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    const storedToken = await AsyncStorage.getItem('token');
    console.log('Stored Token after Login:', storedToken);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`로그인 실패: ${errorMessage}`);
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('사용자 정보 가져오기 실패:', error);
    return null;
  }
};

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.error('로그아웃 실패:', error);
  }
};