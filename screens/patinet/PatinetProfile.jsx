import React, { useState, useCallback, useMemo } from "react";
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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Tab, TabView, Button, Icon, Divider } from "@rneui/base";
import api from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get("window");

const PatientProfile = ({ navigation }) => {
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
  const [myAppointments, setMyAppointments] = useState([]);

  // ─── حالة إدخال الوزن بعد الجلسة (lock) ───────────────────
  const [pendingWeightSession, setPendingWeightSession] = useState(null);
  const [weightAfterInput, setWeightAfterInput] = useState('');
  const [weightAfterError, setWeightAfterError] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);

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
      Alert.alert(t.error, t.patientProfile.fetchError);
    } finally {
      setLoading(false);
    }
  }, []);

  const ultrafiltrationAverage = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = sessions.filter(session => {
      if (session.status !== "COMPLETED") return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= thirtyDaysAgo;
    });

    if (recentSessions.length === 0) return null;

    let totalUF = 0;
    let count = 0;

    recentSessions.forEach(session => {
      let ufValue = parseFloat(session.fluid_removed);

      if (isNaN(ufValue) || ufValue <= 0) {
        const settingsWithUF = session.dialysisSettings?.filter(s => s.ultrafiltration_rate != null) || [];
        if (settingsWithUF.length > 0) {
          const rate = parseFloat(settingsWithUF[settingsWithUF.length - 1].ultrafiltration_rate);
          // If rate is large (e.g. 500 ml/h), assume it needs converting to liters for average consistency
          ufValue = rate > 50 ? rate / 1000 : rate;
        }
      }

      if (!isNaN(ufValue) && ufValue > 0) {
        totalUF += ufValue;
        count++;
      }
    });

    return count > 0 ? (totalUF / count).toFixed(2) : null;
  }, [sessions]);

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

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    let [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? t.time.pm : t.time.am}`;
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
      console.log("Sessions response data:", response.data);
      const sessionsList = Array.isArray(response.data) ? response.data : [];
      console.log("Sessions list length:", sessionsList.length);
      setSessions(sessionsList);

      // ── التحقق: هل في جلسة مكتملة بدون وزن بعد؟ ──
      const needsWeight = sessionsList.find(
        s => s.status === 'COMPLETED' && s.weight_after == null
      );
      if (needsWeight) {
        setPendingWeightSession(needsWeight);
      } else {
        setPendingWeightSession(null);
      }
    } catch (e) {
      console.log("fetchSessions Error:", e);
      Alert.alert(t.error, e.message);
      setSessions([]);
    }
  };

  // ── حفظ الوزن بعد الجلسة (من المريض) ─────────────────────────
  const handleSaveWeightAfter = async () => {
    const num = parseFloat(weightAfterInput);
    if (!weightAfterInput.trim()) {
      setWeightAfterError(t.patientProfile.weightRequired);
      return;
    }
    if (isNaN(num) || num < 20 || num > 300) {
      setWeightAfterError(t.patientProfile.weightInvalid);
      return;
    }
    setWeightAfterError('');

    try {
      setIsSavingWeight(true);
      const sid = pendingWeightSession.session_id || pendingWeightSession.id;
      await api.patch(`/dialysis-sessions/${sid}/status`, {
        weightAfter: num,
      });
      Alert.alert(t.success, t.patientProfile.weightSaved);
      setPendingWeightSession(null);
      setWeightAfterInput('');
      // إعادة جلب الجلسات
      if (patient?.patient_id) {
        fetchSessions(patient.patient_id);
      }
    } catch (err) {
      console.log('Save weight err:', err.response?.data);
      setWeightAfterError(t.patientProfile.weightSaveFailed);
    } finally {
      setIsSavingWeight(false);
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
    if (!date) return t.patientProfile.status.pending;
    return new Date(date).toLocaleDateString(t.vitalSigns.now === 'الآن' ? "ar-EG" : "en-US", {
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
        Alert.alert(t.error, t.failed);
        return;
      }

      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert(t.error, t.failed);
      }
    } catch (e) {
      console.log("Download Error:", e.message);
      Alert.alert(t.error, t.failed);
    }
  };

  const InfoItem = ({ label, value, icon, color = "#059669" }) => (
    <View style={styles.infoBox}>
      <Icon name={icon} type="material-community" size={22} color={color} />
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoTextValue}>{value || t.unknown}</Text>
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
        <Text style={styles.mealContent}>{content || t.patientProfile.noMeal}</Text>
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
          <Text style={styles.boldLabel}>{t.patientProfile.doctor}:</Text> د. {doctor || t.unknown}
        </Text>

        <Text style={styles.reportDetail}>
          <Text style={styles.boldLabel}>{t.patientProfile.description}:</Text> {description || t.unknown}
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
            {status === "PENDING" || status === "pending" ? t.patientProfile.status.pending : t.patientProfile.status.completed}
          </Text>
        </View>
      </View>

      <Button
        title={t.patientProfile.previewFile}
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
        <Text style={styles.loadingText}>{t.patientProfile.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />

      {/* ══════ شاشة إدخال الوزن بعد الجلسة (lock) ══════════════ */}
      {pendingWeightSession && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => {
            Alert.alert('⚠️ تنبيه', 'يجب إدخال وزنك بعد الجلسة قبل المتابعة.');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={weightLockStyles.overlay}
          >
            <View style={weightLockStyles.sheet}>
              {/* الأيقونة */}
              <View style={weightLockStyles.iconWrap}>
                <View style={weightLockStyles.iconCircle}>
                  <MaterialCommunityIcons name="scale" size={40} color="#f59e0b" />
                </View>
              </View>

              <Text style={weightLockStyles.title}>{t.patientProfile.weightAfterTitle}</Text>
              <Text style={weightLockStyles.subtitle}>
                {t.patientProfile.weightAfterSubtitle}
              </Text>

              {/* معلومات الجلسة */}
              <View style={weightLockStyles.sessionInfo}>
                <Text style={weightLockStyles.sessionInfoText}>
                  جلسة #{pendingWeightSession.session_id || pendingWeightSession.id}
                  {' — '}
                  {new Date(pendingWeightSession.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                </Text>
                {pendingWeightSession.weight_before != null && (
                  <Text style={weightLockStyles.weightBeforeText}>
                    {t.patientProfile.weightBefore}: <Text style={{ fontWeight: '800', color: '#3b82f6' }}>{pendingWeightSession.weight_before} kg</Text>
                  </Text>
                )}
              </View>

              {/* حقل الإدخال */}
              <View style={[weightLockStyles.inputRow, weightAfterError ? weightLockStyles.inputErr : null]}>
                <MaterialCommunityIcons name="scale" size={22} color="#3b82f6" />
                <TextInput
                  style={weightLockStyles.input}
                  placeholder="مثال: 72.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={weightAfterInput}
                  onChangeText={t => { setWeightAfterInput(t); setWeightAfterError(''); }}
                  autoFocus
                />
                <Text style={weightLockStyles.unit}>kg</Text>
              </View>
              {weightAfterError ? (
                <Text style={weightLockStyles.errText}>{weightAfterError}</Text>
              ) : null}

              {/* حساب الفرق */}
              {pendingWeightSession.weight_before != null && weightAfterInput && !isNaN(parseFloat(weightAfterInput)) && (
                <View style={weightLockStyles.diffRow}>
                  <Text style={weightLockStyles.diffLabel}>{t.patientProfile.fluidRemoved}</Text>
                  <Text style={weightLockStyles.diffVal}>
                    {Math.abs(pendingWeightSession.weight_before - parseFloat(weightAfterInput)).toFixed(1)} لتر
                  </Text>
                </View>
              )}

              {/* زر الحفظ */}
              <TouchableOpacity
                style={[weightLockStyles.saveBtn, isSavingWeight && { backgroundColor: '#6ee7b7' }]}
                onPress={handleSaveWeightAfter}
                disabled={isSavingWeight}
                activeOpacity={0.8}
              >
                {isSavingWeight
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <MaterialCommunityIcons name="content-save-check" size={20} color="#fff" />
                    <Text style={weightLockStyles.saveBtnText}>{t.patientProfile.saveWeight}</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <View style={styles.modernHeader}>
        <View style={styles.headerCircleOne} />
        <View style={styles.headerCircleTwo} />

        <View style={styles.topBar}>
          <View />

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
              {patient?.full_name || t.unknown}
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
          title={t.patientProfile.tabs.nutrition}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="food-apple" type="material-community" size={22} color={tabIndex === 0 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title={t.patientProfile.tabs.sessions}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="clock-outline" type="material-community" size={22} color={tabIndex === 1 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title={t.patientProfile.tabs.tests}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="clipboard-pulse" type="material-community" size={22} color={tabIndex === 2 ? "#204a42" : "#94a3b8"} />}
        />
        <Tab.Item
          title={t.patientProfile.tabs.appointments}
          titleStyle={(active) => [styles.tabTitle, { color: active ? "#204a42" : "#94a3b8" }]}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          icon={<Icon name="calendar-clock" type="material-community" size={22} color={tabIndex === 3 ? "#204a42" : "#94a3b8"} />}
        />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>{t.patientProfile.tabs.nutrition}</Text>

            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{nutritionPlan.title || t.unknown}</Text>
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

                  <MealItem label={t.patientProfile.meals.breakfast} content={nutritionPlan.breakfast} icon="coffee-outline" color="#f59e0b" />
                  <MealItem label={t.patientProfile.meals.lunch} content={nutritionPlan.lunch} icon="food-turkey" color="#ef4444" />
                  <MealItem label={t.patientProfile.meals.dinner} content={nutritionPlan.dinner} icon="weather-night" color="#3b82f6" />

                  <Divider style={{ marginVertical: 15 }} />

                  <InfoItem label="المسموحات" value={nutritionPlan.allowed_items || nutritionPlan.allowedItems} icon="check-decagram" color="#059669" />
                  <InfoItem label="الممنوعات" value={nutritionPlan.forbidden_items || nutritionPlan.forbiddenItems} icon="alert-octagon" color="#ef4444" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t.patientProfile.noNutritionPlan}</Text>
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>{t.patientProfile.tabs.sessions}</Text>



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
                      <Icon name="scale" type="material-community" size={14} color="#3b82f6" />
                      <Text style={styles.metricLabel}>الوزن قبل</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#3b82f6' }]}>
                        {session.weight_before != null ? `${session.weight_before} kg` : "—"}
                      </Text>
                    </View>
                    <View style={styles.sessionMetricDivider} />
                    <View style={styles.sessionMetricBox}>
                      <Icon name="scale" type="material-community" size={14} color="#059669" />
                      <Text style={styles.metricLabel}>الوزن بعد</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#059669' }]}>
                        {session.weight_after != null ? `${session.weight_after} kg` : "—"}
                      </Text>
                    </View>
                    <View style={styles.sessionMetricDivider} />
                    <View style={styles.sessionMetricBox}>
                      <Icon name="water" type="material-community" size={14} color="#0ea5e9" />
                      <Text style={styles.metricLabel}>السوائل المسحوبة</Text>
                      <Text style={[styles.metricValue, { fontSize: 13, color: '#0ea5e9' }]}>
                        {(() => {
                          // 1. الأولوية: ultrafiltration_rate من إعدادات الجهاز (ما يدخله الممرض)
                          const settingsArr = session.dialysisSettings || [];
                          const lastSetting = settingsArr.length > 0 ? settingsArr[settingsArr.length - 1] : null;
                          const ufRaw = parseFloat(lastSetting?.ultrafiltration_rate ?? lastSetting?.ultrafiltrationRate);
                          if (!isNaN(ufRaw) && ufRaw > 0) {
                            const ufLiters = ufRaw > 50 ? (ufRaw / 1000).toFixed(2) : ufRaw.toFixed(2);
                            return `${ufLiters} L`;
                          }
                          // 2. احتياطي: الفرق بين الوزن قبل وبعد
                          if (session.weight_before != null && session.weight_after != null) {
                            return `${Math.abs(session.weight_before - session.weight_after).toFixed(1)} L`;
                          }
                          // 3. احتياطي: fluid_removed من الجلسة
                          if (session.fluid_removed != null && session.fluid_removed > 0) {
                            return `${session.fluid_removed} L`;
                          }
                          return '—';
                        })()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sessionTapHint}>
                    {isActive ? (
                      <View style={styles.activeSessionBanner}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeSessionText}>{t.patientProfile.status.pending} — {t.patientProfile.status.pending}</Text>
                      </View>
                    ) : (
                      <>
                        <Icon name={t.vitalSigns.now === 'الآن' ? "chevron-left" : "chevron-right"} type="material-community" size={16} color="#94a3b8" />
                        <Text style={styles.sessionTapHintText}>{t.patientProfile.previewFile}</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyState}>
                <Icon name="database-off" type="material-community" size={50} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t.patientProfile.noSessions}</Text>
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
                  {t.medications.title}
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
                  <Text style={styles.sectionHeading}>{t.medications.title}</Text>

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
                              {item.dispense_status === "DISPENSED" ? t.patientProfile.status.completed : t.patientProfile.status.pending}
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
                      <Text style={styles.emptyText}>{t.medications.noMeds}</Text>
                    </View>
                  )}
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
                    status={test.status || (test.result ? "COMPLETED" : "PENDING")}
                    hasFile={!!(test.test_id || test.id)}
                    typeIcon="test-tube"
                  />
                )) : (
                  <View style={styles.emptyState}>
                    <Icon name="test-tube-off" type="material-community" size={60} color="#cbd5e1" />
                    <Text style={styles.emptyText}>{t.medications.noLabTests || 'لا توجد فحوصات مختبرية'}</Text>
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
                    <Text style={styles.emptyText}>{t.medications.noRadiology || 'لا توجد صور أشعة'}</Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <Text style={styles.sectionHeading}>{t.appointments.title}</Text>

            <TouchableOpacity
              style={styles.bookingPrimaryBtn}
              onPress={() => navigation.navigate("DatesDoctor", { patientId: patient?.patient_id })}
              activeOpacity={0.8}
            >
              <Icon name="calendar-plus" type="material-community" color="white" size={24} />
              <Text style={styles.bookingPrimaryBtnText}>{t.appointments.title}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 25 }}>
              <Text style={[styles.sectionHeading, { fontSize: 18, marginBottom: 15 }]}>
                {t.appointments?.completedTitle || 'سجل المواعيد المكتملة'}
              </Text>

              {myAppointments.filter(a => a.status === 'COMPLETED').length > 0 ? (
                myAppointments.filter(a => a.status === 'COMPLETED').map((appt, index) => (
                  <TouchableOpacity
                    key={appt.appointment_id || index}
                    style={styles.completedApptCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('ConsultationDetails', { consultation: appt })}
                  >
                    <View style={styles.completedApptHeader}>
                      <View style={styles.completedApptDocRow}>
                        <View style={styles.completedApptAvatar}>
                          <Icon name="stethoscope" type="material-community" size={20} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.completedApptDocName}>
                            د. {appt.doctor?.full_name || '—'}
                          </Text>
                          <Text style={styles.completedApptType}>
                            {appt.appointment_type === 'CLINIC_REVIEW' ? (t.appointments.clinicReview || 'مراجعة عيادة') : appt.appointment_type}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.completedApptBadge}>
                        <Icon name="check-circle" type="material-community" size={14} color="#059669" />
                        <Text style={styles.completedApptBadgeText}>{t.patientProfile?.status?.completed || 'مكتملة'}</Text>
                      </View>
                    </View>

                    <View style={styles.completedApptDateRow}>
                      <View style={styles.completedApptDateItem}>
                        <Icon name="calendar" type="material-community" size={15} color="#64748b" />
                        <Text style={styles.completedApptDateText}>{appt.appt_date}</Text>
                      </View>
                      <View style={styles.completedApptDateItem}>
                        <Icon name="clock-outline" type="material-community" size={15} color="#64748b" />
                        <Text style={styles.completedApptDateText}>{formatTime(appt.appt_time)}</Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.viewDetailsText}>عرض التفاصيل الكاملة</Text>
                      <Icon name="chevron-left" type="material-community" size={18} color="#059669" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyApptBox}>
                  <Icon name="clipboard-check-outline" type="material-community" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyText}>{t.appointments?.noCompleted || 'لا توجد مواعيد مكتملة'}</Text>
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
    backgroundColor: "#ecfdf5",
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

  // ── Ultrafiltration Stats Card ──
  ufStatsCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  ufIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  ufStatsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0369a1',
    textAlign: 'right',
  },
  ufStatsDesc: {
    fontSize: 12,
    color: '#0ea5e9',
    textAlign: 'right',
    marginTop: 2,
  },
  ufValueBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  ufStatsValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0284c7',
  },
  ufStatsUnit: {
    fontSize: 11,
    color: '#7dd3fc',
    fontWeight: 'bold',
  },

  // ── Completed Appointment Cards ──
  completedApptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderRightWidth: 4,
    borderRightColor: '#059669',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    width: '100%',
  },
  completedApptHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  completedApptDocRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  completedApptAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedApptDocName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  completedApptType: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },
  completedApptBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedApptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  completedApptDateRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 14,
  },
  completedApptDateItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  completedApptDateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 12,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
});

// ── styles لشاشة إدخال الوزن (lock) ──────────────────────────────────────
const weightLockStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fef3c7',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  sessionInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  sessionInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  weightBeforeText: {
    fontSize: 13,
    color: '#64748b',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 58,
    gap: 10,
  },
  inputErr: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  unit: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  errText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  diffLabel: { fontSize: 12, color: '#166534' },
  diffVal: { fontSize: 18, fontWeight: '800', color: '#059669' },
  saveBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    elevation: 3,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});