import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from "react-native";
import { Card, Icon, Input, Button } from "@rneui/themed";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const daysTranslation = {
  "SUNDAY": "الأحد", "MONDAY": "الاثنين", "TUESDAY": "الثلاثاء", 
  "WEDNESDAY": "الأربعاء", "THURSDAY": "الخميس", "FRIDAY": "الجمعة", "SATURDAY": "السبت"
};

const DatesDoctor = () => {
  const [selectDoctor, setSelectDoctor] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [allDaySlots, setAllDaySlots] = useState([]); // المواعيد المدمجة والمرتبة
  const [reason, setReason] = useState("");
  const [isAllowed, setIsAllowed] = useState(true);
  // مم
  const [restrictionReason, setRestrictionReason] = useState("");

  useEffect(() => { fetchAllDoctors(); }, []);

  useEffect(() => {
    if (selectDoctor) {
      fetchDoctorSchedule(selectDoctor);
      setSelectedDay(null);
      setAllDaySlots([]);
      setSelectedSlot(null);
    }
  }, [selectDoctor]);

  useEffect(() => {
    if (selectedDay) {
      fetchAvailability();
    }
  }, [selectedDay]);

  const fetchAllDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get('https://medikidneysys.onrender.com/reports/booking-doctors', {
        params: { search: '' },
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctorsList(response.data);
    } catch (e) { console.log("Doctors Error:", e.message); }
  };

  const fetchDoctorSchedule = async (id) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`https://medikidneysys.onrender.com/doctor-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { doctorId: Number(id) }
      });
      setSchedule(response.data);
    } catch (e) { Alert.alert("تنبيه", "لا يوجد دوام مسجل"); } 
    finally { setLoading(false); }
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const targetDate = getNextDateForDay(selectedDay.weekday);
      const dateStr = formatDate(targetDate);

      const response = await axios.get(`https://medikidneysys.onrender.com/clinic-consultations/availability`, {
        params: { doctorId: Number(selectDoctor), date: dateStr },
        headers: { Authorization: `Bearer ${token}` }
      });

      // دمج المواعيد المتاحة والمحجوزة وترتيبها زمنياً
      const available = (response.data.availableSlots || []).map(time => ({ time, isBooked: false }));
      const booked = (response.data.bookedSlots || []).map(time => ({ time, isBooked: true }));
      
      const combined = [...available, ...booked].sort((a, b) => a.time.localeCompare(b.time));
      
      setAllDaySlots(combined);
      setIsAllowed(response.data.bookingAllowed);
      setRestrictionReason(response.data.bookingRestrictionReason || "");

      if (!response.data.bookingAllowed) {
        Alert.alert("تنبيه", response.data.bookingRestrictionReason);
      }
    } catch (e) {
      console.log("Availability Error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeTo12H = (timeStr) => {
    const [h, m] = timeStr.split(':');
    let hh = parseInt(h);
    const suffix = hh >= 12 ? "م" : "ص";
    hh = hh % 12 || 12;
    return `${hh.toString().padStart(2, '0')}:${m} ${suffix}`;
  };

  const getNextDateForDay = (dayName) => {
    const daysOrder = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetDayIndex = daysOrder.indexOf(dayName.toUpperCase());
    const now = new Date();
    const resultDate = new Date(now);
    const currentDayIndex = now.getDay();
    let distance = (targetDayIndex + 7 - currentDayIndex) % 7;
    resultDate.setDate(now.getDate() + distance);
    return resultDate;
  };

  const handleFinalBook = async () => {
    if (!reason.trim()) { Alert.alert("تنبيه", "يرجى كتابة سبب الزيارة"); return; }
    if (!isAllowed) { Alert.alert("خطأ", restrictionReason); return; }
    
    try {
      setBookingLoading(true);
      const token = await AsyncStorage.getItem("token");
      const targetDate = getNextDateForDay(selectedDay.weekday);
      const dateStr = formatDate(targetDate);
      const timeStr = `${dateStr}T${selectedSlot}`;

      const body = {
        doctorId: Number(selectDoctor),
        apptDate: dateStr, 
        apptTime: timeStr,
        visitReason: reason,
        notes: "تم الحجز من تطبيق الموبايل"
      };

      await axios.post('https://medikidneysys.onrender.com/clinic-consultations/book', body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("نجاح", "تم حجز موعدك بنجاح ✅");
      setSelectedSlot(null);
      setReason("");
      fetchAvailability(); 
    } catch (err) {
      const errorMsg = err.response?.data?.message || "فشل الحجز";
      Alert.alert("خطأ", Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    // lll
    <View style={styles.container}>
      <Text style={styles.mainHeader}>حجز موعد طبي</Text>
      
      <ScrollView style={{ flex: 1 }}>
        <Card containerStyle={styles.topCard}>
          <Text style={styles.label}>اختر الطبيب:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectDoctor} onValueChange={setSelectDoctor}>
              <Picker.Item label="اختر من القائمة..." value="" />
              {doctorsList.map(d => <Picker.Item key={d.doctor_id} label={`د. ${d.full_name}`} value={d.doctor_id.toString()} />)}
            </Picker>
          </View>
          <Text style={[styles.label, {marginTop: 15}]}>سبب الزيارة:</Text>
          <Input 
            placeholder="مثلاً: مراجعة دورية" 
            value={reason} 
            onChangeText={setReason} 
            inputContainerStyle={styles.inputContainer}
          />
        </Card>

        {schedule.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أيام دوام الطبيب:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse'}}>
              {schedule.map((item, i) => (
                <Pressable 
                  key={i} 
                  onPress={() => setSelectedDay(item)} 
                  style={[styles.dayBtn, selectedDay?.schedule_id === item.schedule_id && styles.selectedDayBtn]}
                >
                  <Text style={[styles.dayText, { color: selectedDay?.schedule_id === item.schedule_id ? '#fff' : '#334155' }]}>
                    {daysTranslation[item.weekday] || item.weekday}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ padding: 16 }}>
          {loading ? (
            <ActivityIndicator color="#059669" size="large" />
          ) : (
            <View>
              {allDaySlots.map((slot, index) => (
                <Pressable 
                  key={index} 
                  onPress={() => !slot.isBooked && setSelectedSlot(slot.time)} 
                  disabled={slot.isBooked}
                  style={[
                    styles.slotItem, 
                    selectedSlot === slot.time && styles.selectedSlotBorder,
                    slot.isBooked && styles.bookedSlot
                  ]}
                >
                  <Text style={[styles.slotTimeText, slot.isBooked && {color: '#94a3b8'}]}>
                    {formatTimeTo12H(slot.time)}
                  </Text>
                  
                  {slot.isBooked ? (
                    <Text style={styles.bookedLabel}>محجوز</Text>
                  ) : (
                    <Icon 
                      name={selectedSlot === slot.time ? "check-circle" : "circle"} 
                      type="feather" 
                      color="#059669" 
                      size={20} 
                    />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {selectedSlot && (
        <View style={styles.footer}>
          <Button 
            title={bookingLoading ? "جاري الحجز..." : `تأكيد حجز الساعة ${formatTimeTo12H(selectedSlot)}`} 
            onPress={handleFinalBook} 
            loading={bookingLoading}
            buttonStyle={styles.bookBtn}
            disabled={!isAllowed}
          />
          {!isAllowed && <Text style={styles.errorText}>{restrictionReason}</Text>}
        </View>
      )}
    </View>
  );
};

export default DatesDoctor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  mainHeader: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 50, color: '#0f172a' },
  topCard: { borderRadius: 20, elevation: 4, padding: 15 },
  label: { textAlign: 'right', marginBottom: 8, color: '#64748b', fontSize: 14, fontWeight: '600' },
  pickerWrapper: { backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 5 },
  inputContainer: { backgroundColor: '#f1f5f9', borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 10 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { textAlign: 'right', fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#334155' },
  dayBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, marginLeft: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedDayBtn: { backgroundColor: '#059669', borderColor: '#059669' },
  dayText: { fontWeight: 'bold' },
  slotItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: '#fff', padding: 18, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  selectedSlotBorder: { borderColor: '#059669', borderWidth: 2, backgroundColor: '#f0fdf4' },
  bookedSlot: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', opacity: 0.7 },
  slotTimeText: { fontWeight: 'bold', color: '#1e293b', fontSize: 15 },
  bookedLabel: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f1f5f9' },
  bookBtn: { backgroundColor: '#059669', borderRadius: 15, height: 60, fontWeight: 'bold' },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 10, fontSize: 12 },
});





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

