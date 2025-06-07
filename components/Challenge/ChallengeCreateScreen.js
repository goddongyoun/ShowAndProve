import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import BottomNavBar from '../../navigation/BottomNavBar';
import { createChallenge } from '../../services/authService';
import {globalStyles} from '../../utils/styles';

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
    <View style={[globalStyles.container, { flex: 1, padding: 20, justifyContent: 'space-between' }]}>
      <View>
        <Text style={[globalStyles.text, { fontSize: 24, marginBottom: 20, color: '#5E4636', textAlign: 'center' }]}>도전과제를 생성하세요!</Text>
        
        <TextInput 
          placeholder="도전과제 이름" 
          value={challengeName}
          onChangeText={setChallengeName}
          style={[globalStyles.input, { marginBottom: 10 }]} 
        />
        
        <TextInput 
          placeholder="도전과제 내용" 
          value={challengeContent}
          onChangeText={setChallengeContent}
          style={[globalStyles.input, { marginBottom: 10, height: 100, textAlignVertical: 'top' }]} 
          multiline 
        />
        
        <TouchableOpacity 
          style={[globalStyles.button, { padding: 15, borderRadius: 8 }]} 
          onPress={handleSubmit}
        >
          <Text style={[globalStyles.text, { fontSize: 16, color: '#FFFFFF' }]}>도전과제 생성</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}