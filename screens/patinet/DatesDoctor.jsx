import { Card } from "@rneui/base"
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import {Text,View,TouchableOpacity,FlatList,StyleSheet}from "react-native";
import { Button } from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";

const DatesDoctor=()=>{
  const [selectDoctor, setSelectDoctor] = useState("");
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);


  return(
    <View style={styles.container} >
      <Text>اخحجز موعدك مع الطبيب</Text>
      <View style={styles.Card}>
          <Card>
            <Card.Title>
              الطبيب
            </Card.Title>
            <Picker
              selectedValue={selectDoctor}
              onValueChange={(value) => {
                setSelectDoctor(value);
                setDate(null);
                setSelectedSlot(null);
             }}

            >

          <Picker.Item label="اختر الطبيب" value="" />
          <Picker.Item label="Ahmed" value="ahmed" />
          <Picker.Item label="Samer" value="samer" />
        </Picker>
            <Card.Divider/>
            <Text>الاسم :احمد جمعة</Text>
            <Text> التخصص : اخصائي امراض كلى</Text>
          </Card>
      </View>
      
      <View>

      </View>





    </View>
  )
}





export default DatesDoctor



const styles=StyleSheet.create({
  container:{
    width:'100%',
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16
  },
  Card:{

  }
})

















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

