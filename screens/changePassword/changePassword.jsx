import React, { useState } from "react";
import { Text, View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input } from "@rneui/themed";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ValidationChange from "./ValidationChangePassword";

const ChangePassword = ({ navigation, route }) => {
  // استلام البيانات المرسلة من صفحة Login
  const { tempToken, isInitialChange, userRole } = route.params || {};

  const [oldPassword, setoldPassword] = useState("");
  const [newPassword, setnewPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [errors, seterrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  // دالة مساعدة لتخزين التوكن والتوجيه حسب الدور (Role)
  const handleNavigationAfterSuccess = async (token) => {
    try {
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("role", userRole);
      
      const role = userRole ? userRole.toUpperCase() : "";

      if (role === "PATIENT") {
        navigation.replace("Patinet");
      } else if (role === "NURSE") {
        navigation.replace("NurseHome");
      } else if (role === "NUTRITIONIST") {
        navigation.replace("NutritionistHome");
      } else {
        navigation.replace("Login");
      }
    } catch (error) {
      console.error("Storage Error:", error);
    }
  };

  // 1. دالة تحديث كلمة المرور (إلزامية أو اختيارية)
  const handleChangePassword = async () => {
    try {
      setLoading(true);
      seterrors({});

      // التحقق من صحة المدخلات عبر Yup
      await ValidationChange.validate(
        { oldPassword, newPassword, confirmPassword },
        { abortEarly: false }
      );

      const response = await axios.patch(
        "https://medikidneysys.onrender.com/auth/set-initial-password",
        { oldPassword, newPassword, confirmPassword },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert("نجاح ✅", "تم تحديث كلمة المرور بنجاح");
        // نستخدم التوكن الجديد الذي يرجعه السيرفر بعد التحديث
        handleNavigationAfterSuccess(response.data.access_token);
      }
    } catch (err) {
      if (err.name === "ValidationError") {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        seterrors(validationErrors);
      } else {
        const serverMsg = err.response?.data?.message || "حدث خطأ ما";
        Alert.alert("فشل العملية", Array.isArray(serverMsg) ? serverMsg[0] : serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. دالة تخطي التغيير (Skip)
  const handleSkip = async () => {
    try {
      setSkipLoading(true);
      const response = await axios.patch(
        "https://medikidneysys.onrender.com/auth/skip-initial-password-change",
        {}, // Body فارغ
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // عند التخطي، ندخل بالتوكن المؤقت الذي معنا (أو الجديد إذا أرجعه السيرفر)
        const finalToken = response.data.access_token || tempToken;
        handleNavigationAfterSuccess(finalToken);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || "لا يمكن التخطي حالياً";
      Alert.alert("تنبيه", Array.isArray(serverMsg) ? serverMsg[0] : serverMsg);
    } finally {
      setSkipLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.header}>تفعيل الحساب</Text>
          <Text style={styles.subtitle}>يمكنك حماية حسابك بكلمة مرور جديدة أو التخطي للآن</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>كلمة المرور المؤقتة</Text>
          <Input
            placeholder="كلمة المرور التي وصلتك"
            value={oldPassword}
            onChangeText={setoldPassword}
            errorMessage={errors.oldPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "lock", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <Input
            placeholder="8 خانات على الأقل"
            value={newPassword}
            onChangeText={setnewPassword}
            errorMessage={errors.newPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "key", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>تأكيد الكلمة الجديدة</Text>
          <Input
            placeholder="أعد كتابة الكلمة الجديدة"
            value={confirmPassword}
            onChangeText={setconfirmPassword}
            errorMessage={errors.confirmPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "shield", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Button
            title="تحديث ودخول"
            onPress={handleChangePassword}
            loading={loading}
            disabled={skipLoading}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />

          <Button
            title="التخطي للآن"
            type="clear"
            onPress={handleSkip}
            loading={skipLoading}
            disabled={loading}
            titleStyle={styles.skipTitle}
            containerStyle={styles.skipContainer}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 30 },
  headerSection: { marginBottom: 30, alignItems: 'center' },
  header: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 5, paddingHorizontal: 20 },
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 25, 
    padding: 25, 
    elevation: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  label: { fontSize: 14, fontWeight: "900", color: "#334155", marginBottom: 5, textAlign: 'right', marginRight: 10 },
  inputContainer: { 
    borderBottomWidth: 0, 
    backgroundColor: "#f8fafc", 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    borderWidth: 1, 
    borderColor: "#e2e8f0", 
    height: 55 
  },
  buttonContainer: { borderRadius: 15, marginTop: 10 },
  button: { backgroundColor: "#0f172a", borderRadius: 15, paddingVertical: 15 },
  skipContainer: { marginTop: 15 },
  skipTitle: { color: "#64748b", fontWeight: "bold", fontSize: 16 },
});