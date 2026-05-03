// screens/patinet/patientInformation.jsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import { useLanguage } from '../../context/LanguageContext';

// تفعيل LayoutAnimation على Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── مكوّن سطر معلومة واحدة ──────────────────────────────────────────────────
const InfoRow = ({ label, value, icon, color = "#059669", isLast = false }) => (
  <View>
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: color + "18" }]}>
        <Icon name={icon} type="material-community" size={19} color={color} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={3}>
          {value || (label === "العمر" ? "" : "غير محدد")}
        </Text>
      </View>
    </View>
    {!isLast && <Divider style={styles.rowDivider} />}
  </View>
);

// ─── مكوّن بطاقة قسم قابلة للطي ──────────────────────────────────────────────
const SectionCard = ({ title, icon, accentColor = "#204a42", children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={[styles.sectionHeader, { borderLeftColor: accentColor }]}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconBox, { backgroundColor: accentColor + "18" }]}>
            <Icon name={icon} type="material-community" size={20} color={accentColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: accentColor }]}>{title}</Text>
        </View>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          type="material-community"
          size={22}
          color={accentColor}
        />
      </TouchableOpacity>

      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

// ─── شريط حالة (بادج) ─────────────────────────────────────────────────────────
const StatusBadge = ({ value, trueLabel, falseLabel, trueColor, falseColor }) => {
  const isTrue = value === true || value === "true";
  return (
    <View style={[styles.badge, { backgroundColor: (isTrue ? trueColor : falseColor) + "22" }]}>
      <Text style={[styles.badgeText, { color: isTrue ? trueColor : falseColor }]}>
        {isTrue ? trueLabel : falseLabel}
      </Text>
    </View>
  );
};

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────
const PatinetInfo = ({ route, navigation }) => {
  const { t } = useLanguage();
  const { patientId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.88],
    extrapolate: "clamp",
  });

  const formatDate = (date) => {
    if (!date) return t.unknown;
    return new Date(date).toLocaleDateString(t.vitalSigns.now === 'الآن' ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const calcAge = (birth) => {
    if (!birth) return null;
    const diff = Date.now() - new Date(birth).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        // إذا patientId موجود (عرض موظف) — جيب بيانات مريض محدد بالـ ID
        // إذا لا (عرض المريض لنفسه) — جيب بيانات المريض الحالي
        const endpoint = patientId
          ? `/users/profile/patients/${patientId}`
          : `/users/profile`;

        const { data } = await api.get(endpoint);
        // PatientProfile يرجع { patient: {...} }, StaffView يرجع البيانات مباشرة
        setPatient(patientId ? data : data.patient);
      } catch (err) {
        console.log("Fetch error:", err.message);
        Alert.alert(t.error, t.patientInfo.fetchError);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [patientId]);

  // ── شاشة التحميل ──
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <StatusBar barStyle="light-content" backgroundColor="#204a42" />
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t.patientInfo.loading}</Text>
      </View>
    );
  }

  if (!patient) return null;

  const age = calcAge(patient.date_of_birth || patient.birth_date);
  const isSmoker = patient.smoking_status === true || patient.smoking_status === "true";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

      {/* ── الهيدر ── */}
      <Animated.View style={[styles.header, { transform: [{ scaleY: headerHeight }] }]}>
        {/* زر رجوع */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-right" type="material-community" size={26} color="#fff" />
        </TouchableOpacity>

        {/* عنوان الصفحة */}
        <Text style={styles.headerPageTitle}>{t.patientInfo.title}</Text>

        {/* الأفاتار + الاسم */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Icon name="account" type="material-community" size={52} color="#cbd5e1" />
            </View>
            {/* شارة فصيلة الدم */}
            {patient.blood_type && (
              <View style={styles.bloodBadge}>
                <Icon name="water-plus" type="material-community" size={10} color="#fff" />
                <Text style={styles.bloodBadgeText}>{patient.blood_type}</Text>
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.headerName}>{patient.full_name}</Text>
            <Text style={styles.headerSub}>
              {patient.gender === "Male" ? t.patientInfo.genderMale : t.patientInfo.genderFemale}
              {age ? `  ·  ${t.patientInfo.age.replace('{n}', age)}` : ""}
            </Text>
          </View>
        </View>

        {/* شريط إحصائيات سريعة */}
        <View style={styles.quickStats}>
          <View style={styles.qStat}>
            <Text style={styles.qStatVal}>#{patient.patient_id}</Text>
            <Text style={styles.qStatLabel}>{t.patientInfo.patientId}</Text>
          </View>
          <View style={styles.qDivider} />
          <View style={styles.qStat}>
            <Text style={styles.qStatVal}>{patient.blood_type || "—"}</Text>
            <Text style={styles.qStatLabel}>{t.patientInfo.bloodType}</Text>
          </View>
          <View style={styles.qDivider} />
          <View style={styles.qStat}>
            <Text style={styles.qStatVal} numberOfLines={1}>{patient.national_id || "—"}</Text>
            <Text style={styles.qStatLabel}>{t.patientInfo.nationalId}</Text>
          </View>
        </View>
      </Animated.View>



      {/* ── المحتوى ── */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── البيانات الشخصية ── */}
        <SectionCard title={t.patientInfo.personalData} icon="account-details-outline" accentColor="#204a42" defaultOpen={true}>
          <InfoRow label={t.patientInfo.fullName} value={patient.full_name} icon="account" color="#204a42" />
          <InfoRow label={t.patientInfo.nationalId} value={patient.national_id} icon="card-account-details-outline" color="#3b82f6" />
          <InfoRow
            label={t.patientInfo.dob}
            value={formatDate(patient.date_of_birth || patient.birth_date)}
            icon="calendar-range"
            color="#f59e0b"
          />
          <InfoRow
            label={t.patientInfo.ageLabel}
            value={age ? t.patientInfo.age.replace('{n}', age) : null}
            icon="account-clock-outline"
            color="#8b5cf6"
          />
          <InfoRow
            label={t.patientInfo.gender}
            value={patient.gender === "Male" ? t.patientInfo.genderMale : t.patientInfo.genderFemale}
            icon="gender-male-female"
            color="#8b5cf6"
          />
          <InfoRow label={t.patientInfo.address} value={patient.address} icon="map-marker-outline" color="#059669" isLast />
        </SectionCard>

        {/* ── معلومات التواصل ── */}
        <SectionCard title={t.patientInfo.contactInfo} icon="phone-outline" accentColor="#0369a1" defaultOpen={true}>
          <InfoRow label={t.patientInfo.phone} value={patient.phone_number || patient.phone} icon="phone" color="#0369a1" />
          <InfoRow label={t.patientInfo.emergencyPhone} value={patient.emergency_contact} icon="phone-alert" color="#ef4444" />
          <InfoRow label={t.patientInfo.email} value={patient.email} icon="email-outline" color="#6366f1" isLast />
        </SectionCard>

        {/* ── التاريخ الطبي ── */}
        <SectionCard title={t.patientInfo.medicalHistory} icon="medical-bag" accentColor="#dc2626" defaultOpen={true}>
          <InfoRow label={t.patientInfo.bloodType} value={patient.blood_type} icon="water-plus" color="#ef4444" />
          <InfoRow label={t.patientInfo.chronicDiseases} value={patient.chronic_diseases} icon="heart-pulse" color="#f59e0b" />
          <InfoRow label={t.patientInfo.allergies} value={patient.allergies} icon="allergy" color="#f59e0b" />
          <InfoRow label={t.patientInfo.medicalNotes} value={patient.medical_history_notes} icon="file-document-outline" color="#64748b" />
          <InfoRow label={t.patientInfo.generalNotes} value={patient.notes} icon="note-text-outline" color="#64748b" />

          {/* حالة التدخين — تُعرض كبادج */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: (isSmoker ? "#ef4444" : "#059669") + "18" }]}>
              <Icon name="smoking" type="material-community" size={19} color={isSmoker ? "#ef4444" : "#059669"} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{t.patientInfo.smokingStatus}</Text>
              <StatusBadge
                value={patient.smoking_status}
                trueLabel={t.patientInfo.smoker}
                falseLabel={t.patientInfo.nonSmoker}
                trueColor="#ef4444"
                falseColor="#059669"
              />
            </View>
          </View>
        </SectionCard>

        <View style={{ height: 30 }} />
      </Animated.ScrollView>
    </View>
  );
};

