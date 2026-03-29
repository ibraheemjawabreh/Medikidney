import React, { useState, useEffect } from "react";
import { 
  Text, View, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, ActivityIndicator, Alert 
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NurseTasks = ({ route, navigation }) => {
  const { patientId, patientData } = route.params || {};
  
  const [loading, setLoading] = useState(false);
const [isSessionActive, setIsSessionActive] = useState(false);
const [activeSessionId, setActiveSessionId] = useState(null);

  // حقول الإدخال
  const [weightBefore, setWeightBefore] = useState("");
  const [bpBefore, setBpBefore] = useState("");
  const [bloodFlow, setBloodFlow] = useState("300");
  const [scheduleId, setScheduleId] = useState(""); 
  const [allSchedules, setAllSchedules] = useState([]);

  // حقول النهاية
  const [weightAfter, setWeightAfter] = useState("");
  const [bpAfter, setBpAfter] = useState("");
  const [fluidRemoved, setFluidRemoved] = useState("");

  // --- 1. تعريف الدالة (هنا كان الخطأ، يجب أن تكون داخل المكون) ---
const fetchSchedules = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(
      "https://medikidneysys.onrender.com/dialysis-sessions",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Full Session Object:", response.data[0]); // شوف هون شو اسم الـ ID (id أم session_id)

    const openSession = response.data.find(
      s => String(s.patient_id) === String(patientId) && s.end_time === null
    );

    if (openSession) {
      // جرب نستخدم id إذا كان هو المعرف الأساسي في الـ API
      const actualId = openSession.id || openSession.session_id; 
      console.log("✅ جلسة مفتوحة موجودة، ID المستخدم:", actualId);
      
      setIsSessionActive(true);
      setActiveSessionId(actualId); 
      setScheduleId(openSession.schedule_id?.toString() || "");
    } else {
      setIsSessionActive(false);
    }
  } catch (error) {
    console.log("❌ خطأ في الفحص:", error.message);
  }
};
  // --- 2. استدعاء الدالة عند فتح الصفحة ---
  useEffect(() => {
    fetchSchedules();
    
    // إذا المريض أصلاً عنده جلسة شابة (Active) مررناها من الصفحة السابقة
    if (patientData?.activeSessionId) {
        setIsSessionActive(true);
        setActiveSessionId(patientData.activeSessionId);
    }
  }, [patientId]);

  // --- 3. دالة بدء الجلسة (POST) ---
  const handleStartSession = async () => {
    if (!weightBefore || !bpBefore || !scheduleId) {
      Alert.alert("تنبيه", "تأكد من إدخال الوزن والضغط، والتأكد من وجود موعد (Schedule)");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
const data = {

 patientId: Number(patientId),

 scheduleId: Number(scheduleId),

 date: new Date().toISOString(),

 startTime: new Date().toISOString(),

 weightBefore: Number(weightBefore),

 bloodPressureBefore: bpBefore

};

      const response = await axios.post(
        "https://medikidneysys.onrender.com/dialysis-sessions", 
        data, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("نجاح", "تم بدء الجلسة بنجاح");
      setActiveSessionId(response.data.id);
      setIsSessionActive(true);
    } catch (error) {
      console.log("Error Details:", error.response?.data);
      Alert.alert("فشل البدء", "رقم الجدول غير موجود أو الموعد غير صالح");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. دالة إنهاء الجلسة (PATCH) ---
  const handleEndSession = async () => {
  if (!activeSessionId) {
    Alert.alert("خطأ", "لم يتم العثور على رقم الجلسة النشطة");
    return;
  }

  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");
    
    // تأكد من الـ Payload حسب الـ Swagger تبعك
    const data = {
      weightAfter: Number(weightAfter),
      bloodPressureAfter: bpAfter,
      fluidRemoved: Number(fluidRemoved),
      endTime: new Date().toISOString(), // تأكد إن السيرفر بيقبل ISO
    };

    console.log("جاري إنهاء الجلسة رقم:", activeSessionId);

    const response = await axios.patch(
      `https://medikidneysys.onrender.com/dialysis-sessions/${activeSessionId}`, 
      data, 
      { headers: { Authorization: `Bearer ${token}` } }
    );

    Alert.alert("تم بنجاح", "تم إغلاق الجلسة وحفظ البيانات.");
    setIsSessionActive(false);
    setActiveSessionId(null);
    navigation.goBack(); 
  } catch (error) {
    console.log("❌ فشل الإنهاء:", error.response?.data);
    Alert.alert("خطأ", error.response?.data?.message || "فشل تحديث البيانات");
  } finally {
    setLoading(false);
  }
};
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>وحدة التحكم بجلسة المريض</Text>

      {!isSessionActive ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 تسجيل دخول الجلسة</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم موعد الجلسة (تلقائي)</Text>
            <View style={styles.disabledInput}>
               <Text style={styles.disabledText}>
                 {scheduleId ? `رقم الموعد: ${scheduleId}` : "جاري البحث عن مواعيد..."}
               </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>الوزن قبل (kg)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={weightBefore} onChangeText={setWeightBefore} placeholder="75" />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>الضغط (قبل)</Text>
              <TextInput style={styles.input} value={bpBefore} onChangeText={setBpBefore} placeholder="120/80" />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.startButton, !scheduleId && {backgroundColor: '#94a3b8'}]} 
            onPress={handleStartSession}
            disabled={loading || !scheduleId}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ابدأ الجلسة الآن</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.card, {borderColor: '#DC2626', borderTopWidth: 5}]}>
          <Text style={[styles.cardTitle, {color: '#DC2626'}]}>🏁 إنهاء الجلسة الحالية</Text>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>الوزن بعد (kg)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={weightAfter} onChangeText={setWeightAfter} />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>الضغط (بعد)</Text>
              <TextInput style={styles.input} value={bpAfter} onChangeText={setBpAfter} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>السوائل المسحوبة (L)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={fluidRemoved} onChangeText={setFluidRemoved} placeholder="2.5" />
          </View>

          <TouchableOpacity style={styles.endButton} onPress={handleEndSession} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>حفظ وإنهاء الجلسة</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default NurseTasks;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FE", padding: 20 },
  header: { fontSize: 20, fontWeight: "bold", color: "#1E3A8A", textAlign: "center", marginBottom: 25 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 20, elevation: 5 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#2563EB", marginBottom: 20, textAlign: 'right' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: "#4B5563", marginBottom: 6, textAlign: 'right', fontWeight: '600' },
  input: { backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", textAlign: 'right' },
  disabledInput: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB", borderStyle: 'dashed' },
  disabledText: { color: "#4B5563", textAlign: 'right', fontWeight: 'bold' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 15 },
  halfInput: { width: '48%' },
  startButton: { backgroundColor: "#2563EB", padding: 16, borderRadius: 14, alignItems: "center" },
  endButton: { backgroundColor: "#DC2626", padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});