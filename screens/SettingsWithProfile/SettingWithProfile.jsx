import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, StatusBar } from 'react-native';
import { Icon } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileSettingsScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [userData, setUserData] = useState(null);
const [loading, setLoading] = useState(true); // حالة التحميل
  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/profile");
      setUserData(response.data);
    } catch (error) {
      console.log("Profile Fetch Error Details:", error.response?.data || error.message);
      Alert.alert("خطأ", "لا تملك الصلاحية للوصول لبيانات الملف الشخصي، أو أن هناك خطأ في الخادم.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة تسجيل الخروج");
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "خروج", style: "destructive", onPress: handleLogout }
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

  const SettingItem = ({ icon, title, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Icon name="chevron-left" size={18} color="#94a3b8" />
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{title}</Text>
        <View style={styles.iconCircle}>
          <Icon name={icon} size={20} color="#059669" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!userData) {
    return (
      <View style={[styles.container, {justifyContent: 'center'}]}>
        <Text style={{textAlign: 'center', color: '#64748b'}}>جاري التحميل...</Text>
      </View>
    );
  }

  const role = userData.role;
  let data = role === "PATIENT" ? userData.patient : 
             role === "NURSE" ? userData.nurse : 
             userData.nutritionist;

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} />
          ) : (
            <Icon name="person" size={50} color="#fff" />
          )}
          <View style={styles.editIcon}>
            <Icon name="camera-alt" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{data?.full_name || "مستخدم"}</Text>
        <Text style={styles.subText}>{data?.phone || "059xxxxxxx"}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      <View style={styles.list}>
        <Text style={styles.sectionTitle}>الإعدادات العامة</Text>
        
        <SettingItem
          icon="lock"
          title="تغيير كلمة المرور"
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <SettingItem
          icon="person"
          title="تعديل بيانات الحساب"
          onPress={() => {}}
        />
        <SettingItem
          icon="language"
          title="لغة التطبيق"
          onPress={() => {}}
        />
        <SettingItem
          icon="info"
          title="عن تطبيق MediKidney"
          onPress={() => navigation.navigate("AboutApp")}
        />

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Icon name="logout" size={20} color="#fff" style={{marginRight: 10}} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecfdf5', // نفس خلفية تسجيل الدخول
  },
  header: {
    backgroundColor: '#204a42', // اللون الكحلي الداكن من زر تسجيل الدخول
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 40,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#606a7b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#059669', // اللون الأخضر الطبي
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  editIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#204a42',
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 15,
  },
  subText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  roleText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: 'bold',
  },
  list: {
    padding: 25,
  },
  sectionTitle: {
    textAlign: 'right',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    marginRight: 5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: "flex-end",
  },
  itemText: {
    marginRight: 12,
    fontSize: 15,
    color: '#1e293b', // لون النص الداكن من تسجيل الدخول
    fontWeight: '600',
    textAlign: "right",
  },
  iconCircle: {
    width: 35,
    height: 35,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#ef4444', // أحمر واضح للخروج
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});

export default ProfileSettingsScreen;