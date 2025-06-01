//사용자가 입력한 도전과제 정보(제목, 내용, 날짜 등) 출력하는 페이지

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomNavBar from '../navigation/BottomNavBar';

export default function ChallengeDetail({ route, navigation }) {
  // 더미 도전과제 정보 (실제 구현할 때 데이터베이스에서 정보 받아오게끔 해야 됨)
  const challenge = route?.params?.challenge || {
    title: '도전과제 제목',
    description: '도전과제 내용',
    creator: '작성자',
    createdAt: '2024-01-01',
  };

  // 도전과제 인증 버튼 클릭 핸들러 (빈 함수)
  const handleVerify = () => {
    navigation.navigate('ChallengeVerification', { challengeId: challenge.id });
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>{challenge.title}</Text>
        <Text style={{ marginBottom: 10 }}>{challenge.description}</Text>
        <Text style={{ color: '#888', marginBottom: 10 }}>작성자: {challenge.creator}</Text>
        <Text style={{ color: '#888', marginBottom: 20 }}>생성일: {challenge.createdAt}</Text>
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8 }} onPress={handleVerify}>
          <Text>도전과제 인증</Text>
        </TouchableOpacity>
      </View>
      {/* 네비게이션 바 */}
      <BottomNavBar navigation={navigation} />
    </View>
  );
} 