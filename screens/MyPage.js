import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { globalStyles } from "../utils/styles";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCurrentUser } from "../services/authService";
import {
  getUserChallenges,
  getUserChallengeStats,
} from "../services/challengeService";
import api from "../services/api";
import pushNotificationService from "../services/pushNotificationService";

// 9개 카테고리 태그 정의
const AVAILABLE_TAGS = [
  '학습/공부',
  '운동/건강',
  '요리/생활',
  '창작/취미',
  '마음/명상',
  '사회/관계',
  '업무/커리어',
  '환경/지속가능',
  '도전/모험'
];

export default function MyPage({ navigation, route }) {
  const [challenges, setChallenges] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    total: 0,
    failed: 0,
  });
  const [userInterests, setUserInterests] = useState([]);
  const [showInterestModal, setShowInterestModal] = useState(false);

  // App.js에서 전달받은 로그인 상태 변경 콜백
  const onLoginStateChange = route?.params?.onLoginStateChange;

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      console.log("MyPage 초기화 시작...");
      const user = await getCurrentUser();
      console.log("Current User in MyPage:", user);

      if (user) {
        setCurrentUser(user);
        // 사용자 도전과제와 관심 태그를 병렬로 로드
        await Promise.all([
          fetchUserChallenges(user.email),
          loadUserInterests()
        ]);
      } else {
        // 사용자 정보가 없으면 로그인 화면으로 이동
        console.log("사용자 정보가 없습니다. 로그인 화면으로 이동합니다.");
        navigation.navigate("Login");
      }
    } catch (error) {
      console.error("MyPage 초기화 오류:", error);
      Alert.alert("오류", "사용자 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserInterests = async () => {
    try {
      const interestData = await api.userInterest.getUserInterests();
      console.log('서버에서 가져온 관심 태그 데이터:', interestData);
      
      // 서버에서 반환하는 데이터는 {tag_id, tag_name} 형태의 객체 배열
      // UI에서는 tag_name만 필요하므로 변환
      const tagNames = interestData.map(interest => interest.tag_name || interest.name);
      setUserInterests(tagNames);
      console.log('관심 태그 목록:', tagNames);
    } catch (error) {
      console.error("관심 태그 로드 오류:", error);
      setUserInterests([]);
    }
  };

  const handleInterestToggle = (tag) => {
    setUserInterests(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const saveUserInterests = async () => {
    try {
      if (!currentUser) return;
      
      console.log('관심 태그 저장 중...', userInterests);
      await api.userInterest.updateUserInterests(currentUser.email, userInterests);
      setShowInterestModal(false);
      Alert.alert("성공", "관심 태그가 서버에 저장되었습니다!");
      
      // 저장 후 다시 로드하여 서버 상태와 동기화
      await loadUserInterests();
    } catch (error) {
      console.error("관심 태그 저장 오류:", error);
      Alert.alert("오류", `관심 태그 저장에 실패했습니다: ${error.message}`);
    }
  };

  const fetchUserChallenges = async (userEmail) => {
    try {
      console.log("사용자 도전과제 조회 중...", userEmail);
      const userChallenges = await getUserChallenges(userEmail);
      console.log("사용자 도전과제:", userChallenges);

      // 데이터가 배열인지 확인
      const challengeArray = Array.isArray(userChallenges)
        ? userChallenges
        : [];
      setChallenges(challengeArray);

      // 같은 데이터로 통계 계산 (추가 API 호출 없음)
      console.log("사용자 통계 계산 중...");
      const stats = getUserChallengeStats(challengeArray);
      console.log("사용자 통계:", stats);
      setStats(stats);
    } catch (error) {
      console.error("도전과제 조회 오류:", error);
      // 오류 발생 시 빈 배열로 설정
      setChallenges([]);
      setStats({ completed: 0, total: 0, failed: 0 });

      // 사용자에게 알림 (선택적)
      if (error.message.includes("401") || error.message.includes("인증")) {
        Alert.alert("인증 오류", "다시 로그인해주세요.", [
          { text: "확인", onPress: () => navigation.navigate("Login") },
        ]);
      }
    }
  };

  const performLogout = async () => {
    try {
      console.log("로그아웃 실행 시작");

      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      console.log("AsyncStorage에서 토큰과 사용자 정보 삭제 완료");

      // App.js의 로그인 상태 업데이트
      if (onLoginStateChange) {
        console.log("onLoginStateChange 콜백 호출");
        onLoginStateChange(false);
      } else {
        console.log("onLoginStateChange 콜백이 없음");
      }

      console.log("로그인 화면으로 이동");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });

      // 웹 환경에서만 강제 새로고침 (안전하게 체크)
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.location
      ) {
        console.log("웹 환경에서 강제 새로고침");
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      console.error("로그아웃 오류:", error);
      if (Platform.OS === "web") {
        window.alert("로그아웃 중 문제가 발생했습니다.");
      } else {
        Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
      }
    }
  };

  const handleLogout = async () => {
    console.log("로그아웃 버튼 클릭됨");
    console.log("onLoginStateChange 콜백:", onLoginStateChange);

    // 플랫폼별로 다른 확인 방식 사용
    if (Platform.OS === "web") {
      // 웹에서는 브라우저 confirm 사용
      const confirmed = window.confirm("정말 로그아웃하시겠습니까?");
      if (confirmed) {
        await performLogout();
      }
    } else {
      // 모바일에서는 React Native Alert 사용
      Alert.alert("로그아웃", "정말 로그아웃하시겠습니까?", [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: performLogout,
        },
      ]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    initialize();
  };

  const handleChallengeClick = (challenge) => {
    navigation.navigate("ChallengeDetail", { challenge });
  };

  const handleTestNotification = async () => {
    try {
      console.log('테스트 알림 시작...');
      await pushNotificationService.sendTestNotification();
    } catch (error) {
      console.error('테스트 알림 오류:', error);
      Alert.alert('오류', '테스트 알림 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleManualCheck = async () => {
    try {
      console.log('수동 알림 체크 시작...');
      await pushNotificationService.checkNewChallengesByInterests();
      Alert.alert('완료', '관심 태그 기반 새 도전과제 체크가 완료되었습니다. 콘솔을 확인해주세요.');
    } catch (error) {
      console.error('수동 체크 오류:', error);
      Alert.alert('오류', '수동 체크 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 🆕 알림 시스템 디버깅 핸들러
  const handleNotificationDebug = async () => {
    try {
      console.log('알림 시스템 디버그 시작...');
      await pushNotificationService.debugNotificationSystem();
    } catch (error) {
      console.error('알림 디버그 오류:', error);
      Alert.alert('오류', '알림 디버그 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const renderChallenge = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: "#FFFFFF",
        padding: 15,
        borderWidth: 2,
        borderColor: "#FFE357",
        borderRadius: 14,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
      onPress={() => handleChallengeClick(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[globalStyles.text, { fontSize: 16, fontWeight: "bold" }]}>
          {item.title}
        </Text>
        <Text
          style={[
            globalStyles.text,
            { fontSize: 12, color: "#666", marginTop: 2 },
          ]}
        >
          생성일: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.isCreator && (
          <Text
            style={[
              globalStyles.text,
              { fontSize: 10, color: "#FF6B6B", marginTop: 2 },
            ]}
          >
            내가 생성한 도전과제
          </Text>
        )}
      </View>
      <View style={{ alignItems: "center" }}>
        <Text
          style={[
            globalStyles.text,
            {
              fontSize: 12,
              color: item.status === "완료" ? "#4CAF50" : "#FFA726",
              fontWeight: "bold",
            },
          ]}
        >
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FFF44F" />
        <Text style={[globalStyles.text, { marginTop: 10 }]}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { justifyContent: "space-between" }]}>
      {/* 사용자 정보 */}
      {currentUser && (
        <View style={{ marginBottom: 20, padding: 15 }}>
          <Text
            style={[
              globalStyles.text,
              {
                fontSize: 22,
                textAlign: "center",
                color: "#5E4636",
                marginBottom: 6,
              },
            ]}
          >
            {currentUser.name}님의 도전과제
          </Text>
          <Text
            style={[
              globalStyles.text,
              { fontSize: 14, color: "#CDBCB0", textAlign: "center" },
            ]}
          >
            {currentUser.email}
          </Text>

          {/* 관심 태그 설정 버튼 */}
          <TouchableOpacity
            onPress={() => setShowInterestModal(true)}
            style={{
              marginTop: 10,
              backgroundColor: "#FFE357",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text
              style={[
                globalStyles.text,
                { color: "#5E4636", fontSize: 14, fontWeight: "bold" },
              ]}
            >
              관심 태그 설정 ({userInterests.length})
            </Text>
          </TouchableOpacity>

          {/* 알림 테스트 버튼 */}
          <TouchableOpacity
            onPress={handleTestNotification}
            style={{
              marginTop: 10,
              backgroundColor: "#4CAF50",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text
              style={[
                globalStyles.text,
                { color: "white", fontSize: 14, fontWeight: "bold" },
              ]}
            >
              🔔 실제 푸시 알림 테스트
            </Text>
          </TouchableOpacity>

          {/* 수동 알림 체크 버튼 */}
          <TouchableOpacity
            onPress={handleManualCheck}
            style={{
              marginTop: 10,
              backgroundColor: "#FF9800",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text
              style={[
                globalStyles.text,
                { color: "white", fontSize: 14, fontWeight: "bold" },
              ]}
            >
              🔍 관심 태그 알림 수동 체크
            </Text>
          </TouchableOpacity>

          {/* 알림 시스템 디버깅 버튼 */}
          <TouchableOpacity
            onPress={handleNotificationDebug}
            style={{
              marginTop: 10,
              backgroundColor: "#FF6B6B",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text
              style={[
                globalStyles.text,
                { color: "white", fontSize: 14, fontWeight: "bold" },
              ]}
            >
              🔍 알림 시스템 디버깅
            </Text>
          </TouchableOpacity>

          {/* 로그아웃 버튼 */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginTop: 10,
              backgroundColor: "#FF6B6B",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text
              style={[
                globalStyles.text,
                { color: "white", fontSize: 14, fontWeight: "bold" },
              ]}
            >
              로그아웃
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {/* 통계 섹션 */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 15,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              borderRadius: 20,
              backgroundColor: "#5E4636",
              height: 120,
              width: 100,
              justifyContent: "center",
              alignItems: "center",
              gap: 5,
              transform: [{ rotate: "-3deg" }],
            }}
          >
            <Text
              style={[globalStyles.text, { fontSize: 30, color: "#FFFCF4" }]}
            >
              {stats.completed}
            </Text>
            <Text
              style={[globalStyles.text, { fontSize: 14, color: "#FFFCF4" }]}
            >
              달성
            </Text>
          </View>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: "#5E4636",
              height: 150,
              width: 120,
              justifyContent: "center",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Text
              style={[globalStyles.text, { fontSize: 40, color: "#FFFCF4" }]}
            >
              {stats.total}
            </Text>
            <Text
              style={[globalStyles.text, { fontSize: 16, color: "#FFFCF4" }]}
            >
              전체
            </Text>
          </View>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: "#5E4636",
              height: 120,
              width: 100,
              justifyContent: "center",
              alignItems: "center",
              gap: 5,
              transform: [{ rotate: "3deg" }],
            }}
          >
            <Text
              style={[globalStyles.text, { fontSize: 30, color: "#FFFCF4" }]}
            >
              {stats.failed}
            </Text>
            <Text
              style={[globalStyles.text, { fontSize: 14, color: "#FFFCF4" }]}
            >
              미달성
            </Text>
          </View>
        </View>

        {/* 도전과제 목록 */}
        {challenges.length > 0 ? (
          <FlatList
            data={challenges}
            renderItem={renderChallenge}
            keyExtractor={(item) =>
              item._id || item.id || Math.random().toString()
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#FFF44F"]}
              />
            }
          />
        ) : (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text
              style={[
                globalStyles.text,
                { fontSize: 16, color: "#FF909D", textAlign: "center" },
              ]}
            >
              아직 참여한 도전과제가 없습니다.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{
                marginTop: 15,
                backgroundColor: "#FFC300",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text
                style={[
                  globalStyles.text,
                  { color: "#5E4636", fontSize: 14, fontWeight: "bold" },
                ]}
              >
                도전과제 둘러보기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 관심 태그 설정 모달 */}
      <Modal
        visible={showInterestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInterestModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#FFFCF4',
            borderRadius: 20,
            padding: 20,
            width: '90%',
            maxHeight: '80%',
          }}>
            <Text style={[globalStyles.text, {
              fontSize: 20,
              fontWeight: 'bold',
              color: '#5E4636',
              textAlign: 'center',
              marginBottom: 20,
            }]}>
              관심 태그 설정
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={[globalStyles.text, {
                fontSize: 14,
                color: '#666',
                marginBottom: 15,
                textAlign: 'center',
              }]}>
                관심있는 태그를 선택하면 해당 태그의 새로운 도전과제 알림을 받을 수 있습니다.
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {AVAILABLE_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 25,
                      borderWidth: 2,
                      borderColor: userInterests.includes(tag) ? '#FFE357' : '#DDD',
                      backgroundColor: userInterests.includes(tag) ? '#FFE357' : '#FFF',
                      minWidth: 100,
                      alignItems: 'center',
                    }}
                    onPress={() => handleInterestToggle(tag)}
                  >
                    <Text style={[
                      globalStyles.text,
                      {
                        fontSize: 14,
                        color: userInterests.includes(tag) ? '#5E4636' : '#666',
                        fontWeight: userInterests.includes(tag) ? 'bold' : 'normal'
                      }
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {userInterests.length > 0 && (
                <Text style={[globalStyles.text, {
                  fontSize: 12,
                  color: '#666',
                  marginTop: 15,
                  textAlign: 'center',
                }]}>
                  선택된 태그: {userInterests.join(', ')}
                </Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#DDD',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowInterestModal(false)}
              >
                <Text style={[globalStyles.text, { color: '#666', fontWeight: 'bold' }]}>
                  취소
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FFE357',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={saveUserInterests}
              >
                <Text style={[globalStyles.text, { color: '#5E4636', fontWeight: 'bold' }]}>
                  저장
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
