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
      setChallenges(data);
    } catch (error) {
      alert(error.message);
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

    const handleResize = () => {
      setNumColumns(getNumColumns());
    };

    Dimensions.addEventListener("change", handleResize);

    return () => {
      unsubscribe();
      Dimensions.removeEventListener("change", handleResize);
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
    const confirmed = confirm("정말로 이 도전과제를 삭제하시겠습니까?");
    if (confirmed) {
      try {
        await deleteChallenge(challengeId);
        fetchChallenges();
      } catch (error) {
        alert(error.message);
      }
    }
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
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.creator}>{item.creatorName}</Text>
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
