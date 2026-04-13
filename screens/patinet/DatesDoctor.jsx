import React, { useState, useEffect, useRef } from "react";
import {
  Text, View, ScrollView, StyleSheet, ActivityIndicator,
  Alert, Pressable, TextInput, Animated, StatusBar, Platform
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";



const DaysMap = {
  SUNDAY: "الأحد", MONDAY: "الاثنين", TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء", THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت"
};

const AppointmentScreen = () => {
  // --- States ---
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [myAppointments, setMyAppointments] = useState([]); // المواعيد المحجوزة حالياً للمريض

  // --- UI States ---
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;



  // --- Helpers ---
  const formatDate = (date) => date.toISOString().split('T')[0];

  const getNextDate = (dayName) => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const target = days.indexOf(dayName.toUpperCase());
    const d = new Date();
    d.setDate(d.getDate() + (target + 7 - d.getDay()) % 7);
    return formatDate(d);
  };

  const formatTime = (t) => {
    if (!t) return "";
    let [h, m] = t.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? "م" : "ص"}`;
  };

  // --- API Logic ---


  // 1. تشغيل النظام وجلب البيانات الأولية
  const initData = async () => {
    try {

      // جلب الأطباء وجلب مواعيد المريض الحالية في نفس الوقت
      const [docsRes, myApptsRes] = await Promise.all([
        api.get('/reports/booking-doctors'),
        api.get('/clinic-consultations') // نفترض أن هذا المسار يعيد مواعيد المريض المسجل
      ]);

      setDoctors(Array.isArray(docsRes.data) ? docsRes.data : []);
      // فلترة المواعيد القادمة فقط (غير الملغاة)
      const activeAppts = (myApptsRes.data || []).filter(a => a.status !== 'CANCELLED');
      setMyAppointments(activeAppts);

      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (err) {
      console.log("Init Error:", err);
    } finally {
      setIsWakingUp(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // 2. آلية الحذف (إلغاء الموعد)
const handleCancelAppointment = (apptId) => {
    // التأكد من وجود ID قبل البدء
    if (!apptId) {
      return Alert.alert("خطأ", "لم يتم العثور على معرف الموعد");
    }

    Alert.alert(
      "إلغاء الموعد",
      "هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "تأكيد الإلغاء",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // محاولة الحذف باستخدام api الموحد
              const response = await api.delete(`/clinic-consultations/${apptId}`);

              if (response.status === 200 || response.status === 204) {
                Alert.alert("تم ✅", "تم إلغاء الموعد بنجاح");
                initData(); // تحديث القائمة العلوية
                if (selectedDay) handleDaySelect(selectedDay); // تحديث الخانات المتاحة
              }
            } catch (err) {
              // هذا السطر سيطبع لك السبب الحقيقي في الـ Terminal (Console)
              console.error("Delete Error Detail:", err.response?.data || err.message);
              
              const errorMsg = err.response?.data?.message || "السيرفر رفض عملية الحذف";
              Alert.alert("فشل الإلغاء", errorMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 3. عند اختيار طبيب
  const handleDoctorChange = async (docId) => {
    setSelectedDoctor(docId);
    setSchedules([]);
    setSelectedDay(null);
    setSlots([]);
    setSelectedSlot(null);
    setErrorMsg("");

    if (!docId) return;

    try {
      setLoading(true);
      const res = await api.get('/doctor-schedule', { params: { doctorId: docId } });
      setSchedules(res.data || []);
    } catch (e) {
      Alert.alert("تنبيه", "لا يوجد جدول لهذا الطبيب");
    } finally {
      setLoading(false);
    }
  };

  // 4. عند اختيار يوم
  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    setSlots([]);
    setSelectedSlot(null);
    setErrorMsg("");

    try {
      setLoading(true);
      const date = getNextDate(day.weekday);
      const res = await api.get('/clinic-consultations/availability', {
        params: {
          doctorId: selectedDoctor,
          date: date
        }
      });

      const { availableSlots = [], bookedSlots = [], bookingAllowed, bookingRestrictionReason } = res.data;
      
      const all = [
        ...availableSlots.map(t => ({ time: t, booked: false })),
        ...bookedSlots.map(t => ({ time: t, booked: true }))
      ].sort((a, b) => a.time.localeCompare(b.time));

      setSlots(all);
      if (!bookingAllowed) setErrorMsg(bookingRestrictionReason);
    } catch (e) {
      setErrorMsg("حدث خطأ أثناء جلب المواعيد");
    } finally {
      setLoading(false);
    }
  };

  // 5. تنفيذ الحجز الجديد
  const confirmBooking = async () => {
    if (!reason.trim()) return Alert.alert("تنبيه", "اكتب سبب الزيارة");
    
    try {
      setBookingLoading(true);
      const date = getNextDate(selectedDay.weekday);
      await api.post('/clinic-consultations/book', {
        doctorId: Number(selectedDoctor),
        apptDate: date,
        apptTime: `${date}T${selectedSlot}`,
        visitReason: reason
      });

      Alert.alert("نجاح ✅", "تم حجز موعدك بنجاح", [
        { text: "ممتاز", onPress: () => {
            initData(); // لتحديث قائمة "مواعيدي"
            handleDaySelect(selectedDay); 
        }}
      ]);
    } catch (err) {
      Alert.alert("فشل", "الموعد قد يكون حجز للتو، جرب غيره");
    } finally {
      setBookingLoading(false);
    }
  };

  if (isWakingUp) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={styles.loadingText}>جاري تجهيز النظام...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>إدارة المواعيد</Text>
        <Text style={styles.headerSub}>مشروع MediKidney الطبي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* قسم مواعيدي الحالية (الحذف) */}
          {myAppointments.length > 0 && (
            <View style={styles.myApptsSection}>
              <Text style={styles.label}>مواعيدك القادمة</Text>
              {myAppointments.map((appt) => (
                <View key={appt.appointment_id} style={styles.myApptCard}>
                   <Pressable 
                    onPress={() => handleCancelAppointment(appt.appointment_id)}
                    style={styles.deleteBtn}
                   >
                     <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
                   </Pressable>
                   <View style={{flex: 1, alignItems: 'flex-end'}}>
                      <Text style={styles.docName}>د. {appt.doctor?.full_name}</Text>
                      <Text style={styles.apptDateText}>{appt.appt_date} | {formatTime(appt.appt_time)}</Text>
                   </View>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.divider} />

          {/* الخطوة 1: اختيار الطبيب (الحجز) */}
          <View style={styles.card}>
            <Text style={styles.label}>1. احجز موعداً جديداً</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedDoctor}
                onValueChange={handleDoctorChange}
                style={styles.picker}
              >
                <Picker.Item label="اختر الطبيب..." value="" />
                {doctors.map(d => <Picker.Item key={d.doctor_id} label={`د. ${d.full_name}`} value={d.doctor_id.toString()} />)}
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="سبب الزيارة (مطلوب للحجز)"
              value={reason}
              onChangeText={setReason}
              multiline
            />
          </View>

          {/* الخطوة 2: أيام الدوام */}
          {schedules.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>2. اختر اليوم المتاح</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
                {schedules.map((s, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleDaySelect(s)}
                    style={[styles.dayCard, selectedDay?.schedule_id === s.schedule_id && styles.activeDay]}
                  >
                    <Text style={[styles.dayText, selectedDay?.schedule_id === s.schedule_id && styles.activeText]}>
                      {DaysMap[s.weekday]}
                    </Text>
                    <Text style={styles.smallTime}>{formatTime(s.startTime)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* الخطوة 3: المواعيد المتاحة */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#059669" />
          ) : slots.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>3. اختر الوقت المناسب</Text>
              <View style={styles.grid}>
                {slots.map((s, i) => (
                  <Pressable
                    key={i}
                    disabled={s.booked}
                    onPress={() => setSelectedSlot(s.time)}
                    style={[
                      styles.slot,
                      s.booked && styles.bookedSlot,
                      selectedSlot === s.time && styles.activeSlot
                    ]}
                  >
                    <Text style={[styles.slotText, selectedSlot === s.time && styles.activeText, s.booked && styles.bookedText]}>
                      {formatTime(s.time)}
                    </Text>
                    {s.booked && <Text style={styles.bookedLabel}>محجوز</Text>}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : errorMsg ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>
          ) : null}

        </Animated.View>
      </ScrollView>

      {/* زر التأكيد العائم */}
      {selectedSlot && (
        <View style={styles.footer}>
          <Pressable 
            onPress={confirmBooking} 
            disabled={bookingLoading}
            style={styles.confirmBtn}
          >
            {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>تأكيد الحجز الآن</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#065f46", padding: 30, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 22, color: "#fff", fontWeight: "bold", textAlign: "center" },
  headerSub: { color: "#A7F3D0", textAlign: "center", fontSize: 12 },
  scroll: { padding: 16, paddingBottom: 120 },
  
  // تصفيف مواعيدي الحالية
  myApptsSection: { marginBottom: 10 },
  myApptCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 8, 
    alignItems: 'center',
    borderRightWidth: 4,
    borderRightColor: '#10B981',
    elevation: 2
  },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  docName: { fontWeight: 'bold', color: '#1F2937', fontSize: 14 },
  apptDateText: { color: '#6B7280', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#D1D5DB', marginVertical: 15 },

  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, elevation: 2 },
  label: { fontSize: 15, fontWeight: "bold", color: "#374151", marginBottom: 10, textAlign: "right" },
  pickerBox: { backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
  picker: { height: 50 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, textAlign: "right", minHeight: 60, borderWidth: 1, borderColor: "#E5E7EB" },
  section: { marginTop: 20 },
  daysContainer: { flexDirection: "row-reverse" },
  dayCard: { backgroundColor: "#fff", padding: 15, borderRadius: 12, marginLeft: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", minWidth: 90 },
  activeDay: { backgroundColor: "#059669", borderColor: "#059669" },
  dayText: { fontWeight: "bold", color: "#374151" },
  activeText: { color: "#fff" },
  smallTime: { fontSize: 10, color: "#9CA3AF" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  slot: { backgroundColor: "#fff", width: "30%", padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  activeSlot: { backgroundColor: "#10B981", borderColor: "#10B981" },
  bookedSlot: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  slotText: { fontSize: 13, fontWeight: "600" },
  bookedText: { color: "#9CA3AF" },
  bookedLabel: { fontSize: 8, color: "#EF4444" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#E5E7EB" },
  confirmBtn: { backgroundColor: "#059669", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  errorBox: { marginTop: 20, padding: 15, backgroundColor: "#FEF2F2", borderRadius: 10 },
  errorText: { color: "#DC2626", textAlign: "center", fontSize: 13 },
  loadingText: { marginTop: 10, color: "#6B7280" }
});

export default AppointmentScreen;