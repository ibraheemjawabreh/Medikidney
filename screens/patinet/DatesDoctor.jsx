import React, { useState, useEffect, useRef } from "react";
import {
  Text, View, ScrollView, StyleSheet, ActivityIndicator,
  Alert, Pressable, TextInput, Animated, StatusBar, Platform,
  FlatList, TouchableOpacity, KeyboardAvoidingView
} from "react-native";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../context/LanguageContext";

const C = {
  navy:    "#193B6B",
  teal:    "#26CDD6",
  tealBg:  "#E8F9FA",
  tealMid: "#A8E8EC",
  light:   "#F1FCFD",
  white:   "#FFFFFF",
  muted:   "#8296B1",
  border:  "#E5E7EB",
  red:     "#DE1A1C",
  redBg:   "#FBEAEA",
  gray:    "#F9FAFB",
  darkText:"#1A2E45",
};

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { icon: "doctor", label: "الطبيب" },
    { icon: "calendar-month", label: "الموعد" },
    { icon: "text-box-outline", label: "التفاصيل" },
    { icon: "check-circle-outline", label: "تأكيد" },
  ];

  return (
    <View style={si.wrapper}>
      {steps.map((s, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        const future  = i > currentStep;
        return (
          <React.Fragment key={i}>
            <View style={si.col}>
              <View style={[
                si.circle,
                done   && si.circleDone,
                active && si.circleActive,
                future && si.circleFuture,
              ]}>
                {done
                  ? <MaterialCommunityIcons name="check" size={16} color={C.white} />
                  : <MaterialCommunityIcons
                      name={s.icon}
                      size={16}
                      color={active ? C.white : C.muted}
                    />
                }
              </View>
              <Text style={[
                si.label,
                active && { color: C.teal, fontWeight: "700" },
                done   && { color: C.navy },
                future && { color: C.muted },
              ]}>{s.label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[si.line, done && si.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const si = StyleSheet.create({
  wrapper:      { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 20, paddingHorizontal: 10 },
  col:          { alignItems: "center", width: 60 },
  circle:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  circleDone:   { backgroundColor: C.navy },
  circleActive: { backgroundColor: C.teal },
  circleFuture: { backgroundColor: C.border, borderWidth: 1, borderColor: C.border },
  label:        { fontSize: 11, textAlign: "center" },
  line:         { flex: 1, height: 2, backgroundColor: C.border, marginBottom: 22, marginHorizontal: 2 },
  lineDone:     { backgroundColor: C.navy },
});

const DoctorCard = ({ doctor, selected, onPress, t }) => (
  <Pressable
    onPress={onPress}
    style={[dc.card, selected && dc.cardSelected]}
  >
    <View style={[dc.avatar, selected && dc.avatarSelected]}>
      <MaterialCommunityIcons
        name="doctor"
        size={28}
        color={selected ? C.white : C.teal}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[dc.name, selected && { color: C.white }]}>
        {t.appointments.dr} {doctor.full_name}
      </Text>
      {doctor.specialty && (
        <Text style={[dc.spec, selected && { color: "rgba(255,255,255,0.75)" }]}>
          {doctor.specialty}
        </Text>
      )}
    </View>
    {selected && (
      <MaterialCommunityIcons name="check-circle" size={22} color={C.white} />
    )}
  </Pressable>
);

const dc = StyleSheet.create({
  card:         { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: C.border },
  cardSelected: { backgroundColor: C.navy, borderColor: C.navy },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: C.tealBg, alignItems: "center", justifyContent: "center" },
  avatarSelected:{ backgroundColor: "rgba(255,255,255,0.2)" },
  name:         { fontSize: 15, fontWeight: "700", color: C.navy, textAlign: "right" },
  spec:         { fontSize: 12, color: C.muted, marginTop: 2, textAlign: "right" },
});

const DayCard = ({ schedule, selected, onPress, formatTime, t }) => {
  const DAY_AR = {
    SUNDAY: "الأحد", MONDAY: "الاثنين", TUESDAY: "الثلاثاء",
    WEDNESDAY: "الأربعاء", THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت"
  };
  const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const dayLabel = t?.days?.[schedule.weekday] || DAY_AR[schedule.weekday] || schedule.weekday;

  const getDateForDay = (dayName) => {
    const days = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const target = days.indexOf(dayName.toUpperCase());
    const d = new Date();
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const dateObj   = getDateForDay(schedule.weekday);
  const dayNum    = dateObj.getDate();
  const monthName = MONTH_AR[dateObj.getMonth()];
  const isItToday = dateObj.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

  return (
    <Pressable onPress={onPress} style={[dy.card, selected && dy.cardSelected]}>
      
      <View style={[dy.dateBox, selected && dy.dateBoxSelected]}>
        <Text style={[dy.dayNum, selected && dy.dayNumSelected]}>{dayNum}</Text>
        <Text style={[dy.monthName, selected && dy.monthNameSelected]}>{monthName}</Text>
      </View>

      <View style={[dy.divider, selected && dy.dividerSelected]} />

      <View style={dy.infoCol}>
        <View style={dy.nameRow}>
          <Text style={[dy.dayLabel, selected && dy.textW]}>{dayLabel}</Text>
          {isItToday && (
            <View style={[dy.todayBadge, selected && dy.todayBadgeSelected]}>
              <Text style={[dy.todayText, selected && dy.todayTextSelected]}>اليوم</Text>
            </View>
          )}
        </View>
        <Text style={[dy.timeText, selected && dy.timeTextSelected]}>
          {formatTime(schedule.startTime)}
        </Text>
      </View>

      {selected && (
        <MaterialCommunityIcons name="check-circle" size={18} color={C.white} style={{ marginRight: 4 }} />
      )}
    </Pressable>
  );
};

const dy = StyleSheet.create({
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 12,
  },
  cardSelected: { backgroundColor: C.navy, borderColor: C.navy },

  dateBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.tealBg,
    borderRadius: 10,
    width: 48,
    height: 48,
  },
  dateBoxSelected: { backgroundColor: "rgba(255,255,255,0.15)" },
  dayNum:          { fontSize: 18, fontWeight: "700", color: C.teal, lineHeight: 22 },
  dayNumSelected:  { color: C.white },
  monthName:       { fontSize: 10, color: C.muted, fontWeight: "600" },
  monthNameSelected:{ color: "rgba(255,255,255,0.7)" },

  divider:         { width: 1, height: 36, backgroundColor: C.border },
  dividerSelected: { backgroundColor: "rgba(255,255,255,0.2)" },

  infoCol:  { flex: 1, alignItems: "flex-end", gap: 4 },
  nameRow:  { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  dayLabel: { fontSize: 15, fontWeight: "700", color: C.navy },
  textW:    { color: C.white },
  timeText: { fontSize: 12, color: C.muted },
  timeTextSelected: { color: "rgba(255,255,255,0.75)" },

  todayBadge:        { backgroundColor: C.teal, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  todayBadgeSelected:{ backgroundColor: "rgba(255,255,255,0.25)" },
  todayText:         { fontSize: 10, fontWeight: "700", color: C.white },
  todayTextSelected: { color: C.white },
});

const TimeSlot = ({ slot, selected, onPress, formatTime, t }) => (
  <Pressable
    disabled={slot.booked}
    onPress={onPress}
    style={[ts.slot, slot.booked && ts.booked, selected && ts.selected]}
  >
    <MaterialCommunityIcons
      name={slot.booked ? "clock-remove-outline" : "clock-outline"}
      size={15}
      color={selected ? C.white : slot.booked ? C.muted : C.teal}
    />
    <Text style={[ts.text, slot.booked && ts.bookedText, selected && ts.selectedText]}>
      {formatTime(slot.time)}
    </Text>
    {slot.booked && (
      <Text style={ts.bookedTag}>{t.appointments.booked}</Text>
    )}
  </Pressable>
);

const ts = StyleSheet.create({
  slot:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border, width: "47%", marginBottom: 10 },
  selected:    { backgroundColor: C.teal, borderColor: C.teal },
  booked:      { backgroundColor: C.gray, borderColor: C.border, opacity: 0.6 },
  text:        { fontSize: 13, fontWeight: "600", color: C.navy },
  selectedText:{ color: C.white },
  bookedText:  { color: C.muted },
  bookedTag:   { fontSize: 9, color: C.red, marginRight: "auto" },
});

const SummaryRow = ({ icon, label, value }) => (
  <View style={sr.row}>
    <Text style={sr.value}>{value}</Text>
    <View style={sr.right}>
      <Text style={sr.label}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={20} color={C.teal} />
    </View>
  </View>
);

const sr = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 13, color: C.muted, textAlign: "right" },
  value: { fontSize: 14, fontWeight: "600", color: C.navy, textAlign: "right", flex: 1, marginRight: 16 },
});

const AppointmentScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const [step, setStep]                 = useState(0);
  const [doctors, setDoctors]           = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedules, setSchedules]       = useState([]);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [slots, setSlots]               = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason]             = useState("");
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [isWakingUp, setIsWakingUp]     = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const [slotBookingAllowed, setSlotBookingAllowed] = useState(true);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const formatDate = (date) => date.toISOString().split("T")[0];

  const getNextDate = (dayName) => {
    const days = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const target = days.indexOf(dayName.toUpperCase());
    const d = new Date();
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
  };

  const isToday = (dateStr) => dateStr === formatDate(new Date());

  const filterPastSlots = (slotsArr, dateStr) => {
    if (!isToday(dateStr)) return slotsArr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const bufferMinutes = 15;
    return slotsArr.filter(slot => {
      const [h, m] = slot.time.split(":").map(Number);
      return (h * 60 + m) > currentMinutes + bufferMinutes;
    });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? (t?.time?.pm || "م") : (t?.time?.am || "ص")}`;
  };

  const animateStep = () => {
    slideAnim.setValue(30);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const goToStep = (n) => {
    setStep(n);
    animateStep();
  };

  const initData = async () => {
    try {
      const [docsRes, myApptsRes] = await Promise.all([
        api.get("/reports/booking-doctors"),
        api.get("/clinic-consultations"),
      ]);
      setDoctors(Array.isArray(docsRes.data) ? docsRes.data : []);
      const active = (myApptsRes.data || []).filter(a => a.status === "SCHEDULED");
      setMyAppointments(active);
    } catch (err) {
      console.log("Init Error:", err);
    } finally {
      setIsWakingUp(false);
      animateStep();
    }
  };

  useEffect(() => { initData(); }, []);

  const handleDoctorSelect = async (doc) => {
    setSelectedDoctor(doc);
    setSchedules([]);
    setSelectedDay(null);
    setSlots([]);
    setSelectedSlot(null);
    setErrorMsg("");

    try {
      setLoading(true);
      const res = await api.get("/doctor-schedule", { params: { doctorId: doc.doctor_id } });
      const data = res.data || [];
      setSchedules(data);

      if (data.length === 0) {
        Alert.alert(
          "لا توجد مواعيد",
          `الدكتور ${doc.full_name} لا يملك جدول مواعيد حالياً، يرجى اختيار طبيب آخر.`,
          [{ text: "حسناً" }]
        );
        return;
      }

      goToStep(1);
    } catch {
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
      const res = await api.get("/clinic-consultations/availability", {
        params: { doctorId: selectedDoctor.doctor_id, date },
      });

      const { availableSlots = [], bookedSlots = [], bookingAllowed, bookingRestrictionReason } = res.data;

      const all = [
        ...availableSlots.map(tm => ({ time: tm, booked: false })),
        ...bookedSlots.map(tm =>   ({ time: tm, booked: true  })),
      ].sort((a, b) => a.time.localeCompare(b.time));

      const filtered = filterPastSlots(all, date);

      if (isToday(date) && filtered.filter(s => !s.booked).length === 0 && all.filter(s => !s.booked).length > 0) {
        setSlots([]);
        setErrorMsg("انتهت مواعيد اليوم، يرجى اختيار يوم آخر أو المراجعة غداً.");
        setSlotBookingAllowed(false);
        goToStep(2);
        return;
      }

      setSlots(filtered);
      setSlotBookingAllowed(bookingAllowed !== false);
      if (!bookingAllowed) setErrorMsg(bookingRestrictionReason || "");
      goToStep(2);
    } catch {
      setErrorMsg(t.appointments.fetchError);
      goToStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (s) => {
    setSelectedSlot(s.time);
    goToStep(3);
  };

  const handleCancelAppointment = (apptId) => {
    if (!apptId) return Alert.alert(t.error, t.appointments.apptIdNotFound);
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
              const res = await api.delete(`/clinic-consultations/${apptId}`);
              if (res.status === 200 || res.status === 204) {
                Alert.alert(t.success, t.appointments.cancelSuccess);
                initData();
              }
            } catch (err) {
              Alert.alert(t.failed, err.response?.data?.message || t.appointments.cancelFailed);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const confirmBooking = async () => {
    if (!reason.trim()) return Alert.alert(t.error, t.appointments.reasonRequired);

    const date = getNextDate(selectedDay.weekday);
    if (myAppointments.some(a => a.appt_date === date)) {
      return Alert.alert(t.appointments.sorry, t.appointments.sameDayError);
    }

    try {
      setBookingLoading(true);
      await api.post("/clinic-consultations/book", {
        doctorId:    Number(selectedDoctor.doctor_id),
        apptDate:    date,
        apptTime:    `${date}T${selectedSlot}`,
        visitReason: reason,
      });

      Alert.alert(t.success, t.appointments.bookSuccess, [
        {
          text: t.appointments.bookSuccessBtn,
          onPress: () => {
            initData();
            
            setStep(0);
            setSelectedDoctor(null);
            setSchedules([]);
            setSelectedDay(null);
            setSlots([]);
            setSelectedSlot(null);
            setReason("");
            animateStep();
          },
        },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "";
      const isSameDay = err.response?.status === 400 &&
        (msg.includes("already") || msg.includes("same day") || msg.includes("موعد") || msg.includes("مسبق"));
      Alert.alert(isSameDay ? t.appointments.sorry : t.failed, isSameDay ? t.appointments.sameDayError : msg || t.appointments.bookFailed);
    } finally {
      setBookingLoading(false);
    }
  };

  const DAY_AR = {
    SUNDAY: "الأحد", MONDAY: "الاثنين", TUESDAY: "الثلاثاء",
    WEDNESDAY: "الأربعاء", THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت"
  };

  const renderStep0 = () => (
    <View>
      <Text style={s.sectionTitle}>اختر الطبيب</Text>
      {loading
        ? <ActivityIndicator color={C.teal} style={{ marginTop: 30 }} />
        : doctors.map(doc => (
            <DoctorCard
              key={doc.doctor_id}
              doctor={doc}
              selected={selectedDoctor?.doctor_id === doc.doctor_id}
              onPress={() => handleDoctorSelect(doc)}
              t={t}
            />
          ))
      }
    </View>
  );

  const renderStep1 = () => (
    <View>
      
      <Pressable onPress={() => goToStep(0)} style={s.summaryPill}>
        <MaterialCommunityIcons name="pencil-outline" size={15} color={C.teal} />
        <Text style={s.summaryPillText}>د. {selectedDoctor?.full_name}</Text>
        <MaterialCommunityIcons name="chevron-left" size={16} color={C.muted} />
      </Pressable>

      <Text style={s.sectionTitle}>اختر اليوم</Text>
      <View style={{ gap: 0 }}>
        {schedules.map((sc, i) => (
          <DayCard
            key={i}
            schedule={sc}
            selected={selectedDay?.schedule_id === sc.schedule_id}
            onPress={() => handleDaySelect(sc)}
            formatTime={formatTime}
            t={t}
          />
        ))}
      </View>
      {loading && <ActivityIndicator color={C.teal} style={{ marginTop: 20 }} />}
    </View>
  );

  const renderStep2 = () => (
    <View>
      
      <View style={s.breadRow}>
        <Pressable onPress={() => goToStep(1)} style={s.summaryPill}>
          <MaterialCommunityIcons name="pencil-outline" size={14} color={C.teal} />
          <Text style={s.summaryPillText}>
            {(() => {
              const DAY_AR2 = { SUNDAY:"الأحد", MONDAY:"الاثنين", TUESDAY:"الثلاثاء", WEDNESDAY:"الأربعاء", THURSDAY:"الخميس", FRIDAY:"الجمعة", SATURDAY:"السبت" };
              const MONTH_AR2 = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
              const days2 = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
              const target = days2.indexOf(selectedDay?.weekday?.toUpperCase());
              const d = new Date();
              const diff = (target - d.getDay() + 7) % 7;
              d.setDate(d.getDate() + diff);
              const dayName = t?.days?.[selectedDay?.weekday] || DAY_AR2[selectedDay?.weekday] || "";
              return `${dayName} ${d.getDate()} ${MONTH_AR2[d.getMonth()]}`;
            })()}
          </Text>
        </Pressable>
        <Pressable onPress={() => goToStep(0)} style={[s.summaryPill, { backgroundColor: C.gray }]}>
          <Text style={[s.summaryPillText, { color: C.muted }]}>د. {selectedDoctor?.full_name}</Text>
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>اختر الوقت</Text>

      {errorMsg
        ? <View style={s.errorBox}><Text style={s.errorText}>{errorMsg}</Text></View>
        : loading
          ? <ActivityIndicator color={C.teal} style={{ marginTop: 30 }} />
          : slots.length === 0
            ? <View style={s.emptyBox}><MaterialCommunityIcons name="calendar-remove-outline" size={40} color={C.muted} /><Text style={s.emptyText}>لا توجد مواعيد متاحة</Text></View>
            : <View style={s.slotsGrid}>
                {slots.map((sl, i) => (
                  <TimeSlot
                    key={i}
                    slot={sl}
                    selected={selectedSlot === sl.time}
                    onPress={() => handleSlotSelect(sl)}
                    formatTime={formatTime}
                    t={t}
                  />
                ))}
              </View>
      }
    </View>
  );

  const renderStep3 = () => {
    const date = selectedDay ? getNextDate(selectedDay.weekday) : "";
    const dayLabel = t?.days?.[selectedDay?.weekday] || DAY_AR[selectedDay?.weekday] || "";
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.confirmCard}>
          <Text style={s.confirmTitle}>ملخص الحجز</Text>
          <SummaryRow icon="doctor"          label="الطبيب"  value={`د. ${selectedDoctor?.full_name}`} />
          <SummaryRow icon="calendar-month"  label="اليوم"   value={`${dayLabel} — ${date}`} />
          <SummaryRow icon="clock-outline"   label="الوقت"   value={formatTime(selectedSlot)} />
        </View>

        <Text style={s.inputLabel}>سبب الزيارة *</Text>
        <TextInput
          style={s.reasonInput}
          placeholder="اكتب سبب الزيارة هنا..."
          placeholderTextColor={C.muted}
          value={reason}
          onChangeText={setReason}
          multiline
          textAlign="right"
          textAlignVertical="top"
          color={C.darkText}
          fontSize={14}
        />

        <Pressable
          onPress={confirmBooking}
          disabled={bookingLoading || !reason.trim()}
          style={[s.confirmBtn, (!reason.trim()) && { opacity: 0.5 }]}
        >
          {bookingLoading
            ? <ActivityIndicator color={C.white} />
            : <>
                <MaterialCommunityIcons name="calendar-check" size={20} color={C.white} />
                <Text style={s.confirmBtnText}>{t.appointments.confirmBtn || "تأكيد الحجز"}</Text>
              </>
          }
        </Pressable>
      </KeyboardAvoidingView>
    );
  };

  if (isWakingUp) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.teal} />
      <Text style={s.loadingText}>{t.appointments.systemLoading}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={C.white} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>{t.appointments.title}</Text>
          <Text style={s.headerSub}>{t.appointments.headerSub}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {myAppointments.length > 0 && (
          <View style={s.myApptsSection}>
            <Text style={s.myApptsTitle}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={C.navy} /> مواعيدي
            </Text>
            {myAppointments.map(appt => (
              <View key={appt.appointment_id} style={s.apptCard}>
                <View style={s.apptCardLeft}>
                  <View style={s.apptIconCircle}>
                    <MaterialCommunityIcons name="stethoscope" size={20} color={C.teal} />
                  </View>
                  <Pressable onPress={() => handleCancelAppointment(appt.appointment_id)} style={s.cancelBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.red} />
                  </Pressable>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={s.apptDoc}>د. {appt.doctor?.full_name}</Text>
                  <Text style={s.apptDate}>{appt.appt_date} — {formatTime(appt.appt_time)}</Text>
                  <View style={s.statusChip}>
                    <Text style={s.statusChipText}>مجدول</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <StepIndicator currentStep={step} />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.light },
  center:       { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.light },
  loadingText:  { marginTop: 12, color: C.muted, fontSize: 14 },

  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "ios" ? 58 : 50,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 18, color: C.white, fontWeight: "700", textAlign: "center" },
  headerSub:    { fontSize: 12, color: "rgba(188,239,243,0.85)", marginTop: 2 },

  scroll:       { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.navy, textAlign: "right", marginBottom: 14, marginTop: 4 },

  myApptsSection: { marginBottom: 6 },
  myApptsTitle:   { fontSize: 14, fontWeight: "700", color: C.navy, textAlign: "right", marginBottom: 10 },
  apptCard: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  apptCardLeft: { alignItems: "center", gap: 8 },
  apptIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tealBg, alignItems: "center", justifyContent: "center" },
  cancelBtn:    { width: 34, height: 34, borderRadius: 10, backgroundColor: C.redBg, alignItems: "center", justifyContent: "center" },
  apptDoc:      { fontSize: 14, fontWeight: "700", color: C.navy },
  apptDate:     { fontSize: 12, color: C.muted, marginTop: 3 },
  statusChip:   { marginTop: 6, backgroundColor: C.tealBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusChipText:{ fontSize: 11, color: C.teal, fontWeight: "600" },

  breadRow:     { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  summaryPill:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.tealBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-end", marginBottom: 16 },
  summaryPillText: { fontSize: 13, color: C.navy, fontWeight: "600" },

  slotsGrid:    { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },

  confirmCard:  { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  confirmTitle: { fontSize: 15, fontWeight: "700", color: C.navy, textAlign: "right", marginBottom: 10 },

  inputLabel:   { fontSize: 13, fontWeight: "700", color: C.navy, textAlign: "right", marginBottom: 8 },
  reasonInput:  {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 14,
    minHeight: 100,
    marginBottom: 20,
    fontSize: 14,
    color: C.darkText,
  },
  confirmBtn:   {
    backgroundColor: C.teal,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  confirmBtnText: { color: C.white, fontSize: 16, fontWeight: "700" },

  emptyBox:   { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText:  { color: C.muted, fontSize: 14 },
  errorBox:   { backgroundColor: C.redBg, borderRadius: 12, padding: 16, alignItems: "center" },
  errorText:  { color: C.red, fontSize: 14, textAlign: "center" },
});

export default AppointmentScreen;