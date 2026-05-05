import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";
import { useLanguage } from '../../context/LanguageContext';

// Removed hardcoded translations, now using useLanguage()

const severityColors = {
  LOW: { bg: "#dcfce7", text: "#166534" },
  MEDIUM: { bg: "#fef3c7", text: "#92400e" },
  HIGH: { bg: "#fee2e2", text: "#991b1b" },
};

// ── Helper Components ─────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, color = "#204a42" }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconCircle, { backgroundColor: color + "18" }]}>
      <Icon name={icon} type="material-community" size={22} color={color} />
    </View>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
  </View>
);

const InfoRow = ({ label, value, highlight = false }) => (
  <View style={[styles.infoRow, highlight && styles.infoRowHighlight]}>
    <Text style={styles.infoValue}>{value ?? "—"}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const MetricChip = ({ label, value, icon, color }) => (
  <View style={[styles.metricChip, { borderColor: color + "40" }]}>
    <Icon name={icon} type="material-community" size={18} color={color} />
    <Text style={[styles.metricChipValue, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.metricChipLabel}>{label}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const PatientSessionDetailView = ({ route, navigation }) => {
  const { t } = useLanguage();
  const { sessionId, patientId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ── Strategy: always try the comprehensive last-session endpoint first.
      // If session_id matches → use it (has everything).
      // Otherwise → make parallel calls to all sub-endpoints.
      let sessionData = null;
      let vitalSignsData = [];
      let dialysisSettingsData = [];
      let symptomsData = { total: 0, breakdown: {}, details: [] };
      let patientData = null;
      let nurseData = null;
      let scheduleData = null;

      // 1. Try comprehensive last-session endpoint
      try {
        const lastRes = await api.get(`/dialysis-sessions/patient/${patientId}/last-session`);
        if (lastRes.data?.session?.session_id === sessionId) {
          // Perfect match — use all data from the comprehensive endpoint
          const d = lastRes.data;
          setData({
            session: d.session,
            patient: d.patient,
            nurse: d.nurse,
            schedule: d.schedule,
            vitalSigns: d.vitalSigns || [],
            medications: d.medications || [],
            dialysisSettings: d.dialysisSettings || [],
            symptoms: d.symptoms || { total: 0, breakdown: {}, details: [] },
          });
          return;
        }
      } catch (_) {
        // last-session failed or mismatched — fall through to parallel fetches
      }

      // 2. Fetch all data in parallel from individual endpoints
      const [
        basicRes,
        vitalsRes,
        settingsRes,
        symptomsRes,
        medicationsRes,
      ] = await Promise.allSettled([
        api.get(`/dialysis-sessions/${sessionId}`),
        api.get(`/dialysis-sessions/${sessionId}/details/vital-signs`),
        api.get(`/dialysis-sessions/${sessionId}/details/dialysis-settings/latest`),
        api.get(`/dialysis-sessions/${sessionId}/details/symptoms`),
        api.get(`/dialysis-sessions/${sessionId}/details/medications`).catch(() => ({ data: [] })),
      ]);

      // Basic session info
      if (basicRes.status === "fulfilled") {
        const s = basicRes.value.data;
        sessionData = s;
        patientData = s.patient || null;
        nurseData = s.nurse || null;
        scheduleData = s.schedule || null;
      } else {
        throw new Error(t.patientSessionDetail.fetchError);
      }

      // Vital signs
      if (vitalsRes.status === "fulfilled") {
        const d = vitalsRes.value.data;
        vitalSignsData = Array.isArray(d) ? d : d?.data || [];
      }

      // Dialysis settings — handle both array response and single-object (latest)
      if (settingsRes.status === "fulfilled") {
        const d = settingsRes.value.data;
        const obj = d?.data || d;
        if (Array.isArray(obj)) {
          dialysisSettingsData = obj;
        } else if (obj && typeof obj === "object" && (obj.blood_flow_rate != null || obj.bloodFlowRate != null)) {
          // Normalize snake_case / camelCase from "latest" endpoint
          dialysisSettingsData = [{
            setting_id: obj.setting_id || obj.id || obj.settingId,
            session_id: sessionId,
            recorded_at: obj.recorded_at || obj.recordedAt || obj.createdAt,
            blood_flow_rate: obj.blood_flow_rate ?? obj.bloodFlowRate,
            dialysate_flow: obj.dialysate_flow ?? obj.dialysateFlow,
            ultrafiltration_rate: obj.ultrafiltration_rate ?? obj.ultrafiltrationRate,
            nurse: obj.nurse || null,
          }];
        }
      }

      // Symptoms
      if (symptomsRes.status === "fulfilled") {
        const d = symptomsRes.value.data;
        const list = Array.isArray(d) ? d : d?.data || [];
        // Build breakdown
        const breakdown = {};
        list.forEach((s) => {
          const t = s.symptomType || s.symptom_type;
          const sev = s.severity;
          if (!breakdown[t]) breakdown[t] = {};
          breakdown[t][sev] = (breakdown[t][sev] || 0) + 1;
        });
        symptomsData = {
          total: list.length,
          breakdown,
          details: list.map((s) => ({
            symptom_id: s.symptom_id || s.id,
            symptom_type: s.symptomType || s.symptom_type,
            severity: s.severity,
            occurred_at: s.occurred_at || s.occurredAt || s.createdAt,
            notes: s.notes,
          })),
        };
      }

      // Medications (optional fallback)
      let medicationsResult = [];
      if (medicationsRes.status === "fulfilled") {
        const d = medicationsRes.value.data;
        medicationsResult = Array.isArray(d) ? d : d?.data || [];
      }

      setData({
        session: sessionData,
        patient: patientData,
        nurse: nurseData,
        schedule: scheduleData,
        vitalSigns: vitalSignsData,
        medications: medicationsResult,
        dialysisSettings: dialysisSettingsData,
        symptoms: symptomsData,
      });
    } catch (e) {
      console.log("Session detail error:", e.message);
      setError(t.patientSessionDetail.fetchError);
    } finally {
      setLoading(false);
    }
  }, [sessionId, patientId]);

  useFocusEffect(useCallback(() => { fetchSession(); }, [fetchSession]));

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(t.cancel === 'إلغاء' ? "ar-EG" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    let dateObj = new Date(timeStr);
    if (isNaN(dateObj.getTime())) {
      let [h, m] = timeStr.split(":");
      let hh = parseInt(h);
      const isArabic = t.cancel === 'إلغاء';
      const ampm = hh >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
      return `${hh % 12 || 12}:${m} ${ampm}`;
    }
    return dateObj.toLocaleTimeString(t.cancel === 'إلغاء' ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#204a42" />
        <Text style={styles.loadingText}>{t.patientSessionDetail.loading}</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" type="material-community" size={60} color="#ef4444" />
        <Text style={styles.errorText}>{error || t.patientSessionDetail.noData}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSession}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>{t.patientSessionDetail.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { session, patient, nurse, schedule, vitalSigns, medications, dialysisSettings, symptoms } = data;

  const statusConfig = {
    COMPLETED: { label: t.patientProfile.status.completed, bg: "#dcfce7", text: "#166534", icon: "check-circle" },
    IN_PROGRESS: { label: t.patientProfile.status.pending, bg: "#fef3c7", text: "#92400e", icon: "clock-outline" },
    SCHEDULED: { label: t.patientProfile.status.scheduled || "مجدولة", bg: "#dbeafe", text: "#1e40af", icon: "calendar-clock" },
  };
  const statusStyle = statusConfig[session?.status] || { label: session?.status, bg: "#f1f5f9", text: "#64748b", icon: "help-circle-outline" };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" type="material-community" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.patientSessionDetail.title}</Text>
          <Text style={styles.headerSub}>#{session?.session_id}</Text>
        </View>
        <View style={[styles.statusBadgeHeader, { backgroundColor: statusStyle.bg }]}>
          <Icon name={statusStyle.icon} type="material-community" size={14} color={statusStyle.text} />
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Patient & Nurse Info ── */}
        <View style={styles.card}>
          <SectionHeader icon="account-circle-outline" title={t.patientSessionDetail.patientNurseInfo} color="#204a42" />
          <View style={styles.personRow}>
            <View style={styles.personBox}>
              <View style={[styles.personAvatar, { backgroundColor: "#204a4218" }]}>
                <Icon name="account" type="material-community" size={28} color="#204a42" />
              </View>
              <Text style={styles.personRole}>{t.patientSessionDetail.patient}</Text>
              <Text style={styles.personName}>{patient?.full_name || "—"}</Text>
              {patient?.blood_type && (
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodText}>{patient.blood_type}</Text>
                </View>
              )}
            </View>
            <View style={styles.personDivider} />
            <View style={styles.personBox}>
              <View style={[styles.personAvatar, { backgroundColor: "#05966918" }]}>
                <Icon name="stethoscope" type="material-community" size={28} color="#059669" />
              </View>
              <Text style={styles.personRole}>{t.patientSessionDetail.nurse}</Text>
              <Text style={styles.personName}>{nurse?.full_name || "—"}</Text>
            </View>
          </View>
          {patient?.allergies && (
            <View style={styles.allergyRow}>
              <Icon name="alert-rhombus-outline" type="material-community" size={16} color="#dc2626" />
              <Text style={styles.allergyText}>{t.patientSessionDetail.allergy} {patient.allergies}</Text>
            </View>
          )}
        </View>

        {/* ── Session Overview ── */}
        <View style={styles.card}>
          <SectionHeader icon="calendar-clock" title={t.patientSessionDetail.sessionInfo} color="#3b82f6" />
          <InfoRow label={t.patientSessionDetail.date} value={formatDate(session?.date)} />
          <Divider style={styles.rowDivider} />
          <View style={styles.twoCol}>
            <InfoRow label={t.patientSessionDetail.startTime} value={formatTime(session?.start_time)} />
            <InfoRow
              label={t.patientSessionDetail.endTime}
              value={formatTime(session?.end_time || (session?.status === 'COMPLETED' ? session?.updated_at : null))}
            />
          </View>
          <Divider style={styles.rowDivider} />
          {schedule && (
            <>
              <View style={styles.twoCol}>
                <InfoRow label={t.patientSessionDetail.day} value={t.days[schedule.weekday] || schedule.weekday} />
                <InfoRow label={t.patientSessionDetail.shiftNumber} value={`${t.patientSessionDetail.shiftPrefix} ${schedule.shift_number}`} />
              </View>
              <Divider style={styles.rowDivider} />
              <InfoRow label={t.patientSessionDetail.machineNumber} value={`${t.patientSessionDetail.machinePrefix}${schedule.machine_number}`} />
              <Divider style={styles.rowDivider} />
            </>
          )}

          {/* ── الوزن قبل وبعد الجلسة ── */}
          {(session?.weight_before != null || session?.weight_after != null) && (
            <>
              <View style={styles.weightRow}>
                <View style={styles.weightBox}>
                  <View style={[styles.weightIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <Icon name="scale" type="material-community" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.weightLabel}>{t.patientSessionDetail.weightBefore}</Text>
                  <Text style={[styles.weightValue, { color: '#3b82f6' }]}>
                    {session?.weight_before != null ? `${session.weight_before} kg` : '—'}
                  </Text>
                </View>

                <View style={styles.weightArrow}>
                  <Icon name="arrow-left" type="material-community" size={20} color="#94a3b8" />
                </View>

                <View style={styles.weightBox}>
                  <View style={[styles.weightIconCircle, { backgroundColor: '#f0fdf4' }]}>
                    <Icon name="scale" type="material-community" size={20} color="#059669" />
                  </View>
                  <Text style={styles.weightLabel}>{t.patientSessionDetail.weightAfter}</Text>
                  <Text style={[styles.weightValue, { color: '#059669' }]}>
                    {session?.weight_after != null ? `${session.weight_after} kg` : '—'}
                  </Text>
                </View>
              </View>

              {/* كمية السوائل المزالة - تظهر دائماً إذا توفرت قيمة */}
              {(() => {
                // 1. الأولوية: ultrafiltration_rate من إعدادات الجهاز (ما أدخله الممرض)
                const lastSetting = dialysisSettings && dialysisSettings.length > 0
                  ? dialysisSettings[dialysisSettings.length - 1]
                  : null;
                const ufRaw = parseFloat(lastSetting?.ultrafiltration_rate ?? lastSetting?.ultrafiltrationRate);
                const hasUF = !isNaN(ufRaw) && ufRaw > 0;
                const ufLiters = hasUF
                  ? (ufRaw > 50 ? (ufRaw / 1000).toFixed(2) : ufRaw.toFixed(2))
                  : null;

                // 2. احتياطي: الفرق بين الوزن قبل وبعد
                const weightDiff = (session?.weight_before != null && session?.weight_after != null)
                  ? Math.abs(session.weight_before - session.weight_after).toFixed(1)
                  : null;

                const displayValue = ufLiters ?? weightDiff;
                const isEstimate = !ufLiters && weightDiff != null;

                if (!displayValue) return null;

                return (
                  <View style={styles.fluidRemovedRow}>
                    <Icon name="water-outline" type="material-community" size={16} color="#06b6d4" />
                    <Text style={styles.fluidRemovedText}>
                      {t.patientSessionDetail.fluidRemoved}{' '}
                      <Text style={styles.fluidRemovedValue}>
                        {displayValue} لتر
                      </Text>
                      {isEstimate && (
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}> (تقريبي)</Text>
                      )}
                    </Text>
                  </View>
                );
              })()}
            </>
          )}

        </View>

        {/* ── Vital Signs ── */}
        <View style={styles.card}>
          <SectionHeader icon="heart-pulse" title={t.patientSessionDetail.vitalSigns} color="#ef4444" />
          {vitalSigns && vitalSigns.length > 0 ? (
            vitalSigns.map((v, idx) => (
              <View key={v.vital_id || idx}>
                {idx > 0 && <Divider style={[styles.rowDivider, { marginVertical: 12 }]} />}
                <Text style={styles.recordTime}>
                  <Icon name="clock-outline" type="material-community" size={13} color="#94a3b8" />
                  {"  "}{formatTime(v.recorded_at)}
                  {"  ·  "}
                  {v.nurse?.full_name || ""}
                </Text>
                <View style={styles.vitalsGrid}>
                  <MetricChip label={t.patientSessionDetail.systolic} value={v.systolic ? `${v.systolic}` : "—"} icon="heart-pulse" color="#ef4444" />
                  <MetricChip label={t.patientSessionDetail.diastolic} value={v.diastolic ? `${v.diastolic}` : "—"} icon="heart-outline" color="#f97316" />
                  <MetricChip label={t.patientSessionDetail.pulse} value={v.pulse ? `${v.pulse} bpm` : "—"} icon="pulse" color="#8b5cf6" />
                  <MetricChip label={t.patientSessionDetail.temperature} value={v.temperature ? `${v.temperature}°C` : "—"} icon="thermometer" color="#f59e0b" />
                  {v.oxygen_saturation != null && (
                    <MetricChip label={t.patientSessionDetail.oxygen} value={`${v.oxygen_saturation}%`} icon="lungs" color="#3b82f6" />
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySmall}>
              <Icon name="heart-off-outline" type="material-community" size={36} color="#cbd5e1" />
              <Text style={styles.emptySmallText}>{t.patientSessionDetail.noVitals}</Text>
            </View>
          )}
        </View>

        {/* ── Dialysis Machine Settings ── */}
        <View style={styles.card}>
          <SectionHeader icon="cog-outline" title={t.patientSessionDetail.machineSettings} color="#06b6d4" />
          {dialysisSettings && dialysisSettings.length > 0 ? (
            dialysisSettings.map((s, idx) => (
              <View key={s.setting_id || idx}>
                {idx > 0 && <Divider style={[styles.rowDivider, { marginVertical: 12 }]} />}
                <Text style={styles.recordTime}>
                  {formatTime(s.recorded_at)}{"  ·  "}{s.nurse?.full_name || ""}
                </Text>
                <View style={styles.vitalsGrid}>
                  <MetricChip label={t.patientSessionDetail.bloodFlow} value={`${s.blood_flow_rate} ml/min`} icon="water-pump" color="#06b6d4" />
                  <MetricChip label={t.patientSessionDetail.dialysateFlow} value={`${s.dialysate_flow} ml/h`} icon="beaker-outline" color="#0891b2" />
                  <MetricChip
                    label="كمية السوائل المسحوبة"
                    value={`${(!isNaN(parseFloat(s.ultrafiltration_rate)) && parseFloat(s.ultrafiltration_rate) > 50) ? (parseFloat(s.ultrafiltration_rate) / 1000).toFixed(2) : (s.ultrafiltration_rate || 0)} لتر`}
                    icon="water-percent"
                    color="#0e7490"
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySmall}>
              <Icon name="cog-off-outline" type="material-community" size={36} color="#cbd5e1" />
              <Text style={styles.emptySmallText}>{t.patientSessionDetail.noSettings}</Text>
            </View>
          )}
        </View>

        {/* ── Medications ── */}
        <View style={styles.card}>
          <SectionHeader icon="pill" title={t.patientSessionDetail.medications} color="#059669" />
          {medications && medications.length > 0 ? (
            medications.map((med, idx) => (
              <View key={med.med_id || idx}>
                {idx > 0 && <Divider style={styles.rowDivider} />}
                <View style={styles.medicationRow}>
                  <View style={styles.medIconBox}>
                    <Icon name="pill" type="material-community" size={20} color="#059669" />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.medication_name}</Text>
                    <Text style={styles.medDosage}>
                      {med.dosage} {med.unit}
                    </Text>
                    <Text style={styles.medTime}>{formatTime(med.administered_at)}</Text>
                    {med.notes && (
                      <Text style={styles.medNotes}>{med.notes}</Text>
                    )}
                  </View>
                  <Text style={styles.medNurse}>{med.nurse?.full_name}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySmall}>
              <Icon name="pill-off" type="material-community" size={36} color="#cbd5e1" />
              <Text style={styles.emptySmallText}>{t.patientSessionDetail.noMedications}</Text>
            </View>
          )}
        </View>

        {/* ── Symptoms ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <SectionHeader icon="alert-circle-outline" title={t.patientSessionDetail.symptoms} color="#f59e0b" />
            {symptoms?.total > 0 && (
              <View style={[styles.countBadge, { backgroundColor: "#fef3c7" }]}>
                <Text style={[styles.countBadgeText, { color: "#92400e" }]}>
                  {symptoms.total} {t.patientSessionDetail.symptomCount}
                </Text>
              </View>
            )}
          </View>

          {symptoms?.details && symptoms.details.length > 0 ? (
            <>
              {/* Breakdown Summary */}
              {symptoms.breakdown && Object.keys(symptoms.breakdown).length > 0 && (
                <View style={styles.breakdownContainer}>
                  {Object.entries(symptoms.breakdown).map(([type, severities]) => {
                    const totalOfType = Object.values(severities).reduce((a, b) => a + b, 0);
                    return (
                      <View key={type} style={styles.breakdownChip}>
                        <Text style={styles.breakdownType}>
                          {t.symptomsDict[type] || type}
                        </Text>
                        <Text style={styles.breakdownCount}>{totalOfType}×</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <Divider style={styles.rowDivider} />
              {/* Detail List */}
              {symptoms.details.map((sym, idx) => {
                const sev = severityColors[sym.severity] || { bg: "#f1f5f9", text: "#64748b" };
                return (
                  <View key={sym.symptom_id || idx} style={styles.symptomRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.symptomType}>
                        {t.symptomsDict[sym.symptom_type] || sym.symptom_type}
                      </Text>
                      {sym.notes && <Text style={styles.symptomNotes}>{sym.notes}</Text>}
                      <Text style={styles.symptomTime}>{formatTime(sym.occurred_at)}</Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                      <Text style={[styles.severityText, { color: sev.text }]}>
                        {t.severity[sym.severity] || sym.severity}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptySmall}>
              <Icon name="emoticon-happy-outline" type="material-community" size={36} color="#cbd5e1" />
              <Text style={styles.emptySmallText}>{t.patientSessionDetail.noSymptoms}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 14 },
  errorText: { marginTop: 12, color: "#ef4444", fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 16, backgroundColor: "#204a42", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },

  // Header
  header: {
    backgroundColor: "#204a42",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerSub: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  statusBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "bold" },

  scroll: { padding: 16 },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },

  // Section header
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },

  // Person row (patient & nurse)
  personRow: { flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 12 },
  personBox: { flex: 1, alignItems: "center" },
  personDivider: { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  personAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  personRole: { fontSize: 11, color: "#94a3b8", marginBottom: 2 },
  personName: { fontSize: 13, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  bloodBadge: { backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  bloodText: { fontSize: 12, color: "#991b1b", fontWeight: "bold" },
  allergyRow: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#fff7ed", padding: 8, borderRadius: 8, marginTop: 4 },
  allergyText: { flex: 1, fontSize: 13, color: "#c2410c", textAlign: "right", marginRight: 6 },

  // Info rows
  rowDivider: { marginVertical: 8, backgroundColor: "#f1f5f9" },
  infoRow: { paddingVertical: 4 },
  infoRowHighlight: { backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  twoCol: { flexDirection: "row-reverse", justifyContent: "space-between" },
  infoLabel: { fontSize: 11, color: "#94a3b8", textAlign: "right" },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#1e293b", textAlign: "right" },
  notesBox: { flexDirection: "row-reverse", alignItems: "flex-start", backgroundColor: "#f8fafc", padding: 10, borderRadius: 10, marginTop: 8, gap: 6 },
  notesText: { flex: 1, fontSize: 13, color: "#475569", textAlign: "right", lineHeight: 20 },

  // Vitals grid
  vitalsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metricChip: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 90,
  },
  metricChipValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  metricChipLabel: { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  recordTime: { fontSize: 11, color: "#94a3b8", textAlign: "right", marginBottom: 6 },

  // Medications
  medicationRow: { flexDirection: "row-reverse", alignItems: "flex-start", paddingVertical: 8 },
  medIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0fdf4", justifyContent: "center", alignItems: "center", marginLeft: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "800", color: "#1e293b", textAlign: "right" },
  medDosage: { fontSize: 14, color: "#059669", fontWeight: "700", textAlign: "right", marginTop: 2 },
  medTime: { fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 2 },
  medNotes: { fontSize: 12, color: "#64748b", textAlign: "right", marginTop: 2 },
  medNurse: { fontSize: 10, color: "#94a3b8", textAlign: "left", maxWidth: 80 },

  // Symptoms
  breakdownContainer: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  breakdownChip: { backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  breakdownType: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  breakdownCount: { fontSize: 12, color: "#b45309" },
  symptomRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  symptomType: { fontSize: 14, fontWeight: "700", color: "#1e293b", textAlign: "right" },
  symptomNotes: { fontSize: 12, color: "#64748b", textAlign: "right", marginTop: 2 },
  symptomTime: { fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 2 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  severityText: { fontSize: 12, fontWeight: "bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  countBadgeText: { fontSize: 12, fontWeight: "bold" },

  // Empty state
  emptySmall: { alignItems: "center", paddingVertical: 20 },
  emptySmallText: { color: "#94a3b8", fontSize: 13, marginTop: 8 },

  // Weight display
  weightRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  weightBox: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  weightIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  weightLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  weightValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  weightArrow: {
    paddingHorizontal: 8,
  },
  fluidRemovedRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfeff",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  fluidRemovedText: {
    flex: 1,
    fontSize: 12,
    color: "#0e7490",
    textAlign: "right",
    fontWeight: "600",
  },
  fluidRemovedValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#06b6d4",
  },
});

export default PatientSessionDetailView;
