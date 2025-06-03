import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import BottomNavBar from '../navigation/BottomNavBar';
import { getCurrentUser } from '../services/authService';
import { getUserChallenges } from '../services/challengeService';

export default function MyPage({ navigation }) {
  const [challenges, setChallenges] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completed: 0,
    total: 0,
    failed: 0
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('MyPage 초기화 시작...');
        const user = await getCurrentUser();
        console.log('Current User in MyPage:', user);
        setCurrentUser(user);
        
        if (user) {
          await fetchUserChallenges(user.email);
        }
      } catch (error) {
        console.error('MyPage 초기화 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchUserChallenges = async (userEmail) => {
    try {
      console.log('사용자 도전과제 조회 중...', userEmail);
      const userChallenges = await getUserChallenges(userEmail);
      console.log('사용자 도전과제:', userChallenges);
      
      setChallenges(userChallenges);
      
      // 통계 계산
      const completed = userChallenges.filter(c => c.status === '완료').length;
      const failed = userChallenges.filter(c => c.status === '실패').length;
      const total = userChallenges.length;
      
      setStats({
        completed,
        total,
        failed
      });
    } catch (error) {
      console.error('도전과제 조회 오류:', error);
    }
  };

  const handleChallengeClick = (challenge) => {
    navigation.navigate('ChallengeDetail', { challenge });
  };

  const renderChallenge = ({ item }) => (
    <TouchableOpacity 
      style={{ 
        backgroundColor: '#eee', 
        padding: 15, 
        borderRadius: 8, 
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }} 
      onPress={() => handleChallengeClick(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
          생성일: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={{ 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 4,
        backgroundColor: item.status === '완료' ? '#4CAF50' : 
                        item.status === '실패' ? '#F44336' : '#FFC107'
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 12, 
          fontWeight: 'bold' 
        }}>
          {item.status || '진행중'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFF44F" />
        <Text style={{ marginTop: 10 }}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        {/* 통계 섹션 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            달성: {stats.completed}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            전체: {stats.total}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            미달성: {stats.failed}
          </Text>
        </View>

        {/* 사용자 정보 */}
        {currentUser && (
          <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {currentUser.name}님의 도전과제
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {currentUser.email}
            </Text>
          </View>
        )}

        {/* 도전과제 목록 */}
        {challenges.length > 0 ? (
          <FlatList
            data={challenges}
            renderItem={renderChallenge}
            keyExtractor={item => item._id || item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>
              아직 참여한 도전과제가 없습니다.
            </Text>
          </View>
        )}
      </View>

      {/* 네비게이션 바 */}
      <BottomNavBar navigation={navigation} />
    </View>
  );
}