import { Input, Button } from "@rneui/themed";
import { useState } from "react";
import { Text, View, StyleSheet, Image } from "react-native";
import LoginValidation from "./loginValidation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TouchableOpacity } from "react-native";

const LoginScreen = ({navigation}) => {
  const [username, setusername] = useState("");
  const [password, setpassword] = useState("");
  const [errors, seterrors] = useState({});

  const handleLogin = async () => {
    try {
      await LoginValidation.validate(
        { username, password },
        { abortEarly: false }
      );
      seterrors({});
      const response = await fetch("https://medikidneysys.onrender.com/auth/login",
        {
          method: "POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({username,password}),

        }
      );
      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);
      if(response.ok){
        await AsyncStorage.setItem("token", data.access_token);
        await AsyncStorage.setItem("role", data.user.role);
        const userRole = data.user.role; 
        await AsyncStorage.setItem("role", userRole);

        if(userRole === "PATIENT"){
          navigation.replace("Patinet");
        } else if(userRole === "NURSE"){
          navigation.replace("NurseHome");
        } else if(userRole === "NUTRITIONIST"){
          navigation.replace("NutritionistHome");
        } else {
          alert("Role not found: " + userRole);
        }

      }else{
        alert(data.message||"فشل تسجيل الدخول");
      }
    } catch (err) {
  if (err.inner) {
    const newErrors = {};
    err.inner.forEach((e) => {
      newErrors[e.path] = e.message;
    });
    seterrors(newErrors);
  } else {
    console.log(err);
    alert("خطأ في الاتصال بالسيرفر");
  }
}
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/logo.jpeg")} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>MediKidney</Text>
        <Text style={styles.subtitle}>
          نظام إدارة أقسام غسيل الكلى
        </Text>
      </View>

      <View style={styles.card}>
        <Input
          placeholder="اسم المستخدم"
          value={username}
          onChangeText={setusername}
          errorMessage={errors.username}
          leftIcon={{ type: "feather", name: "user", color: "#2A7FFF" }}
        />

        <Input
          placeholder="كلمة المرور"
          secureTextEntry
          value={password}
          onChangeText={setpassword}
          errorMessage={errors.password}
          leftIcon={{ type: "feather", name: "lock", color: "#2A7FFF" }}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate("EmailInput")}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: "#2A7FFF", textAlign: "right", marginRight: 10, fontWeight: "bold" }}>
            نسيت كلمة المرور؟
          </Text>
        </TouchableOpacity>

        <Button
          title="تسجيل الدخول"
          onPress={handleLogin}
          buttonStyle={styles.button}
        />
      </View>
    </View>
  );
};

export default LoginScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dfe2e5",
    justifyContent: "center",
    paddingHorizontal: 20,
    width:'100%'
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: 90,
    height: 90,
  },

  appName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2A7FFF",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 10,
    elevation: 4, 
  },

  button: {
    backgroundColor: "#2A7FFF",
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 10,
  },
});
