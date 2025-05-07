import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { globalStyles } from '../../utils/styles';
import { registerUser } from '../../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    try {
      await registerUser(email, password, name);
      navigation.navigate('Login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>회원가입</Text>
      <TextInput
        placeholder="이름"
        value={name}
        onChangeText={setName}
        style={globalStyles.input}
      />
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
      <TouchableOpacity style={globalStyles.button} onPress={handleRegister}>
        <Text style={globalStyles.buttonText}>회원가입</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[globalStyles.text, { color: '#FFF44F', textAlign: 'center' }]}>
          이미 계정이 있으신가요? 로그인
        </Text>
      </TouchableOpacity>
    </View>
  );
}