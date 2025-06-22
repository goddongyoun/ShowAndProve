import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { globalStyles } from '../../utils/styles';
import { loginUser } from '../../services/authService'; // TODO: 백엔드 통신 필요
import AsyncStorage from '@react-native-async-storage/async-storage'; // TODO: 백엔드 통신 필요

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // TODO: 백엔드 서버와 통신하여 관리자 유저인지 확인 후 로그인 성공 처리
    // 현재는 임시로 AdminDashboard로 바로 이동
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser(email, password);
      console.log('Admin Login Successful:', response);

      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;

      if (user && user.isAdmin) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminDashboard' }],
        });
      } else {
        Alert.alert('로그인 실패', '관리자 계정이 아닙니다.');
        console.log('You Are Not Admin');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
      /*
      // 임시: 성공 시 바로 대시보드로 이동
      navigation.reset({
        index: 0,
        routes: [{ name: 'AdminDashboard' }],
      });//*/

    } catch (error) {
      console.error('Admin Login Error:', error);
      Alert.alert('로그인 실패', error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Image source={require('../../assets/images/icon.png')} style={globalStyles.logo} />
      <Text style={globalStyles.wordmark}>관리자 로그인</Text>
      <TextInput
        placeholder="이메일 (관리자)"
        value={email}
        onChangeText={setEmail}
        style={globalStyles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        placeholder="비밀번호 (관리자)"
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
          {loading ? '로그인 중...' : '관리자 로그인'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        disabled={loading}
      >
        <Text style={[globalStyles.text, { color: '#FFD400', textAlign: 'center', textDecorationLine: 'underline' }]}>
          일반 사용자 로그인
        </Text>
      </TouchableOpacity>
    </View>
  );
} 