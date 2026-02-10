import { Card, Button, Avatar } from "@rneui/base";
import { StyleSheet, Text, View } from "react-native";

const UserProfile = () => {
  return (
    <View style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text style={styles.textheader}>الملف الشخصي</Text>
        <Text style={styles.line}>_______________________________</Text>

        
        <View style={styles.imageSection}>
          <Avatar
            size={120} 
            rounded
            source={{
              uri: "https://www.w3schools.com/howto/img_avatar.png",
            }}
          />
          <Button
            title="تغيير الصورة"
            type="outline"
            buttonStyle={styles.button}
            titleStyle={styles.buttonTitle}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTextHeader}>الاسم الشخصي</Text>
          <Text style={styles.infoText}>احمد سالم</Text>

          <Text style={styles.infoTextHeader}>رقم الهاتف</Text>
          <Text style={styles.infoText}>058583294</Text>

          <Text style={styles.infoTextHeader}>البريد الإلكتروني</Text>
          <Text style={styles.infoText}>example@email.com</Text>

          <Text style={styles.infoTextHeader}>المسمى الوظيفي</Text>
          <Text style={styles.infoText}>طبيب</Text>
        </View>
      </Card>
    </View>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  card: {
    borderRadius: 25,
    padding: 30,
    marginTop: 30,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  textheader: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 24,
    marginBottom: 10,
    color: "#333",
  },
  line: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 20,
    color: "#AAA",
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  button: {
    marginTop: 15,
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 25,
    borderColor: "#4A90E2",
  },
  buttonTitle: {
    fontSize: 16,
    color: "#4A90E2",
  },
  infoContainer: {
    marginTop: 10,
  },
  infoTextHeader: {
    textAlign: "right",
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  infoText: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
});
