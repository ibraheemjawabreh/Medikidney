import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// ترجمة أنواع الأعراض
const symptomTranslations = {
  CHEST_PAIN: "ألم في الصدر",
  LOW_BP: "انخفاض ضغط الدم",
  CRAMPS: "تشنجات",
  NAUSEA: "غثيان",
  HEADACHE: "صداع",
  DIZZINESS: "دوخة",
  VOMITING: "قيء",
  SHORTNESS_OF_BREATH: "ضيق تنفس",
  FATIGUE: "إرهاق",
  ITCHING: "حكة",
};

const severityTranslations = {
  MILD: "خفيف",
  MODERATE: "متوسط",
  SEVERE: "شديد",
};

const weekdayTranslations = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

// حساب اتجاه القيمة
const getTrend = (values) => {
  const validValues = values.filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length < 2) return "neutral";
  const first = validValues[0];
  const last = validValues[validValues.length - 1];
  const diff = last - first;
  const pct = Math.abs(diff / (first || 1)) * 100;
  if (pct < 3) return "stable";
  return diff > 0 ? "increasing" : "decreasing";
};

const TrendIcon = ({ trend, color }) => {
  if (trend === "increasing") return <Icon name="trending-up" type="material" size={20} color={color || "#ef4444"} />;
  if (trend === "decreasing") return <Icon name="trending-down" type="material" size={20} color={color || "#059669"} />;
  return <Icon name="trending-flat" type="material" size={20} color="#64748b" />;
};

const TrendBadge = ({ trend, goodWhenDown = true }) => {
  let label, bg, textColor;
  if (trend === "increasing") {
    label = "متصاعدة";
    bg = goodWhenDown ? "#fee2e2" : "#dcfce7";
    textColor = goodWhenDown ? "#991b1b" : "#166534";
  } else if (trend === "decreasing") {
    label = "متناقصة";
    bg = goodWhenDown ? "#dcfce7" : "#fee2e2";
    textColor = goodWhenDown ? "#166534" : "#991b1b";
  } else {
    label = "مستقرة";
    bg = "#f1f5f9";
    textColor = "#475569";
  }
  return (
    <View style={[styles.trendBadge, { backgroundColor: bg }]}>
      <Text style={[styles.trendBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

// بطاقة إحصائية واحدة
const StatCard = ({ title, icon, iconColor, values, unit, goodWhenDown = true, formatVal }) => {
  const validValues = values.filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));
  const trend = getTrend(validValues.map(Number));
  const avg = validValues.length ? (validValues.map(Number).reduce((a, b) => a + b, 0) / validValues.length).toFixed(1) : "—";
  const min = validValues.length ? Math.min(...validValues.map(Number)).toFixed(1) : "—";
  const max = validValues.length ? Math.max(...validValues.map(Number)).toFixed(1) : "—";
  const last = validValues.length ? validValues[validValues.length - 1] : null;
  const formatFn = formatVal || ((v) => `${Number(v).toFixed(1)} ${unit}`);

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardTitleRow}>
          <Icon name={icon} type="material-community" size={24} color={iconColor} />
          <Text style={styles.statCardTitle}>{title}</Text>
        </View>
        <TrendBadge trend={trend} goodWhenDown={goodWhenDown} />
      </View>

      <View style={styles.statCardBody}>
        <View style={styles.statMetricRow}>
          <View style={styles.statMetric}>
            <Text style={styles.metricLabel}>آخر قراءة</Text>
            <Text style={[styles.metricValue, { color: iconColor }]}>
              {last !== null ? formatFn(last) : "—"}
            </Text>
          </View>
          <View style={styles.statMetric}>
            <Text style={styles.metricLabel}>المتوسط</Text>
            <Text style={styles.metricValue}>{validValues.length ? `${avg} ${unit}` : "—"}</Text>
          </View>
        </View>
        <View style={styles.statMetricRow}>
          <View style={styles.statMetric}>
            <Text style={styles.metricLabel}>الأدنى</Text>
            <Text style={[styles.metricValue, { color: "#059669" }]}>{validValues.length ? `${min} ${unit}` : "—"}</Text>
          </View>
          <View style={styles.statMetric}>
            <Text style={styles.metricLabel}>الأعلى</Text>
            <Text style={[styles.metricValue, { color: "#ef4444" }]}>{validValues.length ? `${max} ${unit}` : "—"}</Text>
          </View>
        </View>
        {/* مؤشر الاتجاه البصري */}
        <View style={styles.sparklineContainer}>
          {validValues.slice(-8).map((v, i) => {
            const numVals = validValues.slice(-8).map(Number);
            const maxV = Math.max(...numVals) || 1;
            const minV = Math.min(...numVals);
            const range = maxV - minV || 1;
            const heightPct = ((Number(v) - minV) / range) * 60 + 10;
            return (
              <View key={i} style={[styles.sparkBar, { height: heightPct, backgroundColor: iconColor + "99" }]} />
            );
          })}
        </View>
        <Text style={styles.sparkLabel}>آخر {Math.min(validValues.length, 8)} جلسات</Text>
      </View>
    </View>
  );
};

