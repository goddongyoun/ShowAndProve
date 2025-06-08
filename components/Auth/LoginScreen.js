import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { globalStyles } from '../../utils/styles';
import { loginUser } from '../../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // AppNavigator에서 전달받은 로그인 성공 콜백
  const onLoginSuccess = route?.params?.onLoginSuccess;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser(email, password);
      console.log('Login Successful:', response);
      
      // 로그인 성공 시 상태 업데이트
      if (onLoginSuccess) {
        onLoginSuccess(true);
      }
      
      // 홈 화면으로 이동
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('로그인 실패', error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Image source={require('../../assets/images/icon.png')} style={globalStyles.logo} />
      <Text style={globalStyles.wordmark}>Show and Prove</Text>
      <TextInput
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        style={globalStyles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        style={globalStyles.input}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity
        style={[globalStyles.button, loading && { opacity: 0.6 }]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={globalStyles.buttonText}>
          {loading ? '로그인 중...' : '로그인'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        disabled={loading}
      >
        <Text style={[globalStyles.text, { color: '#FFD400', textAlign: 'center', textDecorationLine: 'underline' }]}>
          계정이 없으신가요? 회원가입
        </Text>
      </TouchableOpacity>
    </View>
  );
}