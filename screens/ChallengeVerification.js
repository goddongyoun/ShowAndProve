import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';

export default function ChallengeVerificationScreen({ navigation }) {
  // 인증 사진 목록 더미 데이터
  const dummyPhotos = [];

  // 인증 사진 업로드 버튼 클릭 핸들러 
  const handleUploadPhoto = () => {
    // TODO: 인증 사진 업로드 기능 구현 예정
  };

  // 인증 제출 버튼 클릭 핸들러 
  const handleSubmitVerification = () => {
    // TODO: 인증 제출 기능 구현 예정
  };

  // 인증 사진 목록 렌더링 (더미)
  const renderPhoto = ({ item }) => (
    <Image source={{ uri: item.uri }} style={{ width: 100, height: 100, margin: 5 }} />
  );

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>도전과제 인증</Text>
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8, marginBottom: 20 }} onPress={handleUploadPhoto}>
          <Text>인증 사진 업로드</Text>
        </TouchableOpacity>
        <FlatList
          data={dummyPhotos}
          renderItem={renderPhoto}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          style={{ marginBottom: 20 }}
        />
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8 }} onPress={handleSubmitVerification}>
          <Text>인증 제출</Text>
        </TouchableOpacity>
      </View>
      {/* 네비게이션 바 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ padding: 10 }}>
          <Text>메인</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MyPage')} style={{ padding: 10 }}>
          <Text>마이페이지</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChallengeCreate')} style={{ padding: 10 }}>
          <Text>도전과제 생성</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 