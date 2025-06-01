import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function MyPage({ navigation }) {
  const handleChallengeClick = (challenge) => {
    navigation.navigate('ChallengeDetail', { challenge });
  };
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text>달성: 0</Text>
          <Text>전체: 0</Text>
          <Text>미달성: 0</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8, marginBottom: 10 }} onPress={() => handleChallengeClick({ title: '도전과제1', description: '도전과제1 내용', creator: '나', createdAt: '2024-01-01' })}>
          <Text>도전과제1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8, marginBottom: 10 }} onPress={() => handleChallengeClick({ title: '도전과제2', description: '도전과제2 내용', creator: '나', createdAt: '2024-01-02' })}>
          <Text>도전과제2</Text>
        </TouchableOpacity>
      </View>
      {/* 네비게이션 바 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ padding: 10 }}>
          <Text>메인</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MyPage')} style={{ padding: 10 }}>
          <Text>마이페이지</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChallengeCreate')} style={{ padding: 10 }}>
          <Text>도전과제 생성</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 