import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles } from '../../utils/styles';
import { uploadVerificationPhoto, getVerifications, deleteVerification, updateChallengeStatus } from '../../services/challengeService';
import { getCurrentUser } from '../../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BASE_URL = 'http://219.254.146.234:5000';

export default function ChallengeListScreen({ route, navigation }) {
  const { challenge } = route.params;
  const [image, setImage] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [challengeStatus, setChallengeStatus] = useState(challenge.status);
  const [error, setError] = useState(null);
  const [showCropOption, setShowCropOption] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Fetching current user in ChallengeListScreen...');
        const user = await getCurrentUser();
        console.log('Current User in ChallengeListScreen:', user);
        setCurrentUser(user);
        await fetchVerifications();
      } catch (error) {
        console.error('ChallengeListScreen Initialization Error:', error);
        setError('초기화 중 오류가 발생했습니다: ' + error.message);
        setLoading(false);
      }
    };
    initialize();
  }, [challenge._id]);

  const fetchVerifications = async () => {
    try {
      const data = await getVerifications(challenge._id);
      console.log('Verifications:', data);
      setVerifications(data);
    } catch (error) {
      console.error('Fetch verifications error:', error);
      setError('인증 사진 목록을 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermission.status !== 'granted' || galleryPermission.status !== 'granted') {
        Alert.alert('권한 필요', '카메라 및 갤러리 접근 권한이 필요합니다.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (allowEditing = false) => {
    console.log('pickImage called with allowEditing:', allowEditing);

    // 권한 요청
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return;
    }

    try {
      let result;
      if (Platform.OS === 'web') {
        // 웹 환경에서 파일 선택
        console.log('Launching Image Library for Web...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // 올바른 상수 사용
          allowsEditing: allowEditing,
          quality: 1,
        });
      } else {
        // 모바일 환경에서 카메라 사용
        console.log('Launching Camera for Mobile...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // 올바른 상수 사용
          allowsEditing: allowEditing,
          aspect: [4, 3],
          quality: 1,
        });
      }

      console.log('ImagePicker Result:', result);

      if (!result.canceled) {
        const photoUri = result.assets[0].uri;
        setImage(photoUri);

        try {
          let fileData;
          if (Platform.OS === 'web') {
            // 웹 환경에서 File 객체로 변환
            const response = await fetch(photoUri);
            const blob = await response.blob();
            fileData = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            console.log('Web File Data:', fileData);
          } else {
            // 모바일 환경에서 uri, name, type 명시
            fileData = {
              uri: photoUri,
              name: `photo-${Date.now()}.jpg`,
              type: 'image/jpeg',
            };
            console.log('Mobile File Data:', fileData);
          }

          const response = await uploadVerificationPhoto(challenge._id, currentUser?.email || 'user-id-placeholder', fileData);
          const extractedText = response.extractedText.toLowerCase().trim();
          const userNickname = currentUser?.name.toLowerCase().trim();

          if (extractedText.includes(userNickname)) {
            Alert.alert('성공', '포스트잇 닉네임 인증이 완료되었습니다!');
            await fetchVerifications();
          } else {
            Alert.alert('실패', '포스트잇에 적힌 닉네임이 사용자 이름과 일치하지 않습니다. 다시 시도해주세요.');
            setImage(null);
          }
        } catch (error) {
          console.error('Photo Verification Error:', error);
          Alert.alert('실패', error.message);
        }
      } else {
        console.log('ImagePicker canceled by user');
      }
    } catch (error) {
      console.error('ImagePicker Error:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleDeleteVerification = async (verificationId) => {
    Alert.alert(
      '인증 사진 삭제',
      '정말로 이 인증 사진을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVerification(verificationId);
              await fetchVerifications();
            } catch (error) {
              alert(error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await updateChallengeStatus(challenge._id, newStatus);
      setChallengeStatus(newStatus);
      Alert.alert('성공', `도전과제 상태가 "${newStatus}"로 업데이트되었습니다!`);
      navigation.goBack();
    } catch (error) {
      alert(error.message);
    }
  };

  const renderVerification = ({ item }) => {
    const canDelete = currentUser && item.user_email === currentUser.email;

    return (
      <View style={{ marginVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Image
            source={{ uri: `${BASE_URL}${item.photo_path}` }}
            style={{ width: '100%', height: 200, borderRadius: 8 }}
          />
          <Text style={[globalStyles.text, { color: '#666', fontSize: 12, marginTop: 5 }]}>
            Uploaded on: {new Date(item.submitted_at).toLocaleDateString()}
          </Text>
        </View>
        {canDelete && (
          <TouchableOpacity onPress={() => handleDeleteVerification(item.id)} style={{ marginLeft: 10 }}>
            <Icon name="trash-can-outline" size={24} color="#FF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFF44F" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[globalStyles.text, { color: '#F44336' }]}>{error}</Text>
        <TouchableOpacity style={globalStyles.button} onPress={() => { setError(null); setLoading(true); fetchVerifications(); }}>
          <Text style={globalStyles.buttonText}>재시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>사진 인증</Text>
      <View style={{ marginBottom: 20 }}>
        <Text style={[globalStyles.text, { fontSize: 18 }]}>{challenge.title}</Text>
        <Text style={[globalStyles.text, { color: '#666', fontSize: 14 }]}>Created by: {challenge.creatorName}</Text>
        <Text style={[globalStyles.text, { fontSize: 14, marginTop: 5 }]}>상태: {challengeStatus}</Text>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[globalStyles.button, { backgroundColor: '#4CAF50', marginRight: 10 }]}
            onPress={() => {
              console.log('Update Status: 완료');
              handleUpdateStatus('완료');
            }}
          >
            <Text style={globalStyles.buttonText}>완료</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.button, { backgroundColor: '#F44336' }]}
            onPress={() => {
              console.log('Update Status: 실패');
              handleUpdateStatus('실패');
            }}
          >
            <Text style={globalStyles.buttonText}>실패</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[globalStyles.text, { marginBottom: 10, color: '#666' }]}>
        포스트잇에 닉네임({currentUser?.name})을 적어 인증해주세요.
      </Text>
      <TouchableOpacity
        style={[globalStyles.button, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        onPress={() => {
          console.log('Show Crop Options');
          setShowCropOption(true);
        }}
      >
        <Icon name="camera" size={20} color="#000" style={{ marginRight: 5 }} />
        <Text style={globalStyles.buttonText}>인증 사진 촬영</Text>
      </TouchableOpacity>
      {showCropOption && (
        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-around' }}>
          <TouchableOpacity
            style={[globalStyles.button, { backgroundColor: '#666', marginRight: 10 }]}
            onPress={() => {
              console.log('No Crop Button Pressed');
              pickImage(false);
            }}
          >
            <Text style={globalStyles.buttonText}>자르기 없이 촬영</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.button, { backgroundColor: '#FFF44F' }]}
            onPress={() => {
              console.log('Crop Button Pressed');
              pickImage(true);
            }}
          >
            <Text style={globalStyles.buttonText}>자르기 후 촬영</Text>
          </TouchableOpacity>
        </View>
      )}
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 200, borderRadius: 8, marginVertical: 20 }}
        />
      )}
      <Text style={[globalStyles.title, { fontSize: 20, marginTop: 20 }]}>인증 사진 목록</Text>
      <FlatList
        data={verifications}
        renderItem={renderVerification}
        keyExtractor={item => item.id.toString()}
      />
    </View>
  );
}