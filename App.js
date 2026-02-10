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

export default function App() {

  return (
    <View style={styles.container}>
      {/* <LoginScreen/> */}
      {/* <DatesDoctor/> */}
      {/* <SearchPatinet/> */}
      {/* <PatinetProfile/> */}
      {/* <Weightinput/> */}
      {/* <NurceTasks/> */}
      {/* <PatinetPages/> */}
      {/* <SettingsScreen /> */}
      {/* <NutritionistTable/> */}
      <ChangePassword />
      <StatusBar style="auto" />
    </View>
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
