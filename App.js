import "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppNavigator from "./navigation/AppNavigator";
import BottomNavBar from "./navigation/BottomNavBar";
import { getCurrentUser } from "./services/authService";
import pushNotificationService from "./services/pushNotificationService";

// 앱 시작과 동시에 expo-notifications 경고/에러 완전 차단
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('functionality is not fully supported in Expo Go') ||
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead')) {
    return; // 완전 무시
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead') ||
      message.includes('Use a development build')) {
    return; // 완전 무시
  }
  originalError.apply(console, args);
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Cafe24Ssurround: require("./assets/fonts/Cafe24Ssurround.ttf"),
    "HakgyoansimPuzzle-Black": require("./assets/fonts/HakgyoansimPuzzle-Black.ttf"),
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setCurrentUser(user);
          // 알림 시스템 시작
          await pushNotificationService.startNotificationSystem(user.email);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 앱 종료 시 알림 시스템 정리
    return () => {
      pushNotificationService.stopNotificationSystem();
    };
  }, []);

  const handleLogin = async (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    // 로그인 시 알림 시스템 시작
    await pushNotificationService.startNotificationSystem(user.email);
  };

  const handleLogout = async () => {
    // 로그아웃 시 알림 시스템 중지
    pushNotificationService.stopNotificationSystem();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FFF44F" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppNavigator 
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
      />
      {isLoggedIn && <BottomNavBar />}
    </View>
  );
}
