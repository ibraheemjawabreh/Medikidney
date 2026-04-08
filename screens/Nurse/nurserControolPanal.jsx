import React from 'react'; 
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

// استيراد الصفحة الجديدة (تأكد من صحة المسار لديك)
import DailySchedules from "../Nurse/DailySchedules"; 
import ProfileSettingsScreen from "../SettingsWithProfile/SettingWithProfile";
import SearchPatient from "../patinet/searchPatinet"; // خليناها كخيار ثانوي
import selectPatinet from './selectPatinet'

const Tab = createBottomTabNavigator();

const NursePages = () => {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="selectPatinet" // جعل جدول الجلسات هو الصفحة الأولى
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#2563eb", // لون أزرق طبي احترافي
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            let iconName;

            if (route.name === "selectPatinet") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else if (route.name === "Search") {
              iconName = focused ? "search" : "search-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={24} color={color} />;
          },
        })}
      >
        {/* الصفحة الأساسية الجديدة: جدول الجلسات */}
        <Tab.Screen
          name="selectPatinet"
          component={selectPatinet}
          options={{ title: "جلسات اليوم" }}
        />

        {/* صفحة البحث: أصبحت اختيارية للممرض */}
        <Tab.Screen
          name="Search"
          component={SearchPatient}
          options={{ title: "بحث عن مريض" }}
        />

        {/* صفحة الإعدادات */}
        <Tab.Screen
          name="Settings"
          component={ProfileSettingsScreen}
          options={{ title: "الإعدادات" }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default NursePages;

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: "#F9FAFB",
    width: '100%'
  },
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 15,
    borderTopWidth: 0, 
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});