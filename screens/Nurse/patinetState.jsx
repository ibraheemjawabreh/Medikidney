import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

const PatientState = ({ route }) => {
  const navigation = useNavigation();
  const { selectedPatientIds = [] } = route.params ?? {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myPatients, setMyPatients] = useState([]);
  const [myNurseId, setMyNurseId] = useState(null);

  // ─── Modal الوزن قبل الجلسة ───────────────────────────────────
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [pendingPatient, setPendingPatient] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightInputError, setWeightInputError] = useState('');
  const [isSavingSession, setIsSavingSession] = useState(false);

  // ─── جلب حالة المرضى المختارين ────────────────────────────
  const fetchStatus = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [scheduleRes, profileRes] = await Promise.all([
        api.get("/dialysis-scheduling/nurse/today"),
        api.get("/users/profile"),
      ]);

      const nurseId = profileRes.data?.nurse?.nurse_id ?? null;
      setMyNurseId(nurseId);

      const allPatients = (scheduleRes.data.shifts ?? []).flatMap(s => s.patients);

      // الفلترة الصحيحة: فقط المرضى المحجوزين لهذا الممرض حالياً
      // نستخدم nurseId المستخرج مباشرة من البروفايل لضمان الدقة
      const filtered = allPatients.filter(p => p.assignedNurseId === nurseId);

      setMyPatients(filtered);
      return filtered;
    } catch (error) {
      console.error("Error fetching patient status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { void fetchStatus(); }, [selectedPatientIds])
  );

  // ─── حذف المريض من القائمة (إلغاء الحجز) ──────────────────────
  const handleUnassign = async (patient) => {
    Alert.alert(
      "تأكيد الحذف",
      `هل تود حذف المريض ${patient.patientName} من قائمتك وإتاحته للآخرين؟`,
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "حذف مريض",
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(
                `/dialysis-scheduling/assign-nurse/${patient.scheduleId}`
              );

              // تحديث التخزين المحلي للعداد في الشاشة السابقة
              const stored = await AsyncStorage.getItem("nurse_confirmed_ids");
              if (stored) {
                const parsed = JSON.parse(stored);
                const updated = parsed.filter(id => id !== patient.patientId);
                await AsyncStorage.setItem("nurse_confirmed_ids", JSON.stringify(updated));
              }

              Alert.alert("تم الحذف", "تم حذف المريض من قائمتك بنجاح");
              void fetchStatus();
            } catch (error) {
              Alert.alert("خطأ", "فشل عملية الحذف");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // ─── الخطوة 1: افتح modal إدخال الوزن ────────────────────────
  const handleStartSession = (patient) => {
    setPendingPatient(patient);
    setWeightInput('');
    setWeightInputError('');
    setWeightModalVisible(true);
  };

  // ─── الخطوة 2: تأكيد الوزن وإنشاء الجلسة ────────────────────
  const handleConfirmWeight = async () => {
    // Validation
    const num = parseFloat(weightInput);
    if (!weightInput.trim()) {
      setWeightInputError('الوزن مطلوب قبل بدء الجلسة');
      return;
    }
    if (isNaN(num) || num < 20 || num > 300) {
      setWeightInputError('يجب أن يكون الوزن رقماً بين 20 و 300 كغ');
      return;
    }
    setWeightInputError('');

    try {
      setIsSavingSession(true);
      const now = new Date();

      const todayISO = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      ).toISOString();

      const createRes = await api.post(
        "/dialysis-sessions",
        {
          patientId: pendingPatient.patientId,
          scheduleId: pendingPatient.scheduleId,
          date: todayISO,
          startTime: now.toISOString(),
          status: "PENDING",
          weightBefore: num,
          fluidRemoved: 0,
          bloodPressureBefore: "120/80",
          bloodPressureAfter: "120/80",
          notes: "None"
        }
      );

      // جلب البيانات المحدثة للحصول على الـ sessionId الدقيق
      const updatedList = await fetchStatus();
      const updatedPatient = updatedList?.find(p => p.patientId === pendingPatient.patientId);

      setWeightModalVisible(false);

      if (updatedPatient && updatedPatient.sessionId) {
        navigation.navigate("SessionDetails", { patient: updatedPatient });
      } else {
        // Fallback في حال لم يجده
        const fallbackId = createRes.data?.sessionId || createRes.data?.id;
        navigation.navigate("SessionDetails", {
          patient: { ...pendingPatient, sessionId: fallbackId, sessionStatus: 'PENDING' }
        });
      }

    } catch (error) {
      const msg = error.response?.data?.message;
      if (typeof msg === "string" && (msg.includes("موجود") || msg.includes("exist"))) {
        setWeightModalVisible(false);
        void fetchStatus();
      } else {
        setWeightInputError(
          Array.isArray(msg) ? msg.join(' ') : (msg ?? 'فشل بدء الجلسة')
        );
      }
    } finally {
      setIsSavingSession(false);
    }
  };

  // ─── حالة الجلسة بصرياً ───────────────────────────────────
  const getStatusInfo = (status) => {
    switch (status) {
      case "COMPLETED": return { label: "مكتملة", color: "#059669", icon: "check-circle", bg: "#f0fdf4" };
      case "PENDING":
      case "IN_PROGRESS": return { label: "تم البدء (جاري الغسيل)", color: "#2563eb", icon: "sync", bg: "#eff6ff" };
      case "CANCELLED": return { label: "ملغية", color: "#ef4444", icon: "close-circle", bg: "#fef2f2" };
      case "MISSED": return { label: "غائب", color: "#6b7280", icon: "account-off", bg: "#f9fafb" };
      default: return { label: "لم يتم البدء", color: "#6b7280", icon: "play-circle-outline", bg: "#f9fafb" };
    }
  };

  return (
    <View style={styles.container}>

      {/* ══════ Modal إدخال الوزن قبل الجلسة ══════════════════════════ */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={mStyles.overlay}
        >
          <View style={mStyles.sheet}>
            {/* العنوان */}
            <View style={mStyles.sheetHeader}>
              <MaterialCommunityIcons name="scale" size={28} color="#3b82f6" />
              <Text style={mStyles.sheetTitle}>وزن المريض قبل الجلسة</Text>
            </View>
            {pendingPatient && (
              <Text style={mStyles.sheetPatient}>{pendingPatient.patientName}</Text>
            )}

            {/* حقل الإدخال */}
            <View style={[mStyles.inputRow, weightInputError ? mStyles.inputErr : null]}>
              <MaterialCommunityIcons name="scale" size={20} color="#3b82f6" />
              <TextInput
                style={mStyles.input}
                placeholder="مثال: 74.5"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={t => { setWeightInput(t); setWeightInputError(''); }}
                autoFocus
              />
              <Text style={mStyles.unit}>kg</Text>
            </View>
            {weightInputError ? (
              <Text style={mStyles.errText}>{weightInputError}</Text>
            ) : null}

            {/* الأزرار */}
            <View style={mStyles.btnRow}>
              <Pressable
                style={mStyles.cancelBtn}
                onPress={() => setWeightModalVisible(false)}
                disabled={isSavingSession}
              >
                <Text style={mStyles.cancelBtnText}>إلغاء</Text>
              </Pressable>

              <Pressable
                style={[mStyles.confirmBtn, isSavingSession && { backgroundColor: '#6ee7b7' }]}
                onPress={handleConfirmWeight}
                disabled={isSavingSession}
              >
                {isSavingSession
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                    <Text style={mStyles.confirmBtnText}>بدء الجلسة</Text>
                  </>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("NurseHome")} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#065f46" />
        </Pressable>
        <Text style={styles.title}>مرضاي اليوم ({myPatients.length})</Text>
        <Pressable
          onPress={() => navigation.navigate("SelectPatient")}
          style={styles.editBtn}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#065f46" />
        </Pressable>
      </View>


      {/* ── قائمة المرضى ─────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStatus(true)}
            colors={["#059669"]}
            tintColor="#059669"
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 60 }} />
        ) : myPatients.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>لا توجد مرضى مختارون</Text>
            <Pressable
              style={styles.backToSelectBtn}
              onPress={() => navigation.navigate("SelectPatient")}
            >
              <Text style={styles.backToSelectText}>العودة لاختيار المرضى</Text>
            </Pressable>
          </View>
        ) : (
          myPatients.map(patient => {
            const statusInfo = getStatusInfo(patient.sessionStatus);
            const hasSession = patient.sessionId !== null;
            const isCompleted = patient.sessionStatus === "COMPLETED";

            return (
              <View key={patient.scheduleId} style={[styles.card, { borderRightColor: statusInfo.color }]}>
                {/* ── رأس البطاقة ─────────── */}
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <MaterialCommunityIcons
                      name={statusInfo.icon}
                      size={15}
                      color={statusInfo.color}
                    />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.machineText}>جهاز #{patient.machineNumber}</Text>
                </View>

                {/* اسم المريض */}
                <Text style={styles.patientName}>{patient.patientName}</Text>

                {/* ── زر الإجراء ──────────── */}
                <View style={styles.cardFooter}>
                  {isCompleted ? (
                    <View style={styles.doneRow}>
                      <MaterialCommunityIcons name="check-decagram" size={20} color="#059669" />
                      <Text style={styles.doneText}>اكتملت جلسة الغسيل بنجاح</Text>
                    </View>
                  ) : hasSession ? (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate("SessionDetails", { patient })}
                    >
                      <Text style={styles.actionBtnText}>إدخال البيانات الحيوية</Text>
                      <MaterialCommunityIcons name="chevron-left" size={20} color="#fff" />
                    </Pressable>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actionBtn, { flex: 2, backgroundColor: "#d97706" }]}
                        onPress={() => handleStartSession(patient)}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Text style={styles.actionBtnText}>بدء جلسة الغسيل</Text>
                            <MaterialCommunityIcons name="play" size={20} color="#fff" />
                          </>
                        )}
                      </Pressable>

                      {/* زر سلة المهملات - يظهر فقط إذا لم تبدأ الجلسة */}
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleUnassign(patient)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default PatientState;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  header: {
    backgroundColor: "#ecfdf5",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    elevation: 2,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
  },
  editBtn: {
    padding: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  scroll: { padding: 16 },

  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#9CA3AF", marginTop: 12, fontSize: 16, fontWeight: "600" },
  backToSelectBtn: {
    marginTop: 20,
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToSelectText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderRightWidth: 5,
    borderRightColor: "#059669",
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  machineText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  patientName: { fontSize: 18, fontWeight: "800", color: "#1F2937", textAlign: "right", marginBottom: 12 },

  cardFooter: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  actionBtn: {
    backgroundColor: "#059669",
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  removeBtn: {
    backgroundColor: "#fef2f2",
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  doneRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneText: { color: "#059669", fontWeight: "700", fontSize: 14 },
});

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  sheetPatient: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
    gap: 10,
  },
  inputErr: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  unit: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  errText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});