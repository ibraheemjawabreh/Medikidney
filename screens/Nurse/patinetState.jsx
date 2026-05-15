import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import {
  buildLocalSessionDatePayload,
  buildLocalTimePayload,
} from "../../utils/sessionTime";

const PatientState = ({ route }) => {
  const navigation = useNavigation();
  const { selectedPatientIds = [] } = route.params ?? {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myPatients, setMyPatients] = useState([]);
  const [myNurseId, setMyNurseId] = useState(null);

  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [pendingPatient, setPendingPatient] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightInputError, setWeightInputError] = useState('');
  const [isSavingSession, setIsSavingSession] = useState(false);

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

  const handleStartSession = (patient) => {
    setPendingPatient(patient);
    setWeightInput('');
    setWeightInputError('');
    setWeightModalVisible(true);
  };

  const handleConfirmWeight = async () => {
    
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

      const createRes = await api.post(
        "/dialysis-sessions",
        {
          patientId: pendingPatient.patientId,
          scheduleId: pendingPatient.scheduleId,
          date: buildLocalSessionDatePayload(now),
          startTime: buildLocalTimePayload(now),
          status: "PENDING",
          weightBefore: num,
          fluidRemoved: 0,
          bloodPressureBefore: "120/80",
          bloodPressureAfter: "120/80",
          notes: "None"
        }
      );

      const updatedList = await fetchStatus();
      const updatedPatient = updatedList?.find(p => p.patientId === pendingPatient.patientId);

      setWeightModalVisible(false);

      if (updatedPatient && updatedPatient.sessionId) {
        navigation.navigate("SessionDetails", { patient: updatedPatient });
      } else {
        
        const fallbackId =
          createRes.data?.session_id ||
          createRes.data?.sessionId ||
          createRes.data?.id;
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

  const getStatusInfo = (status) => {
    switch (status) {
      case "COMPLETED": return { label: "مكتملة", color: "#26CDD6", icon: "check-circle", bg: "#E9FAFB" };
      case "PENDING":
      case "IN_PROGRESS": return { label: "تم البدء (جاري الغسيل)", color: "#26CDD6", icon: "sync", bg: "#E9FAFB" };
      case "CANCELLED": return { label: "ملغية", color: "#DE1A1C", icon: "close-circle", bg: "#FBEAEA" };
      case "MISSED": return { label: "غائب", color: "#8296B1", icon: "account-off", bg: "#f9fafb" };
      default: return { label: "لم يتم البدء", color: "#8296B1", icon: "play-circle-outline", bg: "#f9fafb" };
    }
  };

  return (
    <View style={styles.container}>

      <Modal
        visible={weightModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            
            <View style={mStyles.sheetHeader}>
              <MaterialCommunityIcons name="scale" size={28} color="#26CDD6" />
              <Text style={mStyles.sheetTitle}>وزن المريض قبل الجلسة</Text>
            </View>
            {pendingPatient && (
              <Text style={mStyles.sheetPatient}>{pendingPatient.patientName}</Text>
            )}

            <View style={[mStyles.inputRow, weightInputError ? mStyles.inputErr : null]}>
              <MaterialCommunityIcons name="scale" size={20} color="#26CDD6" />
              <TextInput
                style={mStyles.input}
                placeholder="مثال: 74.5"
                placeholderTextColor="#8296B1"
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

            <View style={mStyles.btnRow}>
              <Pressable
                style={mStyles.cancelBtn}
                onPress={() => setWeightModalVisible(false)}
                disabled={isSavingSession}
              >
                <Text style={mStyles.cancelBtnText}>إلغاء</Text>
              </Pressable>

              <Pressable
                style={[mStyles.confirmBtn, isSavingSession && { backgroundColor: '#BCEFF3' }]}
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
        </View>
      </Modal>

      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("NurseHome")} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#193B6B" />
        </Pressable>
        <Text style={styles.title}>مرضاي اليوم ({myPatients.length})</Text>
        <Pressable
          onPress={() => navigation.navigate("SelectPatient")}
          style={styles.editBtn}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#193B6B" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStatus(true)}
            colors={["#26CDD6"]}
            tintColor="#26CDD6"
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#26CDD6" style={{ marginTop: 60 }} />
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

                <Text style={styles.patientName}>{patient.patientName}</Text>

                <View style={styles.cardFooter}>
                  {isCompleted ? (
                    <View style={styles.doneRow}>
                      <MaterialCommunityIcons name="check-decagram" size={20} color="#26CDD6" />
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
                        style={[styles.actionBtn, { flex: 2, backgroundColor: "#A32D2F" }]}
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

                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleUnassign(patient)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#DE1A1C" />
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
    backgroundColor: "#F1FCFD",
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
    backgroundColor: "#F1FCFD",
    borderRadius: 12,
  },
  editBtn: {
    padding: 8,
    backgroundColor: "#F1FCFD",
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#193B6B",
  },

  scroll: { padding: 16 },

  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#8296B1", marginTop: 12, fontSize: 16, fontWeight: "600" },
  backToSelectBtn: {
    marginTop: 20,
    backgroundColor: "#26CDD6",
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
    borderRightColor: "#26CDD6",
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
  machineText: { color: "#8296B1", fontSize: 12, fontWeight: "600" },
  patientName: { fontSize: 18, fontWeight: "800", color: "#193B6B", textAlign: "right", marginBottom: 12 },

  cardFooter: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  actionBtn: {
    backgroundColor: "#26CDD6",
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
    backgroundColor: "#FBEAEA",
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FBEAEA",
  },
  doneRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneText: { color: "#26CDD6", fontWeight: "700", fontSize: 14 },
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
    color: '#193B6B',
  },
  sheetPatient: {
    fontSize: 16,
    color: '#8296B1',
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
    borderColor: '#DE1A1C',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '700',
    color: '#193B6B',
  },
  unit: {
    color: '#8296B1',
    fontSize: 16,
    fontWeight: '700',
  },
  errText: {
    color: '#DE1A1C',
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
    color: '#8296B1',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#26CDD6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
