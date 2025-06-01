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
    Alert.alert(
      '도전과제 삭제',
      '정말로 이 도전과제를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChallenge(challengeId);
              fetchChallenges();
            } catch (error) {
              alert(error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderChallenge = ({ item }) => {
    console.log('Challenge Creator:', item.creator);
    const canDelete = currentUser && item.creator === currentUser.email;

    return (
      <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeList', { challenge: item })}
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
      <TouchableOpacity
        style={[globalStyles.button, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        onPress={() => navigation.navigate('ChallengeCreate')}
      >
        <Icon name="plus" size={20} color="#000" style={{ marginRight: 5 }} />
        <Text style={globalStyles.buttonText}>새 도전과제 만들기</Text>
      </TouchableOpacity>
    </View>
  );
}