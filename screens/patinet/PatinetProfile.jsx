import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Tab, TabView, Button, Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const PatientProfile = ({ navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [subTabIndex, setSubTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalTests, setMedicalTests] = useState([]);
  const [radiology, setRadiology] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);

  const fetchPatientData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/profile`);

      const patientInfo = response.data.patient;
      setPatient(patientInfo);

      if (patientInfo?.patient_id) {
        const pId = patientInfo.patient_id;
        await Promise.all([
          fetchNutritionPlan(pId),
          fetchSessions(pId),
          fetchPrescriptions(pId),
          fetchMedicalTests(pId),
          fetchRadiology(pId),
          fetchMyAppointments(),
        ]);
      }
    } catch (error) {
      console.log("Fetch Error:", error.message);
      Alert.alert("تنبيه", "حدث خطأ أثناء تحديث البيانات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPatientData(); }, [fetchPatientData]));

  const fetchMyAppointments = async () => {
    try {
      const response = await api.get(`/clinic-consultations`);
      const activeAppts = (response.data || []).filter(a => a.status !== "CANCELLED");
      setMyAppointments(activeAppts);
    } catch (e) {
      setMyAppointments([]);
    }
  };

  const formatTime = (t) => {
    if (!t) return "";
    let [h, m] = t.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? "م" : "ص"}`;
  };

  const fetchNutritionPlan = async (id) => {
    try {
      const response = await api.get(`/nutrition-programs?patientId=${id}`);
      if (response.data && response.data.length > 0) {
        const sorted = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
        setNutritionPlan(sorted[0]);
      } else {
        setNutritionPlan(null);
      }
    } catch (e) {
      setNutritionPlan(null);
    }
  };

  const fetchSessions = async (id) => {
    try {
      const response = await api.get(`/dialysis-sessions?patientId=${id}`);
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setSessions([]);
    }
  };

  const fetchPrescriptions = async (id) => {
    try {
      const response = await api.get(`/prescriptions?patientId=${id}`);
      setPrescriptions(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setPrescriptions([]);
    }
  };

  const fetchMedicalTests = async (id) => {
    try {
      const response = await api.get(`/medical-tests?patientId=${id}`);
      setMedicalTests(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setMedicalTests([]);
    }
  };

  const fetchRadiology = async (id) => {
    try {
      const response = await api.get(`/radiology-requests?patientId=${id}`);
      setRadiology(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setRadiology([]);
    }
  };

  const formatDate = (date) => {
    if (!date) return "قيد الانتظار";
    return new Date(date).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDownload = async (id, type) => {
    if (!id) {
      Alert.alert("تنبيه", "الملف غير متوفر حالياً");
      return;
    }

    try {
      const endpoint =
        type === "lab"
          ? `/medical-tests/${id}/result-url`
          : `/radiology-requests/${id}/file-url`;

      const response = await api.get(endpoint);
      const fullUrl = response.data.url;

      if (!fullUrl) {
        Alert.alert("خطأ", "فشل في جلب رابط الملف");
        return;
      }

      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert("خطأ", "لا يمكن فتح هذا النوع من الروابط على جهازك.");
      }
    } catch (e) {
      console.log("Download Error:", e.message);
      Alert.alert("خطأ", "حدث مشكلة أثناء محاولة فتح الملف.");
    }
  };

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
      <View style={[styles.mealIconCircle, { backgroundColor: color + "20" }]}>
        <Icon name={icon} type="material-community" size={20} color={color} />
      </View>
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={[styles.mealLabel, { color }]}>{label}</Text>
        <Text style={styles.mealContent}>{content || "لم يتم تحديد وجبة"}</Text>
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
        <Text style={styles.reportDetail}>
          <Text style={styles.boldLabel}>الطبيب:</Text> د. {doctor || "غير محدد"}
        </Text>

        <Text style={styles.reportDetail}>
          <Text style={styles.boldLabel}>الوصف:</Text> {description || "لا يوجد وصف"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status === "PENDING" || status === "pending" ? "#fef3c7" : "#dcfce7",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  status === "PENDING" || status === "pending" ? "#92400e" : "#166534",
              },
            ]}
          >
            {status === "PENDING" || status === "pending" ? "قيد الانتظار" : "مكتمل"}
          </Text>
        </View>
      </View>

      <Button
        title="معاينة الملف"
        icon={
          <Icon
            name="file-pdf-box"
            type="material-community"
            color="white"
            size={20}
            containerStyle={{ marginLeft: 5 }}
          />
        }
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
        <Text style={styles.loadingText}>جاري تحديث البيانات...</Text>
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
            onPress={() => navigation.navigate("PatinetInfo", {})}
            activeOpacity={0.85}
          >
            <Icon name="account-edit-outline" type="material-community" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.patientHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("PatinetInfo", {})}
            activeOpacity={0.9}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatarContainer}>
                <Icon name="account" type="material-community" size={68} color="#204a42" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.patientHeaderInfo}>
            <Text style={styles.patientNameText}>
              {patient?.full_name || "اسم المريض"}
            </Text>
          </View>
        </View>
      </View>

      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        indicatorStyle={styles.tabIndicator}
        containerStyle={styles.tabBar}
        variant="default"
      >
        <Tab.Item
          title="التغذية"
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="food-apple" type="material-community" size={22} color={tabIndex === 0 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title="الجلسات"
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="clock-outline" type="material-community" size={22} color={tabIndex === 1 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title="الفحوصات"
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="clipboard-pulse" type="material-community" size={22} color={tabIndex === 2 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title="المواعيد"
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="calendar-clock" type="material-community" size={22} color={tabIndex === 3 ? "#204a42" : "#94a3b8"} />}
        />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>البرنامج الغذائي</Text>

            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{nutritionPlan.title || "الخطة الحالية"}</Text>
                  <Icon name="calendar-check" type="material-community" color="#fff" size={20} />
                </View>

                <View style={styles.planBody}>
                  <View style={styles.dateInfoContainer}>
                    <View style={styles.dateSubBox}>
                      <Text style={styles.dateLabelText}>من تاريخ:</Text>
                      <Text style={styles.dateValueText}>
                        {formatDate(nutritionPlan.startDate || nutritionPlan.start_date)}
                      </Text>
                    </View>

                    <Icon name="arrow-left-thin" type="material-community" size={20} color="#cbd5e1" />

                    <View style={styles.dateSubBox}>
                      <Text style={styles.dateLabelText}>إلى تاريخ:</Text>
                      <Text style={styles.dateValueText}>
                        {formatDate(nutritionPlan.endDate || nutritionPlan.end_date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.descriptionSection}>
                    <Text style={styles.descTitle}>وصف البرنامج:</Text>
                    <Text style={styles.descContent}>
                      {nutritionPlan.description || "لا يوجد وصف"}
                    </Text>
                  </View>

                  <Divider style={{ marginVertical: 15 }} />

                  <MealItem label="الفطور" content={nutritionPlan.breakfast} icon="coffee-outline" color="#f59e0b" />
                  <MealItem label="الغداء" content={nutritionPlan.lunch} icon="food-turkey" color="#ef4444" />
                  <MealItem label="العشاء" content={nutritionPlan.dinner} icon="weather-night" color="#3b82f6" />

                  <Divider style={{ marginVertical: 15 }} />

                  <InfoItem label="المسموحات" value={nutritionPlan.allowed_items || nutritionPlan.allowedItems} icon="check-decagram" color="#059669" />
                  <InfoItem label="الممنوعات" value={nutritionPlan.forbidden_items || nutritionPlan.forbiddenItems} icon="alert-octagon" color="#ef4444" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا يوجد برنامج غذائي حالي</Text>
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>سجل جلسات الغسيل</Text>

            {sessions.length > 0 ? sessions.map((session, index) => {
              const statusConfig = {
                COMPLETED: { label: "مكتملة", bg: "#dcfce7", text: "#166534", icon: "check-circle-outline", borderColor: "#059669" },
                IN_PROGRESS: { label: "جارية", bg: "#fef3c7", text: "#92400e", icon: "progress-clock", borderColor: "#f59e0b" },
                SCHEDULED: { label: "مجدولة", bg: "#dbeafe", text: "#1e40af", icon: "calendar-clock", borderColor: "#3b82f6" },
              };

              const sc = statusConfig[session.status] || {
                label: session.status,
                bg: "#f1f5f9",
                text: "#64748b",
                icon: "help-circle-outline",
                borderColor: "#94a3b8",
              };

              const isActive = session.status === "IN_PROGRESS" || session.status === "PENDING";

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sessionCard,
                    { borderRightColor: sc.borderColor },
                    isActive && styles.sessionCardActive,
                  ]}
                  onPress={() => {
                    if (isActive) {
                      navigation.navigate("PatientSessionScreen", {
                        sessionId: session.session_id || session.id,
                        patientName: patient?.full_name,
                        startTime: session.start_time,
                      });
                    } else {
                      navigation.navigate("PatientSessionDetailView", {
                        sessionId: session.session_id || session.id,
                        patientId: patient?.patient_id,
                      });
                    }
                  }}
                  activeOpacity={0.75}
                >
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

                  <View style={styles.sessionMetricsRow}>
                    <View style={styles.sessionMetricBox}>
                      <Icon name="heart-pulse" type="material-community" size={14} color="#ef4444" />
                      <Text style={styles.metricLabel}>ضغط الدم قبل</Text>
                      <Text style={[styles.metricValue, { fontSize: 13 }]}>
                        {session.blood_pressure_before || "—"}
                      </Text>
                    </View>

                    <View style={styles.sessionMetricDivider} />

                    <View style={styles.sessionMetricBox}>
                      <Icon name="heart-outline" type="material-community" size={14} color="#f97316" />
                      <Text style={styles.metricLabel}>ضغط الدم بعد</Text>
                      <Text style={[styles.metricValue, { fontSize: 13 }]}>
                        {session.blood_pressure_after || "—"}
                      </Text>
                    </View>

                    <View style={styles.sessionMetricDivider} />

                    <View style={styles.sessionMetricBox}>
                      <Icon name="scale" type="material-community" size={14} color="#3b82f6" />
                      <Text style={styles.metricLabel}>الوزن</Text>
                      <Text style={[styles.metricValue, { fontSize: 13 }]}>
                        {session.weight_before != null ? `${session.weight_before} kg` : "—"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sessionTapHint}>
                    {isActive ? (
                      <View style={styles.activeSessionBanner}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeSessionText}>جلسة جارية — اضغط للدخول والوزن</Text>
                      </View>
                    ) : (
                      <>
                        <Icon name="chevron-left" type="material-community" size={16} color="#94a3b8" />
                        <Text style={styles.sessionTapHintText}>اضغط لعرض كل تفاصيل الجلسة</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyState}>
                <Icon name="database-off" type="material-community" size={50} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا توجد جلسات مسجلة</Text>
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                onPress={() => setSubTabIndex(0)}
                style={[styles.subTabItem, subTabIndex === 0 && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, subTabIndex === 0 && styles.subTextActive]}>
                  الأدوية
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubTabIndex(1)}
                style={[styles.subTabItem, subTabIndex === 1 && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, subTabIndex === 1 && styles.subTextActive]}>
                  المختبر
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubTabIndex(2)}
                style={[styles.subTabItem, subTabIndex === 2 && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, subTabIndex === 2 && styles.subTextActive]}>
                  الأشعة
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              {subTabIndex === 0 && (
                <View>
                  <Text style={styles.sectionHeading}>الوصفات الطبية</Text>

                  {prescriptions.length > 0 ? prescriptions.map((item, idx) => (
                    <View key={idx} style={styles.prescriptionCard}>
                      <View style={styles.prescriptionHeader}>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.prescriptionDoctor}>
                            د. {item.doctor?.full_name}
                          </Text>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  item.dispense_status === "DISPENSED" ? "#dcfce7" : "#fee2e2",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    item.dispense_status === "DISPENSED" ? "#166534" : "#991b1b",
                                },
                              ]}
                            >
                              {item.dispense_status === "DISPENSED" ? "تم الصرف" : "بانتظار الصرف"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.prescriptionDate}>
                          {formatDate(item.date_prescribed)}
                        </Text>
                      </View>

                      <Divider style={{ marginVertical: 10 }} />

                      {item.details?.map((drug, dIdx) => (
                        <View
                          key={dIdx}
                          style={[
                            styles.drugItem,
                            {
                              borderRightWidth: 4,
                              borderRightColor: drug.is_active ? "#059669" : "#94a3b8",
                            },
                          ]}
                        >
                          <View style={styles.drugNameRow}>
                            <Icon
                              name="pill"
                              type="material-community"
                              size={20}
                              color={drug.is_active ? "#204a42" : "#94a3b8"}
                            />
                            <Text
                              style={[
                                styles.drugName,
                                { color: drug.is_active ? "#204a42" : "#94a3b8" },
                              ]}
                            >
                              {drug.drug_name}
                            </Text>
                          </View>

                          <Text style={styles.drugInstructions}>{drug.instructions}</Text>
                        </View>
                      ))}
                    </View>
                  )) : (
                    <View style={styles.emptyState}>
                      <Icon name="pill-off" type="material-community" size={60} color="#cbd5e1" />
                      <Text style={styles.emptyText}>لا توجد أدوية</Text>
                    </View>
                  )}
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
                  status={test.status || (test.result ? "COMPLETED" : "PENDING")}
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
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>إدارة المواعيد</Text>

            <TouchableOpacity
              style={styles.bookingPrimaryBtn}
              onPress={() => navigation.navigate("DatesDoctor", { patientId: patient?.patient_id })}
              activeOpacity={0.8}
            >
              <Icon name="calendar-plus" type="material-community" color="white" size={24} />
              <Text style={styles.bookingPrimaryBtnText}>إنشاء وإدارة المواعيد</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 25 }}>
              <Text style={[styles.sectionHeading, { fontSize: 18, marginBottom: 15 }]}>
                مواعيدك المحجوزة
              </Text>

              {myAppointments.length > 0 ? myAppointments.map((appt, index) => (
                <View key={appt.appointment_id || index} style={styles.apptCardSimple}>
                  <View style={styles.apptCardIcon}>
                    <Icon name="calendar-clock" type="material-community" color="#059669" size={28} />
                  </View>

                  <View style={styles.apptCardInfo}>
                    <Text style={styles.apptCardDoc}>د. {appt.doctor?.full_name}</Text>

                    <View style={styles.apptCardRow}>
                      <Icon name="calendar" type="material-community" size={14} color="#64748b" />
                      <Text style={styles.apptCardDetail}>{appt.appt_date}</Text>

                      <View style={{ width: 10 }} />

                      <Icon name="clock-outline" type="material-community" size={14} color="#64748b" />
                      <Text style={styles.apptCardDetail}>{formatTime(appt.appt_time)}</Text>
                    </View>
                  </View>
                </View>
              )) : (
                <View style={styles.emptyApptBox}>
                  <Icon name="calendar-blank" type="material-community" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyText}>لا توجد مواعيد نشطة حالياً</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </TabView.Item>
      </TabView>
    </View>
  );
};

