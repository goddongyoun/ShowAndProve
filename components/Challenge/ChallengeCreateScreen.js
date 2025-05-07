import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { globalStyles } from '../../utils/styles';
import { createChallenge } from '../../services/challengeService';
import { getCurrentUser } from '../../services/authService'; // authService에서 임포트
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ChallengeCreateScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Fetching current user in ChallengeCreateScreen...');
        const user = await getCurrentUser();
        console.log('Current User in ChallengeCreateScreen:', user);
        if (!user) {
          setError('로그인이 필요합니다.');
          navigation.navigate('Login');
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('ChallengeCreateScreen Initialization Error:', error);
        setError('사용자 정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
      }
    };
    initialize();
  }, [navigation]);

  const handleCreate = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      navigation.navigate('Login');
      return;
    }

    try {
      await createChallenge(currentUser.email, title, description);
      navigation.navigate('Home');
    } catch (error) {
      alert(error.message);
    }
  };

  if (error) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[globalStyles.text, { color: '#F44336' }]}>{error}</Text>
        <TouchableOpacity style={globalStyles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={globalStyles.buttonText}>로그인 화면으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>도전과제 생성</Text>
      <TextInput
        placeholder="도전과제 제목"
        value={title}
        onChangeText={setTitle}
        style={globalStyles.input}
      />
      <TextInput
        placeholder="설명"
        value={description}
        onChangeText={setDescription}
        style={[globalStyles.input, { height: 100, textAlignVertical: 'top' }]}
        multiline
      />
      <TouchableOpacity style={globalStyles.button} onPress={handleCreate}>
        <Text style={globalStyles.buttonText}>도전과제 생성</Text>
      </TouchableOpacity>
    </View>
  );
}