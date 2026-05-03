import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const NurseTasks = ({ route, navigation }) => {
  const { patientId, patientName } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // بيانات البداية
  const [bpBefore, setBpBefore] = useState("");
  const [startTime, setStartTime] = useState("");

  // بيانات النهاية والحالة والملاحظات
  const [bpAfter, setBpAfter] = useState("");
  const [fluidRemoved, setFluidRemoved] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [notes, setNotes] = useState(""); // حقل الملاحظات الجديد
  const [weightAfter, setWeightAfter] = useState(""); // الوزن بعد الجلسة
  const [scheduleId, setScheduleId] = useState(route.params?.scheduleId?.toString() || "");

  useEffect(() => {
    const checkLocalSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem(`active_session_${patientId}`);
        if (savedSession) {
          const data = JSON.parse(savedSession);
          if (data.scheduleId) setScheduleId(data.scheduleId.toString());
          setIsStarted(true);
        }
      } catch (e) {
        console.error("خطأ في قراءة الذاكرة المحلية", e);
      }
    };
    checkLocalSession();
  }, [patientId]);

  const handleStartSessionLocally = async () => {
    if (!bpBefore || !scheduleId) {
      Alert.alert("تنبيه", "يرجى إدخال الضغط ورقم الموعد");
      return;
    }

    const sessionData = {
      bpBefore,
      scheduleId: Number(scheduleId),
      startTime: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(`active_session_${patientId}`, JSON.stringify(sessionData));
      setStartTime(sessionData.startTime);
      setIsStarted(true);
    } catch (e) {
      Alert.alert("خطأ", "فشل حفظ البيانات محلياً");
    }
  };

  const handleFinalSubmit = async () => {
    if (!bpAfter || !fluidRemoved || !weightAfter) {
      Alert.alert("تنبيه", "يرجى إكمال بيانات نهاية الجلسة (الضغط والسوائل والوزن)");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const savedSession = await AsyncStorage.getItem(`active_session_${patientId}`);
      const localData = JSON.parse(savedSession);

      const finalPayload = {
        patientId: Number(patientId),
        scheduleId: Number(localData.scheduleId || scheduleId),
        date: new Date().toISOString().split('T')[0],
        startTime: startTime,
        endTime: new Date().toISOString(),
        weightBefore: 0,
        weightAfter: Number(weightAfter),
        bloodPressureBefore: bpBefore,
        bloodPressureAfter: bpAfter,
        fluidRemoved: Number(fluidRemoved),
        status: status,
        notes: notes || "لا توجد ملاحظات إضافية"
      };

      await api.post(
        "/dialysis-sessions",
        finalPayload
      );

      await AsyncStorage.removeItem(`active_session_${patientId}`);
      Alert.alert("نجاح ✅", "تم تسجيل الجلسة بالكامل.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("فشل الإرسال", error.response?.data?.message?.toString() || "تأكد من البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLocal = async () => {
    Alert.alert("تنبيه", "هل أنت متأكد من مسح الجلسة؟", [
      { text: "تراجع", style: "cancel" },
      {
        text: "نعم، مسح", onPress: async () => {
          await AsyncStorage.removeItem(`active_session_${patientId}`);
          setIsStarted(false);
          setBpBefore("");
          setNotes("");
          setWeightAfter("");
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.patientName}>{patientName || "ملف المريض"}</Text>
          <Text style={styles.subHeader}>إدارة تقرير الغسيل الكلوي</Text>
        </View>

        {!isStarted ? (
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="play-circle" size={24} color="#2563eb" />
              <Text style={styles.cardTitle}>ما قبل الجلسة</Text>
            </View>
            <Text style={styles.label}>الضغط قبل</Text>
            <TextInput style={styles.input} value={bpBefore} onChangeText={setBpBefore} placeholder="120/80" />
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartSessionLocally}>
              <Text style={styles.buttonText}>بدء الجلسة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: '#10b981' }]}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
              <Text style={[styles.cardTitle, { color: '#10b981' }]}>بيانات الإنهاء</Text>
            </View>

            <Text style={styles.label}>حالة الجلسة</Text>
            <View style={styles.statusRow}>
              {["COMPLETED", "CANCELLED", "MISSED"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusBtn, status === st && (st === "COMPLETED" ? styles.statusBtnActive : st === "CANCELLED" ? styles.statusBtnActiveRed : styles.statusBtnActiveOrange)]}
                  onPress={() => setStatus(st)}
                >
                  <Text style={[styles.statusBtnText, status === st && styles.statusBtnTextActive]}>
                    {st === "COMPLETED" ? "مكتملة" : st === "CANCELLED" ? "ملغية" : "متغيب"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>الضغط بعد</Text>
            <TextInput style={styles.input} value={bpAfter} onChangeText={setBpAfter} placeholder="115/75" />

            <Text style={styles.label}>السوائل المسحوبة (L)</Text>
            <TextInput style={styles.input} value={fluidRemoved} onChangeText={setFluidRemoved} keyboardType="numeric" placeholder="2.5" />

            <Text style={styles.label}>الوزن بعد الجلسة (كغ)</Text>
            <TextInput style={styles.input} value={weightAfter} onChangeText={setWeightAfter} keyboardType="decimal-pad" placeholder="70.5" />

            {/* حقل الملاحظات الجديد */}
            <Text style={styles.label}>ملاحظات التمريض</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="اكتب أي ملاحظات طبية هنا..."
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.successButton} onPress={handleFinalSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>إرسال التقرير</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelLink} onPress={handleCancelLocal}>
              <Text style={styles.cancelText}>إلغاء البيانات</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default NurseTasks;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5", padding: 15 },
  headerCard: { backgroundColor: "#1e3a8a", padding: 25, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
  patientName: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  subHeader: { color: "#bfdbfe", fontSize: 12, marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 17, fontWeight: "bold", marginRight: 8, color: '#1e293b' },
  label: { fontSize: 13, color: "#64748b", marginBottom: 6, textAlign: 'right', fontWeight: '700' },
  input: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", textAlign: 'right', marginBottom: 12, color: '#1e293b' },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }, // ستايل الملاحظات
  primaryButton: { backgroundColor: "#2563eb", padding: 16, borderRadius: 12, alignItems: "center" },
  successButton: { backgroundColor: "#10b981", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  statusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 15 },
  statusBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  statusBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  statusBtnActiveRed: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  statusBtnActiveOrange: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  statusBtnText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  statusBtnTextActive: { color: '#fff' },
  cancelLink: { marginTop: 15, alignItems: 'center' },
  cancelText: { color: '#ef4444', fontSize: 12, textDecorationLine: 'underline' }
});