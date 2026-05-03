import { Input, Button } from "@rneui/base";
import { Text, View, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import api from "../../services/api";
import ValidationPassword from "./ValidationPassword";

const ResetPassword = ({ route, navigation }) => {
  const { email, token } = route.params;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!token) {
      Alert.alert("خطأ", "لم يتم استلام توكن التحقق");
      return;
    }

    try {
      setLoading(true);

      await ValidationPassword.validate(
        { newPassword, confirmPassword },
        { abortEarly: false }
      );

      const response = await api.post(
        "/auth/reset-password",
        { email, newPassword, confirmPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert("نجاح", "تم تغيير كلمة المرور بنجاح");
        navigation.replace("Login");
      } else {
        Alert.alert("خطأ غير معروف", JSON.stringify(response.data));
      }
    } catch (err) {
      if (err.inner) {
        const messages = err.inner.map(e => e.message).join("\n");
        Alert.alert("خطأ", messages);
      }
      else if (err.response) {
        Alert.alert(
          "خطأ من السيرفر",
          err.response?.data?.message || "فشل الاتصال بالسيرفر"
        );
      } else {
        Alert.alert("خطأ", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>تغيير كلمة المرور</Text>
      <View style={styles.card}>
        <Input
          placeholder="كلمة المرور الجديدة"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Input
          placeholder="تأكيد كلمة المرور الجديدة"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button
          title="حفظ التغيير"
          onPress={handleSave}
          loading={loading}
          buttonStyle={styles.button}
        />
      </View>
    </View>
  );
};

export default ResetPassword;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#ecfdf5" },
  header: { fontSize: 22, fontWeight: "bold", color: "#2563EB", textAlign: "center", marginBottom: 24 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, elevation: 4 },
  button: { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 14, marginTop: 10 },
});