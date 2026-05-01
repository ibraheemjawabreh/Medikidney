import { Button } from "@rneui/base";
import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, StatusBar, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
const AboutApp = ({ navigation }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#ecfdf5" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="arrow-left" size={26} color="#0f172a" />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={require("../../assets/project-logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.appName}>MediKidney</Text>
        <View style={styles.badge}>
          <Text style={styles.subtitle}>نظام إدارة أقسام غسيل الكلى</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>نبذة عن التطبيق</Text>
          <View style={styles.dot} />
        </View>

        <Text style={styles.description}>
          تطبيق <Text style={styles.boldText}>MediKidney</Text> هو مشروع تخرج مبتكر يهدف إلى رقمنة وتحسين إدارة متابعة مرضى غسيل الكلى داخل المستشفيات.
        </Text>

        <Text style={styles.description}>
          يوفر النظام منصة متكاملة تربط المريض، والممرض، وأخصائي التغذية لضمان مراقبة الحالة الصحية بشكل دقيق ومنظم وآمن تماماً.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>أهداف النظام</Text>
          <View style={styles.dot} />
        </View>

        <View style={styles.goalItem}>
          <Text style={styles.goalText}>تسهيل متابعة المرضى داخل القسم بدقة عالية</Text>
          <Text style={styles.bullet}>•</Text>
        </View>
        <View style={styles.goalItem}>
          <Text style={styles.goalText}>تحسين التنظيم وتقليل الاعتماد على الأوراق</Text>
          <Text style={styles.bullet}>•</Text>
        </View>
        <View style={styles.goalItem}>
          <Text style={styles.goalText}>توفير سجل طبي رقمي شامل لكل مريض</Text>
          <Text style={styles.bullet}>•</Text>
        </View>
        <View style={styles.goalItem}>
          <Text style={styles.goalText}>دعم الطاقم الطبي في اتخاذ قرارات سريعة</Text>
          <Text style={styles.bullet}>•</Text>
        </View>
      </View>

      <Text style={styles.footer}>© 2026 - مشروع تخرج جامعة الخليل</Text>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export default AboutApp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecfdf5",
  },
  scrollContent: {
    padding: 25,
    paddingTop: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 25,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 15,
  },
  badge: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  subtitle: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e293b",
    marginRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    textAlign: "right",
    marginBottom: 10,
  },
  boldText: {
    color: '#059669',
    fontWeight: 'bold',
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "right",
    marginRight: 10,
    flex: 1,
  },
  bullet: {
    color: '#059669',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: '500',
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 55,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
});