import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';
import { TextInput } from 'react-native'; // TextInput 추가
// import AsyncStorage from '@react-native-async-storage/async-storage'; // TODO 주석 해제
import axios from 'axios'; // TODO 주석 해제

const API_BASE_URL = 'http://219.254.146.234:5000/api'; // 백엔드 서버 URL 설정

export default function AdminDashboardScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchUserQuery, setSearchUserQuery] = useState(''); // 사용자 검색어 상태
  const [searchChallengeQuery, setSearchChallengeQuery] = useState(''); // 게시물 검색어 상태

  useEffect(() => {
    fetchData();
  }, []);

  // TODO: 백엔드 통신을 위한 인증 헤더 가져오기 함수 (필요시)
  // const getAuthHeaders = async () => {
  //   const token = await AsyncStorage.getItem('token');
  //   return {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //     },
  //   };
  // };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // const headers = await getAuthHeaders(); // TODO: 관리자 로그인 구현 시 주석 해제

      // 백엔드에서 회원 정보 가져오기 (기존 API 없음)
      setUsers([]); // 임시로 빈 배열 설정

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
    Alert.alert(
      '사용자 삭제',
      '정말로 이 사용자를 삭제하시겠습니까? 관련 모든 데이터가 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            Alert.alert('알림', '사용자 삭제 기능은 현재 비활성화되어 있습니다. (TODO)');
          },
        },
      ]
    );
  };

  const handleDeleteChallenge = async (challengeId) => {
    Alert.alert(
      '도전과제 삭제',
      '정말로 이 도전과제를 삭제하시겠습니까? 관련 모든 인증 기록이 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            Alert.alert('알림', '도전과제 삭제 기능은 현재 비활성화되어 있습니다. (TODO)');
          },
        },
      ]
    );
  };

  // 사용자 검색 로직 (TODO: 백엔드 검색 API가 없을 경우 클라이언트 필터링)
  const handleSearchUsers = async (query) => {
    Alert.alert('알림', '사용자 검색 기능은 현재 비활성화되어 있습니다. (TODO)');
    // TODO: 백엔드 검색 API가 있다면 이 부분을 수정하세요.
    // 현재는 모든 유저를 가져와서 클라이언트에서 필터링합니다.
    // setLoading(true);
    // try {
    //   const usersResponse = await axios.get(`${API_BASE_URL}/users`);
    //   const allUsers = usersResponse.data;
    //   const filteredUsers = allUsers.filter(user => 
    //     user.email.toLowerCase().includes(query.toLowerCase()) || 
    //     user.name.toLowerCase().includes(query.toLowerCase())
    //   );
    //   setUsers(filteredUsers);
    //   Alert.alert('알림', `사용자 검색 완료: ${filteredUsers.length}명`);
    // } catch (err) {
    //   console.error('Search Users Error:', err.response?.data || err.message);
    //   Alert.alert('오류', err.response?.data?.error || '사용자 검색에 실패했습니다.');
    // } finally {
    //   setLoading(false);
    // }
  };

  // 게시물 검색 로직 (TODO: 백엔드 검색 API가 없을 경우 클라이언트 필터링)
  const handleSearchChallenges = async (query) => {
    // TODO: 백엔드 검색 API가 있다면 이 부분을 수정하세요.
    // 현재는 모든 게시물을 가져와서 클라이언트에서 필터링합니다.
    setLoading(true);
    try {
      const challengesResponse = await axios.get(`${API_BASE_URL}/challenges`);
      const allChallenges = challengesResponse.data;
      const filteredChallenges = allChallenges.filter(challenge => 
        challenge.title.toLowerCase().includes(query.toLowerCase()) || 
        challenge.creator_name.toLowerCase().includes(query.toLowerCase()) ||
        challenge.creator_email.toLowerCase().includes(query.toLowerCase())
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
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>관리자 대시보드</Text>

      <Text style={styles.sectionTitle}>회원 목록</Text>
      {/* 사용자 검색 UI */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="사용자 이메일 또는 이름 검색 (TODO)"
          placeholderTextColor="#aaa"
          value={searchUserQuery}
          onChangeText={setSearchUserQuery}
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
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>이메일: {item.email}</Text>
              <Text style={styles.listItemText}>이름: {item.name}</Text>
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
        <Text style={globalStyles.text}>사용자 목록을 불러올 수 없습니다. (TODO)</Text>
      )}

      <Text style={styles.sectionTitle}>도전과제 목록</Text>
      {/* 게시물 검색 UI */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="도전과제 제목 또는 생성자 검색"
          placeholderTextColor="#aaa"
          value={searchChallengeQuery}
          onChangeText={setSearchChallengeQuery}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearchChallenges(searchChallengeQuery)}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={challenges}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listItemText}>제목: {item.title}</Text>
            <Text style={styles.listItemText}>생성자: {item.creator_name} ({item.creator_email})</Text>
            <Text style={styles.listItemText}>상태: {item.status}</Text>
            <TouchableOpacity 
              onPress={() => handleDeleteChallenge(item.id)}
              style={[styles.deleteButton, { backgroundColor: '#ff6347' }]} // Tomato color
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
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
}); 