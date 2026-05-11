import React, { useState, useCallback } from "react";
import {
  Text, View, ScrollView, StyleSheet,
  ActivityIndicator, Pressable, Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from '../../context/LanguageContext';

const SelectPatient = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(1);

  // 1. selectedIds: ما يختاره الممرض الآن (UI فقط)
  const [selectedIds, setSelectedIds] = useState([]);

  // 2. confirmedIds: ما هو محجوز فعلياً للممرض في قاعدة البيانات
  const [confirmedIds, setConfirmedIds] = useState([]);

  const [myNurseId, setMyNurseId] = useState(null);

  // ─── جلب البيانات وبناء الحالة ─────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, profileRes] = await Promise.all([
        api.get("/dialysis-scheduling/nurse/today"),
        api.get("/users/profile"),
      ]);

      const nurseId = profileRes.data?.nurse?.nurse_id ?? null;
      setMyNurseId(nurseId);
      setShifts(scheduleRes.data.shifts ?? []);

      if (scheduleRes.data.shifts?.length > 0) {
        setActiveShift(scheduleRes.data.shifts[0].shiftNumber);

        // استخراج المرضى المحجوزين فعلياً لهذا الممرض من الـ API
        const assignedToMe = scheduleRes.data.shifts
          .flatMap(s => s.patients)
          .filter(p => p.assignedNurseId === nurseId)
          .map(p => p.patientId);

        setConfirmedIds(assignedToMe); // هؤلاء فقط من يظهر عددهم في "حالة الغسيل"
        setSelectedIds(assignedToMe); // نجعلهم محددين تلقائياً في القائمة
      }

    } catch (e) {
      Alert.alert(t.error, t.selectPatient.fetchError);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { void fetchData(); }, []));

  // ─── اختيار مريض (تحديد جديد فقط) ──────────────────────────
  const togglePatient = (patient) => {
    // إذا كان المريض مخصصاً لأي شخص (أنا أو غيري) -> لا يمكن التعديل هنا
    if (patient.assignedNurseId !== null) {
      const msg = patient.assignedNurseId === myNurseId
        ? t.selectPatient.alreadyAdded
        : `${t.selectPatient.takenByNurse} ${patient.assignedNurseName}`;
      return Alert.alert(t.selectPatient.notAvailable, msg);
    }

    if (patient.sessionStatus === "COMPLETED") {
      return Alert.alert(t.error, t.selectPatient.sessionDone);
    }

    setSelectedIds(prev =>
      prev.includes(patient.patientId)
        ? prev.filter(id => id !== patient.patientId)
        : [...prev, patient.patientId]
    );
  };

  // ─── الضغط على متابعة (تأكيد الإضافات الجديدة فقط) ───────────
  const handleProceed = async () => {
    // تصفية المرضى الذين لم يكونوا مؤكدين سابقاً (إضافات جديدة)
    const newOnly = selectedIds.filter(id => !confirmedIds.includes(id));

    if (!newOnly.length) {
      // إذا لم يضف أي مريض جديد، فقط ننتقل للشاشة التالية
      return navigation.navigate("PatientState", { selectedPatientIds: selectedIds });
    }

    try {
      setProceeding(true);

      for (const patientId of newOnly) {
        const patient = currentShift.patients.find(p => p.patientId === patientId);
        if (patient) {
          try {
            await api.post(
              "/dialysis-scheduling/assign-nurse",
              { scheduleId: patient.scheduleId }
            );
          } catch (err) {
            console.warn("فشل حجز المريض:", patient.patientName);
          }
        }
      }

      // بعد النجاح، نحدث قائمة "المؤكدين"
      setConfirmedIds([...selectedIds]);
      navigation.navigate("PatientState", { selectedPatientIds: selectedIds });

    } catch (err) {
      Alert.alert(t.error, t.selectPatient.bookingError);
    } finally {
      setProceeding(false);
    }
  };

  // ─── زر حالة الغسيل ─────────────────────────────────────
  const goToStatus = () => {
    if (confirmedIds.length === 0) {
      return Alert.alert(t.error, t.selectPatient.confirmFirst);
    }
    navigation.navigate("PatientState", { selectedPatientIds: confirmedIds });
  };

  const currentShift = shifts.find(s => s.shiftNumber === activeShift);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t.selectPatient.title}</Text>

          {/* زر حالة الغسيل - يعتمد فقط على confirmedIds */}
          <Pressable
            onPress={goToStatus}
            style={[
              styles.stateBtn,
              confirmedIds.length === 0 && styles.stateBtnDisabled
            ]}
          >
            <MaterialCommunityIcons
              name="format-list-checks"
              size={20}
              color={confirmedIds.length > 0 ? "#fff" : "rgba(255,255,255,0.4)"}
            />
            <Text style={[
              styles.stateBtnText,
              confirmedIds.length === 0 && styles.stateBtnTextDisabled
            ]}>
              {t.selectPatient.dialysisStatus} {confirmedIds.length > 0 ? `(${confirmedIds.length})` : ""}
            </Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shiftTabs}>
          {shifts.map(s => (
            <Pressable
              key={s.shiftNumber}
              onPress={() => setActiveShift(s.shiftNumber)}
              style={[styles.tab, activeShift === s.shiftNumber && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeShift === s.shiftNumber && styles.activeTabText]}>
                {t.selectPatient.shift} {s.shiftNumber}
              </Text>
              <View style={[styles.countBadge, activeShift === s.shiftNumber && styles.activeCountBadge]}>
                <Text style={styles.countText}>{s.patientCount}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color="#26CDD6" style={{ marginTop: 60 }} />
        ) : !currentShift?.patients || currentShift.patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t.selectPatient.noPatients}</Text>
          </View>
        ) : (
          currentShift.patients.map(patient => {
            const isSelected = selectedIds.includes(patient.patientId);
            const isConfirmed = confirmedIds.includes(patient.patientId);
            const isTakenByOther = patient.assignedNurseId !== null && patient.assignedNurseId !== myNurseId;
            const isDone = patient.sessionStatus === "COMPLETED";

            return (
              <Pressable
                key={patient.scheduleId}
                onPress={() => togglePatient(patient)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isConfirmed && styles.cardConfirmed,
                  (isTakenByOther || isDone) && styles.cardDisabled
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    isDone ? "check-circle" :
                      isTakenByOther ? "lock" :
                        isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"
                  }
                  size={28}
                  color={
                    isDone ? "#26CDD6" :
                      isTakenByOther ? "#DE1A1C" :
                        isSelected ? "#26CDD6" : "#D1D5DB"
                  }
                />
                <View style={styles.info}>
                  <Text style={[styles.name, (isTakenByOther || isDone) && styles.disabledText]}>
                    {patient.patientName}
                  </Text>
                  <Text style={styles.sub}>
                    {isDone ? t.selectPatient.sessionComplete :
                      isConfirmed ? t.selectPatient.confirmedInList :
                        isTakenByOther ? `${t.selectPatient.withNurse} ${patient.assignedNurseName}` :
                          `${t.selectPatient.machine} ${patient.machineNumber}`}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.proceedBtn, proceeding && { opacity: 0.7 }]}
            onPress={handleProceed}
            disabled={proceeding}
          >
            {proceeding ? <ActivityIndicator color="#fff" /> : (
              <>
                <MaterialCommunityIcons name="check-all" size={22} color="#fff" />
                <Text style={styles.proceedText}>{t.selectPatient.proceed}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default SelectPatient;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1FCFD" },
  header: { backgroundColor: "#193B6B", paddingTop: 55, paddingBottom: 16, paddingHorizontal: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  stateBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  stateBtnDisabled: { backgroundColor: "rgba(255,255,255,0.05)" },
  stateBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  stateBtnTextDisabled: { color: "rgba(255,255,255,0.3)" },
  shiftTabs: { flexDirection: "row-reverse", gap: 8 },
  tab: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)" },
  activeTab: { backgroundColor: "#fff" },
  tabText: { color: "#BCEFF3", fontWeight: "600" },
  activeTabText: { color: "#193B6B", fontWeight: "800" },
  countBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 6 },
  activeCountBadge: { backgroundColor: "#193B6B" },
  countText: { fontSize: 11, fontWeight: "bold", color: "#fff" },
  scroll: { padding: 16, paddingBottom: 120 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
    gap: 16
  },
  emptyText: {
    fontSize: 18,
    color: "#8296B1",
    fontWeight: "600",
    textAlign: "center"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: { borderColor: "#26CDD6", backgroundColor: "#E9FAFB" },
  cardConfirmed: { borderColor: "#26CDD6", borderStyle: 'dashed' },
  cardDisabled: { backgroundColor: "#f8fafc", opacity: 0.6 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#193B6B", textAlign: "right" },
  disabledText: { color: "#8296B1" },
  sub: { fontSize: 12, color: "#8296B1", textAlign: "right", marginTop: 3 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  proceedBtn: { backgroundColor: "#26CDD6", flexDirection: "row-reverse", padding: 16, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 10 },
  proceedText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
