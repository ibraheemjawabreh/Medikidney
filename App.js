import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import LoginScreen from './login/loginScreen';
import DatesDoctor from './screens/patinet/DatesDoctor';
import SearchPatinet from './screens/patinet/searchPatinet';
import NurceTasks from './screens/Nurse/NurseTasks';

export default function App() {
  
  return (
    <View style={styles.container}>
      {/* <LoginScreen/> */}
      {/* <DatesDoctor/>*/ }
      {/*<SearchPatinet/>*/}
      <NurceTasks/>
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
