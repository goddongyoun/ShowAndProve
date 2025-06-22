import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import pushNotificationService from '../../services/pushNotificationService';
import { globalStyles } from '../../utils/styles';

// 9개 카테고리 태그 정의
const AVAILABLE_TAGS = [
  '학습/공부',
  '운동/건강',
  '요리/생활',
  '창작/취미',
  '마음/명상',
  '사회/관계',
  '업무/커리어',
  '환경/지속가능',
  '도전/모험'
];

export default function ChallengeCreateScreen({ navigation }) {
  const [challengeName, setChallengeName] = useState('');
  const [challengeContent, setChallengeContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [expiredDate, setExpiredDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 기본값: 7일 후
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiredDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!challengeName.trim() || !challengeContent.trim()) {
      Alert.alert('입력 오류', '도전과제 이름과 내용을 모두 입력해주세요');
      return;
    }

    // 태그 선택은 선택사항으로 변경 (백엔드에서 빈 배열 처리 가능)
    console.log('선택된 태그:', selectedTags);

    try {
      // Python의 datetime.fromisoformat()이 인식할 수 있는 형식으로 변환
      const formatDate = (date) => {
        // YYYY-MM-DDTHH:MM:SS 형식 (타임존 없이)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const challengeData = {
        title: challengeName,
        content: challengeContent,
        tags: selectedTags,
        expired_date: formatDate(expiredDate)
      };

      console.log('전송할 도전과제 데이터:', challengeData);
      console.log('선택된 만료일:', expiredDate.toLocaleDateString('ko-KR'));

      const result = await api.challenge.create(challengeData);
      console.log('도전과제 생성 API 응답:', result);
      
      // 성공 처리
      const successMessage = result.message || '도전과제가 성공적으로 생성되었습니다!';
        
      Alert.alert('성공', successMessage, [
        {
          text: '확인',
          onPress: () => {
            console.log('=== 도전과제 생성 성공 후 처리 시작 ===');
            
            // 폼 초기화
            console.log('폼 초기화 중...');
            setChallengeName('');
            setChallengeContent('');
            setSelectedTags([]);
            setExpiredDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            console.log('폼 초기화 완료');
            
            // 도전과제 생성 후 관심 태그 기반 알림 체크
            console.log('알림 체크 예약 중...');
            setTimeout(() => {
              pushNotificationService.checkNewChallengesByInterests();
            }, 500);
            
            // 도전과제 목록 화면으로 이동
            console.log('화면 이동 시도: ChallengeList');
            console.log('navigation 객체:', navigation);
            console.log('navigation.navigate 함수:', typeof navigation.navigate);
            
            try {
              navigation.navigate('ChallengeList');
              console.log('화면 이동 성공: ChallengeList');
            } catch (error) {
              console.error('화면 이동 오류:', error);
              console.log('홈 화면으로 대체 이동 시도');
              navigation.navigate('Home');
            }
            
            console.log('=== 도전과제 생성 후 처리 완료 ===');
          },
        },
      ]);
      
    } catch (error) {
      console.error('도전과제 생성 오류:', error);
      Alert.alert('오류', `도전과제 생성에 실패했습니다: ${error.message}`);
    }
  };

  return (
    <View style={[globalStyles.container, { flex: 1 }]}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[globalStyles.text, { fontSize: 24, marginBottom: 20, color: '#5E4636', textAlign: 'center' }]}>
          도전과제를 생성하세요!
        </Text>
        
        <TextInput 
          placeholder="도전과제 이름" 
          value={challengeName}
          onChangeText={setChallengeName}
          style={[globalStyles.input, { marginBottom: 15 }]} 
        />
        
        <TextInput 
          placeholder="도전과제 내용" 
          value={challengeContent}
          onChangeText={setChallengeContent}
          style={[globalStyles.input, { marginBottom: 15, height: 100, textAlignVertical: 'top' }]} 
          multiline 
        />

        {/* 만료일 선택 - OS별 분리 */}
        <View style={{ marginBottom: 15 }}>
          <Text style={[globalStyles.text, { fontSize: 16, marginBottom: 8, color: '#5E4636' }]}>
            만료일
          </Text>
          
          {Platform.OS === 'web' ? (
            // 웹에서는 HTML input date 사용
            <input
              type="date"
              value={expiredDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                if (!isNaN(selectedDate.getTime())) {
                  setExpiredDate(selectedDate);
                }
              }}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #DDD',
                backgroundColor: '#FFF',
                fontFamily: 'Cafe24Ssurround',
              }}
            />
          ) : (
            // 모바일에서는 DateTimePicker 사용
            <>
              <TouchableOpacity
                style={[globalStyles.input, { justifyContent: 'center', height: 50 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[globalStyles.text, { color: '#333' }]}>
                  {expiredDate.toLocaleDateString('ko-KR')}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={expiredDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </>
          )}
        </View>

        {/* 태그 선택 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[globalStyles.text, { fontSize: 16, marginBottom: 8, color: '#5E4636' }]}>
            태그 선택 (다중 선택 가능)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: selectedTags.includes(tag) ? '#FFE357' : '#DDD',
                  backgroundColor: selectedTags.includes(tag) ? '#FFE357' : '#FFF',
                }}
                onPress={() => handleTagToggle(tag)}
              >
                <Text style={[
                  globalStyles.text,
                  {
                    fontSize: 12,
                    color: selectedTags.includes(tag) ? '#5E4636' : '#666',
                    fontWeight: selectedTags.includes(tag) ? 'bold' : 'normal'
                  }
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedTags.length > 0 && (
            <Text style={[globalStyles.text, { fontSize: 12, color: '#666', marginTop: 8 }]}>
              선택된 태그: {selectedTags.join(', ')}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[globalStyles.button, { padding: 15, borderRadius: 8, marginBottom: 20 }]} 
          onPress={handleSubmit}
        >
          <Text style={[globalStyles.text, { fontSize: 16, color: '#FFFFFF' }]}>도전과제 생성</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}