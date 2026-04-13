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
import { Tab, TabView, Button, Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const StaffPatientView = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [subTabIndex, setSubTabIndex] = useState(0);
  const [infoSubTabIndex, setInfoSubTabIndex] = useState(0);
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
        Alert.alert("خطأ", "لم يتم تمرير رقم المريض");
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
      Alert.alert("خطأ", "فشل في تحديث بيانات الملف الشخصي");
    } finally {
      setLoading(false);
    }
  }, [patientId, navigation]);

  useFocusEffect(useCallback(() => { fetchPatientData(); }, [fetchPatientData]));

  const formatDate = (date) => {
    if (!date) return "قيد الانتظار";
    return new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownload = async (url) => {
    if (!url) { Alert.alert("تنبيه", "الملف غير متوفر حالياً"); return; }
    const fullUrl = url.startsWith('http') ? url : `${api.defaults.baseURL}${url}`;
    try { await Linking.openURL(fullUrl); } catch (e) { Alert.alert("خطأ", "لا يمكن فتح الرابط حالياً."); }
  };

  // --- Sub-Components ---
  const InfoItem = ({ label, value, icon, color = "#059669" }) => (
    <View style={styles.infoBox}>
      <Icon name={icon} type="material-community" size={22} color={color} />
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoTextValue}>{value || "غير محدد"}</Text>
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
        <Text style={styles.mealContent}>{content || "لم يتم تحديد وجبة"}</Text>
      </View>
    </View>
  );

  const MedicalCard = ({ title, date, doctor, description, status, fileUrl, typeIcon }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Icon name={typeIcon} type="material-community" size={26} color="#204a42" />
          <Text style={styles.reportTitle}>{title}</Text>
        </View>
        <Text style={styles.reportDate}>{formatDate(date)}</Text>
      </View>
      <View style={styles.reportContent}>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>الطبيب:</Text> د. {doctor || "غير محدد"}</Text>
        <Text style={styles.reportDetail}><Text style={styles.boldLabel}>الوصف:</Text> {description || "لا يوجد وصف"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (status === 'PENDING' || status === 'pending') ? '#fef3c7' : '#dcfce7' }]}>
          <Text style={[styles.statusText, { color: (status === 'PENDING' || status === 'pending') ? '#92400e' : '#166534' }]}>
            {(status === 'PENDING' || status === 'pending') ? 'قيد الانتظار' : 'مكتمل'}
          </Text>
        </View>
      </View>
      <Button
        title="معاينة"
        icon={<Icon name="file-pdf-box" type="material-community" color="white" size={20} />}
        buttonStyle={styles.downloadBtn}
        onPress={() => handleDownload(fileUrl)}
        disabled={!fileUrl}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>جاري تحديث البيانات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" type="material-community" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatarCircle}><Icon name="account-circle" type="material-community" size={80} color="#cbd5e1" /></View>
        <Text style={styles.patientName}>{patient?.full_name}</Text>
        <View style={styles.idBadge}><Text style={styles.idText}>رقم المريض: {patient?.patient_id}</Text></View>

        <View style={styles.quickStats}>
          <View style={styles.statBox}><Text style={styles.statLabel}>فصيلة الدم</Text><Text style={styles.statValue}>{patient?.blood_type || "N/A"}</Text></View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}><Text style={styles.statLabel}>الجنس</Text><Text style={styles.statValue}>{patient?.gender === 'Male' ? 'ذكر' : 'أنثى'}</Text></View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}><Text style={styles.statLabel}>الهوية</Text><Text style={[styles.statValue, { fontSize: 13 }]}>{patient?.national_id || "---"}</Text></View>
        </View>
      </View>

      <Tab value={tabIndex} onChange={setTabIndex} indicatorStyle={styles.tabIndicator} containerStyle={styles.tabBar} variant="default" scrollable>
        <Tab.Item title="التغذية" titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} icon={<Icon name="food-apple" type="material-community" size={22} color={tabIndex === 0 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title="الجلسات" titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} icon={<Icon name="clock-outline" type="material-community" size={22} color={tabIndex === 1 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title="الفحوصات" titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} icon={<Icon name="clipboard-pulse" type="material-community" size={22} color={tabIndex === 2 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title="الملاحظات" titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} icon={<Icon name="note-edit-outline" type="material-community" size={22} color={tabIndex === 3 ? "#204a42" : "#94a3b8"} />} />
        <Tab.Item title="معلومات" titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]} icon={<Icon name="card-account-details-outline" type="material-community" size={22} color={tabIndex === 4 ? "#204a42" : "#94a3b8"} />} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        {/* TAB 0: Nutrition */}
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>البرنامج الغذائي</Text>
              {canEditNutrition && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })}
                  style={styles.editBtn}>
                  <Icon name="pencil-outline" type="material-community" size={16} color="#fff" />
                  <Text style={styles.editBtnText}>تعديل</Text>
                </TouchableOpacity>
              )}
            </View>

            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{nutritionPlan.title || "الخطة الحالية"}</Text>
                  <Icon name="calendar-check" type="material-community" color="#fff" size={20} />
                </View>
                <View style={styles.planBody}>
                  <View style={styles.dateInfoContainer}>
                    <View style={styles.dateSubBox}><Text style={styles.dateLabelText}>من تاريخ:</Text><Text style={styles.dateValueText}>{formatDate(nutritionPlan.startDate || nutritionPlan.start_date)}</Text></View>
                    <Icon name="arrow-left-thin" type="material-community" size={20} color="#cbd5e1" />
                    <View style={styles.dateSubBox}><Text style={styles.dateLabelText}>إلى تاريخ:</Text><Text style={styles.dateValueText}>{formatDate(nutritionPlan.endDate || nutritionPlan.end_date)}</Text></View>
                  </View>

                  <View style={styles.descriptionSection}>
                    <Text style={styles.descTitle}>وصف البرنامج:</Text>
                    <Text style={styles.descContent}>{nutritionPlan.description || "لا يوجد وصف"}</Text>
                  </View>

                  <Divider style={{ marginVertical: 15 }} />

                  <Text style={[styles.sectionHeading, { fontSize: 16, marginBottom: 10 }]}>توزيع الوجبات اليومية:</Text>
                  <MealItem label="الفطور" content={nutritionPlan.breakfast} icon="coffee-outline" color="#f59e0b" />
                  <MealItem label="الغداء" content={nutritionPlan.lunch} icon="food-turkey" color="#ef4444" />
                  <MealItem label="العشاء" content={nutritionPlan.dinner} icon="weather-night" color="#3b82f6" />

                  {(nutritionPlan.meal_notes || nutritionPlan.mealNotes) && (
                    <View style={styles.notesBox}>
                      <Icon name="information-outline" type="material-community" size={18} color="#64748b" />
                      <Text style={styles.notesText}>{nutritionPlan.meal_notes || nutritionPlan.mealNotes}</Text>
                    </View>
                  )}

                  <Divider style={{ marginVertical: 15 }} />

                  <InfoItem label="المسموحات" value={nutritionPlan.allowed_items || nutritionPlan.allowedItems} icon="check-decagram" color="#059669" />
                  <InfoItem label="الممنوعات" value={nutritionPlan.forbidden_items || nutritionPlan.forbiddenItems} icon="alert-octagon" color="#ef4444" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا يوجد برنامج غذائي حالي</Text>
                {canEditNutrition && (
                  <Button
                    title="إنشاء برنامج"
                    onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })}
                    buttonStyle={[styles.editBtn, { marginTop: 15, paddingHorizontal: 20 }]}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        {/* TAB 1: Sessions */}
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>سجل جلسات الغسيل</Text>
              <TouchableOpacity
                style={styles.statsBtn}
                onPress={() => navigation.navigate("PatientSessionStatistics", {
                  patientId: patient?.patient_id,
                  patientName: patient?.full_name,
                })}
              >
                <Icon name="chart-line" type="material-community" size={16} color="#fff" />
                <Text style={styles.statsBtnText}>إحصائيات</Text>
              </TouchableOpacity>
            </View>
            {sessions.length > 0 ? sessions.map((session, index) => (
              <View key={index} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionDateBox}>
                    <Icon name="calendar-range" type="material-community" size={16} color="#64748b" />
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                  </View>
                  <Text style={styles.sessionId}>#{session.id}</Text>
                </View>
                <View style={styles.sessionContent}>
                  <View style={styles.sessionMetric}><Text style={styles.metricLabel}>ضغط الدم</Text><Text style={styles.metricValue}>{session.blood_pressure_before} ← {session.blood_pressure_after}</Text></View>
                  <View style={styles.sessionMetric}><Text style={styles.metricLabel}>الوزن</Text><Text style={styles.metricValue}>{session.weight_before}kg ← {session.weight_after}kg</Text></View>
                </View>
              </View>
            )) : <View style={styles.emptyState}><Icon name="database-off" type="material-community" size={50} color="#cbd5e1" /><Text style={styles.emptyText}>لا توجد جلسات مسجلة</Text></View>}
          </ScrollView>
        </TabView.Item>

        {/* TAB 2: Medical Tests */}
        <TabView.Item style={styles.tabViewContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity onPress={() => setSubTabIndex(0)} style={[styles.subTabItem, subTabIndex === 0 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 0 && styles.subTextActive]}>الأدوية</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSubTabIndex(1)} style={[styles.subTabItem, subTabIndex === 1 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 1 && styles.subTextActive]}>المختبر</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSubTabIndex(2)} style={[styles.subTabItem, subTabIndex === 2 && styles.subTabActive]}><Text style={[styles.subTabText, subTabIndex === 2 && styles.subTextActive]}>الأشعة</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              {subTabIndex === 0 && (
                <View>
                  <Text style={styles.sectionHeading}>الوصفات الطبية</Text>
                  {prescriptions.length > 0 ? prescriptions.map((item, idx) => (
                    <View key={idx} style={styles.prescriptionCard}>
                      <View style={styles.prescriptionHeader}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.prescriptionDoctor}>د. {item.doctor?.full_name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: item.dispense_status === 'DISPENSED' ? '#dcfce7' : '#fee2e2' }]}>
                            <Text style={[styles.statusText, { color: item.dispense_status === 'DISPENSED' ? '#166534' : '#991b1b' }]}>
                              {item.dispense_status === 'DISPENSED' ? 'تم الصرف' : 'بانتظار الصرف'}
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
                              <Text style={[styles.drugName, { color: drug.is_active ? '#204a42' : '#94a3b8' }]}>{drug.drug_name} {!drug.is_active && "(ملغي)"}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: drug.status ? '#059669' : '#f59e0b', marginRight: 4 }}>
                                {drug.status ? 'صُرِف' : 'لم يُصرف'}
                              </Text>
                              <Icon name={drug.status ? "check-circle" : "clock-outline"} type="material-community" size={18} color={drug.status ? "#059669" : "#f59e0b"} />
                            </View>
                          </View>
                          <Text style={styles.drugInstructions}>{drug.instructions}</Text>
                        </View>
                      ))}
                    </View>
                  )) : <View style={styles.emptyState}><Icon name="pill-off" type="material-community" size={60} color="#cbd5e1" /><Text style={styles.emptyText}>لا توجد أدوية</Text></View>}
                </View>
              )}
              {subTabIndex === 1 && medicalTests.map((test, idx) => (
                <MedicalCard key={idx} title={test.test_type} date={test.date_completed} doctor={test.doctor?.full_name} description={test.description} status={test.result ? 'COMPLETED' : 'PENDING'} fileUrl={test.result} typeIcon="test-tube" />
              ))}
              {subTabIndex === 2 && radiology.map((rad, idx) => (
                <MedicalCard key={idx} title={rad.image_type} date={rad.completed_at} doctor={rad.doctor?.full_name} description={rad.description} status={rad.status} fileUrl={rad.image_path} typeIcon="file-image-outline" />
              ))}
            </ScrollView>
          </View>
        </TabView.Item>

        {/* TAB 3: Notes */}
        <TabView.Item style={styles.tabViewContent}>
          <View style={styles.emptyState}>
            <Icon name="note-text-outline" type="material-community" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>قريباً</Text>
          </View>
        </TabView.Item>

        {/* TAB 4: Patient Info */}
        <TabView.Item style={styles.tabViewContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity onPress={() => setInfoSubTabIndex(0)} style={[styles.subTabItem, infoSubTabIndex === 0 && styles.subTabActive]}>
                <Text style={[styles.subTabText, infoSubTabIndex === 0 && styles.subTextActive]}>البيانات الأساسية</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setInfoSubTabIndex(1)} style={[styles.subTabItem, infoSubTabIndex === 1 && styles.subTabActive]}>
                <Text style={[styles.subTabText, infoSubTabIndex === 1 && styles.subTextActive]}>التاريخ الطبي</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              {infoSubTabIndex === 0 && (
                <View>
                  <Text style={styles.sectionHeading}>البيانات الشخصية</Text>
                  <View style={styles.nutritionCard}>
                    <View style={styles.planBody}>
                      <InfoItem label="الاسم الكامل" value={patient?.full_name} icon="account" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="رقم الهوية" value={patient?.national_id} icon="card-account-details-outline" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="تاريخ الميلاد" value={patient?.date_of_birth || patient?.birth_date ? formatDate(patient?.date_of_birth || patient?.birth_date) : null} icon="calendar" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="الجنس" value={patient?.gender === 'Male' ? 'ذكر' : 'أنثى'} icon="gender-male-female" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="رقم الهاتف" value={patient?.phone_number || patient?.phone} icon="phone" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="رقم الطوارئ" value={patient?.emergency_contact} icon="phone-alert" color="#ef4444" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="البريد الإلكتروني" value={patient?.email} icon="email" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="العنوان" value={patient?.address} icon="map-marker" />
                    </View>
                  </View>
                </View>
              )}

              {infoSubTabIndex === 1 && (
                <View>
                  <Text style={styles.sectionHeading}>التاريخ الطبي للمريض</Text>
                  <View style={styles.nutritionCard}>
                    <View style={styles.planBody}>
                      <InfoItem label="فصيلة الدم" value={patient?.blood_type} icon="water-plus" color="#ef4444" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="الأمراض المزمنة" value={patient?.chronic_diseases} icon="medical-bag" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="الحساسية" value={patient?.allergies} icon="allergy" color="#f59e0b" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="تاريخ طبي إضافي" value={patient?.medical_history_notes} icon="file-document-outline" />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="حالة التدخين" value={patient?.smoking_status === true || patient?.smoking_status === "true" ? "مدخن" : "غير مدخن"} icon="smoking" color={patient?.smoking_status === true || patient?.smoking_status === "true" ? "#ef4444" : "#059669"} />
                      <Divider style={{ marginVertical: 10 }} />
                      <InfoItem label="ملاحظات عامة" value={patient?.notes} icon="note-text-outline" />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </TabView.Item>
      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#64748b' },
  headerContainer: { backgroundColor: "#204a42", paddingTop: 50, paddingBottom: 25, alignItems: "center", borderBottomRightRadius: 30, borderBottomLeftRadius: 30, elevation: 10, position: 'relative' },
  backButton: { position: 'absolute', left: 20, top: 50, zIndex: 10, padding: 5 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#059669" },
  patientName: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 10 },
  idBadge: { backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  idText: { color: "#94a3b8", fontSize: 13, fontWeight: "bold" },
  quickStats: { flexDirection: "row-reverse", width: "90%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 15, marginTop: 20, padding: 15, justifyContent: "space-around" },
  statBox: { alignItems: "center", flex: 1 },
  statLabel: { color: "#94a3b8", fontSize: 11, marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  tabBar: { backgroundColor: "#fff", elevation: 0, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabIndicator: { backgroundColor: "#204a42", height: 3 },
  tabTitle: { fontSize: 14, fontWeight: "bold", paddingHorizontal: 0, marginTop: 4 },
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
  sessionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 15, marginBottom: 15, elevation: 2, borderRightWidth: 6, borderRightColor: '#204a42' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sessionDateBox: { flexDirection: 'row', alignItems: 'center' },
  sessionDate: { fontSize: 13, color: '#64748b', marginLeft: 5 },
  sessionId: { fontSize: 14, fontWeight: '800' },
  sessionContent: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  sessionMetric: { flex: 1, alignItems: 'flex-end' },
  metricLabel: { fontSize: 11, color: '#94a3b8' },
  metricValue: { fontSize: 14, fontWeight: 'bold' },
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