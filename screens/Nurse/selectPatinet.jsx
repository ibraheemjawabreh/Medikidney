import React, { useState, useCallback, useEffect } from "react";
import {
  Text, View, ScrollView, StyleSheet,
  ActivityIndicator, Pressable, LayoutAnimation, Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const API = "https://medikidneysys.onrender.com";

const SelectPatient = ({ route }) => {
  const navigation = useNavigation();
  const alreadySelected = route?.params?.alreadySelected || [];

  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(1);
  const [selectedIds, setSelectedIds] = useState(alreadySelected);
  const [myId, setMyId] = useState(null);

  // داخل SelectPatient.jsx

  // داخل SelectPatient.jsx

  // داخل SelectPatient.jsx -> fetchData

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const { data } = await axios.get(`${API}/dialysis-scheduling/nurse/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // الفلترة الدقيقة بناءً على الـ JSON الخاص بك:
      const fetchedShifts = data.shifts.map(shift => ({
        ...shift,
        patients: shift.patients.filter(p =>
          // 1. المريض ليس له ممرض مخصص (assignedNurseId هو null)
          p.assignedNurseId === null &&
          // 2. المريض لم ينهِ جلسته اليوم (sessionStatus ليس COMPLETED)
          p.sessionStatus !== "COMPLETED"
        )
      }));

      setShifts(fetchedShifts);
      if (fetchedShifts.length) setActiveShift(fetchedShifts[0].shiftNumber);
    } catch (e) {
      Alert.alert("خطأ", "فشل جلب البيانات");
    } finally {
      setLoading(false);
    }
  };




  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const togglePatient = (patient) => {
    // 1. المريض محجوز لممرض آخر
    const isTakenByOthers = patient.assignedNurseId !== null && patient.assignedNurseId !== myId;
    // 2. الجلسة مكتملة أو بدأت
    const isCompleted = patient.sessionStatus === "COMPLETED";

    if (isTakenByOthers) {
      return Alert.alert("تنبيه", `هذا المريض محجوز للممرض: ${patient.assignedNurseName}`);
    }
    if (isCompleted) {
      return Alert.alert("تنبيه", "هذا المريض أتم جلسته اليوم");
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds((prev) =>
      prev.includes(patient.patientId)
        ? prev.filter((id) => id !== patient.patientId)
        : [...prev, patient.patientId]
    );
  };

  const handleProceed = () => {
    if (!selectedIds.length) return Alert.alert("تنبيه", "اختر مريضاً واحداً على الأقل");
    navigation.navigate("PatientState", { selectedPatientIds: selectedIds });
  };

  const currentShift = shifts.find((s) => s.shiftNumber === activeShift);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.headerTitle, { marginBottom: 0 }]}>اختيار مرضى الشفت</Text>
          <Pressable onPress={() => navigation.navigate("PatientState")} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="format-list-checks" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>حالة الغسيل</Text>
          </Pressable>
        </View>
        <View style={styles.shiftTabs}>
          {shifts.map((s) => (
            <Pressable
              key={s.shiftNumber}
              onPress={() => setActiveShift(s.shiftNumber)}
              style={[styles.tab, activeShift === s.shiftNumber && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeShift === s.shiftNumber && styles.activeTabText]}>
                شفت {s.shiftNumber}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <ActivityIndicator size="large" color="#059669" /> :
          currentShift?.patients?.map((patient) => {
            const isSelected = selectedIds.includes(patient.patientId);
            const isTakenByOthers = patient.assignedNurseId !== null && patient.assignedNurseId !== myId;
            const isBusy = isTakenByOthers || patient.sessionStatus === "COMPLETED";

            return (
              <Pressable
                key={patient.scheduleId}
                onPress={() => togglePatient(patient)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isBusy && styles.cardBusy,
                ]}
              >
                <MaterialCommunityIcons
                  name={isTakenByOthers ? "lock-outline" : isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                  size={26}
                  color={isTakenByOthers ? "#ef4444" : isSelected ? "#059669" : "#D1D5DB"}
                />
                <View style={styles.info}>
                  <Text style={[styles.name, isBusy && styles.busyName]}>
                    {patient.patientName}
                  </Text>
                  <Text style={styles.sub}>
                    {isTakenByOthers ? `مع الممرض: ${patient.assignedNurseName}` : `جهاز: ${patient.machineNumber}`}
                  </Text>
                </View>
              </Pressable>
            );
          })
        }
      </ScrollView>

      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedText}>متابعة ({selectedIds.length}) مرضى</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default SelectPatient;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    backgroundColor: "#065f46",
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 20, fontWeight: "800", color: "#fff",
    textAlign: "center", marginBottom: 16,
  },
  shiftTabs: {
    flexDirection: "row-reverse", justifyContent: "center",
    gap: 10, backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, padding: 5,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10 },
  activeTab: { backgroundColor: "#fff" },
  tabText: { color: "#A7F3D0", fontWeight: "600" },
  activeTabText: { color: "#065f46", fontWeight: "800" },

  scroll: { padding: 16, paddingBottom: 110 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: "#F3F4F6",
    elevation: 2, flexDirection: "row-reverse", alignItems: "center", gap: 12,
  },
  cardSelected: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  cardBusy: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", opacity: 0.65 },

  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#1F2937", textAlign: "right" },
  busyName: { color: "#94a3b8" },
  sub: { fontSize: 13, color: "#6B7280", textAlign: "right", marginTop: 3 },

  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#059669", alignItems: "center", justifyContent: "center",
  },
  checkText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24, backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 10,
  },
  proceedBtn: {
    backgroundColor: "#059669", padding: 16,
    borderRadius: 14, alignItems: "center",
  },
  proceedText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});