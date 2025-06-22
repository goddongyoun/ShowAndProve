import React, { useState, useEffect, createRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../components/Auth/LoginScreen';
import RegisterScreen from '../components/Auth/RegisterScreen';
import AdminLoginScreen from '../components/Auth/AdminLoginScreen'; // Added back
import ChallengeCreateScreen from '../components/Challenge/ChallengeCreateScreen';
import ChallengeListScreen from '../components/Challenge/ChallengeListScreen';
import HomeScreen from '../screens/HomeScreen';
import ChallengeVerificationScreen from '../screens/ChallengeVerification';
import MyPage from '../screens/MyPage';
import ChallengeDetail from '../screens/ChallengeDetail';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen'; // Added back
import { TouchableOpacity, Text, View, Alert } from 'react-native';

const Stack = createStackNavigator();
export const navigationRef = createRef();

// 로그인이 필요한 화면들 목록
const PROTECTED_SCREENS = ['Home', 'ChallengeCreate', 'ChallengeList', 'ChallengeVerification', 'MyPage', 'ChallengeDetail', 'Leaderboard'];

// 헤더 표시 제어 변수 (true로 변경하면 헤더가 보임)
const SHOW_HEADER = false;

export default function AppNavigator({ onLogin, onLogout, isLoggedIn: parentIsLoggedIn }) {
  // MyPage 래퍼 컴포넌트 (AppNavigator 함수 내부로 이동)
  const MyPageWrapper = (props) => {
    return <MyPage {...props} route={{...props.route, params: {...props.route.params, onLogout}}} />;
  };
  const [isLoggedIn, setIsLoggedIn] = useState(parentIsLoggedIn || false);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작시 토큰 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    console.log('checkLoginStatus 함수 실행');
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      console.log('저장된 토큰:', token ? '있음' : '없음');
      console.log('저장된 사용자:', user ? '있음' : '없음');
      
      // 토큰과 사용자 정보가 모두 있어야 로그인 상태로 인정
      const loginState = !!(token && user);
      console.log('로그인 상태 설정:', loginState);
      setIsLoggedIn(loginState);
      
      // 로그인 상태라면 App.js에 사용자 정보 전달
      if (loginState && user && onLogin) {
        const userData = JSON.parse(user);
        await onLogin(userData);
      }
    } catch (error) {
      console.error('토큰 확인 오류:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    console.log('handleLogout 함수 호출됨');
    
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
      
      // App.js로 로그아웃 알림
      if (onLogout) {
        onLogout();
      }
      
      console.log('로그아웃 완료');
      
      // 로그인 화면으로 이동
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 로그인 성공 후 호출할 함수
  const onLoginSuccess = async (user) => {
    setIsLoggedIn(true);
    // App.js로 로그인 성공 알림
    if (onLogin) {
      await onLogin(user);
    }
  };

  // 보호된 화면 접근 시 로그인 체크
  const checkAuthBeforeNavigation = (routeName) => {
    if (PROTECTED_SCREENS.includes(routeName) && !isLoggedIn) {
      navigationRef.current?.navigate('Login');
      return false;
    }
    return true;
  };

  // 헤더 표시 여부 결정 (로그인/회원가입 화면에서는 숨김)
  const shouldShowHeader = (routeName) => {
    if (!SHOW_HEADER) return false; // 전역 헤더 숨김 설정
    return !['Login', 'Register'].includes(routeName);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>로딩 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        // 현재 화면이 보호된 화면인지 확인
        const currentRoute = state?.routes[state.index];
        if (currentRoute && PROTECTED_SCREENS.includes(currentRoute.name) && !isLoggedIn) {
          navigationRef.current?.navigate('Login');
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "Home" : "Login"}
        screenOptions={({ route, navigation }) => ({
          headerBackImage: () => null,
          headerBackTitleVisible: false,
          headerShown: shouldShowHeader(route.name),
          headerRight: () => shouldShowHeader(route.name) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isLoggedIn ? (
                // 로그인된 상태: 로그아웃 버튼 (MyPage에서만 표시)
                route.name === 'MyPage' ? (
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
                ) : null
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
          ) : null,
        })}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          initialParams={{ onLoginSuccess }}
        />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen 
          name="AdminLogin" 
          component={AdminLoginScreen}
          options={{ headerShown: false }} // Hide header for AdminLoginScreen
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChallengeCreate" component={ChallengeCreateScreen} />
        <Stack.Screen name="ChallengeList" component={ChallengeListScreen} />
        <Stack.Screen name="ChallengeVerification" component={ChallengeVerificationScreen} />
        <Stack.Screen 
          name="MyPage" 
          component={MyPageWrapper}
        />
        <Stack.Screen name="ChallengeDetail" component={ChallengeDetail} />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen}
          options={{ headerShown: false }} // Hide header for AdminDashboardScreen
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}