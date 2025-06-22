import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://219.254.146.234:5000/api';

// 통합 API 클라이언트 생성
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('AsyncStorage Error:', error);
    }
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
    console.error('API Response Error:', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

// 인증 관련 API
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

// 도전과제 관련 API
export const challengeAPI = {
  create: async (challengeData) => {
    try {
      console.log('API 요청 데이터:', challengeData);
      
      // 먼저 생성 전 도전과제 목록을 가져와서 개수 확인
      const beforeResponse = await fetch(`${API_URL}/challenges`);
      const beforeChallenges = beforeResponse.ok ? await beforeResponse.json() : [];
      const beforeCount = beforeChallenges.length;
      console.log('생성 전 도전과제 개수:', beforeCount);
      
      const response = await fetch(`${API_URL}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify(challengeData),
      });

      console.log('API 응답 상태:', response.status);
      
      // 500 오류든 아니든 상관없이 실제 생성 여부 확인
      console.log('생성 요청 완료, 실제 생성 여부 확인 중...');
      
      // 1초 후 확인 (DB 처리 시간 고려)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const afterResponse = await fetch(`${API_URL}/challenges`);
      if (afterResponse.ok) {
        const afterChallenges = await afterResponse.json();
        console.log('생성 후 도전과제 개수:', afterChallenges.length);
        
        // 개수가 증가했거나 같은 제목/내용의 도전과제가 있으면 성공
        if (afterChallenges.length > beforeCount) {
          const newestChallenge = afterChallenges[0]; // 최신순으로 정렬되어 있음
          if (newestChallenge.title === challengeData.title && 
              newestChallenge.content === challengeData.content) {
            console.log('✅ 도전과제 생성 성공 확인:', newestChallenge);
            return {
              message: '도전과제가 성공적으로 생성되었습니다',
              challenge: newestChallenge
            };
          }
        }
        
        // 개수는 같지만 같은 제목/내용이 있는지 확인 (중복 생성 방지)
        const matchingChallenge = afterChallenges.find(challenge => 
          challenge.title === challengeData.title && 
          challenge.content === challengeData.content
        );
        
        if (matchingChallenge) {
          console.log('✅ 도전과제가 이미 존재함 (성공):', matchingChallenge);
          return {
            message: '도전과제가 성공적으로 생성되었습니다',
            challenge: matchingChallenge
          };
        }
      }
      
      // 여기까지 왔다면 실제로 생성되지 않음
      throw new Error('도전과제 생성에 실패했습니다');

    } catch (error) {
      console.error('API Challenge Create Error:', error);
      throw error;
    }
  },

  getAll: async () => {
    const response = await api.get('/challenges');
    return response.data;
  },

  delete: async (challengeId) => {
    const response = await api.delete(`/challenges/${challengeId}`);
    return response.data;
  },

  updateStatus: async (challengeId, status) => {
    const response = await api.patch(`/challenges/${challengeId}/status`, { status });
    return response.data;
  },

  getUserChallenges: async (userEmail) => {
    const response = await api.get(`/users/${userEmail}/challenges`);
    return response.data;
  },

  submit: async (challengeId, formData) => {
    const response = await api.post(`/challenges/${challengeId}/submit`, formData);
    return response.data;
  },

  getSubmissions: async (challengeId) => {
    const response = await api.get(`/challenges/${challengeId}/submissions`);
    return response.data;
  },

  deleteVerification: async (verificationId) => {
    const response = await api.delete(`/verifications/${verificationId}`);
    return response.data;
  },
};

// 태그 관련 API
export const tagAPI = {
  getAll: async () => {
    const response = await api.get('/tags');
    return response.data;
  },

  getChallengesByTag: async (tagName) => {
    const response = await api.get(`/tags/${tagName}/challenges`);
    return response.data;
  },
};

// 사용자 관심 태그 관련 API (서버 기반)
const userInterestAPI = {
  // 서버에서 사용자 관심 태그 가져오기
  getUserInterests: async () => {
    try {
      const response = await api.get('/users/interests');
      return response.data.interests || [];
    } catch (error) {
      console.error('서버 관심 태그 조회 오류:', error);
      return [];
    }
  },

  // 서버에 관심 태그 추가
  addUserInterest: async (tagName) => {
    try {
      const response = await api.post('/users/interests', { tag_name: tagName });
      return response.data;
    } catch (error) {
      console.error('관심 태그 추가 오류:', error);
      throw new Error(error.response?.data?.error || '관심 태그 추가에 실패했습니다.');
    }
  },

  // 서버에서 관심 태그 삭제
  removeUserInterest: async (tagId) => {
    try {
      const response = await api.delete(`/users/interests/${tagId}`);
      return response.data;
    } catch (error) {
      console.error('관심 태그 삭제 오류:', error);
      throw new Error(error.response?.data?.error || '관심 태그 삭제에 실패했습니다.');
    }
  },

  // 사용자 관심 태그 전체 업데이트 (이전 버전 호환성을 위해)
  updateUserInterests: async (userEmail, interests) => {
    try {
      // 현재 서버의 관심 태그 가져오기
      const currentInterests = await userInterestAPI.getUserInterests();
      const currentTagNames = currentInterests.map(interest => interest.tag_name);
      
      // 추가할 태그들
      const tagsToAdd = interests.filter(tag => !currentTagNames.includes(tag));
      
      // 삭제할 태그들
      const tagsToRemove = currentInterests.filter(interest => !interests.includes(interest.tag_name));
      
      // 병렬로 추가/삭제 처리
      const promises = [];
      
      // 태그 추가
      tagsToAdd.forEach(tagName => {
        promises.push(userInterestAPI.addUserInterest(tagName));
      });
      
      // 태그 삭제
      tagsToRemove.forEach(interest => {
        promises.push(userInterestAPI.removeUserInterest(interest.tag_id));
      });
      
      await Promise.all(promises);
      
      return { success: true, interests };
    } catch (error) {
      console.error('관심 태그 업데이트 오류:', error);
      throw new Error('관심 태그 업데이트에 실패했습니다.');
    }
  },
};

// 알림 관련 API
const notificationAPI = {
  // 서버에서 알림 조회 (백엔드 API 활용)
  getNotifications: async (userEmail) => {
    try {
      const response = await api.get(`/notify/${userEmail}`);
      return response.data;
    } catch (error) {
      console.error('서버 알림 조회 오류:', error);
      return { success: false, notifications: [] };
    }
  },

  sendTestNotification: async (userEmail, notificationData) => {
    try {
      const response = await api.post(`/notify/test/${userEmail}`, notificationData);
      return response.data;
    } catch (error) {
      console.error('테스트 알림 전송 오류:', error);
      return { success: false, error: error.message };
    }
  },
};

// OCR 관련 API
export const ocrAPI = {
  detectPostit: async (imageData) => {
    const response = await api.post('/detect-postit', { image: imageData });
    return response.data;
  },
};

// 통합 API 객체 내보내기
export default {
  auth: authAPI,
  challenge: challengeAPI,
  tag: tagAPI,
  userInterest: userInterestAPI,
  notification: notificationAPI,
  ocr: ocrAPI,
};
