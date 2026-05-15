import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Tab, Button, Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Platform } from "react-native";
import { useLanguage } from "../../context/LanguageContext";
import SessionTimer from '../../components/SessionTimer';

const { width } = Dimensions.get("window");

const StaffPatientView = ({ route, navigation }) => {
  const { t } = useLanguage();
  const [tabIndex, setTabIndex] = useState(0);
  const [subTabIndex, setSubTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalTests, setMedicalTests] = useState([]);
  const [radiology, setRadiology] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [consultations, setConsultations] = useState([]);

  const { patientId } = route.params || {};

  const isNutritionist = userRole === "NUTRITIONIST";
  const isAdmin = userRole === "ADMIN";
  const canEditNutrition = isNutritionist || isAdmin;

  // --- Functions (Fetch Data) ---
  const fetchMedicalTests = async (id) => {
    try {
      const response = await api.get(`/medical-tests?patientId=${id}`);
      setMedicalTests(Array.isArray(response.data) ? response.data : []);
    } catch (e) { console.log("Error tests:", e.message); }
  };

  const fetchRadiology = async (id) => {
    try {
      const response = await api.get(`/radiology-requests?patientId=${id}`);
      setRadiology(Array.isArray(response.data) ? response.data : []);
    } catch (e) { console.log("Error rad:", e.message); }
  };

  const fetchNutritionPlan = async (id) => {
    try {
      const response = await api.get(`/nutrition-programs?patientId=${id}`);
      if (response.data && response.data.length > 0) {
        const sorted = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
        setNutritionPlan(sorted[0]);
      } else { setNutritionPlan(null); }
    } catch (e) { setNutritionPlan(null); }
  };

  const fetchSessions = async (id) => {
    try {
      const response = await api.get(`/dialysis-sessions?patientId=${id}`);
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (e) { setSessions([]); }
  };

  const fetchConsultations = async (id) => {
    try {
      const response = await api.get(`/clinic-consultations?patientId=${id}`);
      setConsultations(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      if (e.response?.status !== 403) {
        console.log('Consultations fetch error:', e.message);
      }
      setConsultations([]);
    }
  };

  const fetchPrescriptions = async (id) => {
    try {
      const response = await api.get(`/prescriptions?patientId=${id}`);
      setPrescriptions(Array.isArray(response.data) ? response.data : []);
    } catch (e) { setPrescriptions([]); }
  };

  const fetchPatientData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const storedRole = await AsyncStorage.getItem("userRole") || await AsyncStorage.getItem("role");

      let finalRole = "GUEST";

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // هذا السطر هو "السر"؛ يفحص كل الاحتمالات الممكنة لمكان وجود الرتبة في الـ JSON
          finalRole = parsed.role || parsed.user?.role || parsed.data?.user?.role || storedRole || "GUEST";
        } catch (e) {
          finalRole = storedRole || "GUEST";
        }
      } else if (storedRole) {
        finalRole = storedRole;
      }

      // تنظيف النص وتحويله لكبير لضمان نجاح المقارنة userRole === "NUTRITIONIST"
      const roleUpper = String(finalRole).trim().toUpperCase();
      setUserRole(roleUpper);

      // ... تكملة كود جلب بيانات المريض
      if (!patientId) {
        Alert.alert(t.patientProfile.errorTitle || "Error", t.staffPatientView.errorNoPatientId);
        navigation.goBack();
        return;
      }

      const response = await api.get(
        `/users/profile/patients/${patientId}`
      );
      console.log('FULL Patient Response:', JSON.stringify(response.data));
      setPatient(response.data);

      const realId = response.data?.patient_id;
      if (realId) {
        await Promise.all([
          fetchNutritionPlan(realId),
          fetchSessions(realId),
          fetchPrescriptions(realId),
          fetchMedicalTests(realId),
          fetchRadiology(realId),
          fetchConsultations(realId)
        ]);
      }
    } catch (error) {
      console.log("Error:", error.message);
      Alert.alert(t.patientProfile.errorTitle || "Error", t.staffPatientView.errorUpdateProfile);
    } finally {
      setLoading(false);
    }
  }, [patientId, navigation]);

  useFocusEffect(useCallback(() => { fetchPatientData(); }, [fetchPatientData]));

  const formatDate = (date) => {
    if (!date) return t.staffPatientView.pendingDispense || "قيد الانتظار";
    return new Date(date).toLocaleDateString(t.vitalSigns.now === 'الآن' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    let [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? t.time.pm : t.time.am}`;
  };

  const handleDownload = async (id, type) => {
    if (!id) { Alert.alert(t.patientSessionScreen.alertTitle || "تنبيه", t.staffPatientView.fileNotAvailable); return; }
    try {
      const endpoint = type === 'lab'
        ? `/medical-tests/${id}/result-url`
        : `/radiology-requests/${id}/file-url`;

      const response = await api.get(endpoint);
      const fullUrl = response.data?.url || response.data;

      if (!fullUrl) { Alert.alert(t.patientProfile.errorTitle || "خطأ", t.staffPatientView.fileLinkError); return; }

      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert(t.patientProfile.errorTitle || "خطأ", t.staffPatientView.linkOpenError);
      }
    } catch (e) {
      console.log("Download Error:", e.message);
      Alert.alert(t.patientProfile.errorTitle || "خطأ", t.staffPatientView.fileOpenProblem);
    }
  };

  // --- Sub-Components ---
  const InfoItem = ({ label, value, icon, color = "#26CDD6" }) => (
    <View style={styles.infoBox}>
      <Icon name={icon} type="material-community" size={22} color={color} />
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoTextValue}>{value || t.staffPatientView.notSpecified}</Text>
      </View>
    </View>
  );

  const MealItem = ({ label, content, icon, color }) => (
    <View style={styles.mealBox}>
      <View style={[styles.mealIconCircle, { backgroundColor: color + '20' }]}>
        <Icon name={icon} type="material-community" size={20} color={color} />
      </View>
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={[styles.mealLabel, { color: color }]}>{label}</Text>
        <Text style={styles.mealContent}>{content || t.staffPatientView.noMealDefined}</Text>
      </View>
    </View>
  );

  const MedicalCard = ({ id, type, title, date, doctor, description, status, hasFile, typeIcon }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Icon name={typeIcon} type="material-community" size={26} color="#193B6B" />
          <Text style={styles.reportTitle}>{title}</Text>
        </View>
        <Text style={styles.reportDate}>{formatDate(date)}</Text>
      </View>
      <View style={styles.reportContent}>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>{t.staffPatientView.doctor}</Text> د. {doctor || t.staffPatientView.notSpecified}</Text>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>{t.staffPatientView.description}</Text> {description || t.staffPatientView.noDesc}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (status === 'PENDING' || status === 'pending') ? '#FBEAEA' : '#E9FAFB' }]}>
          <Text style={[styles.statusText, { color: (status === 'PENDING' || status === 'pending') ? '#A32D2F' : '#193B6B' }]}>
            {(status === 'PENDING' || status === 'pending') ? t.patientProfile.status.pending : t.patientProfile.status.completed}
          </Text>
        </View>
      </View>
      <Button
        title={t.staffPatientView.previewFile}
        icon={<Icon name="file-pdf-box" type="material-community" color="white" size={20} containerStyle={{ marginLeft: 5 }} />}
        buttonStyle={styles.downloadBtn}
        onPress={() => handleDownload(id, type)}
        disabled={!hasFile}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#26CDD6" />
        <Text style={styles.loadingText}>{t.staffPatientView.updatingData}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#193B6B" />

      <View style={styles.modernHeader}>
        <View style={styles.headerCircleOne} />
        <View style={styles.headerCircleTwo} />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.glassIconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Icon name="chevron-right" type="material-community" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.glassIconButton}
            onPress={() => navigation.navigate("PatinetInfo", { patientId })}
            activeOpacity={0.85}
          >
            <Icon name="account-edit-outline" type="material-community" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.patientHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("PatinetInfo", { patientId })}
            activeOpacity={0.9}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatarContainer}>
                <Icon name="account" type="material-community" size={68} color="#193B6B" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.patientHeaderInfo}>
            <Text style={styles.patientNameText}>{patient?.full_name || t.staffPatientView.patientNameFallback}</Text>

          </View>
        </View>
      </View>



      <Tab value={tabIndex} onChange={setTabIndex} indicatorStyle={styles.tabIndicator} containerStyle={styles.tabBar} variant="default">
        <Tab.Item
          title={t.staffPatientView.tabs.nutrition}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#193B6B" : "#8296B1" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6, allowFontScaling: false }}
          icon={<Icon name="food-apple" type="material-community" size={18} color={tabIndex === 0 ? "#193B6B" : "#8296B1"} />}
        />
        <Tab.Item
          title={t.staffPatientView.tabs.sessions}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#193B6B" : "#8296B1" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6, allowFontScaling: false }}
          icon={<Icon name="clock-outline" type="material-community" size={18} color={tabIndex === 1 ? "#193B6B" : "#8296B1"} />}
        />
        <Tab.Item
          title={t.staffPatientView.tabs.tests}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#193B6B" : "#8296B1" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6, allowFontScaling: false }}
          icon={<Icon name="clipboard-pulse" type="material-community" size={18} color={tabIndex === 2 ? "#193B6B" : "#8296B1"} />}
        />
        <Tab.Item
          title={t.staffPatientView.tabs.notes}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#193B6B" : "#8296B1" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6, allowFontScaling: false }}
          icon={<Icon name="note-edit-outline" type="material-community" size={18} color={tabIndex === 3 ? "#193B6B" : "#8296B1"} />}
        />
      </Tab>

      {/* ── Tab Content ── */}
      <View style={{ flex: 1 }}>
        {/* TAB 0: Nutrition */}
        {tabIndex === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding} style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t.staffPatientView.nutritionPlan}</Text>
              {canEditNutrition && nutritionPlan && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })}
                  style={styles.editBtn}>
                  <Icon name="pencil-outline" type="material-community" size={16} color="#fff" />
                  <Text style={styles.editBtnText}>{t.staffPatientView.edit}</Text>
                </TouchableOpacity>
              )}
            </View>

            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{nutritionPlan.title || t.staffPatientView.currentPlan}</Text>
                  <Icon name="calendar-check" type="material-community" color="#fff" size={20} />
                </View>
                <View style={styles.planBody}>
                  <View style={styles.dateInfoContainer}>
                    <View style={styles.dateSubBox}><Text style={styles.dateLabelText}>{t.staffPatientView.fromDate}</Text><Text style={styles.dateValueText}>{formatDate(nutritionPlan.startDate || nutritionPlan.start_date)}</Text></View>
                    <Icon name="arrow-left-thin" type="material-community" size={20} color="#cbd5e1" />
                    <View style={styles.dateSubBox}><Text style={styles.dateLabelText}>{t.staffPatientView.toDate}</Text><Text style={styles.dateValueText}>{formatDate(nutritionPlan.endDate || nutritionPlan.end_date)}</Text></View>
                  </View>

                  <View style={styles.descriptionSection}>
                    <Text style={styles.descTitle}>{t.staffPatientView.programDesc}</Text>
                    <Text style={styles.descContent}>{nutritionPlan.description || t.staffPatientView.noDesc}</Text>
                  </View>

                  <Divider style={{ marginVertical: 15 }} />

                  <Text style={[styles.sectionHeading, { fontSize: 16, marginBottom: 10 }]}>{t.staffPatientView.dailyMeals}</Text>
                  <MealItem label={t.staffPatientView.breakfast} content={nutritionPlan.breakfast} icon="coffee-outline" color="#A32D2F" />
                  <MealItem label={t.staffPatientView.lunch} content={nutritionPlan.lunch} icon="food-turkey" color="#DE1A1C" />
                  <MealItem label={t.staffPatientView.dinner} content={nutritionPlan.dinner} icon="weather-night" color="#26CDD6" />

                  {(nutritionPlan.meal_notes || nutritionPlan.mealNotes) && (
                    <View style={styles.notesBox}>
                      <Icon name="information-outline" type="material-community" size={18} color="#8296B1" />
                      <Text style={styles.notesText}>{nutritionPlan.meal_notes || nutritionPlan.mealNotes}</Text>
                    </View>
                  )}

                  <Divider style={{ marginVertical: 15 }} />

                  <InfoItem label={t.staffPatientView.allowedItems} value={nutritionPlan.allowed_items || nutritionPlan.allowedItems} icon="check-decagram" color="#26CDD6" />
                  <InfoItem label={t.staffPatientView.forbiddenItems} value={nutritionPlan.forbidden_items || nutritionPlan.forbiddenItems} icon="alert-octagon" color="#DE1A1C" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t.staffPatientView.noNutritionPlan}</Text>
                {canEditNutrition && (
                  <Button
                    title={t.staffPatientView.createProgram}
                    onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })}
                    buttonStyle={[styles.editBtn, { marginTop: 15, paddingHorizontal: 20 }]}
                  />
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* TAB 1: Sessions */}
        {tabIndex === 1 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding} style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t.staffPatientView.sessionsLog}</Text>
            </View>
            {sessions.length > 0 ? sessions.map((session, index) => {
              const statusConfig = {
                COMPLETED: { label: t.patientProfile.status.completed, bg: "#E9FAFB", text: "#193B6B", icon: "check-circle-outline", borderColor: "#26CDD6" },
                IN_PROGRESS: { label: t.patientProfile.status.pending, bg: "#FBEAEA", text: "#A32D2F", icon: "progress-clock", borderColor: "#A32D2F" },
                SCHEDULED: { label: t.patientProfile.status.scheduled || "مجدولة", bg: "#E9FAFB", text: "#193B6B", icon: "calendar-clock", borderColor: "#26CDD6" },
              };
              const sc = statusConfig[session.status] || { label: session.status, bg: "#f1f5f9", text: "#8296B1", icon: "help-circle-outline", borderColor: "#8296B1" };
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.sessionCard, { borderRightColor: sc.borderColor }]}
                  onPress={() => {
                    if (!patient?.patient_id) {
                      Alert.alert(t.error, "خطأ: معرف المريض غير موجود");
                      return;
                    }
                    navigation.navigate("PatientSessionDetailView", {
                      sessionId: session.session_id || session.id,
                      patientId: patient.patient_id,
                    });
                  }}
                  activeOpacity={0.75}
                >
                  {/* Card Header */}
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionDateBox}>
                      <Icon name="calendar-range" type="material-community" size={15} color="#8296B1" />
                      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.sessionStatusBadge, { backgroundColor: sc.bg }]}>
                        <Icon name={sc.icon} type="material-community" size={12} color={sc.text} />
                        <Text style={[styles.sessionStatusText, { color: sc.text }]}>{sc.label}</Text>
                      </View>
                      <Text style={styles.sessionId}>#{session.session_id || session.id}</Text>
                    </View>
                  </View>

                  {/* Card Metrics */}
                  <View style={styles.sessionMetricsRow}>
                    <View style={styles.sessionMetricBox}>
                      <Icon name="scale" type="material-community" size={14} color="#26CDD6" />
                      <Text style={styles.metricLabel}>الوزن قبل</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#26CDD6' }]}>
                        {session.weight_before != null ? `${session.weight_before} kg` : "—"}
                      </Text>
                    </View>
                    <View style={styles.sessionMetricDivider} />
                    <View style={styles.sessionMetricBox}>
                      <Icon name="scale" type="material-community" size={14} color="#26CDD6" />
                      <Text style={styles.metricLabel}>الوزن بعد</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#26CDD6' }]}>
                        {session.weight_after != null ? `${session.weight_after} kg` : "—"}
                      </Text>
                    </View>
                    <View style={styles.sessionMetricDivider} />
                    <View style={styles.sessionMetricBox}>
                      <Icon name="water" type="material-community" size={14} color="#26CDD6" />
                      <Text style={styles.metricLabel}>السوائل المسحوبة</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#26CDD6' }]}>
                        {(() => {
                          const settingsArr = session.dialysisSettings || [];
                          const lastSetting = settingsArr.length > 0 ? settingsArr[settingsArr.length - 1] : null;
                          const ufRaw = parseFloat(lastSetting?.ultrafiltration_rate ?? lastSetting?.ultrafiltrationRate);
                          
                          if (!isNaN(ufRaw) && ufRaw > 0) {
                            const ufLiters = ufRaw > 50 ? (ufRaw / 1000).toFixed(2) : ufRaw.toFixed(2);
                            return `${ufLiters} L`;
                          }
                          
                          if (session.fluid_removed != null && session.fluid_removed > 0) {
                            return `${session.fluid_removed} L`;
                          }

                          if (session.weight_before != null && session.weight_after != null) {
                            return `${Math.abs(session.weight_before - session.weight_after).toFixed(1)} L`;
                          }
                          
                          return '—';
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* تايمر للجلسة الجارية */}
                  {(session.status === 'IN_PROGRESS' || session.status === 'PENDING') && (
                    <SessionTimer session={session} />
                  )}

                  {/* Tap hint */}
                  <View style={styles.sessionTapHint}>
                    <Icon name="chevron-left" type="material-community" size={16} color="#8296B1" />
                    <Text style={styles.sessionTapHintText}>{t.staffPatientView.tapDetailsHint}</Text>
                  </View>
                </TouchableOpacity>
              );
            }) : <View style={styles.emptyState}><Icon name="database-off" type="material-community" size={50} color="#cbd5e1" /><Text style={styles.emptyText}>{t.staffPatientView.noSessions}</Text></View>}
          </ScrollView>
        )}


        {/* TAB 2: Medical Tests */}
        {tabIndex === 2 && (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity onPress={() => setSubTabIndex(0)} style={[styles.subTabItem, subTabIndex === 0 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 0 && styles.subTextActive]}>{t.staffPatientView.subTabs.medications}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSubTabIndex(1)} style={[styles.subTabItem, subTabIndex === 1 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 1 && styles.subTextActive]}>{t.staffPatientView.subTabs.lab}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSubTabIndex(2)} style={[styles.subTabItem, subTabIndex === 2 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 2 && styles.subTextActive]}>{t.staffPatientView.subTabs.radiology}</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              {subTabIndex === 0 && (
                <View>
                  <Text style={styles.sectionHeading}>{t.staffPatientView.prescriptions}</Text>
                  {prescriptions.length > 0 ? prescriptions.map((item, idx) => (
                    <View key={idx} style={styles.prescriptionCard}>
                      <View style={styles.prescriptionHeader}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.prescriptionDoctor}>د. {item.doctor?.full_name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: item.dispense_status === 'DISPENSED' ? '#E9FAFB' : '#FBEAEA' }]}>
                            <Text style={[styles.statusText, { color: item.dispense_status === 'DISPENSED' ? '#193B6B' : '#A32D2F' }]}>
                              {item.dispense_status === 'DISPENSED' ? t.staffPatientView.dispensed : t.staffPatientView.pendingDispense}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.prescriptionDate}>{formatDate(item.date_prescribed)}</Text>
                      </View>
                      <Divider style={{ marginVertical: 10 }} />
                      {item.details?.map((drug, dIdx) => (
                        <View key={dIdx} style={[styles.drugItem, { borderRightWidth: 4, borderRightColor: drug.is_active ? '#26CDD6' : '#8296B1' }]}>
                          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={styles.drugNameRow}>
                              <Icon name="pill" type="material-community" size={20} color={drug.is_active ? "#193B6B" : "#8296B1"} />
                              <Text style={[styles.drugName, { color: drug.is_active ? '#193B6B' : '#8296B1' }]}>{drug.drug_name} {!drug.is_active && `(${t.staffPatientView.canceled})`}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: drug.status ? '#26CDD6' : '#A32D2F', marginRight: 4 }}>
                                {drug.status ? t.staffPatientView.drugDispensed : t.staffPatientView.drugNotDispensed}
                              </Text>
                              <Icon name={drug.status ? "check-circle" : "clock-outline"} type="material-community" size={18} color={drug.status ? "#26CDD6" : "#A32D2F"} />
                            </View>
                          </View>
                          <Text style={styles.drugInstructions}>{drug.instructions}</Text>
                        </View>
                      ))}
                    </View>
                  )) : <View style={styles.emptyState}><Icon name="pill-off" type="material-community" size={60} color="#cbd5e1" /><Text style={styles.emptyText}>{t.staffPatientView.noMedications}</Text></View>}
                </View>
              )}
              {subTabIndex === 1 && (
                medicalTests.length > 0 ? medicalTests.map((test, idx) => (
                  <MedicalCard
                    key={idx}
                    id={test.test_id || test.id}
                    type="lab"
                    title={test.test_type}
                    date={test.date_completed}
                    doctor={test.doctor?.full_name}
                    description={test.description}
                    status={test.status || (test.result ? 'COMPLETED' : 'PENDING')}
                    hasFile={!!(test.test_id || test.id)}
                    typeIcon="test-tube"
                  />
                )) : (
                  <View style={styles.emptyState}>
                    <Icon name="test-tube-off" type="material-community" size={60} color="#cbd5e1" />
                    <Text style={styles.emptyText}>{t.staffPatientView.noLabTests || 'لا توجد فحوصات مختبرية'}</Text>
                  </View>
                )
              )}
              {subTabIndex === 2 && (
                radiology.length > 0 ? radiology.map((rad, idx) => (
                  <MedicalCard
                    key={idx}
                    id={rad.image_id || rad.id}
                    type="radiology"
                    title={rad.image_type}
                    date={rad.completed_at}
                    doctor={rad.doctor?.full_name}
                    description={rad.description}
                    status={rad.status}
                    hasFile={!!(rad.image_id || rad.id)}
                    typeIcon="file-image-outline"
                  />
                )) : (
                  <View style={styles.emptyState}>
                    <Icon name="radiology-box-outline" type="material-community" size={60} color="#cbd5e1" />
                    <Text style={styles.emptyText}>{t.staffPatientView.noRadiology || 'لا توجد صور أشعة'}</Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: استشارات العيادة المكتملة */}
        {tabIndex === 3 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding} style={{ flex: 1 }}>
            <Text style={styles.sectionHeading}>{t.appointments?.completedTitle || 'سجل استشارات العيادة'}</Text>

            {consultations.filter(a => a.status === 'COMPLETED').length > 0 ? (
              consultations.filter(a => a.status === 'COMPLETED').map((appt, index) => (
                <TouchableOpacity
                  key={appt.appointment_id || index}
                  style={styles.consultCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ConsultationDetails', { consultation: appt })}
                >
                  <View style={styles.consultHeader}>
                    <View style={styles.consultDocRow}>
                      <View style={styles.consultAvatar}>
                        <Icon name="stethoscope" type="material-community" size={20} color="#26CDD6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.consultDocName}>د. {appt.doctor?.full_name || '—'}</Text>
                        <Text style={styles.consultType}>
                          {appt.appointment_type === 'CLINIC_REVIEW' ? (t.appointments?.clinicReview || 'مراجعة عيادة') : appt.appointment_type}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.consultBadge}>
                      <Icon name="check-circle" type="material-community" size={14} color="#26CDD6" />
                      <Text style={styles.consultBadgeText}>{t.patientProfile?.status?.completed || 'مكتملة'}</Text>
                    </View>
                  </View>

                  <View style={styles.consultDateRow}>
                    <View style={styles.consultDateItem}>
                      <Icon name="calendar" type="material-community" size={15} color="#8296B1" />
                      <Text style={styles.consultDateText}>{appt.appt_date}</Text>
                    </View>
                    <View style={styles.consultDateItem}>
                      <Icon name="clock-outline" type="material-community" size={15} color="#8296B1" />
                      <Text style={styles.consultDateText}>{formatTime(appt.appt_time)}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailsText}>عرض التفاصيل الكاملة</Text>
                    <Icon name="chevron-left" type="material-community" size={18} color="#26CDD6" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="clipboard-check-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t.appointments?.noCompleted || 'لا توجد استشارات مكتملة'}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1FCFD",
  },
  modernHeader: {
    height: 235,
    backgroundColor: "#193B6B",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 34,
    overflow: "hidden",
    position: "relative",
    elevation: 14,
    shadowColor: "#193B6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },

  topBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 5,
  },

  patientHeaderRow: {
    marginTop: 22,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 5,
  },

  patientHeaderInfo: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 14,
  },

  patientNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "right",
  },

  fileBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 9,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  fileBadgeText: {
    color: "#BCEFF3",
    fontSize: 13,
    fontWeight: "800",
    marginRight: 6,
  },

  avatarRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  avatarContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#BCEFF3",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },

  headerInfoCard: {
    marginHorizontal: 20,
    marginTop: -32,
    marginBottom: 18,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 10,
    shadowColor: "#193B6B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    zIndex: 20,
  },

  infoMiniBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1FCFD",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  infoTextBox: {
    flex: 1,
    alignItems: "flex-end",
  },

  infoMiniLabel: {
    fontSize: 12,
    color: "#8296B1",
    fontWeight: "700",
    textAlign: "right",
  },

  infoMiniValue: {
    fontSize: 15,
    color: "#193B6B",
    fontWeight: "900",
    marginTop: 2,
    textAlign: "right",
  },

  headerCircleOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(38, 205, 214, 0.15)",
    top: -75,
    right: -55,
  },

  headerCircleTwo: {
    position: "absolute",
    width: 135,
    height: 135,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -45,
    left: -35,
  },

  glassIconButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  tabBar: { backgroundColor: "#fff", elevation: 2, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabIndicator: { backgroundColor: "#193B6B", height: 3, borderRadius: 3 },
  tabTitle: { fontSize: 10, fontWeight: "bold", marginTop: 3, textAlign: 'center', width: '100%', flexShrink: 1 },
  tabViewContent: { flex: 1, width: width },
  scrollPadding: { padding: 20 },
  subTabContainer: { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', margin: 15, borderRadius: 12, padding: 4 },
  subTabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: '#fff', elevation: 2 },
  subTabText: { fontSize: 14, color: '#8296B1', fontWeight: '600' },
  subTextActive: { color: '#193B6B', fontWeight: 'bold' },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionHeading: { fontSize: 20, fontWeight: "800", color: "#193B6B", textAlign: "right", marginBottom: 15 },
  editBtn: { flexDirection: 'row-reverse', backgroundColor: '#193B6B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginRight: 5 },
  nutritionCard: { backgroundColor: "#fff", borderRadius: 25, overflow: "hidden", elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  planHeader: { backgroundColor: "#193B6B", padding: 15, flexDirection: "row-reverse", justifyContent: 'space-between', alignItems: "center" },
  planTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  planBody: { padding: 20 },
  dateInfoContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#E9FAFB', borderRadius: 15, padding: 10, marginBottom: 15 },
  dateSubBox: { alignItems: 'center' },
  dateLabelText: { fontSize: 11, color: '#26CDD6', fontWeight: 'bold' },
  dateValueText: { fontSize: 13, color: '#193B6B', fontWeight: '800' },
  descriptionSection: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#26CDD6', marginBottom: 15 },
  descTitle: { fontSize: 12, color: '#8296B1', fontWeight: 'bold', textAlign: 'right' },
  descContent: { fontSize: 14, color: '#193B6B', textAlign: 'right', marginTop: 4, lineHeight: 20 },
  infoBox: { flexDirection: "row-reverse", marginBottom: 15 },
  infoLabel: { fontSize: 13, color: "#8296B1", textAlign: "right" },
  infoTextValue: { fontSize: 15, fontWeight: "700", color: "#193B6B", textAlign: "right" },
  mealBox: { flexDirection: "row-reverse", alignItems: 'center', marginBottom: 12, backgroundColor: '#fafafa', padding: 10, borderRadius: 12 },
  mealIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  mealLabel: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  mealContent: { fontSize: 14, color: '#193B6B', textAlign: 'right', marginTop: 2 },
  notesBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, marginTop: 5 },
  notesText: { fontSize: 12, color: '#8296B1', marginRight: 8, flex: 1, textAlign: 'right' },
  sessionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3, borderRightWidth: 6, borderRightColor: '#193B6B' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionDateBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionDate: { fontSize: 13, color: '#8296B1', marginLeft: 5 },
  sessionId: { fontSize: 14, fontWeight: '800', color: '#193B6B' },
  sessionStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, gap: 3 },
  sessionStatusText: { fontSize: 11, fontWeight: 'bold' },
  sessionMetricsRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 10 },
  sessionMetricBox: { flex: 1, alignItems: 'center', gap: 3 },
  sessionMetricDivider: { width: 1, backgroundColor: '#e2e8f0' },
  sessionContent: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  sessionMetric: { flex: 1, alignItems: 'flex-end' },
  sessionTapHint: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-end' },
  sessionTapHintText: { fontSize: 11, color: '#8296B1', marginRight: 2 },
  metricLabel: { fontSize: 11, color: '#8296B1' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#193B6B' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: "#8296B1", textAlign: "center", marginTop: 10 },
  prescriptionCard: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, borderRightWidth: 5, borderRightColor: '#26CDD6' },
  prescriptionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  prescriptionDoctor: { fontSize: 15, fontWeight: 'bold', color: '#193B6B' },
  prescriptionDate: { fontSize: 13, color: '#8296B1' },
  drugItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  drugNameRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
  drugName: { fontSize: 15, fontWeight: 'bold', color: '#193B6B', marginRight: 8 },
  drugInstructions: { fontSize: 14, color: '#8296B1', textAlign: 'right' },
  reportCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 15, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#193B6B' },
  reportHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportTitleRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  reportTitle: { fontSize: 17, fontWeight: 'bold', color: '#193B6B', marginRight: 8 },
  reportDate: { fontSize: 13, color: '#8296B1' },
  reportContent: { marginBottom: 15 },
  reportDetail: { fontSize: 15, color: '#8296B1', textAlign: 'right', marginBottom: 4 },
  boldLabel: { fontWeight: 'bold', color: '#193B6B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-end', marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  downloadBtn: { backgroundColor: '#193B6B', borderRadius: 10, marginTop: 10, height: 48 },

  // ── Completed Consultations Cards ──
  consultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderRightWidth: 4,
    borderRightColor: '#26CDD6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    width: '100%',
  },
  consultHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  consultDocRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  consultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1FCFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultDocName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#193B6B',
    textAlign: 'right',
  },
  consultType: {
    fontSize: 12,
    color: '#8296B1',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },
  consultBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1FCFD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  consultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#26CDD6',
  },
  consultDateRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  consultDateItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  consultDateText: {
    fontSize: 13,
    color: '#8296B1',
    fontWeight: '600',
  },
  consultSection: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  consultSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  consultSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  consultSectionText: {
    fontSize: 14,
    color: '#193B6B',
    lineHeight: 22,
    textAlign: 'right',
    fontWeight: '500',
  },
  consultNoDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  consultNoDetailsText: {
    fontSize: 13,
    color: '#8296B1',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#26CDD6',
    fontWeight: '700',
  },
});

export default StaffPatientView;
