import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { globalStyles } from '../../utils/styles';
import { loginUser } from '../../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await loginUser(email, password);
      console.log('Login Successful:', response);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login Failed:', error.message);
      alert(error.message);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>로그인</Text>
      <TextInput
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        style={globalStyles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        style={globalStyles.input}
        secureTextEntry
      />
      <TouchableOpacity style={globalStyles.button} onPress={handleLogin}>
        <Text style={globalStyles.buttonText}>로그인</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={[globalStyles.text, { color: '#FFF44F', textAlign: 'center' }]}>
          계정이 없으신가요? 회원가입
        </Text>
      </TouchableOpacity>
    </View>
  );
}