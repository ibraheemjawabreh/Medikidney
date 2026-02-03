import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Tab, TabView } from "@rneui/base";

const PatientProfile = () => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <View style={styles.container}>

      <Text style={styles.title}>ملف المريض</Text>

      <Card>
        <Card.Title>معلومات المريض</Card.Title>
        <Card.Divider />

        <Text>الاسم: أحمد</Text>
        <Text>العمر: 58</Text>
        <Text>رقم الملف: 123</Text>
      </Card>

      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="ملاحظات الطبيب" />
        <Tab.Item title="الفحوصات" />
        <Tab.Item title="الجلسات"/>
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex} animationType="spring">
        
        <TabView.Item style={styles.tabContent}>
          <Text> ملاحظات الطبيب</Text>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <Text> الفحوصات</Text>
        </TabView.Item>
        <TabView.Item style={styles.tabContent}>
        <Text>جلسات الغسيل</Text>
        </TabView.Item>
      </TabView>

    </View>
  );
};

export default PatientProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    width:"100%"
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  indicator: {
    backgroundColor: "#1e90ff",
    height: 3,
  },
  tabContent: {
    width: "100%",
    padding: 15,
  },
});
