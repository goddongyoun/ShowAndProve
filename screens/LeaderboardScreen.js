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

/** 
 * 리더보드 점수 산출 기준:
 * - 완료한 도전과제 수 기준으로 랭킹 결정
 * - 같은 완료 수일 경우 최근 완료 시간 기준으로 순위 결정
 * - 실시간 업데이트되는 랭킹 시스템
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {globalStyles} from '../utils/styles';
import { getLeaderboard, getMyRank } from '../services/challengeService';
import { getCurrentUser } from '../services/authService';

const windowWidth = Dimensions.get('window').width;

const LeaderboardScreen = () => {
  const [topThree, setTopThree] = useState([]);
  const [restUsers, setRestUsers] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

    const fetchLeaderboard = async () => {
      try {
      setLoading(true);
      
      // 리더보드 데이터, 내 랭킹 정보, 현재 사용자 정보를 병렬로 가져오기
      const [leaderboardResponse, myRankResponse, userResponse] = await Promise.all([
        getLeaderboard().catch(() => []), // 실패 시 빈 배열 반환
        getMyRank().catch(() => null), // 실패 시 null 반환
        getCurrentUser().catch(() => null), // 실패 시 null 반환
      ]);
      
      console.log('리더보드 데이터:', leaderboardResponse);
      console.log('내 랭킹 데이터:', myRankResponse);
      console.log('현재 사용자:', userResponse);
        
      setLeaderboardData(leaderboardResponse);
      setMyRank(myRankResponse);
      setCurrentUser(userResponse);

      // 상위 3등 분리 및 정렬 (2등, 1등, 3등 순서로 표시)
      if (leaderboardResponse.length > 0) {
        const tempTopThree = leaderboardResponse.slice(0, 3).sort((a, b) => {
          if (a.rank === 2) return -1;
          if (b.rank === 2) return 1;
          if (a.rank === 1) return 0;
          if (b.rank === 1) return 0;
          return a.rank - b.rank;
        });

        // 1~10등까지 모두 표시 (상위 10등 제한)
        const tempRestUsers = leaderboardResponse.slice(0, 10);

        setTopThree(tempTopThree);
        setRestUsers(tempRestUsers);
      }

      } catch (error) {
        console.error('리더보드 조회 오류:', error);
      // 오류 발생 시 더미 데이터 사용
      const dummyData = [
        { id: '1', email: 'test1', name: '챌린저1', success_count: 20, rank: 1 },
        { id: '2', email: 'test2', name: '챌린저2', success_count: 18, rank: 2 },
        { id: '3', email: 'test3', name: '챌린저3', success_count: 17, rank: 3 },
        { id: '4', email: 'test4', name: '챌린저4', success_count: 12, rank: 4 },
        { id: '5', email: 'test5', name: '챌린저5', success_count: 7, rank: 5 },
      ];
      const dummyMyRank = { id: '6', email: 'test6', name: '나', success_count: 5, rank: 8 };
      
      setLeaderboardData(dummyData);
      setMyRank(dummyMyRank);
      setTopThree(dummyData.slice(0, 3));
      setRestUsers(dummyData.slice(3));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderTopThree = () => (
    <View style={{flexDirection: 'row', justifyContent: 'center', gap: 15, height: 180, marginBottom: 20, alignItems: 'center'}}>
      {topThree.map((item, index) => (
        <View 
          key={`top-${item.email}-${index}`} 
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
          <View style={styles.crown}>
            <Text style={[globalStyles.text, styles.crownText]}>
              {item.rank === 1 ? '👑' : item.rank === 2 ? '🥈' : '🥉'}
            </Text>
          </View>
          <View style={styles.profileImageContainer}>
            <View style={[styles.topThreeProfileImage, styles.defaultProfileImage]}>
              <Text style={[globalStyles.text, {fontSize: 24, fontWeight: 'bold', color: '#FFFFFF'}]}>
                {item.name ? item.name[0] : '?'}
              </Text>
            </View>
          </View>
          <Text style={[globalStyles.text, {fontSize: 16, color: '#000000', textAlign: 'center'}]}>
            {item.name || '알 수 없음'}
          </Text>
          <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
            {item.completedChallenges || 0}회 완료
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
            {item.name ? item.name[0] : '?'}
          </Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={[globalStyles.text, {fontSize: 16, color: '#000000'}]}>{item.name || '알 수 없음'}</Text>
        <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
          {item.completedChallenges || 0}회 완료
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFF44F" />
        <Text style={[globalStyles.text, { marginTop: 10, color: '#5E4636' }]}>
          리더보드 로딩 중...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={{padding: 20}}>
        <Text style={[globalStyles.text, {fontSize: 24, marginBottom: 10, color: '#5E4636', textAlign: 'center'}]}>
          리더보드
        </Text>
        <Text style={[globalStyles.text, {fontSize: 12, color: '#CDBCB0', textAlign: 'center', marginBottom: 15}]}>
          완료한 도전과제 수 기준 랭킹
        </Text>
      </View>

      {topThree.length > 0 && renderTopThree()}

      {leaderboardData.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40}}>
          <Text style={[globalStyles.text, {fontSize: 18, color: '#5E4636', textAlign: 'center', marginBottom: 10}]}>
            😊 아직 도전과제를 완료한 사용자가 없어요!
          </Text>
          <Text style={[globalStyles.text, {fontSize: 14, color: '#CDBCB0', textAlign: 'center'}]}>
            첫 번째로 도전과제를 완료해보세요!
          </Text>
        </View>
      ) : (
        <FlatList
          data={restUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.email}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FFF44F']}
            />
          }
        />
      )}

      {myRank && (
      <View style={styles.myRankContainer}>
          <Text style={[globalStyles.text, {fontSize: 14, color: '#5E4636', textAlign: 'center', marginBottom: 5}]}>
            내 순위
          </Text>
        <View style={styles.rankItem}>
          <View style={styles.rankNumberContainer}>
            <Text style={[globalStyles.text, {fontSize: 18, color: '#666666'}]}>{myRank.rank}</Text>
          </View>
          <View style={styles.profileImageContainer}>
            <View style={[styles.profileImage, styles.defaultProfileImage]}>
              <Text style={[globalStyles.text, {fontSize: 20, fontWeight: 'bold', color: '#FFFFFF'}]}>
                {myRank.name ? myRank.name[0] : '?'}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[globalStyles.text, {fontSize: 16, color: '#000000'}]}>{myRank.name || '알 수 없음'}</Text>
            <Text style={[globalStyles.text, {fontSize: 14, color: '#FFC300', fontWeight: '600'}]}>
                {myRank.completedChallenges || 0}회 완료
            </Text>
          </View>
        </View>
      </View>
      )}
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
