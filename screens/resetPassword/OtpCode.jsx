import { Input, Button } from "@rneui/base";
import { Text, View, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import api from "../../services/api";
import ValidationOtpCode from "./ValidationOtpCode";

const OtpCode = ({ route, navigation }) => {
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      await ValidationOtpCode.validate({ code }, { abortEarly: false });

      const response = await api.post(
        "/auth/verify-otp",
        { email, otp: code }
      );

      if (response.data?.token) {
        const verificationToken = response.data.token;
        navigation.replace("ResetPassword", { email, token: verificationToken });
      } else {
        Alert.alert("خطأ", "الكود غير صحيح أو منتهي الصلاحية");
      }

    } catch (err) {

      if (err.inner) {
        const validationErrors = err.inner.map(e => e.message).join("\n");
        Alert.alert("خطأ", validationErrors);
      }

      else if (err.response) {
        Alert.alert("خطأ", err.response?.data?.message || "فشل الاتصال بالسيرفر");
      }

      else {
        Alert.alert("خطأ", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>إدخال رمز التحقق</Text>
      <View style={styles.card}>
        <Input
          placeholder="أدخل الكود المرسل"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          inputContainerStyle={styles.inputContainer}
          inputStyle={styles.input}
        />
        <Button
          title="تأكيد الكود"
          onPress={handleVerify}
          loading={loading}
          buttonStyle={styles.button}
          titleStyle={styles.buttonText}
        />
      </View>
    </View>
  );
};

export default OtpCode;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1FCFD", padding: 16, justifyContent: "center" },
  header: { fontSize: 22, fontWeight: "bold", color: "#26CDD6", textAlign: "center", marginBottom: 24 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, elevation: 4 },
  inputContainer: { borderBottomWidth: 0, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, marginTop: 6 },
  input: { textAlign: "center", fontSize: 18 },
  button: { backgroundColor: "#26CDD6", borderRadius: 12, paddingVertical: 14, marginTop: 10 },
  buttonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
});