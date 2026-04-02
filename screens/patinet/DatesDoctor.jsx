import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList } from "react-native";
import { Card } from "@rneui/themed";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DatesDoctor = () => {
  const [selectDoctor, setSelectDoctor] = useState("");
  const [schedule, setSchedule] = useState([]); 
  const [appointments, setAppointments] = useState([]); 
  const [selectedDay, setSelectedDay] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);

  // 1. جلب قائمة الأطباء عند فتح الشاشة
  const fetchAllDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get('https://medikidneysys.onrender.com/reports/booking-doctors', {
        params: { search: '' },
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctorsList(response.data);
    } catch (error) {
      console.log("Error Doctors List:", error.message);
    }
  };

  // 2. جلب جدول الطبيب المختار
  const fetchDoctorSchedule = async (doctorId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      console.log("جاري جلب جدول الطبيب رقم:", doctorId);
      
      const response = await axios.get(`https://medikidneysys.onrender.com/doctor-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { doctorId: doctorId }
      });
      
      console.log("بيانات الجدول المستلمة:", response.data);
      setSchedule(response.data);
    } catch (error) {
      console.log("Schedule Error:", error.response?.data || error.message);
      Alert.alert("تنبيه", "لا يوجد جدول متاح لهذا الطبيب حالياً");
    } finally {
      setLoading(false);
    }
  };

  // 3. جلب المراجعات المحجوزة بناءً على اليوم المختار
  const fetchBookedConsultations = async (dayDate) => {
    if (!dayDate) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      console.log("طلب المراجعات للتاريخ:", dayDate);
      
      const response = await axios.get(`https://medikidneysys.onrender.com/clinic-consultations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          doctorId: selectDoctor,
          date: dayDate 
        }
      });
      setAppointments(response.data);
    } catch (error) {
      console.log("Consultations Error 400 - فحص المعاملات:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDoctors();
  }, []);

  useEffect(() => {
    if (selectDoctor) {
      fetchDoctorSchedule(selectDoctor);
      setSelectedDay(null);
      setAppointments([]);
    }
  }, [selectDoctor]);

  useEffect(() => {
    if (selectedDay) {
      // استخراج التاريخ الصحيح سواء كان الحقل اسمه date أو available_date
      const dateToSend = selectedDay.date || selectedDay.available_date || selectedDay.day_date;
      fetchBookedConsultations(dateToSend);
    }
  }, [selectedDay]);

  const renderAppointment = ({ item }) => (
    <View style={styles.apptItem}>
      <Text style={styles.apptTime}>
        {item.apptTime?.includes('T') ? item.apptTime.split('T')[1].substring(0, 5) : (item.apptTime || "00:00")}
      </Text>
      <Text style={styles.apptPatient}>{item.patientName || item.full_name || "مريض مجهول"}</Text>
      <View style={styles.statusDot} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.mainHeader}>إدارة مواعيد العيادة</Text>

      <Card containerStyle={styles.topCard}>
        <Text style={styles.label}>اختر الطبيب المسؤول:</Text>
        <Picker
          selectedValue={selectDoctor}
          onValueChange={(val) => setSelectDoctor(val)}
        >
          <Picker.Item label="-- اختر طبيباً من القائمة --" value="" />
          {doctorsList.map((doc) => (
            <Picker.Item 
              key={doc.doctor_id.toString()} 
              label={`د. ${doc.full_name}`} 
              value={doc.doctor_id.toString()} 
            />
          ))}
        </Picker>
      </Card>

      {loading && <ActivityIndicator color="#059669" size="large" style={{marginVertical: 20}} />}

      {schedule && schedule.length > 0 ? (
        <View style={[styles.section, { minHeight: 140, backgroundColor: '#f0fdf4', padding: 10, borderRadius: 15 }]}>
          <Text style={styles.sectionTitle}>الأيام المتاحة في جدول الطبيب:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            {schedule.map((day, index) => {
              // تحديد التاريخ والاسم بشكل مرن
              const dDate = day.date || day.available_date || day.day_date;
              const dName = day.dayName || day.day_name || "يوم";
              
              return (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => {
                    console.log("تم اختيار يوم:", dDate);
                    setSelectedDay(day);
                  }}
                  style={[
                    styles.dayBtn, 
                    (selectedDay?.date === dDate || selectedDay?.available_date === dDate) && styles.selectedDayBtn
                  ]}
                >
                  <Text style={[styles.dayText, (selectedDay?.date === dDate || selectedDay?.available_date === dDate) && {color: '#fff'}]}>
                    {dName}
                  </Text>
                  <Text style={[styles.dateText, (selectedDay?.date === dDate || selectedDay?.available_date === dDate) && {color: '#fff'}]}>
                    {dDate}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        !loading && selectDoctor !== "" && (
          <Text style={styles.emptyError}>لا توجد أيام متاحة في جدول هذا الطبيب</Text>
        )
      )}

      {selectedDay && !loading && (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            مراجعات يوم ({selectedDay.date || selectedDay.available_date}):
          </Text>
          <FlatList
            data={appointments}
            renderItem={renderAppointment}
            keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={<Text style={styles.empty}>لا يوجد حجوزات لهذا اليوم</Text>}
          />
        </View>
      )}
    </View>
  );
};

export default DatesDoctor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  mainHeader: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginTop: 40, marginBottom: 10 },
  topCard: { borderRadius: 15, padding: 5, elevation: 2 },
  label: { fontSize: 13, color: '#64748b', textAlign: 'right', marginRight: 10 },
  section: { marginTop: 20, width: '100%' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, textAlign: 'right' },
  dayBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', minWidth: 100, height: 80 },
  selectedDayBtn: { backgroundColor: '#059669', borderColor: '#059669' },
  dayText: { fontWeight: 'bold', color: '#475569' },
  dateText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  listSection: { flex: 1, marginTop: 20 },
  apptItem: { flexDirection: 'row-reverse', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 8, alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  apptTime: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  apptPatient: { fontSize: 14, color: '#334155' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 30 },
  emptyError: { textAlign: 'center', marginTop: 20, color: '#ef4444', fontWeight: '500' }
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

