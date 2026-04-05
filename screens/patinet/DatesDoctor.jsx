import React, { useState, useEffect, useRef } from "react";
import {
  Text, View, ScrollView, StyleSheet, ActivityIndicator,
  Alert, Pressable, TextInput, Animated, StatusBar, Platform
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "https://medikidneysys.onrender.com";

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
  
  // --- UI States ---
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const token = useRef(null);

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
  const api = async (method, endpoint, params = {}, data = {}) => {
    return axios({
      method,
      url: `${API_BASE}${endpoint}`,
      params,
      data,
      headers: { Authorization: `Bearer ${token.current}` },
      timeout: 45000 // مهلة كافية لسيرفر Render
    });
  };

  // 1. تشغيل النظام أول مرة
  useEffect(() => {
    const init = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("token");
        if (!savedToken) return Alert.alert("خطأ", "انتهت الجلسة، سجل دخولك");
        token.current = savedToken;

        const res = await api('get', '/reports/booking-doctors');
        setDoctors(Array.isArray(res.data) ? res.data : []);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } catch (err) {
        Alert.alert("مشكلة في الاتصال", "السيرفر قد يكون تحت الصيانة حالياً");
      } finally {
        setIsWakingUp(false);
      }
    };
    init();
  }, []);

  // 2. عند اختيار طبيب (تصفير كامل لما تحته)
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
      const res = await api('get', '/doctor-schedule', { doctorId: docId });
      setSchedules(res.data || []);
    } catch (e) {
      Alert.alert("تنبيه", "لا يوجد جدول لهذا الطبيب");
    } finally {
      setLoading(false);
    }
  };

  // 3. عند اختيار يوم (تصفير المواعيد فقط)
  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    setSlots([]);
    setSelectedSlot(null);
    setErrorMsg("");

    try {
      setLoading(true);
      const date = getNextDate(day.weekday);
      const res = await api('get', '/clinic-consultations/availability', {
        doctorId: selectedDoctor,
        date: date
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

  // 4. تنفيذ الحجز
  const confirmBooking = async () => {
    if (!reason.trim()) return Alert.alert("تنبيه", "اكتب سبب الزيارة");
    
    try {
      setBookingLoading(true);
      const date = getNextDate(selectedDay.weekday);
      await api('post', '/clinic-consultations/book', {}, {
        doctorId: Number(selectedDoctor),
        apptDate: date,
        apptTime: `${date}T${selectedSlot}`,
        visitReason: reason
      });

      Alert.alert("نجاح ✅", "تم حجز موعدك بنجاح", [
        { text: "ممتاز", onPress: () => handleDaySelect(selectedDay) }
      ]);
    } catch (err) {
      Alert.alert("فشل", "الموعد قد يكون حجز للتو، جرب غيره");
    } finally {
      setBookingLoading(false);
    }
  };

  if (isWakingUp) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#059669" /><Text style={styles.loadingText}>جاري تجهيز النظام...</Text></View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حجز الموعد</Text>
        <Text style={styles.headerSub}>مشروع MediKidney الطبي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* الخطوة 1: اختيار الطبيب */}
          <View style={styles.card}>
            <Text style={styles.label}>1. اختر الطبيب</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedDoctor}
                onValueChange={handleDoctorChange}
                style={styles.picker}
              >
                <Picker.Item label="اضغط هنا للاختيار..." value="" />
                {doctors.map(d => <Picker.Item key={d.doctor_id} label={`د. ${d.full_name}`} value={d.doctor_id.toString()} />)}
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="سبب الزيارة (اختياري)"
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

          {/* الخطوة 3: المواعيد */}
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







// import { Picker } from "@react-native-picker/picker";
// import { useState } from "react";
// import {Text,View,TouchableOpacity,FlatList,StyleSheet} 
// from "react-native";
// import { Button } from "@rneui/themed";
// import DateTimePicker from "@react-native-community/datetimepicker";

// const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

// const DatesDoctor = () => {
//   const [selectDoctor, setSelectDoctor] = useState("");
//   const [date, setDate] = useState(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [selectedSlot, setSelectedSlot] = useState(null);

//   const onChangeDate = (event, selectedDate) => {
//     setShowDatePicker(false);
//     if (event?.type === "dismissed") return;

//     if (selectedDate) {
//       setDate(selectedDate);
//       setSelectedSlot(null);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>حجز موعد طبي</Text>
//       <View style={styles.card}>
//         <Text style={styles.label}>الطبيب</Text>
//         <Picker
//           selectedValue={selectDoctor}
//           onValueChange={(value) => {
//             setSelectDoctor(value);
//             setDate(null);
//             setSelectedSlot(null);
//           }}
//         >
//           <Picker.Item label="اختر الطبيب" value="" />
//           <Picker.Item label="Ahmed" value="ahmed" />
//           <Picker.Item label="Samer" value="samer" />
//         </Picker>
//       </View>

//       {selectDoctor !== "" && (
//         <View style={styles.card}>
//           <Text style={styles.label}>اليوم</Text>

//           <Button
//             title="اختيار اليوم"
//             onPress={() => setShowDatePicker(true)}
//             buttonStyle={styles.button}
//           />

//           {date && (
//             <Text style={styles.selectedText}>
//               {date.toDateString()}
//             </Text>
//           )}
//         </View>
//       )}

//       {date && (
//         <View style={styles.card}>
//           <Text style={styles.label}>وقت الحجز</Text>

//           <FlatList
//             data={slots}
//             numColumns={3}
//             keyExtractor={(item) => item}
//             renderItem={({ item }) => (
//               <TouchableOpacity
//                 style={[
//                   styles.slot,
//                   selectedSlot === item && styles.selectedSlot
//                 ]}
//                 onPress={() => setSelectedSlot(item)}
//               >
//                 <Text
//                   style={
//                     selectedSlot === item
//                       ? styles.selectedSlotText
//                       : styles.slotText
//                   }
//                 >
//                   {item}
//                 </Text>
//               </TouchableOpacity>
//             )}
//           />
//         </View>
//       )}

//       {showDatePicker && (
//         <DateTimePicker
//           value={date || new Date()}
//           mode="date"
//           display="calendar"
//           onChange={onChangeDate}
//         />
//       )}

// {selectedSlot && (
//   <View style={styles.card}>
//     <TouchableOpacity
//       style={styles.confirmButton}
//       onPress={() => {
//         console.log("Doctor:", selectDoctor);
//         console.log("Date:", date.toDateString());
//         console.log("Time:", selectedSlot);
//       }}
//     >
//       <Text style={styles.confirmText}>تأكيد الحجز</Text>
//     </TouchableOpacity>
//   </View>
// )}

    

//     </View>
//   );
// };

// export default DatesDoctor;

// const styles = StyleSheet.create({
//   container: {
//     width:'100%',
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//     padding: 16
//   },

//   header: {
//     fontSize: 22,
//     fontWeight: "bold",
//     color: "#2563EB",
//     textAlign: "center",
//     marginBottom: 24
//   },

//   card: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 14,
//     padding: 16,
//     marginBottom: 16,
//     elevation: 3
//   },

//   label: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 8
//   },

//   button: {
//     backgroundColor: "#2563EB",
//     borderRadius: 10,
//     paddingVertical: 12
//   },

//   selectedText: {
//     marginTop: 12,
//     fontSize: 14,
//     color: "#374151",
//     textAlign: "center"
//   },

//   slot: {
//     flex: 1,
//     margin: 6,
//     paddingVertical: 14,
//     borderRadius: 10,
//     backgroundColor: "#E5E7EB",
//     alignItems: "center"
//   },

//   selectedSlot: {
//     backgroundColor: "#2563EB"
//   },

//   slotText: {
//     color: "#111827",
//     fontSize: 14
//   },

//   selectedSlotText: {
//     color: "#FFFFFF",
//     fontWeight: "bold",
//     fontSize: 14
//   },

//   confirmButton: {
//   backgroundColor: "#16A34A",
//   paddingVertical: 14,
//   borderRadius: 10,
//   alignItems: "center"
// },

// confirmText: {
//   color: "#FFFFFF",
//   fontSize: 16,
//   fontWeight: "bold"
// }

// });












// import React, { useState } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   ScrollView, 
//   TouchableOpacity, 
//   FlatList 
// } from 'react-native';
// import { Button, Avatar } from '@rneui/themed';
// import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// const AppointmentBooking = ({ navigation }) => {
//   const [selectedDay, setSelectedDay] = useState(null);
//   const [selectedTime, setSelectedTime] = useState(null);

//   // بيانات تجريبية (ممكن تجيبها من السيرفر لاحقاً)
//   const days = [
//     { id: 1, name: 'السبت', date: '12 ابريل', available: true },
//     { id: 2, name: 'الأحد', date: '13 ابريل', available: true },
//     { id: 3, name: 'الاثنين', date: '14 ابريل', available: false }, // الطبيب لا يداوم
//     { id: 4, name: 'الثلاثاء', date: '15 ابريل', available: true },
//     { id: 5, name: 'الأربعاء', date: '16 ابريل', available: true },
//   ];

//   const timeSlots = [
//     '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', 
//     '10:00 AM', '11:00 AM', '01:00 PM', '01:30 PM'
//   ];

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
//           <Ionicons name="chevron-forward" size={24} color="#0f172a" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>حجز موعد جديد</Text>
//       </View>

//       <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
//         {/* Doctor Info Card */}
//         <View style={styles.doctorCard}>
//           <View style={styles.doctorInfo}>
//             <Text style={styles.doctorName}>د. أحمد محمد علي</Text>
//             <Text style={styles.doctorSpecialty}>أخصائي أمراض الكلى وزراعتها</Text>
//             <View style={styles.ratingRow}>
//               <MaterialCommunityIcons name="star" size={16} color="#fbbf24" />
//               <Text style={styles.ratingText}>4.9 (120 مراجعة)</Text>
//             </View>
//           </View>
//           <Avatar 
//             size={70} 
//             rounded 
//             source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png' }} 
//             containerStyle={styles.avatar}
//           />
//         </View>

//         {/* 1. Select Day (Horizontal Calendar) */}
//         <Text style={styles.sectionTitle}>اختر اليوم المتاح</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysList}>
//           {days.map((day) => (
//             <TouchableOpacity 
//               key={day.id}
//               disabled={!day.available}
//               onPress={() => {setSelectedDay(day.id); setSelectedTime(null);}}
//               style={[
//                 styles.dayCard,
//                 selectedDay === day.id && styles.selectedDayCard,
//                 !day.available && styles.disabledDayCard
//               ]}
//             >
//               <Text style={[styles.dayName, selectedDay === day.id && styles.selectedText]}>{day.name}</Text>
//               <Text style={[styles.dayDate, selectedDay === day.id && styles.selectedText]}>{day.date}</Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>

//         {/* 2. Select Time (Slots) */}
//         {selectedDay && (
//           <>
//             <Text style={styles.sectionTitle}>المواعيد المتاحة</Text>
//             <View style={styles.timeGrid}>
//               {timeSlots.map((time, index) => (
//                 <TouchableOpacity 
//                   key={index}
//                   onPress={() => setSelectedTime(time)}
//                   style={[
//                     styles.timeSlot,
//                     selectedTime === time && styles.selectedTimeSlot
//                   ]}
//                 >
//                   <Text style={[styles.timeText, selectedTime === time && styles.selectedText]}>
//                     {time}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </>
//         )}
//       </ScrollView>

//       {/* Confirmation Button */}
//       <View style={styles.footer}>
//         <Button
//           title="تأكيد الموعد"
//           disabled={!selectedTime}
//           buttonStyle={styles.confirmBtn}
//           titleStyle={styles.confirmBtnTitle}
//           onPress={() => alert('تم إرسال طلب الحجز بنجاح!')}
//         />
//       </View>
//     </View>
//   );
// };

// export default AppointmentBooking;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#ecfdf5' },
//   header: { 
//     flexDirection: 'row-reverse', 
//     alignItems: 'center', 
//     justifyContent: 'space-between', 
//     paddingHorizontal: 20, 
//     paddingTop: 50, 
//     paddingBottom: 20, 
//     backgroundColor: '#fff' 
//   },
//   headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
//   backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  
//   doctorCard: { 
//     backgroundColor: '#fff', 
//     margin: 20, 
//     padding: 20, 
//     borderRadius: 24, 
//     flexDirection: 'row-reverse', 
//     alignItems: 'center',
//     elevation: 4,
//     shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 10
//   },
//   doctorInfo: { flex: 1, alignItems: 'flex-end', marginRight: 15 },
//   doctorName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
//   doctorSpecialty: { fontSize: 14, color: '#64748b', marginTop: 4 },
//   ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 8 },
//   ratingText: { fontSize: 12, color: '#94a3b8', marginRight: 5 },
//   avatar: { backgroundColor: '#f1f5f9' },

//   sectionTitle: { 
//     fontSize: 17, fontWeight: '800', color: '#0f172a', 
//     marginHorizontal: 20, marginBottom: 15, textAlign: 'right' 
//   },
  
//   daysList: { paddingHorizontal: 15, marginBottom: 25 },
//   dayCard: { 
//     backgroundColor: '#fff', padding: 15, borderRadius: 18, 
//     marginHorizontal: 6, alignItems: 'center', width: 85, borderWidth: 1, borderColor: '#e2e8f0' 
//   },
//   selectedDayCard: { backgroundColor: '#059669', borderColor: '#059669' },
//   disabledDayCard: { opacity: 0.3, backgroundColor: '#f1f5f9' },
//   dayName: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
//   dayDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
//   selectedText: { color: '#fff' },

//   timeGrid: { 
//     flexDirection: 'row-reverse', flexWrap: 'wrap', 
//     paddingHorizontal: 15, justifyContent: 'flex-start' 
//   },
//   timeSlot: { 
//     backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 15, 
//     borderRadius: 14, margin: 5, width: '30%', alignItems: 'center',
//     borderWidth: 1, borderColor: '#e2e8f0'
//   },
//   selectedTimeSlot: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
//   timeText: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },

//   footer: { 
//     padding: 20, backgroundColor: '#fff', 
//     borderTopWidth: 1, borderTopColor: '#f1f5f9' 
//   },
//   confirmBtn: { backgroundColor: '#059669', borderRadius: 16, height: 55 },
//   confirmBtnTitle: { fontWeight: '900', fontSize: 16 }
// });

