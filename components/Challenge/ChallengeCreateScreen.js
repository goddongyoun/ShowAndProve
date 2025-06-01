import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function ChallengeCreateScreen({ navigation }) {
  const handlePhotoUpload = () => {
    // TODO: 사진 업로드 기능 구현 예정
  };
  const handleSubmit = () => {
    // TODO: 제출 기능 구현 예정
  };
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>도전과제 생성</Text>
        <TextInput placeholder="도전과제 이름" style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, padding: 10 }} />
        <TextInput placeholder="도전과제 내용" style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, padding: 10, height: 100, textAlignVertical: 'top' }} multiline />
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8, marginBottom: 10 }} onPress={handlePhotoUpload}>
          <Text>사진 업로드</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8 }} onPress={handleSubmit}>
          <Text>제출</Text>
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