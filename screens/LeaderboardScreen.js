/** 
 * TODO: 데이터 형식
 * getLeaderBoard -> leaderBoard: {
 *  id: int;
 *  email: string;
 *  name: string;
 *  success_count: int;
 *  rank: int;
 * }[]
 * 
 * getMyInfo -> 이건 마이페이지랑 겹치니까 같이 쓰면 될듯
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {globalStyles} from '../utils/styles';

// 임시 데이터 (나중에 백엔드에서 받아올 데이터 형식)
const dummyData = [
  { id: '1', email: 'test1', name: '챌린저1', success_count: 20, rank: 1 },
  { id: '2', email: 'test2', name: '챌린저2', success_count: 18, rank: 2 },
  { id: '3', email: 'test3', name: '챌린저3', success_count: 17, rank: 3 },
  { id: '4', email: 'test4', name: '챌린저4', success_count: 12, rank: 4 },
  { id: '5', email: 'test5', name: '챌린저5', success_count: 7, rank: 5 },
  { id: '6', email: 'test6', name: '챌린저6', success_count: 7, rank: 6 },
  { id: '7', email: 'test7', name: '챌린저7', success_count: 7, rank: 7 },
  { id: '8', email: 'test8', name: '챌린저8', success_count: 7, rank: 8 },
  { id: '9', email: 'test9', name: '챌린저9', success_count: 7, rank: 9 },
  { id: '10', email: 'test10', name: '챌린저10', success_count: 7, rank: 10 },
];

const dummyMyRank = { id: '6', email: 'test6', name: '나', success_count: 5, rank: 8 };

const windowWidth = Dimensions.get('window').width;

const LeaderboardScreen = () => {
  // 상위 3등과 나머지 분리
  const [topThree, setTopThree] = useState([]);
  const [restUsers, setRestUsers] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myRank, setMyRank] = useState(dummyMyRank);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // const response = await api.get('/users/leaderboard');
        // const data = response.data;

        // const responseMyRank = dummyMyRank;
        // const dataMyRank = responseMyRank.data;
        
        const data = dummyData;
        const dataMyRank = dummyMyRank;
        
        setLeaderboardData(data);
        setMyRank(dataMyRank);

        const tempTopThree = data.slice(0, 3).sort((a, b) => {
          if (a.rank === 2) return -1;
          if (b.rank === 2) return 1;
          if (a.rank === 1) return 0;
          if (b.rank === 1) return 0;
          return a.rank - b.rank;
        });

        const tempRestUsers = data.slice(3);

        setTopThree(tempTopThree);
        setRestUsers(tempRestUsers);

      } catch (error) {
        console.error('리더보드 조회 오류:', error);
      }
    };
    fetchLeaderboard();
  }, []);
  
  // 임시 내 정보 (나중에 실제 사용자 정보로 대체)
  // const myRank = { id: '6', email: 'test6', name: '나', success_count: 5, rank: 8 };

  const renderTopThree = () => (
    <View style={{flexDirection: 'row', justifyContent: 'center', gap: 15, height: 180, marginBottom: 20, alignItems: 'center'}}>
      {topThree.map((item) => (
        <View 
          key={item.id} 
          // style={[
          //   styles.topThreeItem,
          //   item.rank === 1 && styles.firstPlace,
          //   item.rank === 2 && styles.secondPlace,
          //   item.rank === 3 && styles.thirdPlace,
          // ]}
          style={[
            {
              alignItems: 'center',
              gap: 5,
            },
            item.rank === 1 && {
              transform: [{scale: 1.2}],
            }
          ]}
        >
          <View style={[styles.crown, item.rank === 1 && {
          }]}>
            <Text style={[globalStyles.text, styles.crownText]}>
              {item.rank === 1 ? '👑' : item.rank === 2 ? '🥈' : '🥉'}
            </Text>
          </View>
          <View 
            style={styles.profileImageContainer}
          >
            <View style={[styles.topThreeProfileImage, styles.defaultProfileImage]}>
              <Text style={[globalStyles.text, {fontSize: 24, fontWeight: 'bold', color: '#FFFFFF'}]}>
                {item.name[0]}
              </Text>
            </View>
          </View>
          <Text style={[globalStyles.text, {fontSize: 16, color: '#000000', textAlign: 'center'}]}>
            {item.name}
          </Text>
          <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
            {item.success_count}회
          </Text>
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.rankItem}>
      <View style={styles.rankNumberContainer}>
        <Text style={[globalStyles.text, {fontSize: 18, color: '#666666'}]}>{item.rank}</Text>
      </View>
      <View style={styles.profileImageContainer}>
        <View style={[styles.profileImage, styles.defaultProfileImage]}>
          <Text style={[globalStyles.text, {fontSize: 20, fontWeight: 'bold', color: '#FFFFFF'}]}>
            {item.name[0]}
          </Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={[globalStyles.text, {fontSize: 16, color: '#000000'}]}>{item.name}</Text>
        <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
          {item.success_count}회
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={{padding: 20}}>
        <Text style={[globalStyles.text, {fontSize: 24, marginBottom: 15, color: '#5E4636', textAlign: 'center'}]}>
          리더보드
        </Text>
      </View>

      {renderTopThree()}

      <FlatList
        data={restUsers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.myRankContainer}>
        <View style={styles.rankItem}>
          <View style={styles.rankNumberContainer}>
            <Text style={[globalStyles.text, {fontSize: 18, color: '#666666'}]}>{myRank.rank}</Text>
          </View>
          <View style={styles.profileImageContainer}>
            <View style={[styles.profileImage, styles.defaultProfileImage]}>
              <Text style={[globalStyles.text, {fontSize: 20, fontWeight: 'bold', color: '#FFFFFF'}]}>
                {myRank.name[0]}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[globalStyles.text, {fontSize: 16, color: '#000000'}]}>{myRank.name}</Text>
            <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
              {myRank.success_count}회
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#FFC300',
    borderBottomWidth: 1,
    borderBottomColor: '#E6B100',
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#FFC300',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topThreeItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: windowWidth * 0.25,
  },
  firstPlace: {
    marginBottom: -20,
    transform: [{scale: 1.2}],
    zIndex: 2,
  },
  secondPlace: {
    marginBottom: 10,
  },
  thirdPlace: {
    marginBottom: 10,
  },
  crown: {
    marginBottom: 5,
  },
  crownFirst: {
    transform: [{scale: 1.2}],
  },
  crownText: {
    fontSize: 24,
    textAlign: 'center',
  },
  topThreeProfileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultProfileImage: {
    backgroundColor: '#FFC300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFE357',
  },
  rankNumberContainer: {
    width: 30,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginHorizontal: 15,
  },
  userInfo: {
    flex: 1,
  },
  myRankContainer: {
    padding: 15,
    paddingTop: 25,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderTopColor: '#FFD700',
  },
});

export default LeaderboardScreen;
