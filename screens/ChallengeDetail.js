//사용자가 입력한 도전과제 정보(제목, 내용, 날짜 등) 출력하는 페이지

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Modal, Dimensions } from 'react-native';
import BottomNavBar from '../navigation/BottomNavBar';
import { getVerifications } from '../services/challengeService';
import { getCurrentUser } from '../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BASE_URL = 'http://219.254.146.234:5000';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChallengeDetail({ route, navigation }) {
  // 더미 도전과제 정보 (실제 구현할 때 데이터베이스에서 정보 받아오게끔 해야 됨)
  const challenge = route?.params?.challenge || {
    title: '도전과제 제목',
    description: '도전과제 내용',
    creator: '작성자',
    createdAt: '2024-01-01',
  };

  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Fetching current user in ChallengeDetail...');
        const user = await getCurrentUser();
        console.log('Current User in ChallengeDetail:', user);
        setCurrentUser(user);
        
        if (challenge._id || challenge.id) {
          await fetchVerifications();
        }
      } catch (error) {
        console.error('ChallengeDetail Initialization Error:', error);
        setError('초기화 중 오류가 발생했습니다: ' + error.message);
        setLoading(false);
      }
    };
    initialize();
  }, [challenge._id, challenge.id]);

  const fetchVerifications = async () => {
    try {
      const challengeId = challenge._id || challenge.id;
      console.log('Fetching verifications for challenge:', challengeId);
      const data = await getVerifications(challengeId);
      console.log('Verifications in ChallengeDetail:', data);
      setVerifications(data);
    } catch (error) {
      console.error('Fetch verifications error:', error);
      setError('인증 사진 목록을 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 이미지 클릭 핸들러
  const handleImagePress = (imageUri) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  // 모달 닫기 핸들러
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // 도전과제 인증 버튼 클릭 핸들러
  const handleVerify = () => {
    const challengeId = challenge._id || challenge.id;
    navigation.navigate('ChallengeVerification', { challengeId });
  };

  const renderVerification = ({ item }) => (
    <View style={{ 
      marginVertical: 10, 
      backgroundColor: '#f9f9f9', 
      padding: 15, 
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      <View style={{ flex: 1 }}>
        {item.photo_path && (
          <TouchableOpacity onPress={() => handleImagePress(`${BASE_URL}${item.photo_path}`)}>
            <Image
              source={{ uri: `${BASE_URL}${item.photo_path}` }}
              style={{ 
                width: '100%', 
                height: 150, 
                borderRadius: 8, 
                marginBottom: 10 
              }}
            />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
          {item.user_name || item.user_email}
        </Text>
        {item.comment && (
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
            "{item.comment}"
          </Text>
        )}
        <Text style={{ fontSize: 12, color: '#888' }}>
          인증일: {new Date(item.submitted_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        {/* 도전과제 정보 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
            {challenge.title}
          </Text>
          <Text style={{ marginBottom: 10, fontSize: 16 }}>
            {challenge.description || challenge.content}
          </Text>
          <Text style={{ color: '#888', marginBottom: 10 }}>
            작성자: {challenge.creator || challenge.creatorName}
          </Text>
          <Text style={{ color: '#888', marginBottom: 20 }}>
            생성일: {new Date(challenge.createdAt || challenge.created_at).toLocaleDateString()}
          </Text>
          
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#FFF44F', 
              padding: 15, 
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }} 
            onPress={handleVerify}
          >
            <Icon name="camera-plus" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>도전과제 인증</Text>
          </TouchableOpacity>
        </View>

        {/* 인증 사진 목록 */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
            인증 사진 목록 ({verifications.length})
          </Text>
          
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#FFF44F" />
              <Text style={{ marginTop: 10, color: '#666' }}>로딩 중...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#F44336', marginBottom: 10 }}>{error}</Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#eee', padding: 10, borderRadius: 8 }} 
                onPress={() => { setError(null); setLoading(true); fetchVerifications(); }}
              >
                <Text>재시도</Text>
              </TouchableOpacity>
            </View>
          ) : verifications.length > 0 ? (
            <FlatList
              data={verifications}
              renderItem={renderVerification}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="image-off" size={48} color="#ccc" />
              <Text style={{ color: '#666', marginTop: 10 }}>
                아직 인증 사진이 없습니다.
              </Text>
              <Text style={{ color: '#666', fontSize: 12 }}>
                첫 번째 인증자가 되어보세요!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 네비게이션 바 */}
      <BottomNavBar navigation={navigation} />

      {/* 이미지 전체화면 모달 */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={closeImageModal}
        >
          <TouchableOpacity activeOpacity={1}>
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: screenWidth * 0.9,
                height: screenHeight * 0.7,
                borderRadius: 8,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          {/* 닫기 버튼 */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 20,
              padding: 10,
            }}
            onPress={closeImageModal}
          >
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}