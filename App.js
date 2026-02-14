import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import LoginScreen from './login/loginScreen';
import DatesDoctor from './screens/patinet/DatesDoctor';
import SearchPatinet from './screens/patinet/searchPatinet';
import PatinetProfile from './screens/patinet/PatinetProfile';
import Weightinput from './screens/patinet/Weightinput';
import PatinetPages from './screens/patinet/PatinetControolPanal';
import NurceTasks from './screens/Nurse/NurseTasks';
import SettingsScreen from './screens/settings/settingsScreen';
import ChangePassword from './screens/changePassword/changePassword';
import NutritionistTable from './screens/Nutritionist/NutritionistTable';
import UserProfile from './screens/Profile/UserProfile';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown:false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SearchPatient" component={SearchPatinet} />
        <Stack.Screen name="Patinet" component={PatinetPages} />
        <Stack.Screen name="NurseHome" component={NurceTasks} />
        <Stack.Screen name="NutritionistHome" component={NutritionistTable} />
      </Stack.Navigator>
      </NavigationContainer>
      
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
