import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = 'http://219.254.146.234:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30초 타임아웃 설정
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Request Token (Challenge Service):', token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('No token found in AsyncStorage (Challenge Service)');
      }
    } catch (error) {
      console.error('AsyncStorage Error in Challenge Service:', error);
    }
    console.log('Sending request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData (cannot display contents)' : config.data,
    });
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error (Challenge Service):', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    console.error('Response Interceptor Error (Challenge Service):', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

export const createChallenge = async (userId, title, description) => {
  try {
    const response = await api.post('/challenges', { title, description, creator: userId });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`도전과제 생성 실패: ${errorMessage}`);
  }
};

export const getChallenges = async () => {
  try {
    const response = await api.get('/challenges');
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`도전과제 목록 가져오기 실패: ${errorMessage}`);
  }
};

export const uploadVerificationPhoto = async (challengeId, userId, photoData) => {
  const formData = new FormData();
  formData.append('comment', ''); // 코멘트 필드 추가 (빈 값으로)

  if (Platform.OS === 'web') {
    formData.append('photo', photoData);
  } else {
    formData.append('photo', {
      uri: photoData.uri,
      name: photoData.name || `photo-${Date.now()}.jpg`,
      type: photoData.type || 'image/jpeg',
    });
  }

  console.log('FormData Content:', formData instanceof FormData ? 'FormData instance created' : formData);

  try {
    // 수정된 엔드포인트: /challenges/{challengeId}/submit
    const response = await api.post(`/challenges/${challengeId}/submit`, formData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`사진 인증 실패: ${errorMessage}`);
  }
};

export const deleteChallenge = async (challengeId) => {
  try {
    const response = await api.delete(`/challenges/${challengeId}`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`도전과제 삭제 실패: ${errorMessage}`);
  }
};

export const getVerifications = async (challengeId) => {
  try {
    // 수정된 엔드포인트: /challenges/{challengeId}/submissions
    const response = await api.get(`/challenges/${challengeId}/submissions`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`인증 사진 목록 가져오기 실패: ${errorMessage}`);
  }
};

export const deleteVerification = async (verificationId) => {
  try {
    const response = await api.delete(`/verifications/${verificationId}`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`인증 사진 삭제 실패: ${errorMessage}`);
  }
};

export const updateChallengeStatus = async (challengeId, status) => {
  try {
    const response = await api.patch(`/challenges/${challengeId}/status`, { status });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`도전과제 상태 업데이트 실패: ${errorMessage}`);
  }
};

export const getUserChallenges = async (userEmail) => {
  try {
    console.log('사용자 도전과제 조회:', userEmail);
    // /api 제거 - baseURL에 이미 포함되어 있음
    const response = await api.get(`/users/${userEmail}/challenges`);
    console.log('사용자 도전과제 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('사용자 도전과제 조회 오류:', error);
    throw new Error(error.response?.data?.message || '사용자 도전과제를 불러오는데 실패했습니다.');
  }
};