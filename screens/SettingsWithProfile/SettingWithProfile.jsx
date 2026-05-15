import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, StatusBar, Switch } from 'react-native';
import { Icon } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from '../../context/LanguageContext';

const ProfileSettingsScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lang, t, toggleLanguage } = useLanguage();

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
      Alert.alert(t.error, t.settings.profileError);
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
      Alert.alert(t.error, t.settings.logoutError);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      t.settings.logoutTitle,
      t.settings.logoutMsg,
      [
        { text: t.cancel, style: "cancel" },
        { text: t.settings.logoutConfirm, style: "destructive", onPress: handleLogout }
      ]
    );
  };

  const handleLanguageToggle = () => {
    Alert.alert(
      t.settings.languageTitle,
      t.settings.languageMsg,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.confirm, onPress: toggleLanguage },
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

  const SettingItem = ({ icon, title, onPress, rightElement }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      {rightElement ? rightElement : <Icon name="chevron-left" size={18} color="#8296B1" />}
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{title}</Text>
        <View style={styles.iconCircle}>
          <Icon name={icon} size={20} color="#26CDD6" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!userData) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ textAlign: 'center', color: '#8296B1' }}>{t.loading}</Text>
      </View>
    );
  }

  const role = userData.role;
  let data = role === "PATIENT" ? userData.patient :
    role === "NURSE" ? userData.nurse :
      userData.nutritionist;

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#193B6B" />

      <View style={styles.header}>
        <View style={styles.headerCircleOne} />
        <View style={styles.headerCircleTwo} />
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
        <Text style={styles.sectionTitle}>{t.settings.title}</Text>

        <SettingItem
          icon="lock"
          title={t.settings.changePassword}
          onPress={() => navigation.navigate("ChangePassword")}
        />

        <TouchableOpacity style={styles.item} onPress={handleLanguageToggle}>
          <Switch
            value={lang === 'en'}
            onValueChange={handleLanguageToggle}
            trackColor={{ false: '#d1d5db', true: '#26CDD6' }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          <View style={styles.itemContent}>
            <View>
              <Text style={styles.itemText}>{t.settings.language}</Text>
              <Text style={styles.langSubText}>{t.settings.currentLang}</Text>
            </View>
            <View style={styles.iconCircle}>
              <Icon name="language" size={20} color="#26CDD6" />
            </View>
          </View>
        </TouchableOpacity>

        <SettingItem
          icon="info"
          title={t.settings.aboutApp}
          onPress={() => navigation.navigate("AboutApp")}
        />

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Icon name="logout" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>{t.settings.logout}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FCFD',
  },
  header: {
    backgroundColor: '#193B6B',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
  },
  headerCircleOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(38, 205, 214, 0.15)",
    top: -75,
    right: -55,
  },
  headerCircleTwo: {
    position: "absolute",
    width: 135,
    height: 135,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    bottom: -45,
    left: -35,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#8296B1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#26CDD6',
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
    backgroundColor: '#193B6B',
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: '#193B6B',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 15,
  },
  subText: {
    color: '#8296B1',
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
    borderColor: '#26CDD6',
  },
  roleText: {
    color: '#26CDD6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  list: {
    padding: 25,
  },
  sectionTitle: {
    textAlign: 'right',
    color: '#8296B1',
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
    color: '#193B6B',
    fontWeight: '600',
    textAlign: "right",
  },
  langSubText: {
    marginRight: 12,
    fontSize: 11,
    color: '#26CDD6',
    textAlign: "right",
    fontWeight: '500',
  },
  iconCircle: {
    width: 35,
    height: 35,
    backgroundColor: '#E9FAFB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#DE1A1C',
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