import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';
import { TextInput } from 'react-native'; // TextInput 추가
// import AsyncStorage from '@react-native-async-storage/async-storage'; // TODO: 백엔드 통신 필요
// import axios from 'axios'; // TODO: 백엔드 통신 필요

// const API_BASE_URL = 'http://203.234.62.50:5000/api'; // TODO: 백엔드 서버 URL 설정 필요

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
      // TODO: 백엔드에서 회원 정보 및 게시물 정보 가져오는 로직 구현
      // const headers = await getAuthHeaders();
      // const usersResponse = await axios.get(`${API_BASE_URL}/admin/users`, headers);
      // setUsers(usersResponse.data);

      // const challengesResponse = await axios.get(`${API_BASE_URL}/admin/challenges`, headers);
      // setChallenges(challengesResponse.data);

      // 임시 데이터 (백엔드 통신 전까지 사용)
      setUsers([
        { id: '1', email: 'user1@example.com', name: '테스트유저1' },
        { id: '2', email: 'user2@example.com', name: '테스트유저2' },
      ]);
      setChallenges([
        { id: 'c1', title: '테스트 도전과제1', creator_name: '테스트유저1', creator_email: 'user1@example.com', status: '진행 중' },
        { id: 'c2', title: '테스트 도전과제2', creator_name: '테스트유저2', creator_email: 'user2@example.com', status: '완료' },
      ]);

    } catch (err) {
      console.error('Admin Dashboard Fetch Error:', err);
      setError('데이터를 불러오는 데 실패했습니다. (TODO)');
      Alert.alert('오류', '데이터를 불러오는 데 실패했습니다. (TODO)');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      '사용자 삭제',
      '정말로 이 사용자를 삭제하시겠습니까? (TODO)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            // TODO: 백엔드 서버와 통신하여 사용자 삭제 로직 구현
            console.log(`사용자 삭제 요청: ${userId}`);
            Alert.alert('알림', `사용자 ${userId} 삭제 요청 (TODO)`);
            fetchData(); // 임시로 데이터 새로고침
          },
        },
      ]
    );
  };

  const handleDeleteChallenge = async (challengeId) => {
    Alert.alert(
      '도전과제 삭제',
      '정말로 이 도전과제를 삭제하시겠습니까? (TODO)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            // TODO: 백엔드 서버와 통신하여 도전과제 삭제 로직 구현
            console.log(`도전과제 삭제 요청: ${challengeId}`);
            Alert.alert('알림', `도전과제 ${challengeId} 삭제 요청 (TODO)`);
            fetchData(); // 임시로 데이터 새로고침
          },
        },
      ]
    );
  };

  // TODO: 사용자 검색 로직 (백엔드 통신 필요)
  const handleSearchUsers = (query) => {
    console.log(`사용자 검색 요청: ${query} (TODO)`);
    Alert.alert('알림', `사용자 검색: ${query} (TODO)`);
    // 백엔드 API 호출하여 검색된 사용자 목록을 가져오도록 구현 예정
  };

  // TODO: 게시물 검색 로직 (백엔드 통신 필요)
  const handleSearchChallenges = (query) => {
    console.log(`게시물 검색 요청: ${query} (TODO)`);
    Alert.alert('알림', `게시물 검색: ${query} (TODO)`);
    // 백엔드 API 호출하여 검색된 게시물 목록을 가져오도록 구현 예정
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

      <Text style={styles.sectionTitle}>도전과제 목록</Text>
      {/* 게시물 검색 UI */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="도전과제 제목 또는 생성자 검색 (TODO)"
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
    color: '#fff',
  },
  listItem: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    color: '#fff',
    fontSize: 16,
    flexShrink: 1, // 텍스트가 길어질 경우 줄바꿈되도록
    marginRight: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#FFD400',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 