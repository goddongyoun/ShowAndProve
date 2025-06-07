import React, { useState, useEffect, createRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../components/Auth/LoginScreen';
import RegisterScreen from '../components/Auth/RegisterScreen';
import ChallengeCreateScreen from '../components/Challenge/ChallengeCreateScreen';
import ChallengeListScreen from '../components/Challenge/ChallengeListScreen';
import HomeScreen from '../screens/HomeScreen';
import ChallengeVerificationScreen from '../screens/ChallengeVerification';
import MyPage from '../screens/MyPage';
import ChallengeDetail from '../screens/ChallengeDetail';
import { TouchableOpacity, Text, View, Alert } from 'react-native';

const Stack = createStackNavigator();
export const navigationRef = createRef();

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 앱 시작시 토큰 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    console.log('checkLoginStatus 함수 실행');
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('저장된 토큰:', token ? '있음' : '없음');
      const loginState = !!token;
      console.log('로그인 상태 설정:', loginState);
      setIsLoggedIn(loginState); // token이 있으면 true, 없으면 false
    } catch (error) {
      console.error('토큰 확인 오류:', error);
      setIsLoggedIn(false);
    }
  };

  // 로그아웃 처리 (Alert 없이 바로 로그아웃)
  const handleLogout = async () => {
    console.log('handleLogout 함수 호출됨');
    
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
      console.log('로그아웃 완료');
      
      // 새로고침
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 로그인 성공 후 호출할 함수 (필요시 사용)
  const onLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        // 화면 전환시마다 로그인 상태 체크
        checkLoginStatus();
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={({ navigation }) => ({
          headerBackImage: () => null,
          headerBackTitleVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={{ marginRight: 10, backgroundColor: '#eee', padding: 8, borderRadius: 8 }}
              >
                <Text>메인페이지</Text>
              </TouchableOpacity>
              
              {isLoggedIn && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MyPage')}
                  style={{ marginRight: 10, backgroundColor: '#ccffcc', padding: 8, borderRadius: 8 }}
                >
                  <Text>마이페이지</Text>
                </TouchableOpacity>
              )}
              
              {isLoggedIn ? (
                // 로그인된 상태: 로그아웃 버튼
                <TouchableOpacity
                  onPress={() => {
                    console.log('로그아웃 버튼 클릭됨');
                    console.log('isLoggedIn 상태:', isLoggedIn);
                    handleLogout();
                  }}
                  style={{ marginRight: 15, backgroundColor: '#ffcccc', padding: 8, borderRadius: 8 }}
                >
                  <Text>로그아웃</Text>
                </TouchableOpacity>
              ) : (
                // 로그인 안된 상태: 로그인 버튼
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={{ marginRight: 15, backgroundColor: '#eee', padding: 8, borderRadius: 8 }}
                >
                  <Text>로그인</Text>
                </TouchableOpacity>
              )}
            </View>
          ),
        })}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChallengeCreate" component={ChallengeCreateScreen} />
        <Stack.Screen name="ChallengeList" component={ChallengeListScreen} />
        <Stack.Screen name="ChallengeVerification" component={ChallengeVerificationScreen} />
        <Stack.Screen name="MyPage" component={MyPage} />
        <Stack.Screen name="ChallengeDetail" component={ChallengeDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}