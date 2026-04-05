import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input } from "@rneui/themed";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ValidationChange from "./ValidationChangePassword";

const ChangePassword = ({ navigation }) => {
  const [oldPassword, setoldPassword] = useState("");
  const [newPassword, setnewPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [errors, seterrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      seterrors({});

      await ValidationChange.validate(
        { oldPassword, newPassword, confirmPassword },
        { abortEarly: false }
      );

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("خطأ", "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
        setLoading(false);
        return;
      }

      const response = await axios.patch(
        "https://medikidneysys.onrender.com/auth/change-password",
        { oldPassword, newPassword, confirmPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            accept: "*/*",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert("نجاح ✅", "تم تحديث كلمة المرور بنجاح");
        setoldPassword("");
        setnewPassword("");
        setconfirmPassword("");
        navigation.goBack();
      }
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        seterrors(validationErrors);
      } else {
        const apiError = err.response?.data?.message || "فشل الاتصال بالسيرفر";
        Alert.alert("تنبيه", apiError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.headerSection}>
          <Text style={styles.header}>أمن الحساب</Text>
          <Text style={styles.subtitle}>قم بتحديث كلمة المرور الخاصة بك بانتظام</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>كلمة المرور الحالية</Text>
          <Input
            placeholder="أدخل الكلمة القديمة"
            value={oldPassword}
            onChangeText={setoldPassword}
            errorMessage={errors.oldPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "lock", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            errorStyle={styles.errorStyle}
          />

          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <Input
            placeholder="أدخل الكلمة الجديدة"
            value={newPassword}
            onChangeText={setnewPassword}
            errorMessage={errors.newPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "key", color: "#059669", size: 20 }}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            errorStyle={styles.errorStyle}
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
            inputStyle={styles.inputStyle}
            errorStyle={styles.errorStyle}
          />

          <Button
            title="حفظ التغييرات"
            onPress={handleChangePassword}
            loading={loading}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
            containerStyle={styles.buttonContainer}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("EmailInput")}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>هل نسيت كلمة المرور القديمة؟</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecfdf5", // نفس خلفية تسجيل الدخول
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a", // اللون الزيتي الداكن
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 5,
  },
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
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
    marginBottom: 5,
    textAlign: 'right',
    marginRight: 10,
  },
  inputContainer: {
    borderBottomWidth: 0,
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 55,
  },
  inputStyle: {
    textAlign: 'right', // ليتناسب مع العربية
    fontSize: 15,
    color: "#1e293b",
  },
  errorStyle: {
    textAlign: 'right',
    color: '#ef4444',
  },
  buttonContainer: {
    borderRadius: 15,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  button: {
    backgroundColor: "#0f172a", // نفس لون زر الدخول
    borderRadius: 15,
    paddingVertical: 15,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  forgotBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotText: {
    color: "#059669",
    fontWeight: "bold",
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});