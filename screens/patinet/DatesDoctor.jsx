import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "https://medikidneysys.onrender.com";

// ─── Cache: 5 دقائق لقائمة الأطباء ──────────────────────────────────────────
const DOCTORS_CACHE_KEY = "cached_doctors";
const DOCTORS_CACHE_TTL = 5 * 60 * 1000;

const daysTranslation = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

// ─── بطاقة الموعد ──────────────────────────────────────────────────────────
const SlotCard = ({ slot, isSelected, onPress, formatTimeTo12H }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (slot.isBooked) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(slot.time);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        disabled={slot.isBooked}
        style={[
          styles.slotCard,
          isSelected && styles.slotCardSelected,
          slot.isBooked && styles.slotCardBooked,
        ]}
      >
        <View style={[
          styles.slotIndicator,
          isSelected && styles.slotIndicatorSelected,
          slot.isBooked && styles.slotIndicatorBooked,
        ]} />
        <View style={styles.slotContent}>
          <Text style={[
            styles.slotTime,
            isSelected && styles.slotTimeSelected,
            slot.isBooked && styles.slotTimeBooked,
          ]}>
            {formatTimeTo12H(slot.time)}
          </Text>
          <Text style={[
            styles.slotStatus,
            isSelected && { color: "#047857" },
            slot.isBooked && { color: "#94a3b8" },
          ]}>
            {slot.isBooked ? "محجوز" : isSelected ? "تم الاختيار" : "متاح"}
          </Text>
        </View>
        {slot.isBooked ? (
          <View style={styles.bookedBadge}><Text style={styles.bookedBadgeText}>✕</Text></View>
        ) : isSelected ? (
          <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓</Text></View>
        ) : (
          <View style={styles.availableBadge} />
        )}
      </Pressable>
    </Animated.View>
  );
};

// ─── شاشة الإيقاظ ──────────────────────────────────────────────────────────
const WakeupScreen = ({ dots }) => {
  const progress = (dots / 8) * 100;
  return (
    <View style={styles.wakeupContainer}>
      <View style={styles.wakeupCard}>
        <View style={styles.pulseWrapper}>
          <View style={styles.pulseOuter} />
          <View style={styles.pulseInner}>
            <Text style={styles.pulseIcon}>🏥</Text>
          </View>
        </View>
        <Text style={styles.wakeupTitle}>جاري الاتصال بالنظام</Text>
        <Text style={styles.wakeupSub}>
          يستغرق الاتصال الأول بضع ثوانٍ{"\n"}شكراً لصبرك
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.dotsText}>{"● ".repeat(dots).trim()}</Text>
      </View>
    </View>
  );
};

