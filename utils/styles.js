import { StyleSheet, Platform } from "react-native";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffcf4", // 배경 색
    padding: 20,
    // paddingTop: 20,
    ...(Platform.OS === "web" && {
      width: "100%",
      alignSelf: "center",
    }),
  },
  title: {
    fontFamily: "Cafe24Ssurround",
    fontSize: 24,
    color: "#000000",
    marginBottom: 20,
  },
  text: {
    fontFamily: "Cafe24Ssurround",
    fontSize: 16,
    color: "#333333",
  },
  input: {
    borderWidth: 2,
    borderColor: "#FFD400",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontFamily: "Cafe24Ssurround",
    fontSize: 12,
    backgroundColor: "#FFFFFF",
    placeholderTextColor: "#FFEB88",
  },
  button: {
    backgroundColor: "#FFC300", // 메인컬러
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    fontFamily: "Cafe24Ssurround",
    fontSize: 16,
    color: "#FFFFFF", // 화이트
  },
  logo: {
    //로고 스타일
    width: 120,
    height: 120,
    marginBottom: 4,
    alignSelf: "center",
  },
  wordmark: {
    // 워드마크 스타일
    fontFamily: "HakgyoansimPuzzle-Black",
    fontSize: 20,
    color: "#333333",
    marginBottom: 20,
    alignSelf: "center",
  },
});
