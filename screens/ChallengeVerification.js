import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Platform, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomNavBar from '../navigation/BottomNavBar';
import { uploadVerificationPhoto } from '../services/challengeService';
import { getCurrentUser } from '../services/authService';
import { verifyWithOCR } from '../services/ocrService';
import { globalStyles } from '../utils/styles';

export default function ChallengeVerificationScreen({ route, navigation }) {
  const { challengeId } = route.params;
  const [photos, setPhotos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);

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
          allowsEditing: false, // 자르기 강제 제거
          quality: 0.7, // 품질 조정으로 용량 감소
        });
      } else {
        // 모바일 환경에서 카메라 사용
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // 자르기 강제 제거
          quality: 0.3, // 품질을 대폭 낮춰서 용량 감소 (OCR용으로는 충분)
        });
      }

      if (!result.canceled) {
        const photoUri = result.assets[0].uri;
        
        // OCR 인증 실행
        await performOCRVerification(photoUri);
      }
    } catch (error) {
      console.error('사진 선택 오류:', error);
      alert('오류: 사진 선택 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // OCR 인증 수행
  const performOCRVerification = async (photoUri) => {
    if (!currentUser?.name) {
      alert('오류: 사용자 닉네임 정보가 없습니다.');
      return;
    }

    setIsVerifying(true);
    setOcrResults([]);

    try {
      // OCR 인증 실행
      const verificationResult = await verifyWithOCR(photoUri, currentUser.name);
      
      setOcrResults(verificationResult.ocrResults);
      
      if (verificationResult.success) {
        // 인증 성공 시 사진을 목록에 추가
        const newPhoto = {
          id: Date.now().toString(),
          uri: photoUri,
          uploaded: false,
          verified: true,
          ocrResult: verificationResult
        };
        setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
        
        // 성공 알림
        if (Platform.OS === 'web') {
          window.alert(`✅ ${verificationResult.message}`);
        } else {
          Alert.alert(
            '인증 성공!',
            verificationResult.message,
            [
              {
                text: '확인',
                style: 'default'
              }
            ]
          );
        }
      } else {
        // 인증 실패 알림
        const failMessage = verificationResult.message + 
          (verificationResult.ocrResults.length > 0 ? 
            `\n\n인식된 텍스트: ${verificationResult.ocrResults.join(', ')}` : 
            '\n\n텍스트가 인식되지 않았습니다.');
        
        if (Platform.OS === 'web') {
          const retry = window.confirm(`❌ ${failMessage}\n\n다시 시도하시겠습니까?`);
          if (retry) {
            handleUploadPhoto();
          }
        } else {
          Alert.alert(
            '인증 실패',
            failMessage,
            [
              {
                text: '다시 시도',
                onPress: () => handleUploadPhoto(),
                style: 'default'
              },
              {
                text: '취소',
                style: 'cancel'
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('OCR 인증 오류:', error);
      const errorMessage = `OCR 인증 중 오류가 발생했습니다: ${error.message}`;
      
      if (Platform.OS === 'web') {
        window.alert(`❌ ${errorMessage}`);
      } else {
        Alert.alert('오류', errorMessage);
      }
    } finally {
      setIsVerifying(false);
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
    const verifiedPhotos = photos.filter(photo => photo.verified);
    
    if (verifiedPhotos.length === 0) {
      alert('알림: OCR 인증을 통과한 사진을 먼저 업로드해주세요.');
      return;
    }

    if (!currentUser) {
      alert('오류: 사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      // 업로드되지 않은 인증된 사진들만 업로드
      const photosToUpload = verifiedPhotos.filter(photo => !photo.uploaded);
      
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
          opacity: item.uploaded ? 0.7 : 1,
          borderWidth: item.verified ? 3 : 0,
          borderColor: item.verified ? '#4CAF50' : 'transparent'
        }} 
      />
      {item.verified && (
        <View style={{
          position: 'absolute',
          top: 5,
          left: 5,
          backgroundColor: '#4CAF50',
          borderRadius: 10,
          padding: 2
        }}>
          <Text style={{ color: 'white', fontSize: 10 }}>OCR ✓</Text>
        </View>
      )}
      {item.uploaded && (
        <View style={{
          position: 'absolute',
          top: 5,
          right: 5,
          backgroundColor: '#2196F3',
          borderRadius: 10,
          padding: 2
        }}>
          <Text style={{ color: 'white', fontSize: 10 }}>업로드 ✓</Text>
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
        <Text style={[globalStyles.text, { color: 'white', fontSize: 12 }]}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const verifiedCount = photos.filter(p => p.verified).length;
  const uploadedCount = photos.filter(p => p.uploaded).length;
  const pendingCount = photos.filter(p => p.verified && !p.uploaded).length;

  return (
    <View style={[globalStyles.container, { flex: 1, padding: 20, justifyContent: 'space-between' }]}>
      <View>
        <Image source={require('../assets/images/icon.png')} style={globalStyles.logo} />
        <Text style={[globalStyles.text, { fontSize: 24, marginBottom: 20, color: '#5E4636', textAlign: 'center' }]}>
          도전과제 OCR 인증
        </Text>
        
        <Text style={[globalStyles.text, { fontSize: 16, marginBottom: 10, color: '#666', textAlign: 'center' }]}>
          포스트잇에 닉네임({currentUser?.name})을 적어 인증해주세요.
        </Text>
        
        <Text style={[globalStyles.text, { fontSize: 14, marginBottom: 20, color: '#888', textAlign: 'center' }]}>
          📝 OCR 시스템이 포스트잇의 닉네임을 자동으로 검증합니다
        </Text>
        
        {isVerifying && (
          <View style={{ 
            backgroundColor: '#FFF3CD', 
            padding: 15, 
            borderRadius: 8, 
            marginBottom: 20,
            alignItems: 'center'
          }}>
            <ActivityIndicator size="small" color="#856404" />
            <Text style={[globalStyles.text, { color: '#856404', marginTop: 8 }]}>
              포스트잇에서 닉네임을 찾는 중...
            </Text>
          </View>
        )}
        
        {ocrResults.length > 0 && (
          <View style={{ 
            backgroundColor: '#E7F3FF', 
            padding: 15, 
            borderRadius: 8, 
            marginBottom: 20 
          }}>
            <Text style={[globalStyles.text, { fontSize: 14, fontWeight: 'bold', marginBottom: 5 }]}>
              🔍 인식된 텍스트:
            </Text>
            <Text style={[globalStyles.text, { fontSize: 13, color: '#0066CC' }]}>
              {ocrResults.join(', ')}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[globalStyles.button, {
            padding: 15,
            marginBottom: 20,
            alignItems: 'center',
            opacity: isVerifying ? 0.6 : 1
          }]} 
          onPress={handleUploadPhoto}
          disabled={isVerifying}
        >
          <Text style={[globalStyles.text, { fontSize: 16, color: '#FFFFFF' }]}>
            {isVerifying ? 'OCR 인증 중...' : '📷 포스트잇 인증 사진 촬영'}
          </Text>
        </TouchableOpacity>
        
        {photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[globalStyles.text, { fontSize: 16, fontWeight: 'bold', marginBottom: 10 }]}>
              📸 인증 사진 ({verifiedCount}/{photos.length})
            </Text>
            <Text style={[globalStyles.text, { fontSize: 13, color: '#666', marginBottom: 10 }]}>
              ✅ OCR 인증: {verifiedCount}개 | 📤 업로드 완료: {uploadedCount}개
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
          style={[globalStyles.button, {
            backgroundColor: pendingCount > 0 ? '#4CAF50' : '#ccc', 
            padding: 15, 
            borderRadius: 8,
            alignItems: 'center'
          }]} 
          onPress={handleSubmitVerification}
          disabled={pendingCount === 0}
        >
          <Text style={[globalStyles.text, { 
            fontSize: 16, 
            fontWeight: 'bold',
            color: pendingCount > 0 ? 'white' : '#666'
          }]}>
            🚀 인증 제출 ({pendingCount}개 대기중)
          </Text>
        </TouchableOpacity>
        
        {pendingCount === 0 && photos.length > 0 && (
          <Text style={[globalStyles.text, { 
            fontSize: 13, 
            color: '#666', 
            textAlign: 'center',
            marginTop: 10
          }]}>
            💡 OCR 인증을 통과한 사진만 제출할 수 있습니다
          </Text>
        )}
      </View>
    </View>
  );
}