import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

export default function BottomNavBar({ navigation }) {
  return (
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
  );
} 