import React, { useState } from "react";
import { Text, View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input } from "@rneui/themed";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ChangePasswordFirstTime = ({ navigation, route }) => {
  // استلام البيانات من صفحة Login
  const { tempToken, userRole } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  // دالة التوجيه الموحدة
  const navigateToHome = async (token) => {
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("role", userRole);
    
    const role = userRole?.toUpperCase();
    if (role === "PATIENT") navigation.replace("Patinet");
    else if (role === "NURSE") navigation.replace("NurseHome");
    else if (role === "NUTRITIONIST") navigation.replace("NutritionistHome");
    else navigation.replace("Login");
  };

  // 1. تعيين كلمة المرور لأول مرة
  const handleSetInitialPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 8 خانات على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمات المرور غير متطابقة");
      return;
    }

    try {
      setLoading(true);
      const response = await api.patch(
        "/auth/set-initial-password",
        { newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert("تم التفعيل ✅", "تم تعيين كلمة المرور الجديدة بنجاح");
        await navigateToHome(response.data.access_token || tempToken);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء التفعيل";
      Alert.alert("فشل التفعيل", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. تخطي التغيير
  const handleSkip = async () => {
    try {
      setSkipLoading(true);
      const response = await api.patch(
        "/auth/skip-initial-password-change",
        {},
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      await navigateToHome(tempToken);
    } catch (err) {
      Alert.alert("تنبيه", "لا يمكن التخطي حالياً، يرجى تعيين كلمة مرور");
    } finally {
      setSkipLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.header}>تفعيل الحساب</Text>
          <Text style={styles.subtitle}>أهلاً بك! يرجى تعيين كلمة مرور خاصة بك للبدء</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <Input
            placeholder="8 خانات على الأقل"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "lock", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>تأكيد كلمة المرور</Text>
          <Input
            placeholder="أعد كتابة الكلمة"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "shield", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Button
            title="حفظ ودخول"
            onPress={handleSetInitialPassword}
            loading={loading}
            buttonStyle={styles.mainButton}
            containerStyle={styles.buttonContainer}
          />

          <Button
            title="التخطي للآن"
            type="clear"
            onPress={handleSkip}
            loading={skipLoading}
            titleStyle={styles.skipText}
            containerStyle={styles.skipButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePasswordFirstTime;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  headerSection: { marginBottom: 30, alignItems: 'center' },
  header: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 25, padding: 25, elevation: 4 },
  label: { fontSize: 14, fontWeight: "bold", color: "#334155", textAlign: 'right', marginBottom: 5 },
  inputContainer: { borderBottomWidth: 0, backgroundColor: "#f8fafc", borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: "#e2e8f0" },
  buttonContainer: { borderRadius: 15, marginTop: 10 },
  mainButton: { backgroundColor: "#0f172a", borderRadius: 15, paddingVertical: 15 },
  skipButton: { marginTop: 10 },
  skipText: { color: "#64748b", fontWeight: "bold" }
});