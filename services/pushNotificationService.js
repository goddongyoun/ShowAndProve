import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// 이미 App.js에서 처리하므로 여기서는 제거

// 알림 핸들러 설정 - 항상 표시하도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.currentUserEmail = null;
    this.intervalId = null;
    this.lastNotificationCheck = 0;
  }

  // 알림 권한 요청 및 초기화
  async initialize() {
    console.log('🚀 알림 시스템 초기화 중...');

    // 웹에서는 브라우저 알림 권한만 요청
    if (Platform.OS === 'web') {
      if ('Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        console.log('🌐 웹 알림 권한:', permission);
        
        if (permission === 'granted') {
          this.isInitialized = true;
          console.log('✅ 웹 브라우저 알림 권한이 허용되었습니다.');
          
          // 웹에서 페이지 포커스 시 즉시 체크
          if (typeof window !== 'undefined') {
            window.addEventListener('focus', () => {
              if (this.currentUserEmail) {
                console.log('👀 페이지 포커스 - 즉시 알림 체크');
                this.checkNewChallengesByInterests();
              }
            });
          }
        } else {
          console.log('❌ 웹 알림 권한이 거부되었습니다.');
          this.isInitialized = false;
        }
      } else {
        console.log('❌ 이 브라우저는 알림을 지원하지 않습니다.');
        this.isInitialized = false;
      }
      return this.isInitialized;
    }

    // 모바일에서는 로컬 알림 권한 요청
    if (Platform.OS === 'android') {
      // Android 알림 채널 설정
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ChallengeApp 기본',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFC300',
      });

      await Notifications.setNotificationChannelAsync('challenge-app', {
        name: 'ChallengeApp 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFC300',
        description: '도전과제 관련 알림',
      });
    }

    // 모바일 알림 권한 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ 알림 권한이 거부되었습니다.');
      Alert.alert(
        '알림 권한 필요',
        '알림을 받으려면 권한이 필요합니다. 설정에서 알림을 허용해주세요.',
        [{ text: '확인' }]
      );
      this.isInitialized = false;
      return false;
    }

    console.log('✅ 모바일 알림 권한이 허용되었습니다.');
    this.isInitialized = true;
    return true;
  }

  // 알림 전송 (플랫폼별)
  async sendNotification(title, body, data = {}) {
    if (!this.isInitialized) {
      console.log('⚠️ 알림 시스템이 초기화되지 않음, 초기화 시도...');
      await this.initialize();
    }

    if (!this.isInitialized) {
      console.log('❌ 알림 권한이 없어 알림을 보낼 수 없습니다.');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        // 웹에서는 브라우저 알림
        this.showWebNotification(title, body, data);
      } else {
        // 모바일에서는 로컬 알림
        await this.showLocalNotification(title, body, data);
      }
    } catch (error) {
      console.error('알림 전송 오류:', error);
    }
  }

  // 만료 예정 도전과제 체크
  async checkExpiringChallenges() {
    if (!this.currentUserEmail) return;

    try {
      const challenges = await api.challenge.getAll();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const challenge of challenges) {
        if (challenge.expired_date) {
          const expiredDate = new Date(challenge.expired_date);
          
          // 1일 전 알림 (24시간 이내)
          if (expiredDate > now && expiredDate <= tomorrow) {
            const alreadyNotified = await this.checkIfAlreadyNotified(
              `expiring_${challenge._id || challenge.id}`
            );

            if (!alreadyNotified) {
              await this.sendNotification(
                '⏰ 도전과제 만료 임박!',
                `"${challenge.title}" 도전과제가 내일 만료됩니다. 지금 참여해보세요!`,
                {
                  type: 'expiring',
                  challengeId: challenge._id || challenge.id,
                  screen: 'ChallengeDetail',
                }
              );

              await this.markAsNotified(`expiring_${challenge._id || challenge.id}`);
              console.log(`⏰ 만료 예정 알림 전송: ${challenge.title}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('만료 예정 도전과제 체크 오류:', error);
    }
  }

  // 관심 태그 기반 새 도전과제 체크
  async checkNewChallengesByInterests() {
    if (!this.currentUserEmail) {
      console.log('❌ 현재 사용자 이메일이 없음 - 알림 체크 중단');
      return;
    }

    try {
      console.log('🔍 새 도전과제 알림 체크 시작 - 사용자:', this.currentUserEmail);
      
      // 사용자 관심 태그 가져오기
      const userInterests = await api.userInterest.getUserInterests();
      if (!userInterests || userInterests.length === 0) {
        console.log('📭 관심 태그가 설정되지 않음 - 알림 체크 중단');
        return;
      }

      const interestTagNames = userInterests.map(interest => interest.tag_name || interest.name);
      console.log('🏷️ 관심 태그:', interestTagNames);

      // 모든 도전과제 가져오기
      const challenges = await api.challenge.getAll();
      console.log(`📋 총 ${challenges.length}개의 도전과제 확인 중...`);
      
      const recentTime = Date.now() - (24 * 60 * 60 * 1000); // 24시간 전
      console.log('⏰ 24시간 전 기준 시간:', new Date(recentTime).toLocaleString());

      let recentChallenges = 0;
      let matchingChallenges = 0;
      let ownChallenges = 0;

      for (const challenge of challenges) {
        // 최근 24시간 내에 생성된 도전과제인지 확인
        const createdTime = new Date(challenge.created_at || challenge.createdAt).getTime();
        if (createdTime < recentTime) continue;

        recentChallenges++;
        console.log(`📅 최근 도전과제: ${challenge.title} (${new Date(createdTime).toLocaleString()})`);

        // 🚫 자기가 올린 도전과제는 제외
        if (challenge.creator_email === this.currentUserEmail || 
            challenge.creatorEmail === this.currentUserEmail) {
          ownChallenges++;
          console.log(`⚠️ 자기가 올린 도전과제 제외: ${challenge.title}`);
          continue;
        }

        console.log(`👤 다른 사용자 도전과제: ${challenge.title}, 생성자: ${challenge.creator_email || challenge.creatorEmail}`);

        // 태그가 관심 태그와 일치하는지 확인
        if (challenge.tags && Array.isArray(challenge.tags)) {
          console.log(`🏷️ 도전과제 태그: [${challenge.tags.join(', ')}]`);
          
          const hasInterestingTag = challenge.tags.some(tag => 
            interestTagNames.includes(tag)
          );

          if (hasInterestingTag) {
            matchingChallenges++;
            console.log(`✅ 관심 태그와 일치하는 도전과제 발견: ${challenge.title}`);
            
            const alreadyNotified = await this.checkIfAlreadyNotified(
              `new_challenge_${challenge._id || challenge.id}`
            );

            if (!alreadyNotified) {
              const matchingTags = challenge.tags.filter(tag => 
                interestTagNames.includes(tag)
              );

              console.log(`🚀 알림 전송 준비: ${challenge.title}, 매칭 태그: [${matchingTags.join(', ')}]`);

              await this.sendNotification(
                '🎯 관심 있는 새 도전과제!',
                `"${challenge.title}" - ${matchingTags.join(', ')} 카테고리의 새로운 도전과제가 등록되었습니다!`,
                {
                  type: 'new_challenge',
                  challengeId: challenge._id || challenge.id,
                  tags: matchingTags,
                  screen: 'ChallengeDetail',
                }
              );

              await this.markAsNotified(`new_challenge_${challenge._id || challenge.id}`);
              console.log(`🎯 새 도전과제 알림 전송 완료: ${challenge.title} (${matchingTags.join(', ')})`);
            } else {
              console.log(`🔇 이미 알림 전송됨: ${challenge.title}`);
            }
          } else {
            console.log(`❌ 관심 태그와 일치하지 않음: ${challenge.title}`);
          }
        } else {
          console.log(`❌ 태그가 없거나 배열이 아님: ${challenge.title}, 태그:`, challenge.tags);
        }
      }

      console.log(`📊 알림 체크 완료 - 최근 도전과제: ${recentChallenges}개, 내 도전과제: ${ownChallenges}개, 매칭: ${matchingChallenges}개`);
      
    } catch (error) {
      console.error('❌ 새 도전과제 체크 오류:', error);
    }
  }

  // 알림 중복 방지 체크
  async checkIfAlreadyNotified(notificationId) {
    try {
      const notifiedList = await AsyncStorage.getItem('notifiedChallenges');
      if (!notifiedList) {
        console.log(`🔍 알림 기록 없음: ${notificationId}`);
        return false;
      }

      const notified = JSON.parse(notifiedList);
      const isNotified = notified.some(record => {
        if (typeof record === 'string') {
          return record === notificationId;
        }
        return record.id === notificationId;
      });
      
      if (isNotified) {
        console.log(`🔇 이미 알림 전송됨 (기록 확인): ${notificationId}`);
        // 현재 저장된 알림 기록들 출력
        console.log(`📝 현재 알림 기록들:`, notified.slice(-5)); // 최근 5개만 표시
      } else {
        console.log(`✅ 새로운 알림 가능: ${notificationId}`);
      }
      
      return isNotified;
    } catch (error) {
      console.error('알림 체크 오류:', error);
      return false;
    }
  }

  // 알림 전송 완료 표시
  async markAsNotified(notificationId) {
    try {
      const notifiedList = await AsyncStorage.getItem('notifiedChallenges');
      let notified = notifiedList ? JSON.parse(notifiedList) : [];
      
      // 날짜 정보와 함께 저장
      const record = {
        id: notificationId,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
      };
      
      // 이미 존재하는지 확인
      const exists = notified.some(item => 
        (typeof item === 'string' && item === notificationId) ||
        (typeof item === 'object' && item.id === notificationId)
      );
      
      if (!exists) {
        notified.push(record);
        console.log(`📝 알림 기록 저장: ${notificationId} (${record.date})`);
      } else {
        console.log(`⚠️ 이미 기록된 알림: ${notificationId}`);
      }
      
      // 7일 이전 기록 정리
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      notified = notified.filter(item => {
        if (typeof item === 'string') return true; // 기존 문자열 형식은 유지
        return item.timestamp > sevenDaysAgo;
      });
      
      // 최대 100개까지만 저장 (메모리 절약)
      if (notified.length > 100) {
        notified = notified.slice(-100);
      }
      
      await AsyncStorage.setItem('notifiedChallenges', JSON.stringify(notified));
      console.log(`💾 총 ${notified.length}개의 알림 기록 저장됨`);
      
    } catch (error) {
      console.error('알림 표시 저장 오류:', error);
    }
  }

  // 🆕 알림 기록 확인 (디버깅용)
  async getNotificationHistory() {
    try {
      const notifiedList = await AsyncStorage.getItem('notifiedChallenges');
      if (!notifiedList) return [];
      
      const notified = JSON.parse(notifiedList);
      console.log(`📋 전체 알림 기록 (${notified.length}개):`, notified);
      return notified;
    } catch (error) {
      console.error('알림 기록 조회 오류:', error);
      return [];
    }
  }

  // 🆕 알림 기록 초기화 (디버깅용)
  async clearNotificationHistory() {
    try {
      await AsyncStorage.removeItem('notifiedChallenges');
      console.log('🗑️ 모든 알림 기록이 삭제되었습니다.');
      return true;
    } catch (error) {
      console.error('알림 기록 삭제 오류:', error);
      return false;
    }
  }

  // 🆕 오늘의 알림 기록만 초기화
  async clearTodayNotifications() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const notifiedList = await AsyncStorage.getItem('notifiedChallenges');
      
      if (!notifiedList) {
        console.log('🗑️ 삭제할 알림 기록이 없습니다.');
        return true;
      }

      const notified = JSON.parse(notifiedList);
      const filtered = notified.filter(item => {
        if (typeof item === 'string') return true; // 기존 문자열 형식은 유지
        return item.date !== today;
      });

      await AsyncStorage.setItem('notifiedChallenges', JSON.stringify(filtered));
      console.log(`🗑️ 오늘(${today})의 알림 기록 ${notified.length - filtered.length}개가 삭제되었습니다.`);
      return true;
    } catch (error) {
      console.error('오늘 알림 기록 삭제 오류:', error);
      return false;
    }
  }

  // 알림 시스템 시작
  async startNotificationSystem(userEmail) {
    this.currentUserEmail = userEmail;
    console.log('🚀 알림 시스템 시작:', userEmail);

    // 초기화 확인
    if (!this.isInitialized) {
      console.log('⚠️ 알림 시스템이 초기화되지 않음. 초기화 중...');
      await this.initialize();
    }

    if (!this.isInitialized) {
      console.log('❌ 알림 시스템 초기화 실패 - 권한이 없음');
      return false;
    }

    // 기존 인터벌 정리
    if (this.intervalId) {
      console.log('🔄 기존 알림 체크 인터벌 정리');
      clearInterval(this.intervalId);
    }

    // 즉시 한번 체크
    console.log('🔍 초기 알림 체크 실행...');
    await this.checkExpiringChallenges();
    await this.checkNewChallengesByInterests();

    // 5분마다 체크 (개발 중에는 30초로 줄임)
    const interval = 30 * 1000; // 30초 (개발용)
    this.intervalId = setInterval(async () => {
      console.log('🔍 주기적 알림 체크 실행...');
      await this.checkExpiringChallenges();
      await this.checkNewChallengesByInterests();
    }, interval);

    console.log(`✅ 알림 시스템이 시작되었습니다. (${interval/1000}초마다 체크)`);
    return true;
  }

  // 알림 시스템 중지
  stopNotificationSystem() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserEmail = null;
    console.log('🛑 알림 시스템이 중지되었습니다.');
  }

  // 테스트 알림
  async sendTestNotification() {
    console.log('🧪 테스트 알림 전송...');

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      Alert.alert(
        '알림 권한 필요',
        '알림 권한을 허용해주세요.',
        [{ text: '확인' }]
      );
      return;
    }

    const now = new Date();
    await this.sendNotification(
      '🧪 테스트 알림',
      `알림 시스템이 정상 작동합니다! (${now.toLocaleTimeString()})`,
      { 
        type: 'test',
        timestamp: now.toISOString()
      }
    );

    // 웹에서는 추가 안내
    if (Platform.OS === 'web') {
      setTimeout(() => {
        Alert.alert(
          '웹 알림 테스트 완료',
          '브라우저 알림이 표시되었습니다! 화면 상단이나 브라우저 알림 영역을 확인해주세요.',
          [{ text: '확인' }]
        );
      }, 1000);
    } else {
      Alert.alert(
        '알림 전송 완료',
        '테스트 알림이 전송되었습니다!',
        [{ text: '확인' }]
      );
    }
  }

  // 🆕 알림 시스템 상태 확인 및 디버깅
  async debugNotificationSystem() {
    console.log('🔧 알림 시스템 디버그 정보:');
    console.log('- 초기화 상태:', this.isInitialized);
    console.log('- 현재 사용자:', this.currentUserEmail);
    console.log('- 인터벌 ID:', this.intervalId);
    console.log('- 플랫폼:', Platform.OS);
    
    // 알림 기록 확인
    const history = await this.getNotificationHistory();
    console.log(`- 저장된 알림 기록: ${history.length}개`);
    
    // 최근 3개 기록 표시
    if (history.length > 0) {
      console.log('- 최근 알림 기록 3개:');
      history.slice(-3).forEach((record, index) => {
        if (typeof record === 'string') {
          console.log(`  ${index + 1}. ${record} (구형식)`);
        } else {
          console.log(`  ${index + 1}. ${record.id} (${record.date})`);
        }
      });
    }

    // Alert로도 정보 표시
    Alert.alert(
      '🔧 알림 시스템 디버그',
      `초기화: ${this.isInitialized ? '✅' : '❌'}\n` +
      `사용자: ${this.currentUserEmail || '없음'}\n` +
      `플랫폼: ${Platform.OS}\n` +
      `알림 기록: ${history.length}개`,
      [
        { text: '기록 보기', onPress: () => this.showNotificationHistory() },
        { text: '기록 초기화', onPress: () => this.confirmClearHistory() },
        { text: '닫기' }
      ]
    );
  }

  // 🆕 알림 기록 표시
  async showNotificationHistory() {
    const history = await this.getNotificationHistory();
    
    if (history.length === 0) {
      Alert.alert('📭 알림 기록', '저장된 알림 기록이 없습니다.', [{ text: '확인' }]);
      return;
    }

    // 최근 10개만 표시
    const recent = history.slice(-10);
    const historyText = recent.map((record, index) => {
      if (typeof record === 'string') {
        return `${index + 1}. ${record}`;
      } else {
        return `${index + 1}. ${record.id}\n   (${record.date})`;
      }
    }).join('\n\n');

    Alert.alert(
      `📋 알림 기록 (최근 ${recent.length}개)`,
      historyText,
      [{ text: '확인' }]
    );
  }

  // 🆕 알림 기록 초기화 확인
  confirmClearHistory() {
    Alert.alert(
      '🗑️ 알림 기록 초기화',
      '어떤 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '오늘만', 
          onPress: async () => {
            const success = await this.clearTodayNotifications();
            Alert.alert(
              success ? '✅ 완료' : '❌ 오류',
              success ? '오늘의 알림 기록이 삭제되었습니다.' : '삭제 중 오류가 발생했습니다.',
              [{ text: '확인' }]
            );
          }
        },
        { 
          text: '전체', 
          style: 'destructive',
          onPress: async () => {
            const success = await this.clearNotificationHistory();
            Alert.alert(
              success ? '✅ 완료' : '❌ 오류',
              success ? '모든 알림 기록이 삭제되었습니다.' : '삭제 중 오류가 발생했습니다.',
              [{ text: '확인' }]
            );
          }
        }
      ]
    );
  }

  // 웹 브라우저 알림
  showWebNotification(title, body, data = {}) {
    if (Platform.OS !== 'web') {
      console.log('❌ 웹이 아닌 환경에서 웹 알림 시도');
      return;
    }

    console.log('🌐 웹 브라우저 알림 시도:', title);
    console.log('📝 알림 내용:', body);
    console.log('🔍 브라우저 알림 지원:', 'Notification' in window);
    console.log('🔑 현재 알림 권한:', window.Notification ? Notification.permission : 'undefined');

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          tag: data.type || 'challenge-app',
          requireInteraction: true,
          data,
          icon: '/favicon.ico', // 아이콘 추가
        });

        notification.onclick = function(event) {
          console.log('🖱️ 사용자가 알림을 클릭함');
          event.preventDefault();
          window.focus();
          notification.close();
        };

        notification.onshow = function() {
          console.log('✅ 브라우저 알림이 화면에 표시됨');
        };

        notification.onerror = function(event) {
          console.error('❌ 브라우저 알림 오류:', event);
        };

        // 5초 후 자동으로 닫기
        setTimeout(() => {
          notification.close();
          console.log('⏰ 알림 자동 닫기 (5초 후)');
        }, 5000);

        console.log('🌐 웹 브라우저 알림 생성 완료:', title);
      } catch (error) {
        console.error('❌ 브라우저 알림 생성 오류:', error);
      }
    } else {
      if (!('Notification' in window)) {
        console.log('❌ 이 브라우저는 알림을 지원하지 않습니다.');
      } else {
        console.log('❌ 웹 알림 권한이 없습니다. 현재 권한:', Notification.permission);
        console.log('💡 브라우저 주소창 옆 🔒 아이콘을 클릭해서 알림을 허용해주세요.');
      }
    }
  }

  // 모바일 로컬 알림
  async showLocalNotification(title, body, data = {}) {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // 즉시 전송
      });
      console.log('📱 로컬 알림 전송됨:', title);
    } catch (error) {
      console.error('로컬 알림 오류:', error);
      
      // Expo Go에서 실패하면 콘솔과 Alert로 시뮬레이션
      if (Constants.appOwnership === 'expo') {
        console.log(`📱 [Expo Go 시뮬레이션] ${title}: ${body}`);
        Alert.alert(title, body);
      }
    }
  }
}

// 싱글톤 인스턴스
const pushNotificationService = new PushNotificationService();
export default pushNotificationService; 