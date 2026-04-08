import React, { useState, useCallback } from "react";
import {
  Text, View, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, LayoutAnimation, Platform, UIManager, Alert
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// تفعيل الانيميشن للأندرويد لضمان سلاسة اختيار الكروت
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SelectPatient = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(1);
  const [selectedPatients, setSelectedPatients] = useState([]); // تخزين مصفوفة patientId

  // 1. جلب المواعيد اليومية من السيرفر
  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        "https://medikidneysys.onrender.com/dialysis-scheduling/nurse/today",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // تحديث الشفتات، وفي حال كان الشفت الحالي فارغاً ننتقل لأول شفت يحتوي مرضى
      const allShifts = response.data.shifts || [];
      setShifts(allShifts);

      // منطق ذكي: إذا كان الشفت 1 فارغاً، ابحث عن أول شفت فيه مرضى وافتحه تلقائياً
      const firstPopulatedShift = allShifts.find(s => s.patientCount > 0);
      if (firstPopulatedShift && activeShift === 1 && allShifts[0].patientCount === 0) {
        setActiveShift(firstPopulatedShift.shiftNumber);
      }

    } catch (error) {
      console.log("Error fetching shifts:", error);
      Alert.alert("خطأ", "فشل جلب بيانات الشفتات");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodaySchedules();
    }, [])
  );

  // 2. منطق اختيار/إلغاء اختيار مريض (Multi-Select)
  const togglePatientSelection = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedPatients.includes(id)) {
      setSelectedPatients(selectedPatients.filter(pId => pId !== id));
    } else {
      setSelectedPatients([...selectedPatients, id]);
    }
  };

  // 3. الانتقال للصفحة التالية وتمرير الـ IDs
  const handleProceed = () => {
    if (selectedPatients.length === 0) {
      return Alert.alert("تنبيه", "الرجاء اختيار مريض واحد على الأقل للبدء");
    }
    
    // تمرير المصفوفة تحت مفتاح 'selectedPatientIds' لتستقبله صفحة PatientState
    navigation.navigate("PatientState", { 
        selectedPatientIds: selectedPatients 
    });
  };

  // تصفية بيانات الشفت الحالي المختار
  const currentShiftData = shifts.find(s => s.shiftNumber === activeShift);

  return (
    <View style={styles.container}>
      {/* Header مع تبويبات الشفتات */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>اختيار مرضى الشفت</Text>
        <View style={styles.shiftTabs}>
          {shifts.map(s => (
            <Pressable 
              key={s.shiftNumber} 
              onPress={() => setActiveShift(s.shiftNumber)}
              style={[styles.tab, activeShift === s.shiftNumber && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeShift === s.shiftNumber && styles.activeTabText]}>
                شفت {s.shiftNumber}
              </Text>
              {s.patientCount > 0 && <View style={styles.dot} />}
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {currentShiftData?.patients?.length > 0 ? (
            currentShiftData.patients.map((patient) => {
              const isSelected = selectedPatients.includes(patient.patientId);
              
              return (
                <Pressable 
                  key={patient.scheduleId}
                  onPress={() => togglePatientSelection(patient.patientId)}
                  style={[styles.patientCard, isSelected && styles.selectedCard]}
                >
                  <View style={styles.cardContent}>
                    {/* أيقونة الاختيار الجانبية */}
                    <MaterialCommunityIcons 
                      name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                      size={26} 
                      color={isSelected ? "#059669" : "#D1D5DB"} 
                    />

                    <View style={styles.info}>
                      <Text style={styles.patientName}>{patient.patientName}</Text>
                      
                      <View style={styles.metaRow}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>جهاز: {patient.machineNumber}</Text>
                        </View>
                        {patient.hasSessionToday && (
                          <View style={[styles.badge, {backgroundColor: '#ECFDF5'}]}>
                            <Text style={[styles.badgeText, {color: '#059669'}]}>مسجل اليوم</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-off-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyText}>لا يوجد مرضى في هذا الشفت</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* زر الانتقال العائم - يظهر فقط عند اختيار مريض واحد على الأقل */}
      {selectedPatients.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.proceedBtn} onPress={handleProceed}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
            <Text style={styles.proceedBtnText}>
              بدء العمل مع ({selectedPatients.length}) مرضى
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { 
    backgroundColor: "#065f46", 
    padding: 20, 
    paddingTop: 50, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 5
  },
  headerTitle: { fontSize: 20, color: "#fff", fontWeight: "bold", textAlign: "center", marginBottom: 15 },
  shiftTabs: { 
    flexDirection: "row-reverse", 
    justifyContent: "space-around", 
    backgroundColor: "rgba(255,255,255,0.15)", 
    borderRadius: 15, 
    padding: 5 
  },
  tab: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, alignItems: 'center' },
  activeTab: { backgroundColor: "#fff" },
  tabText: { color: "#A7F3D0", fontWeight: "bold" },
  activeTabText: { color: "#065f46" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981', marginTop: 2 },
  
  scroll: { padding: 16, paddingBottom: 110 },
  patientCard: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 12, 
    borderWidth: 1.5, 
    borderColor: "#F3F4F6",
    elevation: 2 
  },
  selectedCard: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  cardContent: { flexDirection: "row-reverse", alignItems: "center" },
  info: { marginRight: 15, flex: 1 },
  patientName: { fontSize: 17, fontWeight: "bold", color: "#1F2937", textAlign: "right" },
  metaRow: { flexDirection: 'row-reverse', marginTop: 8, gap: 8 },
  badge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  
  footer: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 20, 
    backgroundColor: "rgba(255,255,255,0.9)", 
    borderTopWidth: 1, 
    borderColor: "#E5E7EB" 
  },
  proceedBtn: { 
    backgroundColor: "#059669", 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 16, 
    borderRadius: 15,
    elevation: 3
  },
  proceedBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16, marginRight: 10 },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#9CA3AF", marginTop: 10, fontSize: 16 }
});

export default SelectPatient;