import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const AboutApp = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.appName}>MediKidney</Text>

        <Text style={styles.subtitle}>نظام إدارة أقسام غسيل الكلى</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>نبذة عن التطبيق</Text>

        <Text style={styles.description}>
          تطبيق MediKidney هو مشروع تخرج يهدف إلى تحسين إدارة ومتابعة مرضى غسيل
          الكلى داخل المستشفيات.
        </Text>

        <Text style={styles.description}>
          يوفر النظام منصة سهلة للمريض، والممرض، وأخصائي التغذية لمتابعة البيانات
          الطبية، حجز المواعيد، تسجيل الجلسات، ومراقبة الحالة الصحية بشكل منظم
          وآمن.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>هدف التطبيق</Text>

        <Text style={styles.description}>
          • تسهيل متابعة المرضى داخل قسم غسيل الكلى{"\n"}
          • تقليل الأخطاء الورقية وتحسين التنظيم{"\n"}
          • توفير سجل طبي واضح للمريض{"\n"}
          • دعم الطاقم الطبي في اتخاذ قرارات أسرع
        </Text>
      </View>

      <Text style={styles.footer}>© 2026 - مشروع تخرج جامعة الخليل</Text>
    </View>
  );
};

export default AboutApp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 20,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: 90,
    height: 90,
  },

  appName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2563EB",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 14,
    color: "#374151",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },

  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
  },
});
