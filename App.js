import "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppNavigator from "./navigation/AppNavigator";
import BottomNavBar from "./navigation/BottomNavBar";

export default function App() {
  const [fontsLoaded] = useFonts({
    Cafe24Ssurround: require("./assets/fonts/Cafe24Ssurround.ttf"),
    "HakgyoansimPuzzle-Black": require("./assets/fonts/HakgyoansimPuzzle-Black.ttf"),
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();

    // 주기적으로 로그인 상태 체크 (10초마다)
    const interval = setInterval(checkLoginStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");
      const loginState = !!(token && user);

      if (loginState !== isLoggedIn) {
        console.log("로그인 상태 변경:", loginState);
        setIsLoggedIn(loginState);
      }
    } catch (error) {
      console.error("로그인 상태 확인 오류:", error);
      setIsLoggedIn(false);
    } finally {
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleLoginStateChange = (newLoginState) => {
    console.log("로그인 상태 수동 변경:", newLoginState);
    setIsLoggedIn(newLoginState);
    // 상태 변경 후 즉시 체크
    setTimeout(checkLoginStatus, 100);
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
      <AppNavigator onLoginStateChange={handleLoginStateChange} />
      {isLoggedIn && <BottomNavBar />}
    </View>
  );
}