export default PatientProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748b",
  },

  modernHeader: {
    height: 235,
    backgroundColor: "#204a42",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 40,
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

  tabBar: {
    backgroundColor: "#fff",
    elevation: 0,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },

  tabIndicator: {
    backgroundColor: "#204a42",
    height: 3,
  },

  tabTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },

  tabViewContent: {
    flex: 1,
    width,
  },

  scrollPadding: {
    padding: 20,
  },

  subTabContainer: {
    flexDirection: "row-reverse",
    backgroundColor: "#f1f5f9",
    margin: 15,
    borderRadius: 12,
    padding: 4,
  },

  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  subTabActive: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  subTabText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  subTextActive: {
    color: "#204a42",
    fontWeight: "bold",
  },

  sectionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "right",
    marginBottom: 15,
  },

  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    overflow: "hidden",
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },

  planHeader: {
    backgroundColor: "#204a42",
    padding: 15,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  planTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  planBody: {
    padding: 20,
  },

  dateInfoContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
  },

  dateSubBox: {
    alignItems: "center",
  },

  dateLabelText: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "bold",
  },

  dateValueText: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "800",
  },

  descriptionSection: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderRightWidth: 4,
    borderRightColor: "#0ea5e9",
    marginBottom: 15,
  },

  descTitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "bold",
    textAlign: "right",
  },

  descContent: {
    fontSize: 14,
    color: "#334155",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 20,
  },

  infoBox: {
    flexDirection: "row-reverse",
    marginBottom: 15,
  },

  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "right",
  },

  infoTextValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    textAlign: "right",
  },

  mealBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fafafa",
    padding: 10,
    borderRadius: 12,
  },

  mealIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  mealLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
  },

  mealContent: {
    fontSize: 14,
    color: "#334155",
    textAlign: "right",
    marginTop: 2,
  },

  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    borderRightWidth: 6,
    borderRightColor: "#204a42",
  },

  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sessionDateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  sessionDate: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 5,
  },

  sessionId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },

  sessionStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },

  sessionStatusText: {
    fontSize: 11,
    fontWeight: "bold",
  },

  sessionMetricsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },

  sessionMetricBox: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },

  sessionMetricDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },

  sessionTapHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  sessionTapHintText: {
    fontSize: 11,
    color: "#94a3b8",
    marginRight: 2,
  },

  sessionCardActive: {
    borderWidth: 2,
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },

  activeSessionBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },

  activeSessionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },

  metricLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },

  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
  },

  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10,
  },

  prescriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    borderRightWidth: 5,
    borderRightColor: "#059669",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  prescriptionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  prescriptionDoctor: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e293b",
  },

  prescriptionDate: {
    fontSize: 13,
    color: "#64748b",
  },

  drugItem: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  drugNameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 4,
  },

  drugName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#204a42",
    marginRight: 8,
  },

  drugInstructions: {
    fontSize: 14,
    color: "#475569",
    textAlign: "right",
  },

  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#204a42",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  reportHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  reportTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  reportTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1e293b",
    marginRight: 8,
  },

  reportDate: {
    fontSize: 13,
    color: "#64748b",
  },

  reportContent: {
    marginBottom: 15,
  },

  reportDetail: {
    fontSize: 15,
    color: "#475569",
    textAlign: "right",
    marginBottom: 4,
  },

  boldLabel: {
    fontWeight: "bold",
    color: "#1e293b",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-end",
    marginTop: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },

  downloadBtn: {
    backgroundColor: "#204a42",
    borderRadius: 10,
    marginTop: 10,
    height: 48,
  },

  bookingPrimaryBtn: {
    backgroundColor: "#204a42",
    flexDirection: "row-reverse",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#204a42",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  bookingPrimaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginRight: 10,
  },

  apptCardSimple: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderRightWidth: 5,
    borderRightColor: "#059669",
    elevation: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  apptCardIcon: {
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 12,
    marginLeft: 15,
  },

  apptCardInfo: {
    flex: 1,
    alignItems: "flex-start",
  },

  apptCardDoc: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
    textAlign: "right",
    width: "100%",
  },

  apptCardRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  apptCardDetail: {
    fontSize: 13,
    color: "#64748b",
    marginRight: 4,
  },

  emptyApptBox: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    marginTop: 10,
  },
});