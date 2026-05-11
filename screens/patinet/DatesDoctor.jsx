import React, { useState, useEffect, useRef } from "react";
import {
  Text, View, ScrollView, StyleSheet, ActivityIndicator,
  Alert, Pressable, TextInput, Animated, StatusBar, Platform
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../context/LanguageContext";

const AppointmentScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [myAppointments, setMyAppointments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const formatDate = (date) => date.toISOString().split('T')[0];

  const getNextDate = (dayName) => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const target = days.indexOf(dayName.toUpperCase());
    const d = new Date();
    d.setDate(d.getDate() + (target + 7 - d.getDay()) % 7);
    return formatDate(d);
  };

  const formatTime = (time) => {
    if (!time) return "";
    let [h, m] = time.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? t.time.pm : t.time.am}`;
  };

  const initData = async () => {
    try {
      const [docsRes, myApptsRes] = await Promise.all([
        api.get('/reports/booking-doctors'),
        api.get('/clinic-consultations')
      ]);

      setDoctors(Array.isArray(docsRes.data) ? docsRes.data : []);
      const activeAppts = (myApptsRes.data || []).filter(a => a.status === 'SCHEDULED');
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

  const handleCancelAppointment = (apptId) => {
    if (!apptId) {
      return Alert.alert(t.error, t.appointments.apptIdNotFound);
    }

    Alert.alert(
      t.appointments.cancelTitle,
      t.appointments.cancelMsg,
      [
        { text: t.appointments.cancelBack, style: "cancel" },
        {
          text: t.appointments.cancelConfirm,
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/clinic-consultations/${apptId}`);
              if (response.status === 200 || response.status === 204) {
                Alert.alert(t.success, t.appointments.cancelSuccess);
                initData();
                if (selectedDay) handleDaySelect(selectedDay);
              }
            } catch (err) {
              console.error("Delete Error Detail:", err.response?.data || err.message);
              const errMsg = err.response?.data?.message || t.appointments.cancelFailed;
              Alert.alert(t.failed, errMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

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
      Alert.alert(t.error, t.appointments.noSchedule);
    } finally {
      setLoading(false);
    }
  };

  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    setSlots([]);
    setSelectedSlot(null);
    setErrorMsg("");

    try {
      setLoading(true);
      const date = getNextDate(day.weekday);
      const res = await api.get('/clinic-consultations/availability', {
        params: { doctorId: selectedDoctor, date }
      });

      const { availableSlots = [], bookedSlots = [], bookingAllowed, bookingRestrictionReason } = res.data;

      const all = [
        ...availableSlots.map(tm => ({ time: tm, booked: false })),
        ...bookedSlots.map(tm => ({ time: tm, booked: true }))
      ].sort((a, b) => a.time.localeCompare(b.time));

      setSlots(all);
      if (!bookingAllowed) setErrorMsg(bookingRestrictionReason);
    } catch (e) {
      setErrorMsg(t.appointments.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!reason.trim()) return Alert.alert(t.error, t.appointments.reasonRequired);

    const date = getNextDate(selectedDay.weekday);

    const hasApptSameDay = myAppointments.some(appt => appt.appt_date === date);
    if (hasApptSameDay) {
      return Alert.alert(t.appointments.sorry, t.appointments.sameDayError);
    }

    try {
      setBookingLoading(true);
      await api.post('/clinic-consultations/book', {
        doctorId: Number(selectedDoctor),
        apptDate: date,
        apptTime: `${date}T${selectedSlot}`,
        visitReason: reason
      });

      Alert.alert(t.success, t.appointments.bookSuccess, [
        {
          text: t.appointments.bookSuccessBtn, onPress: () => {
            initData();
            handleDaySelect(selectedDay);
          }
        }
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "";
      if (err.response?.status === 400 && (errMsg.includes("already") || errMsg.includes("same day") || errMsg.includes("موعد") || errMsg.includes("مسبق"))) {
        Alert.alert(t.appointments.sorry, t.appointments.sameDayError);
      } else {
        Alert.alert(t.failed, errMsg || t.appointments.bookFailed);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (isWakingUp) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#26CDD6" />
      <Text style={styles.loadingText}>{t.appointments.systemLoading}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#193B6B" />

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{t.appointments.title}</Text>
            <Text style={styles.headerSub}>{t.appointments.headerSub}</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <MaterialCommunityIcons name="arrow-right" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {myAppointments.length > 0 && (
            <View style={styles.myApptsSection}>
              <Text style={styles.label}>{t.appointments.myAppointments}</Text>
              {myAppointments.map((appt) => {
                const isCompleted = appt.status === 'COMPLETED';
                return (
                  <View key={appt.appointment_id} style={styles.myApptCard}>
                    {isCompleted ? (
                      <View style={styles.completedBadge}>
                        <MaterialCommunityIcons name="check-circle-outline" size={20} color="#26CDD6" />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleCancelAppointment(appt.appointment_id)}
                        style={styles.deleteBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#DE1A1C" />
                      </Pressable>
                    )}
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.docName}>{t.appointments.dr} {appt.doctor?.full_name}</Text>
                      <Text style={styles.apptDateText}>{appt.appt_date} | {formatTime(appt.appt_time)}</Text>
                      {isCompleted && (
                        <Text style={styles.completedText}>{t.patientProfile?.status?.completed || 'مكتمل'}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.card}>
            <Text style={styles.label}>{t.appointments.step1}</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedDoctor}
                onValueChange={handleDoctorChange}
                style={styles.picker}
              >
                <Picker.Item label={t.appointments.selectDoctor} value="" />
                {doctors.map(d => <Picker.Item key={d.doctor_id} label={`${t.appointments.dr} ${d.full_name}`} value={d.doctor_id.toString()} />)}
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.appointments.visitReason}
              value={reason}
              onChangeText={setReason}
              multiline
            />
          </View>

          {schedules.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t.appointments.step2}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
                {schedules.map((s, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleDaySelect(s)}
                    style={[styles.dayCard, selectedDay?.schedule_id === s.schedule_id && styles.activeDay]}
                  >
                    <Text style={[styles.dayText, selectedDay?.schedule_id === s.schedule_id && styles.activeText]}>
                      {t.days[s.weekday] || s.weekday}
                    </Text>
                    <Text style={styles.smallTime}>{formatTime(s.startTime)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#26CDD6" />
          ) : slots.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>{t.appointments.step3}</Text>
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
                    {s.booked && <Text style={styles.bookedLabel}>{t.appointments.booked}</Text>}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : errorMsg ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>
          ) : null}

        </Animated.View>
      </ScrollView>

      {selectedSlot && (
        <View style={styles.footer}>
          <Pressable
            onPress={confirmBooking}
            disabled={bookingLoading}
            style={styles.confirmBtn}
          >
            {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.appointments.confirmBtn}</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1FCFD" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#193B6B", padding: 30, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 22, color: "#fff", fontWeight: "bold", textAlign: "center" },
  headerSub: { color: "#BCEFF3", textAlign: "center", fontSize: 12 },
  scroll: { padding: 16, paddingBottom: 120 },
  myApptsSection: { marginBottom: 10 },
  myApptCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderRightWidth: 4,
    borderRightColor: '#26CDD6',
    elevation: 2
  },
  deleteBtn: { padding: 8, backgroundColor: '#FBEAEA', borderRadius: 8 },
  completedBadge: { padding: 8, backgroundColor: '#F1FCFD', borderRadius: 8 },
  completedText: { fontSize: 11, color: '#26CDD6', fontWeight: '600', marginTop: 2 },
  docName: { fontWeight: 'bold', color: '#193B6B', fontSize: 14 },
  apptDateText: { color: '#8296B1', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#D1D5DB', marginVertical: 15 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, elevation: 2 },
  label: { fontSize: 15, fontWeight: "bold", color: "#193B6B", marginBottom: 10, textAlign: "right" },
  pickerBox: { backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
  picker: { height: 50 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, textAlign: "right", minHeight: 60, borderWidth: 1, borderColor: "#E5E7EB" },
  section: { marginTop: 20 },
  daysContainer: { flexDirection: "row-reverse" },
  dayCard: { backgroundColor: "#fff", padding: 15, borderRadius: 12, marginLeft: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", minWidth: 90 },
  activeDay: { backgroundColor: "#26CDD6", borderColor: "#26CDD6" },
  dayText: { fontWeight: "bold", color: "#193B6B" },
  activeText: { color: "#fff" },
  smallTime: { fontSize: 10, color: "#8296B1" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  slot: { backgroundColor: "#fff", width: "30%", padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  activeSlot: { backgroundColor: "#26CDD6", borderColor: "#26CDD6" },
  bookedSlot: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  slotText: { fontSize: 13, fontWeight: "600" },
  bookedText: { color: "#8296B1" },
  bookedLabel: { fontSize: 8, color: "#DE1A1C" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#E5E7EB" },
  confirmBtn: { backgroundColor: "#26CDD6", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  errorBox: { marginTop: 20, padding: 15, backgroundColor: "#FBEAEA", borderRadius: 10 },
  errorText: { color: "#DE1A1C", textAlign: "center", fontSize: 13 },
  loadingText: { marginTop: 10, color: "#8296B1" }
});

export default AppointmentScreen;
