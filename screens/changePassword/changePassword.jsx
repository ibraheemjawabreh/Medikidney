import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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

 const handleChangePassword = async () => {
    try {
      setLoading(true);
      
      // اختيار التوكن (القادم من صفحة اللوجن)
      const token = tempToken || await AsyncStorage.getItem("token");

      // تجهيز البيانات بنفس الصيغة التي يحبها السيرفر
      const payload = {
        oldPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      };

      console.log("البيانات المرسلة:", payload); // لمراقبة ما يخرج من التطبيق

      const response = await axios.patch(
        "https://medikidneysys.onrender.com/auth/change-password",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // 1. استخراج التوكن الجديد من رد السيرفر بعد التغيير
        const newToken = response.data.access_token; 

        if (newToken) {
          // 2. تخزين التوكن الجديد (الآن أصبح غير مقيد ويمكنه دخول البروفايل)
          await AsyncStorage.setItem("token", newToken);
          await AsyncStorage.setItem("role", userRole);
          
          Alert.alert("نجاح ✅", "تم تفعيل حسابك بنجاح");

          // 3. التوجه للصفحة الرئيسية
          if (userRole === "PATIENT") {
            navigation.replace("Patinet");
          } else if (userRole === "NURSE") {
            navigation.replace("NurseHome");
          }
        } else {
          // في حال لم يرسل السيرفر توكن جديد، نطلب منه تسجيل الدخول مرة أخرى بالباسورد الجديدة
          Alert.alert("تم التغيير", "يرجى تسجيل الدخول بكلمة المرور الجديدة");
          navigation.replace("Login");
        }
      }

    } catch (err) {
      // طباعة الخطأ القادم من السيرفر بالتفصيل في الـ Console
      console.log("خطأ السيرفر (400):", err.response?.data);

      const errorMessage = err.response?.data?.message || "حدث خطأ ما";
      
      // إذا كان الخطأ عبارة عن مصفوفة (Array) كما يفعل NestJS أحياناً
      const finalMessage = Array.isArray(errorMessage) ? errorMessage.join("\n") : errorMessage;
      
      Alert.alert("فشل التغيير", finalMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.header}>{isInitialChange ? "خطوة أخيرة" : "أمن الحساب"}</Text>
          <Text style={styles.subtitle}>
            {isInitialChange ? "يرجى تعيين كلمة مرور جديدة لتفعيل حسابك" : "حدث كلمة المرور الخاصة بك"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>كلمة المرور القديمة</Text>
          <Input
            placeholder="كلمة المرور الحالية"
            value={oldPassword}
            onChangeText={setoldPassword}
            errorMessage={errors.oldPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "lock", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <Input
            placeholder="كلمة المرور الجديدة"
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
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ... ستايلاتك تبقى كما هي
export default ChangePassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 30 },
  headerSection: { marginBottom: 30, alignItems: 'center' },
  header: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 5 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 25, padding: 25, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 14, fontWeight: "900", color: "#334155", marginBottom: 5, textAlign: 'right', marginRight: 10 },
  inputContainer: { borderBottomWidth: 0, backgroundColor: "#f8fafc", borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: "#e2e8f0", height: 55 },
  buttonContainer: { borderRadius: 15, marginTop: 10 },
  button: { backgroundColor: "#0f172a", borderRadius: 15, paddingVertical: 15 },
});