import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Icon } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileSettingsScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة تسجيل الخروج");
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج من التطبيق؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "نعم، اخرج", style: "destructive", onPress: handleLogout }
      ]
    );
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const SettingItem = ({ icon, title, onPress, id }) => (
    <TouchableOpacity key={id} style={styles.item} onPress={onPress}>
      <Icon name="chevron-left" size={20} color="#ccc" />
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{title}</Text>
        <Icon name={icon} size={22} color="#382120" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {image ? <Image source={{ uri: image }} style={styles.avatar} /> : 
                   <Icon name="person" size={50} color="#fff" />}
          <View style={styles.editIcon}><Icon name="edit" size={12} color="#fff" /></View>
        </TouchableOpacity>
        <Text style={styles.name}>احمد محمد</Text>
        <Text style={styles.subText}>ahmed@.com</Text>
      </View>

      <View style={styles.list}>
        <SettingItem id="1" icon="lock" title="تغيير كلمة المرور" onPress={() => 
            navigation.navigate('ChangePassword')} />
        <SettingItem id="2" icon="person" title="تعديل الحساب" onPress={() => {}} />
        <SettingItem id="3" icon="language" title="لغة التطبيق" onPress={() => {}} />
        <SettingItem id="4" icon="info" title="عن التطبيق" onPress={() => 
            navigation.navigate('AboutApp')}  />

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProfileSettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#382120',
    padding: 40,
    alignItems: 'center',
    borderBottomRightRadius: 50,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5e3c3a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#a27d7b',
    borderRadius: 10,
    padding: 4,
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subText: {
    color: '#ccc',
    fontSize: 12,
  },
  list: {
    padding: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    marginRight: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});