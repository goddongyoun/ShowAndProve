import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import BottomNavBar from '../../navigation/BottomNavBar';
import { createChallenge } from '../../services/authService';

export default function ChallengeCreateScreen({ navigation }) {
  const [challengeName, setChallengeName] = useState('');
  const [challengeContent, setChallengeContent] = useState('');

  const handleSubmit = async () => {
    if (!challengeName.trim() || !challengeContent.trim()) {
      alert('도전과제 이름과 내용을 모두 입력해주세요');
      return;
    }

    try {
      const challengeData = {
        title: challengeName,
        content: challengeContent
      };

      await createChallenge(challengeData);
      alert('도전과제가 성공적으로 생성되었습니다!');
      navigation.goBack(); // 이전 화면으로 돌아가기
    } catch (error) {
      console.error('도전과제 생성 오류:', error);
      alert(error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>도전과제 생성</Text>
        
        <TextInput 
          placeholder="도전과제 이름" 
          value={challengeName}
          onChangeText={setChallengeName}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, padding: 10 }} 
        />
        
        <TextInput 
          placeholder="도전과제 내용" 
          value={challengeContent}
          onChangeText={setChallengeContent}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, padding: 10, height: 100, textAlignVertical: 'top' }} 
          multiline 
        />
        
        <TouchableOpacity 
          style={{ backgroundColor: '#eee', padding: 15, borderRadius: 8 }} 
          onPress={handleSubmit}
        >
          <Text>도전과제 생성</Text>
        </TouchableOpacity>
      </View>
      
      {/* 네비게이션 바 */}
      <BottomNavBar navigation={navigation} />
    </View>
  );
}