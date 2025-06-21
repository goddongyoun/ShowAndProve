import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigationRef } from "./AppNavigator";

// 로그인이 필요한 화면들
const PROTECTED_SCREENS = ["Home", "ChallengeCreate", "MyPage", "Leaderboard"];

export default function BottomNavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();

    // 주기적으로 로그인 상태 체크 (2초마다)
    const interval = setInterval(checkLoginStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");
      const loginState = !!(token && user);
      setIsLoggedIn(loginState);
    } catch (error) {
      console.error("로그인 상태 확인 오류:", error);
      setIsLoggedIn(false);
    }
  };

  const navigate = (screenName) => {
    // 보호된 화면에 접근하려 할 때 로그인 상태 체크
    if (PROTECTED_SCREENS.includes(screenName) && !isLoggedIn) {
      navigationRef.current?.navigate("Login");
      return;
    }
    navigationRef.current?.navigate(screenName);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#FFC300",
      }}
    >
      <TouchableOpacity
        onPress={() => navigate("Leaderboard")}
        style={{ padding: 10 }}
      >
        <Icon name="trophy-variant-outline" size={30} color="#FFFFFF" />
        {/* <Text>리더보드</Text> */}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigate("Home")}
        style={{ padding: 10 }}
      >
        <Icon name="home-outline" size={30} color="#FFFFFF" />
        {/* <Text>메인</Text> */}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigate("ChallengeCreate")}
        style={{ padding: 10 }}
      >
        <Icon name="plus-circle-outline" size={30} color="#FFFFFF" />
        {/* <Text>도전과제 생성</Text> */}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigate("MyPage")}
        style={{ padding: 10 }}
      >
        <Icon name="account-outline" size={30} color="#FFFFFF" />
        {/* <Text>마이페이지</Text> */}
      </TouchableOpacity>
      {/* <TouchableOpacity onPress={() => navigate('')} style={{ padding: 10 }}>
        <Icon name="logout-variant" size={30} color="#FFFFFF" />
      </TouchableOpacity> */}
    </View>
  );
}