// بطاقة الأعراض
const SymptomsCard = ({ allSymptoms }) => {
  if (!allSymptoms || allSymptoms.length === 0) {
    return (
      <View style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <View style={styles.statCardTitleRow}>
            <Icon name="alert-circle-outline" type="material-community" size={24} color="#f59e0b" />
            <Text style={styles.statCardTitle}>الأعراض الشائعة</Text>
          </View>
        </View>
        <View style={styles.emptySmall}>
          <Text style={styles.emptySmallText}>لا توجد أعراض مسجلة</Text>
        </View>
      </View>
    );
  }

  // تجميع الأعراض
  const counts = {};
  allSymptoms.forEach((s) => {
    const key = s.symptom_type;
    counts[key] = (counts[key] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = allSymptoms.length;

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardTitleRow}>
          <Icon name="alert-circle-outline" type="material-community" size={24} color="#f59e0b" />
          <Text style={styles.statCardTitle}>الأعراض الشائعة</Text>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: "#fef3c7" }]}>
          <Text style={[styles.trendBadgeText, { color: "#92400e" }]}>{total} عارض</Text>
        </View>
      </View>
      <View style={styles.statCardBody}>
        {sorted.slice(0, 5).map(([type, count], i) => {
          const pct = (count / total) * 100;
          return (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={styles.symptomName}>{symptomTranslations[type] || type}</Text>
                <Text style={styles.symptomCount}>{count} مرة ({pct.toFixed(0)}%)</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#3b82f6" }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// --- Main Screen ---
const PatientSessionStatistics = ({ route, navigation }) => {
  const { patientId, patientName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [allVitals, setAllVitals] = useState([]);
  const [allSymptoms, setAllSymptoms] = useState([]);
  const [allWeights, setAllWeights] = useState([]);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      // جلب كل الجلسات (هذا الـ endpoint مسموح به)
      const sessionsRes = await api.get(`/dialysis-sessions?patientId=${patientId}`);
      const sessionsList = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      setSessions(sessionsList);

      // استخراج البيانات من قائمة الجلسات مباشرة (بدون endpoints محجوبة)
      const vitalsArr = [];
      const weightsArr = [];

      for (const session of sessionsList) {
        // --- الأوزان ---
        if (session.weight_before !== null && session.weight_before !== undefined) {
          weightsArr.push({ date: session.date, value: session.weight_before, type: "before" });
        }
        if (session.weight_after !== null && session.weight_after !== undefined) {
          weightsArr.push({ date: session.date, value: session.weight_after, type: "after" });
        }

        // --- ضغط الدم: استخراج من النص "120/80" ---
        const parseBP = (bp) => {
          if (!bp || bp === "0/0") return null;
          const parts = bp.split("/");
          if (parts.length === 2) {
            const sys = parseFloat(parts[0]);
            const dia = parseFloat(parts[1]);
            if (!isNaN(sys) && !isNaN(dia) && sys > 0) return { systolic: sys, diastolic: dia };
          }
          return null;
        };

        const bpBefore = parseBP(session.blood_pressure_before);
        const bpAfter = parseBP(session.blood_pressure_after);

        if (bpBefore) vitalsArr.push({ date: session.date, ...bpBefore, type: "before" });
        if (bpAfter) vitalsArr.push({ date: session.date, ...bpAfter, type: "after" });
      }

      // جلب آخر جلسة شاملة لقراءات العلامات الحيوية
      try {
        const lastSessionRes = await api.get(`/dialysis-sessions/patient/${patientId}/last-session`);
        const lastSession = lastSessionRes.data;
        if (lastSession?.vitalSigns && lastSession.vitalSigns.length > 0) {
          lastSession.vitalSigns.forEach((v) => {
            vitalsArr.push({
              date: v.recorded_at,
              systolic: v.systolic,
              diastolic: v.diastolic,
              pulse: v.pulse,
              temperature: v.temperature,
              oxygen_saturation: v.oxygen_saturation,
              type: "last",
            });
          });
        }
        // استخراج الأعراض من آخر جلسة
        if (lastSession?.symptoms?.details && lastSession.symptoms.details.length > 0) {
          setAllSymptoms(lastSession.symptoms.details);
        } else {
          setAllSymptoms([]);
        }
      } catch (_) {
        setAllSymptoms([]);
      }

      setAllVitals(vitalsArr.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setAllWeights(weightsArr.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (e) {
      console.log("Stats error:", e.message);
      Alert.alert("خطأ", "فشل في جلب الإحصائيات");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { fetchStatistics(); }, [fetchStatistics]));

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  // استخراج سلاسل البيانات مرتبة زمنياً
  const systolicValues = allVitals.map((v) => v.systolic).filter(Boolean);
  const diastolicValues = allVitals.map((v) => v.diastolic).filter(Boolean);
  const pulseValues = allVitals.map((v) => v.pulse).filter(Boolean);
  const tempValues = allVitals.map((v) => v.temperature).filter(Boolean);
  const o2Values = allVitals.map((v) => v.oxygen_saturation).filter(Boolean);
  const weightBeforeValues = allWeights.filter((w) => w.type === "before").map((w) => w.value);
  const fluidRemovedValues = sessions.map((s) => s.fluid_removed).filter((v) => v !== null && v !== undefined && v > 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" type="material-community" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>إحصائيات الجلسات</Text>
          <Text style={styles.headerSubtitle}>{patientName || "المريض"}</Text>
        </View>
        <View style={styles.sessionCountBadge}>
          <Text style={styles.sessionCountText}>{sessions.length}</Text>
          <Text style={styles.sessionCountLabel}>جلسة</Text>
        </View>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Icon name="heart-pulse" type="material-community" size={18} color="#ef4444" />
          <Text style={styles.summaryVal}>{allVitals.length}</Text>
          <Text style={styles.summaryLabel}>قراءة حيوية</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="alert-circle" type="material-community" size={18} color="#f59e0b" />
          <Text style={styles.summaryVal}>{allSymptoms.length}</Text>
          <Text style={styles.summaryLabel}>عارض</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="scale" type="material-community" size={18} color="#3b82f6" />
          <Text style={styles.summaryVal}>{weightBeforeValues.length}</Text>
          <Text style={styles.summaryLabel}>قياس وزن</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* تنبيه للأخصائي */}
        <View style={styles.nutritionTip}>
          <Icon name="food-apple" type="material-community" size={20} color="#204a42" />
          <Text style={styles.nutritionTipText}>
            هذه الإحصائيات تساعد أخصائي التغذية في وضع خطة غذائية مناسبة بناءً على مسار قراءات المريض عبر الجلسات.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>العلامات الحيوية</Text>

        {allVitals.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="heart-off-outline" type="material-community" size={50} color="#cbd5e1" />
            <Text style={styles.emptyText}>لا توجد قراءات حيوية مسجلة</Text>
          </View>
        ) : (
          <>
            {/* ضغط الدم الانقباضي */}
            <StatCard
              title="ضغط الدم الانقباضي"
              icon="heart-pulse"
              iconColor="#ef4444"
              values={systolicValues}
              unit="mmHg"
              goodWhenDown={true}
            />
            {/* ضغط الدم الانبساطي */}
            <StatCard
              title="ضغط الدم الانبساطي"
              icon="heart-outline"
              iconColor="#f97316"
              values={diastolicValues}
              unit="mmHg"
              goodWhenDown={true}
            />
            {/* النبض */}
            <StatCard
              title="النبض"
              icon="pulse"
              iconColor="#8b5cf6"
              values={pulseValues}
              unit="bpm"
              goodWhenDown={false}
            />
            {/* درجة الحرارة */}
            <StatCard
              title="درجة الحرارة"
              icon="thermometer"
              iconColor="#f59e0b"
              values={tempValues}
              unit="°C"
              goodWhenDown={false}
            />
            {/* تشبع الأكسجين */}
            {o2Values.filter((v) => v !== null).length > 0 && (
              <StatCard
                title="تشبع الأكسجين"
                icon="lungs"
                iconColor="#3b82f6"
                values={o2Values}
                unit="%"
                goodWhenDown={false}
              />
            )}
          </>
        )}

        <Divider style={{ marginVertical: 20 }} />
        <Text style={styles.sectionTitle}>الوزن والسوائل</Text>

        {weightBeforeValues.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="scale-off" type="material-community" size={50} color="#cbd5e1" />
            <Text style={styles.emptyText}>لا توجد بيانات وزن</Text>
          </View>
        ) : (
          <>
            <StatCard
              title="الوزن قبل الجلسة"
              icon="scale"
              iconColor="#3b82f6"
              values={weightBeforeValues}
              unit="kg"
              goodWhenDown={true}
            />
            {fluidRemovedValues.length > 0 && (
              <StatCard
                title="السوائل المُزالة"
                icon="water-minus"
                iconColor="#06b6d4"
                values={fluidRemovedValues}
                unit="L"
                goodWhenDown={false}
              />
            )}
          </>
        )}

        <Divider style={{ marginVertical: 20 }} />
        <Text style={styles.sectionTitle}>الأعراض</Text>
        <SymptomsCard allSymptoms={allSymptoms} />

        {/* آخر 5 جلسات */}
        <Divider style={{ marginVertical: 20 }} />
        <Text style={styles.sectionTitle}>سجل الجلسات الأخيرة</Text>
        {sessions.slice(0, 5).map((s, i) => (
          <View key={i} style={styles.sessionRow}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.sessionRowDate}>{formatDate(s.date)}</Text>
              <View style={[styles.sessionStatusBadge, {
                backgroundColor: s.status === "COMPLETED" ? "#dcfce7" : s.status === "IN_PROGRESS" ? "#fef3c7" : "#f1f5f9"
              }]}>
                <Text style={[styles.sessionStatusText, {
                  color: s.status === "COMPLETED" ? "#166534" : s.status === "IN_PROGRESS" ? "#92400e" : "#64748b"
                }]}>
                  {s.status === "COMPLETED" ? "مكتملة" : s.status === "IN_PROGRESS" ? "جارية" : s.status}
                </Text>
              </View>
            </View>
            <View style={styles.sessionRowMetrics}>
              {s.blood_pressure_before && (
                <Text style={styles.sessionRowMetric}>
                  <Text style={{ color: "#64748b", fontSize: 11 }}>ضغط: </Text>
                  {s.blood_pressure_before}
                </Text>
              )}
              {s.weight_before !== null && s.weight_before !== undefined && (
                <Text style={styles.sessionRowMetric}>
                  <Text style={{ color: "#64748b", fontSize: 11 }}>وزن: </Text>
                  {s.weight_before}kg
                </Text>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#64748b" },

  header: {
    backgroundColor: "#204a42",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
    elevation: 8,
  },
  backBtn: { padding: 5 },
  headerContent: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerSubtitle: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  sessionCountBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 8, minWidth: 48 },
  sessionCountText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  sessionCountLabel: { color: "#94a3b8", fontSize: 10 },

  summaryBar: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryVal: { fontSize: 20, fontWeight: "900", color: "#1e293b", marginTop: 4 },
  summaryLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#e2e8f0" },

  scrollContent: { paddingHorizontal: 16 },

  nutritionTip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  nutritionTipText: { flex: 1, marginRight: 10, fontSize: 13, color: "#166534", textAlign: "right", lineHeight: 20 },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", textAlign: "right", marginBottom: 14 },

  statCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statCardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  statCardTitleRow: { flexDirection: "row-reverse", alignItems: "center" },
  statCardTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b", marginRight: 8 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  trendBadgeText: { fontSize: 12, fontWeight: "bold" },
  statCardBody: { padding: 14 },
  statMetricRow: { flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 12 },
  statMetric: { alignItems: "center", flex: 1 },
  metricLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "800", color: "#1e293b" },

  sparklineContainer: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "center", height: 70, gap: 4, marginTop: 8, paddingHorizontal: 8 },
  sparkBar: { width: 18, borderRadius: 4 },
  sparkLabel: { textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 6 },

  emptyState: { alignItems: "center", marginVertical: 30 },
  emptyText: { color: "#94a3b8", marginTop: 10, textAlign: "center" },
  emptySmall: { padding: 16, alignItems: "center" },
  emptySmallText: { color: "#94a3b8", fontSize: 13 },

  symptomName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  symptomCount: { fontSize: 12, color: "#64748b" },
  progressBg: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },

  sessionRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    borderRightWidth: 5,
    borderRightColor: "#204a42",
  },
  sessionRowDate: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  sessionStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  sessionStatusText: { fontSize: 11, fontWeight: "bold" },
  sessionRowMetrics: { alignItems: "flex-start" },
  sessionRowMetric: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 3 },
});

export default PatientSessionStatistics;
