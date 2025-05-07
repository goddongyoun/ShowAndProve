import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // 화이트 배경
    padding: 20,
    paddingTop: 40, // 넓은 여백
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#000000',
    marginBottom: 20,
  },
  text: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    color: '#000000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  button: {
    backgroundColor: '#FFF44F', // 레몬 옐로우 포인트 컬러
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: '#000000',
  },
});