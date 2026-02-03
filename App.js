import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import LoginScreen from './login/loginScreen';
import DatesDoctor from './screens/patinet/DatesDoctor';
import SearchPatinet from './screens/patinet/searchPatinet';
import PatinetProfile from './screens/patinet/PatinetProfile';
import Weightinput from './screens/patinet/Weightinput';
import PatinetPages from './screens/patinet/PatinetControolPanal';

export default function App() {
  
  return (
    <View style={styles.container}>
      {/* <LoginScreen/> */}
      {/* <DatesDoctor/> */}
      {/* <SearchPatinet/> */}
      {/* <PatinetProfile/> */}
      {/* <Weightinput/> */}

      <PatinetPages/>
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
