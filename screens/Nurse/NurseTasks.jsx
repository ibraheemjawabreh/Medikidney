import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  buildLocalSessionDatePayload,
  buildLocalTimePayload,
} from "../../utils/sessionTime";

const NurseTasks = ({ route, navigation }) => {
  const { patientId, patientName } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const [bpBefore, setBpBefore] = useState("");
  const [startTime, setStartTime] = useState("");

  const [bpAfter, setBpAfter] = useState("");
  const [fluidRemoved, setFluidRemoved] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [notes, setNotes] = useState(""); 
  const [weightAfter, setWeightAfter] = useState(""); 
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
      startTime: buildLocalTimePayload(),
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
        date: buildLocalSessionDatePayload(),
        startTime: startTime,
        endTime: buildLocalTimePayload(),
        weightBefore: 0,
        weightAfter: Number(weightAfter),
        bloodPressureBefore: bpBefore,
        bloodPressureAfter: bpAfter,
        fluidRemoved: Number(fluidRemoved),
        status: status,
        notes: notes || "لا توجد ملاحظات إضافية"
      };

      console.log("الـ Payload المُرسل:", finalPayload);

      await api.post(
        "/dialysis-sessions",
        finalPayload
      );

      await AsyncStorage.removeItem(`active_session_${patientId}`);
      Alert.alert("نجاح ✅", "تم تسجيل الجلسة بالكامل.");
      navigation.goBack();
    } catch (error) {
      console.log("خطأ الإرسال:", error.response?.data);
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
              <MaterialCommunityIcons name="play-circle" size={24} color="#26CDD6" />
              <Text style={styles.cardTitle}>ما قبل الجلسة</Text>
            </View>
            <Text style={styles.label}>الضغط قبل</Text>
            <TextInput style={styles.input} value={bpBefore} onChangeText={setBpBefore} placeholder="120/80" />
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartSessionLocally}>
              <Text style={styles.buttonText}>بدء الجلسة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: '#26CDD6' }]}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#26CDD6" />
              <Text style={[styles.cardTitle, { color: '#26CDD6' }]}>بيانات الإنهاء</Text>
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
  container: { flex: 1, backgroundColor: "#F1FCFD", padding: 15 },
  headerCard: { backgroundColor: "#193B6B", padding: 25, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
  patientName: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  subHeader: { color: "#BCEFF3", fontSize: 12, marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 17, fontWeight: "bold", marginRight: 8, color: '#193B6B' },
  label: { fontSize: 13, color: "#8296B1", marginBottom: 6, textAlign: 'right', fontWeight: '700' },
  input: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", textAlign: 'right', marginBottom: 12, color: '#193B6B' },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }, 
  primaryButton: { backgroundColor: "#26CDD6", padding: 16, borderRadius: 12, alignItems: "center" },
  successButton: { backgroundColor: "#26CDD6", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  statusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 15 },
  statusBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  statusBtnActive: { backgroundColor: '#26CDD6', borderColor: '#26CDD6' },
  statusBtnActiveRed: { backgroundColor: '#DE1A1C', borderColor: '#DE1A1C' },
  statusBtnActiveOrange: { backgroundColor: '#A32D2F', borderColor: '#A32D2F' },
  statusBtnText: { color: '#8296B1', fontSize: 11, fontWeight: 'bold' },
  statusBtnTextActive: { color: '#fff' },
  cancelLink: { marginTop: 15, alignItems: 'center' },
  cancelText: { color: '#DE1A1C', fontSize: 12, textDecorationLine: 'underline' }
});
