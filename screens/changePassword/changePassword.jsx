import { Button } from "@rneui/base";
import { Input } from "@rneui/themed";
import { Text, View, StyleSheet } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native"; 
import ValidationChange from "./ValidationChangePassword";
import { useState } from "react";

const ChangePassword = () => {
  const [oldPassword, setoldPassword] = useState("");
  const [newPassword, setnewPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [errors, seterrors] = useState({});
  const [loading, setLoading] = useState(false); // حالة التحميل للزر

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
      Alert.alert("نجاح", "تم تغيير كلمة المرور بنجاح");
      setoldPassword("");
      setnewPassword("");
      setconfirmPassword("");
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
    <View style={styles.container}>
      <Text style={styles.header}>تغيير كلمة المرور</Text>
      <View style={styles.card}>
        <Input
          placeholder="كلمة المرور القديمة"
          value={oldPassword}
          onChangeText={(text) => setoldPassword(text)}
          errorMessage={errors.oldPassword}
          secureTextEntry
          leftIcon={{
            type: "feather",
            name: "lock",
            color: "#2563EB",
          }}
          inputContainerStyle={styles.inputContainer}
        />
        <Input
          placeholder="كلمة المرور الجديدة"
          value={newPassword}
          onChangeText={(text) => setnewPassword(text)}
          errorMessage={errors.newPassword}
          secureTextEntry
          leftIcon={{
            type: "feather",
            name: "key",
            color: "#2563EB",
          }}
          inputContainerStyle={styles.inputContainer}
        />
        <Input
          placeholder="تأكيد كلمة المرور الجديدة"
          value={confirmPassword}
          onChangeText={(text) => setconfirmPassword(text)}
          errorMessage={errors.confirmPassword}
          secureTextEntry
          leftIcon={{
            type: "feather",
            name: "check-circle",
            color: "#2563EB",
          }}
          inputContainerStyle={styles.inputContainer}
        />
        <Button
  title="حفظ التغيير"
  onPress={handleChangePassword}
  loading={loading} // حالة الـ state الجديدة
  buttonStyle={styles.button}
  titleStyle={styles.buttonText}
/>
      </View>
    </View>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    justifyContent: "center",
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },

  inputContainer: {
    borderBottomWidth: 0,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 6,
  },

  button: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
