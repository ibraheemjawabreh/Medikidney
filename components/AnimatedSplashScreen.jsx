import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// منع الـ splash screen الافتراضي من الاختفاء فوراً
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplashScreen({ children }) {
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // محاكاة وقت التحميل السريع للتأكد من أن التطبيق في الخلفية جاهز
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 400); // وقت قصير للسماح للتطبيق بالتحميل في الخلفية
    
    return () => clearTimeout(timer);
  }, []);

  const triggerAnimation = async () => {
    try {
      // إخفاء الـ splash الافتراضي الخاص بـ Expo
      await SplashScreen.hideAsync();
      
      // بدء الأنيميشن الناعم (تكبير بسيط + اختفاء متدرج)
      Animated.timing(animation, {
        toValue: 1,
        duration: 3200, // مدة الأنيميشن: 3.2 ثانية (زيادة بمقدار ثانيتين)
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setAnimationComplete(true);
      });
    } catch (e) {
      setAnimationComplete(true);
    }
  };

  useEffect(() => {
    if (isAppReady) {
      triggerAnimation();
    }
  }, [isAppReady]);

  return (
    <View style={{ flex: 1 }}>
      {/* محتوى التطبيق الأساسي (يكون جاهزاً في الخلفية) */}
      {isAppReady && children}

      {/* واجهة الـ Splash المتحركة (تكون فوق التطبيق حتى تنتهي) */}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#ffffff', // نفس لون خلفية الـ splash الافتراضي
              opacity: animation.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0], // الشاشة تختفي في الثلث الأخير
              }),
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Animated.Image
            source={require('../assets/project-logo.png')}
            style={{
              width: 350,
              height: 350,
              resizeMode: 'contain',
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.15], // تكبير خفيف وأنيق جداً
                  }),
                },
              ],
              opacity: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.8, 0], // اللوجو يختفي بنعومة
              }),
            }}
            fadeDuration={0} // إلغاء الـ fade الافتراضي للصور في React Native
          />
        </Animated.View>
      )}
    </View>
  );
}
