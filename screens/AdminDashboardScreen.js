import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { globalStyles } from '../utils/styles';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // TODO 주석 해제
import axios from 'axios'; // TODO 주석 해제

const API_BASE_URL = 'http://219.254.146.234:5000/api'; // 백엔드 서버 URL 설정

export default function AdminDashboardScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // 모든 사용자 목록 (검색용)
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchUserQuery, setSearchUserQuery] = useState(''); // 사용자 검색어 상태
  const [searchChallengeQuery, setSearchChallengeQuery] = useState(''); // 게시물 검색어 상태

  useEffect(() => {
    fetchData();
  }, []);

  // 날짜 포맷팅 함수 (컴포넌트 내부에 추가)
  const formatDate = (dateString) => {
    if (!dateString) return '없음';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    
    // YYYY-MM-DD HH:MM 형식으로 포맷팅
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // TODO: 백엔드 통신을 위한 인증 헤더 가져오기 함수 (필요시)
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders(); // TODO: 관리자 로그인 구현 시 주석 해제

      // 수정된 부분: 새로 구현한 /api/users API 엔드포인트를 사용하여 모든 사용자 정보 가져오기
      const usersResponse = await axios.get(`${API_BASE_URL}/users`, headers);
      
      // API 응답이 배열 형태인 경우
      if (Array.isArray(usersResponse.data)) {
        setUsers(usersResponse.data);
        setAllUsers(usersResponse.data);
      } 
      // API 응답이 객체 형태인 경우 (users 필드 사용)
      else if (usersResponse.data && Array.isArray(usersResponse.data.users)) {
        setUsers(usersResponse.data.users);
        setAllUsers(usersResponse.data.users);
      } 
      // 그 외의 경우 (오류 처리)
      else {
        console.error('Unexpected API response format:', usersResponse.data);
        Alert.alert('오류', '사용자 데이터 형식이 올바르지 않습니다.');
        setUsers([]);
        setAllUsers([]);
      }

      // 백엔드에서 도전과제 목록 가져오기
      const challengesResponse = await axios.get(`${API_BASE_URL}/challenges`);
      setChallenges(challengesResponse.data);

    } catch (err) {
      console.error('Admin Dashboard Fetch Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || '데이터를 불러오는 데 실패했습니다.');
      Alert.alert('오류', err.response?.data?.error || '데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // 토큰 가져오기
      const token = await AsyncStorage.getItem('token');
      
      // 삭제 API 호출
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // 성공시 목록 갱신
      fetchData();
    } catch (err) {
      console.error('Delete User Error:', err.response?.data || err.message);
      Alert.alert('오류', err.response?.data?.error || '사용자 삭제에 실패했습니다.');
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    try {
      // 토큰 가져오기
      const token = await AsyncStorage.getItem('token');
      
      // 삭제 API 호출
      await axios.delete(`${API_BASE_URL}/challenges/${challengeId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // 성공시 목록 갱신
      fetchData();
    } catch (err) {
      console.error('Delete Challenge Error:', err.response?.data || err.message);
      Alert.alert('오류', err.response?.data?.error || '도전과제 삭제에 실패했습니다.');
    }
  };

  // 수정된 부분: 사용자 검색 로직 (클라이언트 필터링)
  const handleSearchUsers = (query) => {
    // query.trim()으로 앞뒤 공백 제거 후 비어있는지 확인
    if (query.trim() === '') {
      setUsers(allUsers); // 검색어가 없으면 전체 목록 표시
      return;
    }

    const filteredUsers = allUsers.filter(user => 
      (user.email && user.email.toLowerCase().includes(query.toLowerCase())) || 
      (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
    );
    
    setUsers(filteredUsers);
    Alert.alert('알림', `사용자 검색 완료: ${filteredUsers.length}명`);
  };

  // 게시물 검색 로직
  const handleSearchChallenges = async (query) => {
    // 검색어가 비어있으면 모든 도전과제를 표시
    if (query.trim() === '') {
      try {
        const headers = await getAuthHeaders();
        const challengesResponse = await axios.get(`${API_BASE_URL}/challenges`);
        setChallenges(challengesResponse.data);
        return;
      } catch (err) {
        console.error('Fetch Challenges Error:', err.response?.data || err.message);
        Alert.alert('오류', err.response?.data?.error || '도전과제 목록을 불러오는데 실패했습니다.');
        return;
      }
    }

    setLoading(true);
    try {
      const challengesResponse = await axios.get(`${API_BASE_URL}/challenges`);
      const allChallenges = challengesResponse.data;
      const filteredChallenges = allChallenges.filter(challenge => 
        (challenge.title && challenge.title.toLowerCase().includes(query.toLowerCase())) || 
        (challenge.creatorName && challenge.creatorName.toLowerCase().includes(query.toLowerCase())) ||
        (challenge.creator && challenge.creator.toLowerCase().includes(query.toLowerCase()))
      );
      setChallenges(filteredChallenges);
      Alert.alert('알림', `게시물 검색 완료: ${filteredChallenges.length}개`);
    } catch (err) {
      console.error('Search Challenges Error:', err.response?.data || err.message);
      Alert.alert('오류', err.response?.data?.error || '게시물 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <Text style={globalStyles.text}>데이터 로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={globalStyles.container}>
        <Text style={[globalStyles.text, { color: 'red' }]}>오류: {error}</Text>
        <TouchableOpacity onPress={fetchData} style={globalStyles.button}>
          <Text style={globalStyles.buttonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <Text style={globalStyles.title}>관리자 대시보드</Text>

      <Text style={styles.sectionTitle}>회원 목록 ({users.length}명)</Text>
      {/* 사용자 검색 UI */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="사용자 이메일 또는 이름 검색"
          placeholderTextColor="#aaa"
          value={searchUserQuery}
          onChangeText={setSearchUserQuery}
          onSubmitEditing={() => handleSearchUsers(searchUserQuery)}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearchUsers(searchUserQuery)}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>
      {users.length > 0 ? (
        <FlatList
          data={users}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          style={styles.flatListStyle}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemText}>이메일: {item.email}</Text>
                <Text style={styles.listItemText}>이름: {item.name}</Text>
                <Text 
                  style={[
                    styles.listItemText, 
                    { color: item.isAdmin ? '#007bff' : '#888' }
                  ]}
                >
                  {item.isAdmin ? '관리자' : '비관리자'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleDeleteUser(item.id)}
                style={[styles.deleteButton, { backgroundColor: '#ff6347' }]} // Tomato color
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <Text style={globalStyles.text}>등록된 사용자가 없습니다.</Text>
      )}

      <Text style={styles.sectionTitle}>도전과제 목록 ({challenges.length}개)</Text>
      {/* 게시물 검색 UI */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="도전과제 제목 또는 생성자 검색"
          placeholderTextColor="#aaa"
          value={searchChallengeQuery}
          onChangeText={setSearchChallengeQuery}
          onSubmitEditing={() => handleSearchChallenges(searchChallengeQuery)}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearchChallenges(searchChallengeQuery)}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>
      {challenges.length > 0 ? (
        <FlatList
          data={challenges}
          keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          style={styles.flatListStyle}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemText}>제목: {item.title}</Text>
                <Text style={styles.listItemText}>생성자: {item.creatorName} ({item.creator})</Text>
                
                {/* 만기일 표시 추가 */}
                {item.expired_date && (
                  <Text style={[
                    styles.listItemText, 
                    {
                      color: item.is_expired ? '#dc3545' : 
                            item.days_left <= 1 ? '#fd7e14' : '#28a745'
                    }
                  ]}>
                    만기일: {formatDate(item.expired_date)}
                    {item.is_expired ? ' (만료됨)' : 
                    item.days_left !== null ? ` (${item.days_left}일 남음)` : ''}
                  </Text>
                )}
                
                {/* 상태 표시 (이미 있는 코드) */}
                {item.status && item.status !== 'active' && (
                  <Text style={[styles.listItemText, { color: item.status === 'completed' ? 'green' : 'orange' }]}>
                    상태: {item.status}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => handleDeleteChallenge(item._id)}
                style={[styles.deleteButton, { backgroundColor: '#ff6347' }]} // Tomato color
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <Text style={globalStyles.text}>등록된 도전과제가 없습니다.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  listItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  listItemText: {
    fontSize: 16,
    color: '#555',
    flexShrink: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    backgroundColor: '#fff',
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  flatListStyle: {
    maxHeight: 200, // FlatList 최대 높이 제한
    marginBottom: 20,
  },
});