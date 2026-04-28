import { Input, Button } from "@rneui/themed";
import { useState } from "react";
import { Text, View, StyleSheet, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import LoginValidation from "./loginValidation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../services/api";


const LoginScreen = ({ navigation }) => {
  const [username, setusername] = useState("");
  const [password, setpassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, seterrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await LoginValidation.validate(
        { username, password },
        { abortEarly: false }
      );
      seterrors({});

      const response = await api.post("/auth/login", { username, password });
      const data = response.data;

      if (data.user && data.user.mustChangePassword === true) {
        console.log("المستخدم يحتاج لتفعيل الحساب لأول مرة");

        navigation.replace("ChangePasswordFirstTime", {
          tempToken: data.access_token,
          userRole: data.user.role
        });
        return;
      }

      await AsyncStorage.setItem("token", data.access_token);
      await AsyncStorage.setItem("role", data.user.role);
      if (data.user.id) {
        await AsyncStorage.setItem("userId", String(data.user.id));
      } else if (data.user.userId) {
        await AsyncStorage.setItem("userId", String(data.user.userId));
      }

      const userRole = data.user.role;
      if (userRole === "PATIENT") navigation.replace("PatinetPages");
      else if (userRole === "NURSE") navigation.replace("NurseHome");
      else if (userRole === "NUTRITIONIST") navigation.replace("NutritionistHome");

    } catch (err) {
      if (err.name === "ValidationError") {
        const newErrors = {};
        err.inner.forEach((error) => {
          newErrors[error.path] = error.message;
        });
        seterrors(newErrors);
      } else {
        const msg = err.response?.data?.message || "بيانات الدخول غير صحيحة أو وجد خطأ في الاتصال";
        Alert.alert("خطأ", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };


return (
  <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Image source={require("../assets/logo.jpeg")} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.subtitleText}>سجل دخولك للوصول إلى MediKidney</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>اسم المستخدم</Text>
          <Input
            placeholder="اسم المستخدم"
            value={username}
            onChangeText={setusername}
            errorMessage={errors.username}
            leftIcon={<MaterialCommunityIcons name="account-outline" size={22} color="#059669" />}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <Input
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setpassword}
            errorMessage={errors.password}
            leftIcon={<MaterialCommunityIcons name="lock-outline" size={22} color="#059669" />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#059669"
                />
              </TouchableOpacity>
            }
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
          />

          <Button
            title={isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            loading={isLoading}
            onPress={handleLogin}
            buttonStyle={styles.loginButton}
            containerStyle={styles.loginButtonContainer}
            titleStyle={styles.loginButtonTitle}
          />
        </View>
      </View>

    </ScrollView>
  </KeyboardAvoidingView>
);
};



export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecfdf5",
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },

  logoBackground: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#d1fae5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },

  logo: {
    width: 210,
    height: 210,
    borderRadius: 65,
  },

  titleContainer: {
    marginBottom: 30,
    alignItems: "center",
  },

  welcomeText: {
    fontSize: 31,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },

  subtitleText: {
    fontSize: 15,
    color: "#222325",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    
  },

  formContainer: {
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
    marginBottom: 8,
    textAlign: "right",
    marginRight: 6,
  },

  inputContainer: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0,
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 58,
  },

  inputStyle: {
    textAlign: "left",
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },

  loginButtonContainer: {
    marginTop: 10,
    borderRadius: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },

  loginButton: {
    backgroundColor: "#0f172a",
    height: 60,
    borderRadius: 18,
  },

  loginButtonTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },

  forgotBtn: {
    alignSelf: "flex-start",
    marginBottom: 25,
  },

  forgotText: {
    color: "#059669",
    fontWeight: "bold",
    fontSize: 14,
  },
});