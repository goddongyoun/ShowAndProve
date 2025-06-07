import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function BottomNavBar({ navigation }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFC300' }}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ padding: 10 }}>
        <Icon name="home-outline" size={30} color="#FFFFFF" />
        {/* <Text>메인</Text> */}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ChallengeCreate')} style={{ padding: 10 }}>
        <Icon name="plus-circle-outline" size={30} color="#FFFFFF" />
        {/* <Text>도전과제 생성</Text> */}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('MyPage')} style={{ padding: 10 }}>
        <Icon name="account-outline" size={30} color="#FFFFFF" />
        {/* <Text>마이페이지</Text> */}
      </TouchableOpacity>
    </View>
  );
} 