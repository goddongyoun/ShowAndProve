import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { globalStyles } from "../utils/styles";
import { getChallenges, deleteChallenge } from "../services/challengeService";
import { getCurrentUser } from "../services/authService"; // authService에서 임포트
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
// BottomNavBar import 제거 - 순환 참조 방지

export default function HomeScreen({ navigation }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const getNumColumns = () => {
    const { width } = Dimensions.get("window");
    if (Platform.OS === "web") {
      if (width < 768) return 1;
      if (width < 1024) return 2;
      if (width < 1440) return 3;
      return 4;
    }
    return 1;
  };

  const [numColumns, setNumColumns] = useState(getNumColumns());

  const fetchChallenges = async () => {
    try {
      const data = await getChallenges();
      // 데이터가 배열인지 확인하고 안전하게 처리
      if (Array.isArray(data)) {
        setChallenges(data.filter(item => item && typeof item === 'object'));
      } else {
        console.warn('getChallenges가 배열이 아닌 데이터를 반환했습니다:', data);
        setChallenges([]);
      }
    } catch (error) {
      console.error('도전과제 목록 조회 오류:', error);
      Alert.alert("오류", "도전과제 목록을 불러오는 중 오류가 발생했습니다: " + error.message);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Fetching current user...");
        const user = await getCurrentUser();
        console.log("Current User:", user);
        setCurrentUser(user);
        await fetchChallenges();
      } catch (error) {
        console.error("HomeScreen Initialization Error:", error);
        alert(
          "사용자 정보를 불러오는 중 오류가 발생했습니다: " + error.message
        );
      }
    };
    initialize();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchChallenges();
    });

    // Dimensions 이벤트 리스너를 새로운 방식으로 처리
    const subscription = Dimensions.addEventListener("change", () => {
      setNumColumns(getNumColumns());
    });

    return () => {
      unsubscribe();
      subscription?.remove(); // 새로운 방식으로 제거
    };
  }, [navigation]);

  const formatData = (data, columns) => {
    const dataCopy = [...data];
    const fullRows = Math.floor(dataCopy.length / columns);
    let lastRowElements = dataCopy.length - fullRows * columns;
    while (lastRowElements !== columns && lastRowElements !== 0) {
      dataCopy.push({ _id: `blank-${lastRowElements}`, isEmpty: true });
      lastRowElements++;
    }
    return dataCopy;
  };

  const handleDelete = async (challengeId) => {
    console.log('=== 도전과제 삭제 시작 ===');
    console.log('삭제할 도전과제 ID:', challengeId);
    console.log('현재 플랫폼:', Platform.OS);
    console.log('현재 사용자:', currentUser);
    
    try {
      console.log('deleteChallenge API 호출 중...');
      const result = await deleteChallenge(challengeId);
      console.log('deleteChallenge API 응답:', result);
      
      console.log('삭제 성공, 목록 새로고침 중...');
      await fetchChallenges(); // 목록 새로고침
      
      console.log('목록 새로고침 완료');
      
      // 플랫폼별 알림
      if (Platform.OS === 'web') {
        alert("도전과제가 성공적으로 삭제되었습니다.");
      } else {
        Alert.alert("성공", "도전과제가 성공적으로 삭제되었습니다.");
      }
    } catch (error) {
      console.error("=== 도전과제 삭제 오류 ===");
      console.error("오류 상세:", error);
      console.error("오류 메시지:", error.message);
      
      // 플랫폼별 오류 알림
      if (Platform.OS === 'web') {
        alert("도전과제 삭제 중 오류가 발생했습니다: " + error.message);
      } else {
        Alert.alert("오류", "도전과제 삭제 중 오류가 발생했습니다: " + error.message);
      }
    }
    
    console.log('=== 도전과제 삭제 완료 ===');
  };

  // 새 도전과제 만들기 버튼 클릭 시 로그인 확인
  const handleCreateChallenge = () => {
    console.log("handleCreateChallenge 함수 호출됨");
    console.log("currentUser 상태:", currentUser);
    console.log("currentUser 타입:", typeof currentUser);
    console.log("currentUser가 null인가?", currentUser === null);
    console.log("currentUser가 undefined인가?", currentUser === undefined);
    console.log("!currentUser 결과:", !currentUser);

    if (!currentUser) {
      console.log("로그인 안됨 - alert 표시");
      alert("로그인이 필요한 작업입니다");
      return;
    }

    console.log("로그인됨 - ChallengeCreate 화면으로 이동");
    // 로그인되어 있으면 도전과제 생성 페이지로 이동
    navigation.navigate("ChallengeCreate");
  };

  const renderChallenge = ({ item }) => {
    if (item.isEmpty) {
      return <View style={[styles.itemContainer, styles.itemInvisible]} />;
    }

    // 안전한 객체 접근
    if (!item || typeof item !== 'object') {
      return <View style={[styles.itemContainer, styles.itemInvisible]} />;
    }

    // 현재 사용자가 이 도전과제의 작성자인지 확인
    const isOwner = currentUser && currentUser.email && item.creator && 
                   (item.creator === currentUser.email || item.creator === currentUser.id);

    // 웹에서 이벤트 처리를 위한 함수
    const handleDeletePress = (e) => {
      // 이벤트 전파 중단 (웹과 모바일 모두 지원)
      if (Platform.OS === 'web') {
        if (e && e.nativeEvent) {
          e.nativeEvent.stopPropagation();
          e.nativeEvent.preventDefault();
        }
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
        if (e && e.preventDefault) {
          e.preventDefault();
        }
      } else {
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
      }
      
      console.log('삭제 버튼 클릭됨, 도전과제 ID:', item._id || item.id);
      console.log('현재 플랫폼:', Platform.OS);
      
      // 플랫폼별 알림 처리
      if (Platform.OS === 'web') {
        // 웹에서는 confirm 사용
        const confirmed = window.confirm("정말로 이 도전과제를 삭제하시겠습니까?");
        if (confirmed) {
          console.log('웹 삭제 확인됨, handleDelete 호출');
          handleDelete(item._id || item.id);
        }
      } else {
        // 모바일에서는 Alert 사용
        Alert.alert(
          "도전과제 삭제",
          "정말로 이 도전과제를 삭제하시겠습니까?",
          [
            {
              text: "취소",
              style: "cancel",
            },
            {
              text: "삭제",
              style: "destructive",
              onPress: () => {
                console.log('모바일 삭제 확인됨, handleDelete 호출');
                handleDelete(item._id || item.id);
              },
            },
          ]
        );
      }
    };

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ChallengeDetail", { challenge: item })
          }
          style={styles.card}
        >
          <View style={styles.thumbnail}>
            <Icon name="trophy-award" size={50} color="#E0DACE" />
          </View>
          <View style={styles.infoContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title || "제목 없음"}
                </Text>
                <Text style={styles.creator}>{item.creatorName || item.creator || "작성자 없음"}</Text>
              </View>
              
              {/* 작성자만 삭제 버튼 보이기 */}
              {isOwner && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FF6B6B",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginLeft: 8,
                  }}
                  onPress={handleDeletePress}
                  activeOpacity={0.7}
                  {...(Platform.OS === 'web' && {
                    onPressIn: (e) => {
                      e.stopPropagation();
                    },
                    onPressOut: (e) => {
                      e.stopPropagation();
                    }
                  })}
                >
                  <Icon name="delete" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          globalStyles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#FFF44F" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Text
        style={[
          globalStyles.title,
          { color: "#5E4636", textAlign: "center", marginTop: 20 },
        ]}
      >
        도전과제 목록
      </Text>
      <FlatList
        data={formatData(challenges, numColumns)}
        renderItem={renderChallenge}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.listContainer}
      />
      {/* <TouchableOpacity
        style={[globalStyles.button, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        onPress={handleCreateChallenge} // 변경된 부분
      >
        <Icon name="plus" size={20} color="#000" style={{ marginRight: 5 }} />
        <Text style={globalStyles.buttonText}>새 도전과제 만들기</Text>
      </TouchableOpacity> // 하단 네비게이션바에 도전과제 생성 기능 존재함 그래서 일단 주석함 */}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 10,
    paddingHorizontal: Platform.OS === "web" ? 4 : 0,
  },
  itemContainer: {
    flex: 1,
    padding: 8,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: "#F0EAD6",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        height: "100%",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#FAF8F1",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontFamily: "Cafe24Ssurround",
    fontSize: 16,
    fontWeight: "bold",
    color: "#5E4636",
    minHeight: 38, // 2줄 높이 확보
  },
  creator: {
    fontFamily: "Cafe24Ssurround",
    fontSize: 14,
    color: "#8A7968",
    marginTop: 4,
  },
});
