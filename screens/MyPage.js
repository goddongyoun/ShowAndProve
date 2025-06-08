import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { globalStyles } from '../utils/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavBar from '../navigation/BottomNavBar';
import { getCurrentUser } from '../services/authService';
import { getUserChallenges, getUserChallengeStats } from '../services/challengeService';

export default function MyPage({ navigation, route }) {
  const [challenges, setChallenges] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    total: 0,
    failed: 0
  });

  // App.js에서 전달받은 로그인 상태 변경 콜백
  const onLoginStateChange = route?.params?.onLoginStateChange;

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      console.log('MyPage 초기화 시작...');
      const user = await getCurrentUser();
      console.log('Current User in MyPage:', user);
      
      if (user) {
        setCurrentUser(user);
        // fetchUserChallenges 내에서 통계도 함께 계산하므로 하나만 호출
        await fetchUserChallenges(user.email);
      } else {
        // 사용자 정보가 없으면 로그인 화면으로 이동
        console.log('사용자 정보가 없습니다. 로그인 화면으로 이동합니다.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('MyPage 초기화 오류:', error);
      Alert.alert('오류', '사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserChallenges = async (userEmail) => {
    try {
      console.log('사용자 도전과제 조회 중...', userEmail);
      const userChallenges = await getUserChallenges(userEmail);
      console.log('사용자 도전과제:', userChallenges);
      
      // 데이터가 배열인지 확인
      const challengeArray = Array.isArray(userChallenges) ? userChallenges : [];
      setChallenges(challengeArray);
      
      // 같은 데이터로 통계 계산 (추가 API 호출 없음)
      console.log('사용자 통계 계산 중...');
      const stats = getUserChallengeStats(challengeArray);
      console.log('사용자 통계:', stats);
      setStats(stats);
    } catch (error) {
      console.error('도전과제 조회 오류:', error);
      // 오류 발생 시 빈 배열로 설정
      setChallenges([]);
      setStats({ completed: 0, total: 0, failed: 0 });
      
      // 사용자에게 알림 (선택적)
      if (error.message.includes('401') || error.message.includes('인증')) {
        Alert.alert('인증 오류', '다시 로그인해주세요.', [
          { text: '확인', onPress: () => navigation.navigate('Login') }
        ]);
      }
    }
  };

  const performLogout = async () => {
    try {
      console.log('로그아웃 실행 시작');
      
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('AsyncStorage에서 토큰과 사용자 정보 삭제 완료');
      
      // App.js의 로그인 상태 업데이트
      if (onLoginStateChange) {
        console.log('onLoginStateChange 콜백 호출');
        onLoginStateChange(false);
      } else {
        console.log('onLoginStateChange 콜백이 없음');
      }
      
      console.log('로그인 화면으로 이동');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
      // 웹 환경에서만 강제 새로고침 (안전하게 체크)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
        console.log('웹 환경에서 강제 새로고침');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      
    } catch (error) {
      console.error('로그아웃 오류:', error);
      if (Platform.OS === 'web') {
        window.alert('로그아웃 중 문제가 발생했습니다.');
      } else {
        Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
      }
    }
  };

  const handleLogout = async () => {
    console.log('로그아웃 버튼 클릭됨');
    console.log('onLoginStateChange 콜백:', onLoginStateChange);
    
    // 플랫폼별로 다른 확인 방식 사용
    if (Platform.OS === 'web') {
      // 웹에서는 브라우저 confirm 사용
      const confirmed = window.confirm('정말 로그아웃하시겠습니까?');
      if (confirmed) {
        await performLogout();
      }
    } else {
      // 모바일에서는 React Native Alert 사용
      Alert.alert(
        '로그아웃',
        '정말 로그아웃하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '로그아웃',
            style: 'destructive',
            onPress: performLogout
          }
        ]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    initialize();
  };

  const handleChallengeClick = (challenge) => {
    navigation.navigate('ChallengeDetail', { challenge });
  };

  const renderChallenge = ({ item }) => (
    <TouchableOpacity 
      style={{ 
        backgroundColor: '#FFFFFF', 
        padding: 15, 
        borderWidth: 2,
        borderColor: '#FFE357',
        borderRadius: 14, 
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }} 
      onPress={() => handleChallengeClick(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[globalStyles.text, { fontSize: 16, fontWeight: 'bold' }]}>{item.title}</Text>
        <Text style={[globalStyles.text, { fontSize: 12, color: '#666', marginTop: 2 }]}>
          생성일: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.isCreator && (
          <Text style={[globalStyles.text, { fontSize: 10, color: '#FFC300', marginTop: 1 }]}>
            내가 생성한 도전과제
          </Text>
        )}
      </View>
      <View style={{ 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 4,
        backgroundColor: item.status === '완료' ? '#4CAF50' : 
                        item.status === '실패' ? '#F44336' : '#FFC107'
      }}>
        <Text style={[globalStyles.text, { 
          color: 'white', 
          fontSize: 12, 
          fontWeight: 'bold' 
        }]}>
          {item.status || '진행중'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFF44F" />
        <Text style={[globalStyles.text, { marginTop: 10 }]}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { justifyContent: 'space-between' }]}>
      {/* 사용자 정보 */}
      {currentUser && (
        <View style={{ marginBottom: 20, padding: 15 }}>
          <Text style={[globalStyles.text, { fontSize: 22, textAlign: 'center', color: '#5E4636', marginBottom: 6 }]}>
            {currentUser.name}님의 도전과제
          </Text>
          <Text style={[globalStyles.text, { fontSize: 14, color: '#CDBCB0', textAlign: 'center' }]}>
            {currentUser.email}
          </Text>
          
          {/* 로그아웃 버튼 */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginTop: 15,
              backgroundColor: '#FF6B6B',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: 'center'
            }}
          >
            <Text style={[globalStyles.text, { color: 'white', fontSize: 14, fontWeight: 'bold' }]}>
              로그아웃
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={{ flex: 1 }}>
        {/* 통계 섹션 */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 20, alignItems: 'center' }}>
          <View style={{ borderRadius: 20, backgroundColor: '#5E4636', height: 120, width: 100, justifyContent: 'center', alignItems: 'center', gap: 5, transform: [{ rotate: '-3deg' }] }}>
            <Text style={[globalStyles.text, { fontSize: 30, color: '#FFFCF4' }]}>
              {stats.completed}
            </Text>
            <Text style={[globalStyles.text, { fontSize: 14, color: '#FFFCF4' }]}>
              달성
            </Text>
          </View>
          <View style={{ borderRadius: 20, backgroundColor: '#5E4636', height: 150, width: 120, justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            <Text style={[globalStyles.text, { fontSize: 40, color: '#FFFCF4' }]}>
              {stats.total}
            </Text>
            <Text style={[globalStyles.text, { fontSize: 16, color: '#FFFCF4' }]}>
              전체
            </Text>
          </View>
          <View style={{ borderRadius: 20, backgroundColor: '#5E4636', height: 120, width: 100, justifyContent: 'center', alignItems: 'center', gap: 5, transform: [{ rotate: '3deg' }] }}>
            <Text style={[globalStyles.text, { fontSize: 30, color: '#FFFCF4' }]}>
              {stats.failed}
            </Text>
            <Text style={[globalStyles.text, { fontSize: 14, color: '#FFFCF4' }]}>
              미달성
            </Text>
          </View>
        </View>
        
        {/* 도전과제 목록 */}
        {challenges.length > 0 ? (
          <FlatList
            data={challenges}
            renderItem={renderChallenge}
            keyExtractor={item => item._id || item.id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FFF44F']}
              />
            }
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[globalStyles.text, { fontSize: 16, color: '#FF909D', textAlign: 'center' }]}>
              아직 참여한 도전과제가 없습니다.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ChallengeList')}
              style={{
                marginTop: 15,
                backgroundColor: '#FFC300',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8
              }}
            >
              <Text style={[globalStyles.text, { color: '#5E4636', fontSize: 14, fontWeight: 'bold' }]}>
                도전과제 둘러보기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}