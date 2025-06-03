import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomNavBar from '../navigation/BottomNavBar';
import { uploadVerificationPhoto } from '../services/challengeService';
import { getCurrentUser } from '../services/authService';

export default function ChallengeVerificationScreen({ route, navigation }) {
  const { challengeId } = route.params;
  const [photos, setPhotos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('사용자 정보 로딩 오류:', error);
        alert('오류: 사용자 정보를 불러올 수 없습니다.');
      }
    };
    initialize();
  }, []);

  // 권한 요청
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermission.status !== 'granted' || galleryPermission.status !== 'granted') {
        alert('권한 필요: 카메라 및 갤러리 접근 권한이 필요합니다.');
        return false;
      }
    }
    return true;
  };

  // 인증 사진 업로드 버튼 클릭 핸들러 
  const handleUploadPhoto = async () => {
    // 권한 요청
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return;
    }

    try {
      let result;
      if (Platform.OS === 'web') {
        // 웹 환경에서 파일 선택
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });
      } else {
        // 모바일 환경에서 카메라 사용
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }

      if (!result.canceled) {
        const photoUri = result.assets[0].uri;
        
        // 로컬 사진 목록에 추가 (미리보기용)
        const newPhoto = {
          id: Date.now().toString(),
          uri: photoUri,
          uploaded: false
        };
        setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
        
        alert('성공: 사진이 추가되었습니다. "인증 제출" 버튼을 눌러 업로드하세요.');
      }
    } catch (error) {
      console.error('사진 선택 오류:', error);
      alert('오류: 사진 선택 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 새로고침 함수 (F5와 동일)
  const refreshPage = () => {
    if (Platform.OS === 'web') {
      // 웹에서 강제 새로고침 (여러 방법 시도)
      try {
        if (typeof window !== 'undefined') {
          // 방법 1: location.reload()
          window.location.reload(true);
          
          // 방법 2: 페이지 재로드가 안되면 강제로 URL 변경
          setTimeout(() => {
            window.location.href = window.location.href;
          }, 50);
        }
      } catch (error) {
        console.error('새로고침 오류:', error);
        // 백업: 이전 화면으로
        navigation.goBack();
      }
    } else {
      // 모바일에서는 이전 화면으로 돌아가기
      navigation.goBack();
    }
  };

  // 인증 제출 버튼 클릭 핸들러 
  const handleSubmitVerification = async () => {
    if (photos.length === 0) {
      alert('알림: 업로드할 사진을 먼저 선택해주세요.');
      return;
    }

    if (!currentUser) {
      alert('오류: 사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      // 업로드되지 않은 사진들만 업로드
      const photosToUpload = photos.filter(photo => !photo.uploaded);
      
      if (photosToUpload.length === 0) {
        alert('알림: 이미 모든 사진이 업로드되었습니다.');
        return;
      }

      for (const photo of photosToUpload) {
        let fileData;
        
        if (Platform.OS === 'web') {
          // 웹 환경에서 File 객체로 변환
          const response = await fetch(photo.uri);
          const blob = await response.blob();
          fileData = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        } else {
          // 모바일 환경에서 uri, name, type 명시
          fileData = {
            uri: photo.uri,
            name: `photo-${Date.now()}.jpg`,
            type: 'image/jpeg',
          };
        }

        await uploadVerificationPhoto(challengeId, currentUser.email, fileData);
        
        // 업로드 완료 표시
        setPhotos(prevPhotos => 
          prevPhotos.map(p => 
            p.id === photo.id ? { ...p, uploaded: true } : p
          )
        );
      }

      alert('인증 사진이 성공적으로 업로드되었습니다!');
      
      // 콜백 함수 호출 (있다면)
      route.params?.onSuccess?.();
      
      // 강제 새로고침 (F5와 동일)
      setTimeout(() => {
        refreshPage();
      }, 100);
      
    } catch (error) {
      console.error('인증 제출 오류:', error);
      alert('실패: ' + (error.message || '인증 제출 중 오류가 발생했습니다.'));
    }
  };

  // 사진 삭제 핸들러
  const handleDeletePhoto = (photoId) => {
    setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
  };

  // 인증 사진 목록 렌더링
  const renderPhoto = ({ item }) => (
    <View style={{ margin: 5, position: 'relative' }}>
      <Image 
        source={{ uri: item.uri }} 
        style={{ 
          width: 100, 
          height: 100, 
          borderRadius: 8,
          opacity: item.uploaded ? 0.7 : 1
        }} 
      />
      {item.uploaded && (
        <View style={{
          position: 'absolute',
          top: 5,
          right: 5,
          backgroundColor: '#4CAF50',
          borderRadius: 10,
          padding: 2
        }}>
          <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>
        </View>
      )}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: -5,
          right: -5,
          backgroundColor: '#FF4444',
          borderRadius: 10,
          width: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        onPress={() => handleDeletePhoto(item.id)}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          도전과제 인증
        </Text>
        
        <Text style={{ fontSize: 16, marginBottom: 10, color: '#666' }}>
          포스트잇에 닉네임({currentUser?.name})을 적어 인증해주세요.
        </Text>
        
        <TouchableOpacity 
          style={{ 
            backgroundColor: '#FFF44F', 
            padding: 15, 
            borderRadius: 8, 
            marginBottom: 20,
            alignItems: 'center'
          }} 
          onPress={handleUploadPhoto}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>인증 사진 업로드</Text>
        </TouchableOpacity>
        
        {photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
              선택된 사진 ({photos.length})
            </Text>
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
        
        <TouchableOpacity 
          style={{ 
            backgroundColor: photos.length > 0 ? '#4CAF50' : '#ccc', 
            padding: 15, 
            borderRadius: 8,
            alignItems: 'center'
          }} 
          onPress={handleSubmitVerification}
          disabled={photos.length === 0}
        >
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold',
            color: photos.length > 0 ? 'white' : '#666'
          }}>
            인증 제출 ({photos.filter(p => !p.uploaded).length}개 대기중)
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 네비게이션 바 */}
      <BottomNavBar navigation={navigation} />
    </View>
  );
}