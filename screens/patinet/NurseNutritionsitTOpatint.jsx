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
      setPatient(response.data);

      const realId = response.data?.patient_id;
      if (realId) {
        await Promise.all([
          fetchNutritionPlan(realId),
          fetchSessions(realId),
          fetchPrescriptions(realId),
          fetchMedicalTests(realId),
          fetchRadiology(realId)
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
  const InfoItem = ({ label, value, icon, color = "#059669" }) => (
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
          <Icon name={typeIcon} type="material-community" size={26} color="#204a42" />
          <Text style={styles.reportTitle}>{title}</Text>
        </View>
        <Text style={styles.reportDate}>{formatDate(date)}</Text>
      </View>
      <View style={styles.reportContent}>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>{t.staffPatientView.doctor}</Text> د. {doctor || t.staffPatientView.notSpecified}</Text>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>{t.staffPatientView.description}</Text> {description || t.staffPatientView.noDesc}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (status === 'PENDING' || status === 'pending') ? '#fef3c7' : '#dcfce7' }]}>
          <Text style={[styles.statusText, { color: (status === 'PENDING' || status === 'pending') ? '#92400e' : '#166534' }]}>
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
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t.staffPatientView.updatingData}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

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
                <Icon name="account" type="material-community" size={68} color="#204a42" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.patientHeaderInfo}>
            <Text style={styles.patientNameText}>{patient?.full_name || t.staffPatientView.patientNameFallback}</Text>

          </View>
        </View>
      </View>



      <Tab value={tabIndex} onChange={setTabIndex} indicatorStyle={styles.tabIndicator} containerStyle={styles.tabBar} variant="default">
        <Tab.Item title={t.staffPatientView.tabs.nutrition} titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }} icon={<Icon name="food-apple" type="material-community" size={22} color={tabIndex === 0 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title={t.staffPatientView.tabs.sessions} titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }} icon={<Icon name="clock-outline" type="material-community" size={22} color={tabIndex === 1 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title={t.staffPatientView.tabs.tests} titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }} icon={<Icon name="clipboard-pulse" type="material-community" size={22} color={tabIndex === 2 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title={t.staffPatientView.tabs.notes} titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }} icon={<Icon name="note-edit-outline" type="material-community" size={22} color={tabIndex === 3 ? "#204a42" : "#94a3b8"} />} />
      </Tab>

      {/* ── Tab Content ── */}
      <View style={{ flex: 1 }}>
        {/* TAB 0: Nutrition */}
        {tabIndex === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding} style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t.staffPatientView.nutritionPlan}</Text>
              {canEditNutrition && (
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
                  <MealItem label={t.staffPatientView.breakfast} content={nutritionPlan.breakfast} icon="coffee-outline" color="#f59e0b" />
                  <MealItem label={t.staffPatientView.lunch} content={nutritionPlan.lunch} icon="food-turkey" color="#ef4444" />
                  <MealItem label={t.staffPatientView.dinner} content={nutritionPlan.dinner} icon="weather-night" color="#3b82f6" />

                  {(nutritionPlan.meal_notes || nutritionPlan.mealNotes) && (
                    <View style={styles.notesBox}>
                      <Icon name="information-outline" type="material-community" size={18} color="#64748b" />
                      <Text style={styles.notesText}>{nutritionPlan.meal_notes || nutritionPlan.mealNotes}</Text>
                    </View>
                  )}

                  <Divider style={{ marginVertical: 15 }} />

                  <InfoItem label={t.staffPatientView.allowedItems} value={nutritionPlan.allowed_items || nutritionPlan.allowedItems} icon="check-decagram" color="#059669" />
                  <InfoItem label={t.staffPatientView.forbiddenItems} value={nutritionPlan.forbidden_items || nutritionPlan.forbiddenItems} icon="alert-octagon" color="#ef4444" />
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
              <TouchableOpacity
                style={styles.statsBtn}
                onPress={() => navigation.navigate("PatientSessionStatistics", {
                  patientId: patient?.patient_id,
                  patientName: patient?.full_name,
                })}
              >
                <Icon name="chart-line" type="material-community" size={16} color="#fff" />
                <Text style={styles.statsBtnText}>{t.staffPatientView.statistics}</Text>
              </TouchableOpacity>
            </View>
            {sessions.length > 0 ? sessions.map((session, index) => {
              const statusConfig = {
                COMPLETED: { label: t.patientProfile.status.completed, bg: "#dcfce7", text: "#166534", icon: "check-circle-outline", borderColor: "#059669" },
                IN_PROGRESS: { label: t.patientProfile.status.pending, bg: "#fef3c7", text: "#92400e", icon: "progress-clock", borderColor: "#f59e0b" },
                SCHEDULED: { label: t.patientProfile.status.scheduled || "مجدولة", bg: "#dbeafe", text: "#1e40af", icon: "calendar-clock", borderColor: "#3b82f6" },
              };
              const sc = statusConfig[session.status] || { label: session.status, bg: "#f1f5f9", text: "#64748b", icon: "help-circle-outline", borderColor: "#94a3b8" };
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.sessionCard, { borderRightColor: sc.borderColor }]}
                  onPress={() => navigation.navigate("PatientSessionDetailView", {
                    sessionId: session.session_id || session.id,
                    patientId: patient?.patient_id,
                  })}
                  activeOpacity={0.75}
                >
                  {/* Card Header */}
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionDateBox}>
                      <Icon name="calendar-range" type="material-community" size={15} color="#64748b" />
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
                      <Icon name="heart-pulse" type="material-community" size={14} color="#ef4444" />
                      <Text style={styles.metricLabel}>{t.staffPatientView.bpBefore}</Text>
                      <Text style={[styles.metricValue, { fontSize: 13 }]}>{session.blood_pressure_before || "—"}</Text>
                    </View>
                    <View style={styles.sessionMetricDivider} />
                    <View style={styles.sessionMetricBox}>
                      <Icon name="heart-outline" type="material-community" size={14} color="#f97316" />
                      <Text style={styles.metricLabel}>{t.staffPatientView.bpAfter}</Text>
                      <Text style={[styles.metricValue, { fontSize: 13 }]}>{session.blood_pressure_after || "—"}</Text>
                    </View>
                  </View>

                  {/* Tap hint */}
                  <View style={styles.sessionTapHint}>
                    <Icon name="chevron-left" type="material-community" size={16} color="#94a3b8" />
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
                          <View style={[styles.statusBadge, { backgroundColor: item.dispense_status === 'DISPENSED' ? '#dcfce7' : '#fee2e2' }]}>
                            <Text style={[styles.statusText, { color: item.dispense_status === 'DISPENSED' ? '#166534' : '#991b1b' }]}>
                              {item.dispense_status === 'DISPENSED' ? t.staffPatientView.dispensed : t.staffPatientView.pendingDispense}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.prescriptionDate}>{formatDate(item.date_prescribed)}</Text>
                      </View>
                      <Divider style={{ marginVertical: 10 }} />
                      {item.details?.map((drug, dIdx) => (
                        <View key={dIdx} style={[styles.drugItem, { borderRightWidth: 4, borderRightColor: drug.is_active ? '#059669' : '#94a3b8' }]}>
                          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={styles.drugNameRow}>
                              <Icon name="pill" type="material-community" size={20} color={drug.is_active ? "#204a42" : "#94a3b8"} />
                              <Text style={[styles.drugName, { color: drug.is_active ? '#204a42' : '#94a3b8' }]}>{drug.drug_name} {!drug.is_active && `(${t.staffPatientView.canceled})`}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: drug.status ? '#059669' : '#f59e0b', marginRight: 4 }}>
                                {drug.status ? t.staffPatientView.drugDispensed : t.staffPatientView.drugNotDispensed}
                              </Text>
                              <Icon name={drug.status ? "check-circle" : "clock-outline"} type="material-community" size={18} color={drug.status ? "#059669" : "#f59e0b"} />
                            </View>
                          </View>
                          <Text style={styles.drugInstructions}>{drug.instructions}</Text>
                        </View>
                      ))}
                    </View>
                  )) : <View style={styles.emptyState}><Icon name="pill-off" type="material-community" size={60} color="#cbd5e1" /><Text style={styles.emptyText}>{t.staffPatientView.noMedications}</Text></View>}
                </View>
              )}
              {subTabIndex === 1 && medicalTests.map((test, idx) => (
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
              ))}
              {subTabIndex === 2 && radiology.map((rad, idx) => (
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
              ))}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: Notes */}
        {tabIndex === 3 && (
          <View style={styles.emptyState}>
            <Icon name="note-text-outline" type="material-community" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t.staffPatientView.comingSoon}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87898b56",
  },
  modernHeader: {
    height: 235,
    backgroundColor: "#204a42",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 34,
    overflow: "hidden",
    position: "relative",
    elevation: 14,
    shadowColor: "#204a42",
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
    color: "#d1fae5",
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
    borderColor: "#d1fae5",
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
    shadowColor: "#204a42",
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
    backgroundColor: "#ecfdf5",
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
    color: "#94a3b8",
    fontWeight: "700",
    textAlign: "right",
  },

  infoMiniValue: {
    fontSize: 15,
    color: "#204a42",
    fontWeight: "900",
    marginTop: 2,
    textAlign: "right",
  },

  headerCircleOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(5, 150, 105, 0.28)",
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
  tabIndicator: { backgroundColor: "#204a42", height: 3, borderRadius: 3 },
  tabTitle: { fontSize: 11, fontWeight: "bold", marginTop: 3, textAlign: 'center' },
  tabViewContent: { flex: 1, width: width },
  scrollPadding: { padding: 20 },
  subTabContainer: { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', margin: 15, borderRadius: 12, padding: 4 },
  subTabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: '#fff', elevation: 2 },
  subTabText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  subTextActive: { color: '#204a42', fontWeight: 'bold' },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionHeading: { fontSize: 20, fontWeight: "800", color: "#1e293b", textAlign: "right", marginBottom: 15 },
  editBtn: { flexDirection: 'row-reverse', backgroundColor: '#204a42', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginRight: 5 },
  statsBtn: { flexDirection: 'row-reverse', backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center', gap: 4 },
  statsBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginRight: 5 },
  nutritionCard: { backgroundColor: "#fff", borderRadius: 25, overflow: "hidden", elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  planHeader: { backgroundColor: "#204a42", padding: 15, flexDirection: "row-reverse", justifyContent: 'space-between', alignItems: "center" },
  planTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  planBody: { padding: 20 },
  dateInfoContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f0f9ff', borderRadius: 15, padding: 10, marginBottom: 15 },
  dateSubBox: { alignItems: 'center' },
  dateLabelText: { fontSize: 11, color: '#0369a1', fontWeight: 'bold' },
  dateValueText: { fontSize: 13, color: '#1e293b', fontWeight: '800' },
  descriptionSection: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#0ea5e9', marginBottom: 15 },
  descTitle: { fontSize: 12, color: '#64748b', fontWeight: 'bold', textAlign: 'right' },
  descContent: { fontSize: 14, color: '#334155', textAlign: 'right', marginTop: 4, lineHeight: 20 },
  infoBox: { flexDirection: "row-reverse", marginBottom: 15 },
  infoLabel: { fontSize: 13, color: "#64748b", textAlign: "right" },
  infoTextValue: { fontSize: 15, fontWeight: "700", color: "#334155", textAlign: "right" },
  mealBox: { flexDirection: "row-reverse", alignItems: 'center', marginBottom: 12, backgroundColor: '#fafafa', padding: 10, borderRadius: 12 },
  mealIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  mealLabel: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  mealContent: { fontSize: 14, color: '#334155', textAlign: 'right', marginTop: 2 },
  notesBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, marginTop: 5 },
  notesText: { fontSize: 12, color: '#64748b', marginRight: 8, flex: 1, textAlign: 'right' },
  sessionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3, borderRightWidth: 6, borderRightColor: '#204a42' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionDateBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionDate: { fontSize: 13, color: '#64748b', marginLeft: 5 },
  sessionId: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  sessionStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, gap: 3 },
  sessionStatusText: { fontSize: 11, fontWeight: 'bold' },
  sessionMetricsRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 10 },
  sessionMetricBox: { flex: 1, alignItems: 'center', gap: 3 },
  sessionMetricDivider: { width: 1, backgroundColor: '#e2e8f0' },
  sessionContent: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  sessionMetric: { flex: 1, alignItems: 'flex-end' },
  sessionTapHint: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-end' },
  sessionTapHintText: { fontSize: 11, color: '#94a3b8', marginRight: 2 },
  metricLabel: { fontSize: 11, color: '#94a3b8' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: "#94a3b8", textAlign: "center", marginTop: 10 },
  prescriptionCard: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, borderRightWidth: 5, borderRightColor: '#059669' },
  prescriptionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  prescriptionDoctor: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  prescriptionDate: { fontSize: 13, color: '#64748b' },
  drugItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  drugNameRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
  drugName: { fontSize: 15, fontWeight: 'bold', color: '#204a42', marginRight: 8 },
  drugInstructions: { fontSize: 14, color: '#475569', textAlign: 'right' },
  reportCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 15, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#204a42' },
  reportHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportTitleRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  reportTitle: { fontSize: 17, fontWeight: 'bold', color: '#1e293b', marginRight: 8 },
  reportDate: { fontSize: 13, color: '#64748b' },
  reportContent: { marginBottom: 15 },
  reportDetail: { fontSize: 15, color: '#475569', textAlign: 'right', marginBottom: 4 },
  boldLabel: { fontWeight: 'bold', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-end', marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  downloadBtn: { backgroundColor: '#204a42', borderRadius: 10, marginTop: 10, height: 48 }
});

export default StaffPatientView;