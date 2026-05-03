import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Icon } from '@rneui/base';
import { useLanguage } from '../../context/LanguageContext';

const ConsultationDetails = ({ route, navigation }) => {
  const { t } = useLanguage();
  const { consultation } = route.params || {};

  if (!consultation) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>لم يتم العثور على تفاصيل الاستشارة</Text>
      </View>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    let [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? t.time?.pm || 'م' : t.time?.am || 'ص'}`;
  };

  const InfoSection = ({ title, content, icon, color, bgColor }) => {
    if (!content) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
          <Icon name={icon} type="material-community" size={20} color={color} />
          <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        </View>
        <View style={styles.sectionBody}>
          <Text style={styles.sectionText}>{content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-right" type="material-community" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.appointments?.detailsTitle || 'تفاصيل الاستشارة'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.docRow}>
            <View style={styles.avatar}>
              <Icon name="stethoscope" type="material-community" size={32} color="#059669" />
            </View>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.docName}>د. {consultation.doctor?.full_name || '—'}</Text>
              <Text style={styles.docSpecialty}>
                {consultation.appointment_type === 'CLINIC_REVIEW' ? (t.appointments?.clinicReview || 'مراجعة عيادة') : consultation.appointment_type}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Icon name="calendar" type="material-community" size={18} color="#64748b" />
              <Text style={styles.dateText}>{consultation.appt_date}</Text>
            </View>
            <View style={styles.dateItem}>
              <Icon name="clock-outline" type="material-community" size={18} color="#64748b" />
              <Text style={styles.dateText}>{formatTime(consultation.appt_time)}</Text>
            </View>
          </View>

          {consultation.visit_reason && (
            <View style={styles.reasonContainer}>
              <Icon name="text-box-outline" type="material-community" size={16} color="#475569" />
              <Text style={styles.reasonText}>
                <Text style={{ fontWeight: '700' }}>سبب الزيارة: </Text>
                {consultation.visit_reason}
              </Text>
            </View>
          )}
        </View>

        {/* Sections */}
        <View style={styles.sectionsWrapper}>
          <InfoSection
            title={t.appointments?.diagnosis || 'التشخيص الطبي'}
            content={consultation.diagnosis}
            icon="clipboard-pulse"
            color="#dc2626"
            bgColor="#fef2f2"
          />

          <InfoSection
            title={t.appointments?.treatmentPlan || 'الخطة العلاجية'}
            content={consultation.treatment_plan}
            icon="medical-bag"
            color="#2563eb"
            bgColor="#eff6ff"
          />

          <InfoSection
            title={t.appointments?.medications || 'الأدوية الموصوفة'}
            content={consultation.medications}
            icon="pill"
            color="#059669"
            bgColor="#ecfdf5"
          />

          <InfoSection
            title={t.appointments?.doctorNotes || 'ملاحظات الطبيب'}
            content={consultation.notes}
            icon="note-text-outline"
            color="#d97706"
            bgColor="#fffbeb"
          />

          {!consultation.diagnosis && !consultation.treatment_plan && !consultation.notes && !consultation.medications && (
            <View style={styles.emptyDetails}>
              <Icon name="folder-open-outline" type="material-community" size={60} color="#cbd5e1" />
              <Text style={styles.emptyDetailsText}>
                {t.appointments?.noDetailsYet || 'لم يقم الطبيب بإضافة تفاصيل لهذه الجلسة حتى الآن.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ConsultationDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecfdf5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontFamily: 'Tajawal-Medium',
  },
  header: {
    backgroundColor: '#204a42',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Tajawal-Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
  },
  docRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d1fae5',
  },
  docName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  docSpecialty: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  dateRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 24,
  },
  dateItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  reasonContainer: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 22,
  },
  sectionsWrapper: {
    gap: 16,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionBody: {
    padding: 16,
  },
  sectionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    textAlign: 'right',
    fontWeight: '500',
  },
  emptyDetails: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyDetailsText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
});
