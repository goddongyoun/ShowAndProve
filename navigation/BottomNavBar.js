import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { navigationRef } from './AppNavigator';

export default function BottomNavBar() {
  const navigate = (screenName) => {
    navigationRef.current?.navigate(screenName);
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFC300' }}>
      <TouchableOpacity onPress={() => navigate('Home')} style={{ padding: 10 }}>
        <Icon name="home-outline" size={30} color="#FFFFFF" />
        {/* <Text>메인</Text> */}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate('ChallengeCreate')} style={{ padding: 10 }}>
        <Icon name="plus-circle-outline" size={30} color="#FFFFFF" />
        {/* <Text>도전과제 생성</Text> */}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate('MyPage')} style={{ padding: 10 }}>
        <Icon name="account-outline" size={30} color="#FFFFFF" />
        {/* <Text>마이페이지</Text> */}
      </TouchableOpacity>
    </View>
  );
} 