// ─── المكوّن الرئيسي ────────────────────────────────────────────────────────
const DatesDoctor = () => {
  const [selectDoctor, setSelectDoctor] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [allDaySlots, setAllDaySlots] = useState([]);
  const [reason, setReason] = useState("");
  const [isAllowed, setIsAllowed] = useState(true);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [step, setStep] = useState(1);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [wakeupDots, setWakeupDots] = useState(1);

  const userToken = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotsInterval = useRef(null);

  const startDotsAnimation = () => {
    dotsInterval.current = setInterval(() => {
      setWakeupDots((prev) => (prev >= 8 ? 1 : prev + 1));
    }, 400);
  };

  const stopDotsAnimation = () => {
    if (dotsInterval.current) {
      clearInterval(dotsInterval.current);
      dotsInterval.current = null;
    }
  };

  // ── تهيئة البيانات مع Cache + Wakeup ───────────────────────────────────
  const initializeData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("تنبيه", "يرجى تسجيل الدخول مجدداً");
        return;
      }
      userToken.current = token;

      // 1. جرّب Cache أولاً — إظهار فوري بدون انتظار سيرفر
      const cached = await AsyncStorage.getItem(DOCTORS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < DOCTORS_CACHE_TTL && data.length > 0) {
            setDoctorsList(data);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            // جدّد في الخلفية بصمت
            refreshDoctorsInBackground(token);
            return;
          }
        } catch {}
      }

      // 2. لا Cache صالح → شاشة الإيقاظ + طلب السيرفر
      setIsWakingUp(true);
      startDotsAnimation();

      const response = await axios.get(`${API_BASE}/reports/booking-doctors`, {
        params: { search: "" },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
      });

      const doctors = Array.isArray(response.data) ? response.data : [];
      setDoctorsList(doctors);

      await AsyncStorage.setItem(
        DOCTORS_CACHE_KEY,
        JSON.stringify({ data: doctors, timestamp: Date.now() })
      );
    } catch (e) {
      Alert.alert("خطأ في الاتصال", "تأكد من اتصالك بالإنترنت وأعد المحاولة");
    } finally {
      stopDotsAnimation();
      setIsWakingUp(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, []);

  const refreshDoctorsInBackground = async (token) => {
    try {
      const response = await axios.get(`${API_BASE}/reports/booking-doctors`, {
        params: { search: "" },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
      });
      const doctors = Array.isArray(response.data) ? response.data : [];
      if (doctors.length > 0) {
        setDoctorsList(doctors);
        await AsyncStorage.setItem(
          DOCTORS_CACHE_KEY,
          JSON.stringify({ data: doctors, timestamp: Date.now() })
        );
      }
    } catch {}
  };

  useEffect(() => {
    initializeData();
    return () => stopDotsAnimation();
  }, []);

  useEffect(() => {
    if (selectDoctor && userToken.current) {
      fetchDoctorSchedule(selectDoctor);
      setSelectedDay(null);
      setAllDaySlots([]);
      setSelectedSlot(null);
      setStep(2);
    }
  }, [selectDoctor]);

  useEffect(() => {
    if (selectedDay && userToken.current) {
      fetchAvailability();
      setStep(3);
    }
  }, [selectedDay]);

  const fetchDoctorSchedule = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/doctor-schedule`, {
        headers: { Authorization: `Bearer ${userToken.current}` },
        params: { doctorId: Number(id) },
        timeout: 20000,
      });
      setSchedule(response.data);
    } catch (e) {
      Alert.alert("تنبيه", "لا يوجد دوام مسجل لهذا الطبيب");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    setAllDaySlots([]);
    setSelectedSlot(null);
    setRestrictionReason("");
    setIsAllowed(true);

    try {
      const targetDate = getNextDateForDay(selectedDay.weekday);
      const dateStr = formatDate(targetDate);
      const now = new Date();
      const isToday = dateStr === formatDate(now);

      if (isToday && selectedDay.endTime) {
        const [endHour, endMin] = selectedDay.endTime.split(":").map(Number);
        if (now.getHours() > endHour || (now.getHours() === endHour && now.getMinutes() >= endMin)) {
          setIsAllowed(false);
          setRestrictionReason("انتهى وقت دوام الطبيب لهذا اليوم.");
          return;
        }
      }

      setLoading(true);
      const response = await axios.get(`${API_BASE}/clinic-consultations/availability`, {
        params: { doctorId: Number(selectDoctor), date: dateStr },
        headers: { Authorization: `Bearer ${userToken.current}` },
        timeout: 20000,
      });

      const {
        availableSlots = [],
        bookedSlots = [],
        bookingAllowed,
        bookingRestrictionReason,
      } = response.data;

      const combined = [
        ...availableSlots.map((t) => ({ time: t, isBooked: false })),
        ...bookedSlots.map((t) => ({ time: t, isBooked: true })),
      ].sort((a, b) => a.time.localeCompare(b.time));

      setAllDaySlots(combined);
      setIsAllowed(bookingAllowed);
      setRestrictionReason(bookingRestrictionReason || "");

      if (combined.length === 0 && !bookingRestrictionReason) {
        setRestrictionReason("لا توجد مواعيد متاحة حالياً.");
        setIsAllowed(false);
      }
    } catch (e) {
      setRestrictionReason("حدث خطأ أثناء جلب المواعيد، حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalBook = async () => {
    if (!reason.trim()) { Alert.alert("تنبيه", "يرجى كتابة سبب الزيارة"); return; }
    if (!isAllowed) { Alert.alert("غير مسموح", restrictionReason); return; }

    try {
      setBookingLoading(true);
      const targetDate = getNextDateForDay(selectedDay.weekday);
      const dateStr = formatDate(targetDate);
      const timeStr = `${dateStr}T${selectedSlot}`;

      await axios.post(
        `${API_BASE}/clinic-consultations/book`,
        {
          doctorId: Number(selectDoctor),
          apptDate: dateStr,
          apptTime: timeStr,
          visitReason: reason,
          notes: "تم الحجز من تطبيق الموبايل",
        },
        { headers: { Authorization: `Bearer ${userToken.current}` }, timeout: 20000 }
      );

      Alert.alert("تم بنجاح! ✅", "تم تأكيد حجز موعدك", [{
        text: "حسناً",
        onPress: () => { setSelectedSlot(null); setReason(""); setStep(3); fetchAvailability(); },
      }]);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل الحجز";
      Alert.alert("خطأ", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatTimeTo12H = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    const suffix = hh >= 12 ? "م" : "ص";
    hh = hh % 12 || 12;
    return `${hh.toString().padStart(2, "0")}:${m} ${suffix}`;
  };

  const getNextDateForDay = (dayName) => {
    const daysOrder = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const targetIdx = daysOrder.indexOf(dayName.toUpperCase());
    const now = new Date();
    const dist = (targetIdx + 7 - now.getDay()) % 7;
    const result = new Date(now);
    result.setDate(now.getDate() + dist);
    return result;
  };

  const selectedDoctorName = doctorsList.find(
    (d) => d.doctor_id.toString() === selectDoctor
  )?.full_name;

  const availableCount = allDaySlots.filter((s) => !s.isBooked).length;
  const bookedCount = allDaySlots.filter((s) => s.isBooked).length;

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= s && { color: "#fff" }]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  // ─── شاشة الإيقاظ ────────────────────────────────────────────────────────
  if (isWakingUp) return <WakeupScreen dots={wakeupDots} />;

  // ─── الشاشة الرئيسية ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>حجز موعد طبي</Text>
        <Text style={styles.headerSub}>اختر طبيبك والوقت المناسب لك</Text>
        <StepIndicator />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── خطوة 1 ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>1</Text>
              <Text style={styles.sectionTitle}>اختر الطبيب</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectDoctor}
                  onValueChange={(v) => setSelectDoctor(v)}
                  dropdownIconColor="#059669"
                  style={styles.picker}
                >
                  <Picker.Item label="اختر طبيباً..." value="" color="#94a3b8" />
                  {doctorsList.map((d) => (
                    <Picker.Item
                      key={d.doctor_id}
                      label={`د. ${d.full_name}`}
                      value={d.doctor_id.toString()}
                      color="#0f172a"
                    />
                  ))}
                </Picker>
              </View>

              {selectedDoctorName && (
                <View style={styles.selectedDoctorBanner}>
                  <Text style={styles.selectedDoctorIcon}>👨‍⚕️</Text>
                  <Text style={styles.selectedDoctorName}>د. {selectedDoctorName}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>سبب الزيارة</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="مثلاً: مراجعة دورية، فحص تحاليل..."
                placeholderTextColor="#94a3b8"
                value={reason}
                onChangeText={setReason}
                multiline
                textAlign="right"
              />
            </View>
          </View>

          {/* ── خطوة 2 ── */}
          {schedule.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionBadge}>2</Text>
                <Text style={styles.sectionTitle}>اختر يوم الدوام</Text>
              </View>
              {loading && !selectedDay ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#059669" />
                  <Text style={styles.loadingText}>جاري جلب الجدول...</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
                  {[...schedule].reverse().map((item, i) => {
                    const isSelected = selectedDay?.schedule_id === item.schedule_id;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setSelectedDay(item)}
                        style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                      >
                        <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                          {daysTranslation[item.weekday] || item.weekday}
                        </Text>
                        {item.startTime && (
                          <Text style={[styles.dayTime, isSelected && { color: "#a7f3d0" }]}>
                            {formatTimeTo12H(item.startTime)}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── خطوة 3 ── */}
          {selectedDay && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionBadge}>3</Text>
                <Text style={styles.sectionTitle}>اختر الموعد</Text>
              </View>

              {allDaySlots.length > 0 && !loading && (
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statNum}>{availableCount}</Text>
                    <Text style={styles.statLabel}>متاح</Text>
                  </View>
                  <View style={[styles.statChip, { backgroundColor: "#fef2f2" }]}>
                    <Text style={[styles.statNum, { color: "#ef4444" }]}>{bookedCount}</Text>
                    <Text style={[styles.statLabel, { color: "#ef4444" }]}>محجوز</Text>
                  </View>
                </View>
              )}

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#059669" size="large" />
                  <Text style={styles.loadingText}>جاري جلب المواعيد...</Text>
                </View>
              ) : restrictionReason && allDaySlots.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🚫</Text>
                  <Text style={styles.emptyText}>{restrictionReason}</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {allDaySlots.map((slot, i) => (
                    <SlotCard
                      key={i}
                      slot={slot}
                      isSelected={selectedSlot === slot.time}
                      onPress={setSelectedSlot}
                      formatTimeTo12H={formatTimeTo12H}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── الفوتر ── */}
      {selectedSlot && (
        <View style={styles.footer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>الطبيب</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>د. {selectedDoctorName}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>اليوم</Text>
              <Text style={styles.summaryValue}>{daysTranslation[selectedDay?.weekday]}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>الوقت</Text>
              <Text style={styles.summaryValue}>{formatTimeTo12H(selectedSlot)}</Text>
            </View>
          </View>

          {!isAllowed && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ {restrictionReason}</Text>
            </View>
          )}

          <Pressable
            onPress={handleFinalBook}
            disabled={bookingLoading || !isAllowed}
            style={[styles.confirmBtn, (bookingLoading || !isAllowed) && styles.confirmBtnDisabled]}
          >
            {bookingLoading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.confirmBtnText}>جاري الحجز...</Text>
              </View>
            ) : (
              <Text style={styles.confirmBtnText}>تأكيد الحجز</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default DatesDoctor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },

  // شاشة الإيقاظ
  wakeupContainer: {
    flex: 1, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  wakeupCard: {
    backgroundColor: "#fff", borderRadius: 28, padding: 32,
    alignItems: "center", width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  pulseWrapper: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pulseOuter: {
    position: "absolute", width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#d1fae5", opacity: 0.6,
  },
  pulseInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#059669", alignItems: "center", justifyContent: "center",
  },
  pulseIcon: { fontSize: 28 },
  wakeupTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 8, textAlign: "center" },
  wakeupSub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  progressBar: {
    width: "100%", height: 6, backgroundColor: "#e2e8f0",
    borderRadius: 3, overflow: "hidden", marginBottom: 12,
  },
  progressFill: { height: "100%", backgroundColor: "#059669", borderRadius: 3 },
  dotsText: { color: "#059669", fontSize: 12, letterSpacing: 4 },

  // الهيدر
  header: {
    backgroundColor: "#065f46",
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center" },
  headerSub: { fontSize: 13, color: "#a7f3d0", textAlign: "center", marginTop: 4, marginBottom: 20 },

  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#ffffff30", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#ffffff50",
  },
  stepDotActive: { backgroundColor: "#10b981", borderColor: "#10b981" },
  stepNum: { fontSize: 12, fontWeight: "700", color: "#ffffff80" },
  stepLine: { width: 50, height: 2, backgroundColor: "#ffffff30", marginHorizontal: 4 },
  stepLineActive: { backgroundColor: "#10b981" },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 12 },
  sectionBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#059669", color: "#fff",
    textAlign: "center", lineHeight: 26, fontSize: 13, fontWeight: "700", marginLeft: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  pickerWrapper: {
    backgroundColor: "#f8fafc", borderRadius: 14,
    borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 12,
  },
  picker: { height: 52 },

  selectedDoctorBanner: {
    flexDirection: "row-reverse", alignItems: "center",
    backgroundColor: "#f0fdf4", borderRadius: 12,
    padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  selectedDoctorIcon: { fontSize: 20, marginLeft: 8 },
  selectedDoctorName: { fontSize: 15, fontWeight: "700", color: "#065f46" },

  inputLabel: { textAlign: "right", fontSize: 13, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  reasonInput: {
    backgroundColor: "#f8fafc", borderRadius: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
    padding: 12, fontSize: 14, color: "#0f172a",
    minHeight: 60, textAlignVertical: "top",
  },

  daysRow: { flexDirection: "row-reverse", paddingVertical: 4, paddingHorizontal: 4 },
  dayCard: {
    backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 20, marginLeft: 10,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", minWidth: 80,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  dayCardSelected: { backgroundColor: "#059669", borderColor: "#059669", elevation: 5 },
  dayName: { fontSize: 14, fontWeight: "700", color: "#334155" },
  dayNameSelected: { color: "#fff" },
  dayTime: { fontSize: 11, color: "#94a3b8", marginTop: 4 },

  statsRow: { flexDirection: "row-reverse", marginBottom: 12, gap: 10 },
  statChip: {
    backgroundColor: "#f0fdf4", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: "row-reverse", alignItems: "center", gap: 6,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: "#059669" },
  statLabel: { fontSize: 12, color: "#059669", fontWeight: "600" },

  slotsGrid: { gap: 8 },
  slotCard: {
    flexDirection: "row-reverse", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  slotCardSelected: { borderColor: "#059669", backgroundColor: "#f0fdf4", elevation: 3 },
  slotCardBooked: { backgroundColor: "#f8fafc", borderColor: "#f1f5f9", opacity: 0.7 },
  slotIndicator: { width: 4, height: 36, borderRadius: 2, backgroundColor: "#e2e8f0", marginLeft: 12 },
  slotIndicatorSelected: { backgroundColor: "#059669" },
  slotIndicatorBooked: { backgroundColor: "#cbd5e1" },
  slotContent: { flex: 1, alignItems: "flex-end" },
  slotTime: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  slotTimeSelected: { color: "#065f46" },
  slotTimeBooked: { color: "#94a3b8" },
  slotStatus: { fontSize: 12, color: "#94a3b8", marginTop: 2, fontWeight: "500" },

  selectedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#059669", alignItems: "center", justifyContent: "center",
  },
  selectedBadgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  bookedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
  },
  bookedBadgeText: { color: "#94a3b8", fontWeight: "800", fontSize: 13 },
  availableBadge: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#e2e8f0" },

  loadingBox: { alignItems: "center", padding: 40, gap: 12 },
  loadingText: { color: "#94a3b8", fontSize: 14 },
  emptyBox: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: "#94a3b8", fontSize: 14, textAlign: "center" },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
  },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  summaryDivider: { width: 1, backgroundColor: "#f1f5f9", marginHorizontal: 8 },

  warningBox: { backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, marginBottom: 10 },
  warningText: { color: "#ef4444", fontSize: 12, textAlign: "center", fontWeight: "500" },

  confirmBtn: {
    backgroundColor: "#059669", borderRadius: 16, height: 54,
    alignItems: "center", justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#94a3b8" },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnInner: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
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

