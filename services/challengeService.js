import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { getCurrentUser } from './authService';

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
    
    // 모든 도전과제를 가져오기
    const allChallenges = await getChallenges();
    console.log('전체 도전과제:', allChallenges);
    
    // 사용자가 참여한 도전과제 찾기 (생성한 것 + 참여한 것)
    const userParticipatedChallenges = [];
    
    for (const challenge of allChallenges) {
      try {
        // 사용자가 생성한 도전과제인지 확인
        const isCreator = challenge.creator === userEmail || 
                         challenge.creator_email === userEmail || 
                         challenge.createdBy === userEmail;
        
        // 사용자가 참여한 도전과제인지 확인 (제출물이 있는지)
        const submissions = await getVerifications(challenge._id);
        const userSubmission = submissions.find(sub => sub.user_email === userEmail);
        const hasParticipated = !!userSubmission;
        
        // 생성했거나 참여한 도전과제만 포함
        if (isCreator || hasParticipated) {
          userParticipatedChallenges.push({
            ...challenge,
            createdAt: challenge.created_at, // 날짜 필드 통일
            isCreator: isCreator,
            status: userSubmission && userSubmission.photo_path ? '완료' : 
                   hasParticipated ? '참여중' : '진행중'
          });
        }
      } catch (error) {
        console.error(`도전과제 ${challenge._id} 참여 상태 확인 오류:`, error);
        // 오류 발생 시 생성자인지만 확인
        const isCreator = challenge.creator === userEmail || 
                         challenge.creator_email === userEmail || 
                         challenge.createdBy === userEmail;
        if (isCreator) {
          userParticipatedChallenges.push({
            ...challenge,
            createdAt: challenge.created_at,
            isCreator: true,
            status: '진행중'
          });
        }
      }
    }
    
    console.log('사용자 참여 도전과제:', userParticipatedChallenges);
    return userParticipatedChallenges;
  } catch (error) {
    console.error('사용자 도전과제 조회 오류:', error);
    throw new Error(error.response?.data?.message || '사용자 도전과제를 불러오는데 실패했습니다.');
  }
};

// 캐싱을 위한 변수들
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const CACHE_DURATION = 30 * 1000; // 30초 캐시

// 캐시 무효화 함수 (새로운 제출물이나 도전과제 생성 시 호출)
export const clearLeaderboardCache = () => {
  console.log('리더보드 캐시 무효화');
  leaderboardCache = null;
  leaderboardCacheTime = 0;
};

// 리더보드 데이터 계산 함수 (내부 함수)
const calculateLeaderboard = async () => {
  console.log('리더보드 데이터 계산 중...');
  
  // 모든 도전과제 가져오기
  const challenges = await getChallenges();
  
  // 각 도전과제의 제출물을 가져와서 사용자별 통계 계산
  const userStats = {};
  
  for (const challenge of challenges) {
    try {
      const submissions = await getVerifications(challenge._id);
      
      submissions.forEach(submission => {
        const userEmail = submission.user_email;
        const userName = submission.user_name;
        
        if (!userStats[userEmail]) {
          userStats[userEmail] = {
            email: userEmail,
            name: userName,
            completedChallenges: 0,
            lastCompletedAt: null
          };
        }
        
        userStats[userEmail].completedChallenges++;
        
        // 최근 완료 시간 업데이트
        const submittedAt = new Date(submission.submitted_at);
        if (!userStats[userEmail].lastCompletedAt || submittedAt > userStats[userEmail].lastCompletedAt) {
          userStats[userEmail].lastCompletedAt = submittedAt;
        }
      });
    } catch (error) {
      console.error(`도전과제 ${challenge._id} 제출물 조회 오류:`, error);
    }
  }
  
  // 배열로 변환하고 정렬 (완료한 도전과제 수 기준, 같으면 최근 완료 시간 기준)
  const leaderboard = Object.values(userStats)
    .sort((a, b) => {
      if (b.completedChallenges !== a.completedChallenges) {
        return b.completedChallenges - a.completedChallenges;
      }
      return new Date(b.lastCompletedAt) - new Date(a.lastCompletedAt);
    })
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }));
  
  return leaderboard;
};

// 리더보드 데이터 가져오기 (캐싱 적용)
export const getLeaderboard = async () => {
  try {
    const now = Date.now();
    
    // 캐시가 유효한지 확인
    if (leaderboardCache && (now - leaderboardCacheTime) < CACHE_DURATION) {
      console.log('리더보드 캐시 사용');
      return leaderboardCache;
    }
    
    // 캐시가 없거나 만료된 경우 새로 계산
    console.log('리더보드 새로 계산');
    leaderboardCache = await calculateLeaderboard();
    leaderboardCacheTime = now;
    
    console.log('리더보드 응답:', leaderboardCache);
    return leaderboardCache;
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    return [];
  }
};

// 내 랭킹 정보 가져오기 (리더보드 재사용)
export const getMyRank = async () => {
  try {
    console.log('내 랭킹 정보 조회 중...');
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // 같은 캐시를 사용하여 추가 API 호출 방지
    const leaderboard = await getLeaderboard();
    const myRank = leaderboard.find(user => user.email === currentUser.email);
    
    console.log('내 랭킹 응답:', myRank);
    return myRank || { rank: null, completedChallenges: 0 };
  } catch (error) {
    console.error('내 랭킹 조회 오류:', error);
    return { rank: null, completedChallenges: 0 };
  }
};

// 사용자의 도전과제 달성 상태 조회 (userChallenges 재사용)
export const getUserChallengeStats = (userChallenges) => {
  try {
    console.log('사용자 도전과제 통계 계산 중...');
    console.log('통계용 사용자 도전과제:', userChallenges);
    
    if (!Array.isArray(userChallenges) || userChallenges.length === 0) {
      return { completed: 0, total: 0, failed: 0 };
    }
    
    let completed = 0;
    let failed = 0;
    
    // 각 도전과제의 상태 확인
    for (const challenge of userChallenges) {
      if (challenge.status === '완료') {
        completed++;
      } else {
        failed++;
      }
    }
    
    return {
      completed,
      total: userChallenges.length,
      failed
    };
  } catch (error) {
    console.error('사용자 도전과제 통계 계산 오류:', error);
    return { completed: 0, total: 0, failed: 0 };
  }
};