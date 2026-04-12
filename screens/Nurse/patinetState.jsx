import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const PatientState = ({ route }) => {
  const navigation = useNavigation();
  const { selectedPatientIds } = route.params || { selectedPatientIds: [] };

  const [loading, setLoading] = useState(false);
  const [myPatients, setMyPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // دالة جلب البيانات وتحديث حالة المرضى المتابعين
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        "https://medikidneysys.onrender.com/dialysis-scheduling/nurse/today",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allShifts = response.data.shifts || [];
      // فلترة المرضى بناءً على الـ IDs التي اخترناها في الصفحة السابقة
      const filtered = allShifts
        .flatMap(shift => shift.patients)
        .filter(p => selectedPatientIds.includes(p.patientId));

      setMyPatients(filtered);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [selectedPatientIds])
  );

  // دالة لبدء الجلسة إذا كانت null (تحديث الحالة إلى IN_PROGRESS)
  const handleStartSession = async (patient) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      let sid = patient.sessionId;

      // إذا كان الـ sessionId غير موجود (null)، ننشئ الجلسة بـ POST
      if (!sid) {
        const createRes = await axios.post(
          "https://medikidneysys.onrender.com/dialysis-sessions",
          {
            patientId: patient.patientId,
            scheduleId: patient.scheduleId,
            date: new Date().toISOString(),
            startTime: new Date().toISOString(),
            status: "PENDING",
            weightBefore: 0,
            bloodPressureBefore: "0/0"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sid = createRes.data.sessionId || createRes.data.id;
      }

      // الآن نحدث الحالة إلى قيد العمل (IN_PROGRESS)
      await axios.patch(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sid}/status`,
        { status: "IN_PROGRESS" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("نجاح", "تم بدء الجلسة وتحويلها إلى قيد الغسيل");
      fetchStatus();

    } catch (error) {
      console.log("Error Details:", error.response?.data);
      Alert.alert("خطأ", "فشل بدء الجلسة");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "COMPLETED": return { label: "مكتمل", color: "#059669", icon: "check-circle" };
      case "IN_PROGRESS": return { label: "قيد الغسيل", color: "#2563eb", icon: "sync" };
      case "PENDING": return { label: "بانتظار البيانات", color: "#d97706", icon: "clock-outline" };
      default: return { label: "لم تبدأ بعد", color: "#6b7280", icon: "play-circle-outline" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.mainHeader}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.navigate("NurseHome")} style={styles.headerIcon}>
            <MaterialCommunityIcons name="home-variant-outline" size={26} color="#065f46" />
          </Pressable>
          <Text style={styles.mainTitle}>مرضاي ({myPatients.length})</Text>
          <Pressable onPress={() => navigation.navigate("SelectPatient", { alreadySelected: selectedPatientIds })} style={styles.headerIcon}>
            <MaterialCommunityIcons name="account-edit-outline" size={26} color="#065f46" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStatus} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
        ) : myPatients.map((patient) => {
          const statusInfo = getStatusInfo(patient.sessionStatus);
          const hasActiveSession = patient.sessionId !== null;

          return (
            <View key={patient.scheduleId} style={styles.patientCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
                <Text style={styles.machineText}>جهاز #{patient.machineNumber}</Text>
              </View>

              <Text style={styles.patientName}>{patient.patientName}</Text>

              <View style={styles.cardFooter}>
                {hasActiveSession ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate("SessionDetails", { patient: patient })}
                  >
                    <Text style={styles.actionBtnText}>إدخال البيانات الحيوية</Text>
                    <MaterialCommunityIcons name="chevron-left" size={20} color="#fff" />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#d97706' }]}
                    onPress={() => handleStartSession(patient)}
                  >
                    <Text style={styles.actionBtnText}>بدء جلسة غسيل الآن</Text>
                    <MaterialCommunityIcons name="play" size={20} color="#fff" />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {myPatients.length === 0 && !loading && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#D1D5DB" />
            <Text style={{ color: '#9CA3AF', marginTop: 10 }}>لم يتم اختيار مرضى للمتابعة</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  mainHeader: { backgroundColor: "#fff", paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerIcon: { padding: 8, backgroundColor: '#ECFDF5', borderRadius: 12 },
  scroll: { padding: 16 },
  patientCard: { backgroundColor: "#fff", borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, borderRightWidth: 5, borderRightColor: '#059669' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginRight: 5 },
  machineText: { color: '#6B7280', fontSize: 12 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'right' },
  cardFooter: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actionBtn: { backgroundColor: "#059669", flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10 },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14, marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 80 }
});

export default PatientState;