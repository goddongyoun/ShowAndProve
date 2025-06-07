import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import BottomNavBar from '../navigation/BottomNavBar';
import { getVerifications } from '../services/challengeService';
import { getCurrentUser } from '../services/authService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BASE_URL = 'http://219.254.146.234:5000';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChallengeDetail({ route, navigation }) {
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

  /** 환경에 따라 반응형으로 리스트를 1열 / 2열 / 3열... 등으로 맞춤 */
  const getNumColumns = () => {
    console.log(screenWidth);
    if (screenWidth < 480) {
      return 1;
    } else if (screenWidth < 768) {
      return 2;
    } else if (screenWidth < 1024) {
      return 3;
    } else {
      return 4;
    }
  }

  const numColumns = getNumColumns();

  const itemGap = 8; // 아이템 사이 여백
  const totalSpacing = itemGap * numColumns * 2 + (numColumns > 1 ? 16 : 0); // 좌우 패딩 포함
  const itemWidth = (screenWidth - totalSpacing) / numColumns;

  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        if (challenge._id || challenge.id) {
          await fetchVerifications();
        }
      } catch (error) {
        setError('초기화 중 오류가 발생했습니다: ' + error.message);
        setLoading(false);
      }
    };
    initialize();

    const unsubscribe = navigation.addListener('focus', () => {
      if (challenge._id || challenge.id) {
        fetchVerifications();
      }
    });

    return unsubscribe;
  }, [challenge._id, challenge.id, navigation]);

  const fetchVerifications = async () => {
    try {
      const challengeId = challenge._id || challenge.id;
      const data = await getVerifications(challengeId);
      setVerifications((data || []).filter(v => typeof v === 'object' && v !== null));
    } catch (error) {
      setError('인증 사진 목록을 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = (imageUri) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const handleVerify = () => {
    const challengeId = challenge._id || challenge.id;
    navigation.navigate('ChallengeVerification', {
      challengeId,
      onSuccess: () => {
        fetchVerifications();
      },
    });
  };

  const renderVerification = ({ item }) => {
    const userName = item.user_name || item.user_email || '사용자';
    const commentText = typeof item.comment === 'string' ? item.comment.trim() : '';
    const hasComment = commentText.length > 0;

    let dateText = '인증일: 정보 없음';
    if (item.submitted_at) {
      try {
        const date = new Date(item.submitted_at);
        if (!isNaN(date.getTime())) {
          dateText = `인증일: ${date.toLocaleDateString()}`;
        }
      } catch (error) {
        // 무시
      }
    }

    return (
      <View style={{
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 8,
        width: itemWidth,
        margin: itemGap,
      }}>
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
          {userName}
        </Text>
        {hasComment && (
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
            {`"${commentText}"`}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: '#888' }}>
          {dateText}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
        {challenge.title || '제목 없음'}
      </Text>
      <Text style={{ marginBottom: 10, fontSize: 16 }}>
        {challenge.description || challenge.content || '내용 없음'}
      </Text>
      <Text style={{ color: '#888', marginBottom: 10 }}>
        작성자: {challenge.creator || challenge.creatorName || '알 수 없음'}
      </Text>
      <Text style={{ color: '#888', marginBottom: 20 }}>
        {challenge.createdAt || challenge.created_at
          ? `생성일: ${new Date(challenge.createdAt || challenge.created_at).toLocaleDateString()}`
          : '생성일: 날짜 없음'}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#FFF44F',
          padding: 15,
          borderRadius: 8,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 30,
        }}
        onPress={handleVerify}
      >
        <Icon name="camera-plus" size={20} color="#000" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>도전과제 인증</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
        인증 사진 목록 ({verifications.length})
      </Text>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 50 }}>
      <Icon name="image-off" size={48} color="#ccc" />
      <Text style={{ color: '#666', marginTop: 10 }}>아직 인증 사진이 없습니다.</Text>
      <Text style={{ color: '#666', fontSize: 12 }}>첫 번째 인증자가 되어보세요!</Text>
    </View>
  );

  const renderFooter = () => <View style={{ height: 100 }} />;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFF44F" />
        <Text style={{ marginTop: 10, color: '#666' }}>로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#F44336', marginBottom: 10, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#eee', padding: 10, borderRadius: 8 }}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchVerifications();
          }}
        >
          <Text>재시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={verifications}
        renderItem={renderVerification}
        keyExtractor={(item, index) => `${item.id || item._id || index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 100 }}
        numColumns={numColumns}
        style={{ flex: 1 }}
      />

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* 배경 터치 영역 */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={closeImageModal}
            activeOpacity={1}
          />

          {/* 이미지 컨테이너 */}
          {selectedImage && (
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: screenWidth * 0.9,
                  height: screenHeight * 0.7,
                  borderRadius: 8,
                }}
                resizeMode="contain"
              />
              
              {/* 닫기 버튼 */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: -15,
                  right: -15,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
                onPress={closeImageModal}
              >
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}