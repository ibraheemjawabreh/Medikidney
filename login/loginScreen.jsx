import { Input, Button } from "@rneui/themed";
import { useState } from "react";
import { Text, View, StyleSheet, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import LoginValidation from "./loginValidation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
      
      const response = await fetch("https://medikidneysys.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem("token", data.access_token);
        const userRole = data.user.role;
        await AsyncStorage.setItem("role", userRole);

        if (userRole === "PATIENT") navigation.replace("Patinet");
        else if (userRole === "NURSE") navigation.replace("NurseHome");
        else if (userRole === "NUTRITIONIST") navigation.replace("NutritionistHome");
        else alert("Role not found: " + userRole);
      } else {
        alert(data.message || "فشل تسجيل الدخول");
        
      }
    } catch (err) {
      if (err.inner) {
        const newErrors = {};
        err.inner.forEach((e) => { newErrors[e.path] = e.message; });
        seterrors(newErrors);
      } else {
        alert("خطأ في الاتصال بالسيرفر");
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo.jpeg")} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>أهلاً بك مجدداً</Text>
          <Text style={styles.subtitleText}>سجل دخولك للوصول إلى لوحة تحكم MediKidney</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>اسم المستخدم</Text>
          <Input
            placeholder="username"
            value={username}
            onChangeText={setusername}
            errorMessage={errors.username}
            renderErrorMessage={true}
            leftIcon={<MaterialCommunityIcons name="account-outline" size={22} color="#94a3b8" />}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            containerStyle={{ paddingHorizontal: 0 }}
            errorStyle={{ textAlign: 'right', fontWeight: 'bold' }}
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <Input
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setpassword}
            errorMessage={errors.password}
            renderErrorMessage={true}
            leftIcon={<MaterialCommunityIcons name="lock-outline" size={22} color="#94a3b8" />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color="#94a3b8" 
                />
              </TouchableOpacity>
            }
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            containerStyle={{ paddingHorizontal: 0 }}
            errorStyle={{ textAlign: 'right', fontWeight: 'bold' }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("EmailInput")}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
          </TouchableOpacity>

          <Button
            title={isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            loading={isLoading}
            onPress={handleLogin}
            buttonStyle={styles.loginButton}
            titleStyle={styles.loginButtonTitle}
            containerStyle={styles.loginButtonContainer}
          />
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
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 25,
  },
  titleContainer: {
    marginBottom: 35,
    alignItems: 'flex-end', 
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a", 
    textAlign: 'right',
  },
  subtitleText: {
    fontSize: 15,
    color: "#64748b", 
    fontWeight: "500",
    textAlign: 'right',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
    marginBottom: 8,
    textAlign: 'right',
    marginRight: 5,
  },
  inputContainer: {
    backgroundColor: "#f8fafc", 
    borderBottomWidth: 0, 
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 55,
  },
  inputStyle: {
    textAlign: 'left', 
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  forgotBtn: {
    alignSelf: 'flex-start', 
    marginBottom: 25,
  },
  forgotText: {
    color: "#059669", 
    fontWeight: "bold",
    fontSize: 14,
  },
  loginButtonContainer: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: "#0f172a", 
    height: 60,
    borderRadius: 16,
  },
  loginButtonTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
});