export default PatinetInfo;

// ─── الستايلات ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, backgroundColor: "#f1f5f9" },
  loadingText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

  // ── الهيدر ──
  header: {
    backgroundColor: "#204a42",
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    elevation: 12,
    transformOrigin: "top",
  },
  headerPageTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 52,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 7,
    borderRadius: 14,
    zIndex: 10,
  },

  // الأفاتار
  avatarSection: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 20 },
  avatarWrap: { position: "relative", marginLeft: 16 },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#059669",
  },
  bloodBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#204a42",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  bloodBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  nameSection: { flex: 1, alignItems: "flex-end" },
  headerName: { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "right" },
  headerSub: { color: "#a7f3d0", fontSize: 13, marginTop: 4, textAlign: "right" },

  // إحصائيات
  quickStats: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  qStat: { alignItems: "center", flex: 1 },
  qStatVal: { color: "#fff", fontSize: 13, fontWeight: "800", marginBottom: 3, textAlign: "center" },
  qStatLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  qDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },



  // ── المحتوى ──
  scrollContent: { padding: 16, paddingBottom: 40 },

  // بطاقة قسم
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionHeaderLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  sectionBody: { paddingHorizontal: 16, paddingVertical: 12 },

  // سطر معلومة
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "700", textAlign: "right", marginBottom: 2 },
  infoValue: { fontSize: 15, color: "#1e293b", fontWeight: "700", textAlign: "right", lineHeight: 20 },
  rowDivider: { marginVertical: 2, backgroundColor: "#f8fafc", marginHorizontal: -4 },

  // بادج
  badge: { alignSelf: "flex-end", marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 13, fontWeight: "800" },
});