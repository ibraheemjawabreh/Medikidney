import { Input, Button } from "@rneui/base";
import { Text, View, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import axios from "axios";
import ValidationEmail from "./ValidationEmail";

const EmailInput = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
  try {
    setLoading(true);
    setErrors({});

    await ValidationEmail.validate({ email }, { abortEarly: false });

    const response = await axios.post(
      "https://medikidneysys.onrender.com/auth/forgot-password",
      { email },
      {
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
      }
    );

    console.log("Server response:", response.data);

    if (response.status === 200 || response.status === 201) {
      Alert.alert("نجاح", response.data.message);
      navigation.navigate("OtpCode", { email });
    }

  } catch (err) {
    console.log("Axios error:", err.response || err);
    if (err.inner) {
      const validationErrors = {};
      err.inner.forEach(error => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
    } else if (err.response?.status === 404) {
      setErrors({ email: "البريد الإلكتروني غير مسجل في النظام" });
    } else {
      Alert.alert("خطأ", "فشل الاتصال بالسيرفر");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>إدخال البريد الإلكتروني</Text>
      <View style={styles.card}>
        <Input
          placeholder="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          errorMessage={errors.email}
          inputContainerStyle={styles.inputContainer}
        />
        <Button
          title="التأكد من البريد"
          onPress={handleSubmit}
          loading={loading}
          buttonStyle={styles.button}
        />
      </View>
    </View>
  );
};

export default EmailInput;
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