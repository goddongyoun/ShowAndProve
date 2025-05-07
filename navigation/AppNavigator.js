import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../components/Auth/LoginScreen';
import RegisterScreen from '../components/Auth/RegisterScreen';
import ChallengeCreateScreen from '../components/Challenge/ChallengeCreateScreen';
import ChallengeListScreen from '../components/Challenge/ChallengeListScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerBackImage: () => null,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChallengeCreate" component={ChallengeCreateScreen} />
        <Stack.Screen name="ChallengeList" component={ChallengeListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}