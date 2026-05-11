import React, { useState } from "react";
import { Text, View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input } from "@rneui/themed";
import api from "../../services/api";
import ValidationChange from "./ValidationChangePassword";
import { useLanguage } from '../../context/LanguageContext';

const ChangePassword = ({ navigation }) => {
  const { t } = useLanguage();
  const [oldPassword, setoldPassword] = useState("");
  const [newPassword, setnewPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [errors, seterrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      seterrors({});

      // 1. التحقق من المدخلات
      await ValidationChange.validate(
        { oldPassword, newPassword, confirmPassword },
        { abortEarly: false }
      );

      // 3. إرسال طلب تغيير كلمة المرور التقليدي
      const response = await api.patch(
        "/auth/change-password",
        { oldPassword, newPassword, confirmPassword }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert(t.success, t.changePasswordScreen.successMsg);

        // بعد التغيير بنجاح، نعود للصفحة السابقة (البروفايل مثلاً)
        navigation.goBack();
      }
    } catch (err) {
      if (err.name === "ValidationError") {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        seterrors(validationErrors);
      } else {
        const serverMsg = err.response?.data?.message || t.changePasswordScreen.failedMsg;
        Alert.alert(t.error, Array.isArray(serverMsg) ? serverMsg[0] : serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.header}>{t.changePasswordScreen.header}</Text>
          <Text style={styles.subtitle}>{t.changePasswordScreen.subtitle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t.changePasswordScreen.oldPassword}</Text>
          <Input
            placeholder={t.changePasswordScreen.oldPlaceholder}
            value={oldPassword}
            onChangeText={setoldPassword}
            errorMessage={errors.oldPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "lock", color: "#26CDD6", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>{t.changePasswordScreen.newPassword}</Text>
          <Input
            placeholder={t.changePasswordScreen.newPlaceholder}
            value={newPassword}
            onChangeText={setnewPassword}
            errorMessage={errors.newPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "key", color: "#26CDD6", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Text style={styles.label}>{t.changePasswordScreen.confirmPassword}</Text>
          <Input
            placeholder={t.changePasswordScreen.confirmPlaceholder}
            value={confirmPassword}
            onChangeText={setconfirmPassword}
            errorMessage={errors.confirmPassword}
            secureTextEntry
            leftIcon={{ type: "feather", name: "shield", color: "#26CDD6", size: 20 }}
            inputContainerStyle={styles.inputContainer}
          />

          <Button
            title={t.changePasswordScreen.updateBtn}
            onPress={handleChangePassword}
            loading={loading}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />

          <Button
            title={t.changePasswordScreen.cancelBtn}
            type="clear"
            onPress={() => navigation.goBack()}
            titleStyle={{ color: "#DE1A1C" }}
            containerStyle={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1FCFD" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 30 },
  headerSection: { marginBottom: 30, alignItems: 'center' },
  header: { fontSize: 28, fontWeight: "900", color: "#193B6B" },
  subtitle: { fontSize: 14, color: "#8296B1", textAlign: "center", marginTop: 5, paddingHorizontal: 20 },
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
  label: { fontSize: 14, fontWeight: "900", color: "#193B6B", marginBottom: 5, textAlign: 'right', marginRight: 10 },
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
  button: { backgroundColor: "#193B6B", borderRadius: 15, paddingVertical: 15 },
});