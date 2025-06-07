import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { globalStyles } from '../utils/styles';
import { getChallenges, deleteChallenge } from '../services/challengeService';
import { getCurrentUser } from '../services/authService'; // authService에서 임포트
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function HomeScreen({ navigation }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchChallenges = async () => {
    try {
      const data = await getChallenges();
      setChallenges(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Fetching current user...');
        const user = await getCurrentUser();
        console.log('Current User:', user);
        setCurrentUser(user);
        await fetchChallenges();
      } catch (error) {
        console.error('HomeScreen Initialization Error:', error);
        alert('사용자 정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
      }
    };
    initialize();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchChallenges();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = async (challengeId) => {
    const confirmed = confirm('정말로 이 도전과제를 삭제하시겠습니까?');
    if (confirmed) {
      try {
        await deleteChallenge(challengeId);
        fetchChallenges();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  // 새 도전과제 만들기 버튼 클릭 시 로그인 확인
  const handleCreateChallenge = () => {
    console.log('handleCreateChallenge 함수 호출됨');
    console.log('currentUser 상태:', currentUser);
    console.log('currentUser 타입:', typeof currentUser);
    console.log('currentUser가 null인가?', currentUser === null);
    console.log('currentUser가 undefined인가?', currentUser === undefined);
    console.log('!currentUser 결과:', !currentUser);
    
    if (!currentUser) {
      console.log('로그인 안됨 - alert 표시');
      alert('로그인이 필요한 작업입니다');
      return;
    }
    
    console.log('로그인됨 - ChallengeCreate 화면으로 이동');
    // 로그인되어 있으면 도전과제 생성 페이지로 이동
    navigation.navigate('ChallengeCreate');
  };

  const renderChallenge = ({ item }) => {
    console.log('Challenge Creator:', item.creator);
    const canDelete = currentUser && item.creator === currentUser.email;

    return (
      <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeDetail', { challenge: item })}  // ← 변경됨
          style={{ flex: 1 }}
        >
          <Text style={[globalStyles.text, { fontSize: 18 }]}>{item.title}</Text>
          <Text style={[globalStyles.text, { color: '#666', fontSize: 14 }]}>Created by: {item.creatorName}</Text>
        </TouchableOpacity>
        {canDelete ? (
          <TouchableOpacity onPress={() => handleDelete(item._id)}>
            <Icon name="trash-can-outline" size={24} color="#FF4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFF44F" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>도전과제 목록</Text>
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={item => item._id}
        style={{ marginBottom: 20 }}
      />
      {/* <TouchableOpacity
        style={[globalStyles.button, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        onPress={handleCreateChallenge} // 변경된 부분
      >
        <Icon name="plus" size={20} color="#000" style={{ marginRight: 5 }} />
        <Text style={globalStyles.buttonText}>새 도전과제 만들기</Text>
      </TouchableOpacity> // 하단 네비게이션바에 도전과제 생성 기능 존재함 그래서 일단 주석함 */} 
    </View>
  );
}