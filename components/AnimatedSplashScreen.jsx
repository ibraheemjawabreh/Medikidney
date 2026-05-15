import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplashScreen({ children }) {
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 400); 
    
    return () => clearTimeout(timer);
  }, []);

  const triggerAnimation = async () => {
    try {
      
      await SplashScreen.hideAsync();

      Animated.timing(animation, {
        toValue: 1,
        duration: 3200, 
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
      
      {isAppReady && children}

      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#ffffff', 
              opacity: animation.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0], 
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
                    outputRange: [1, 1.15], 
                  }),
                },
              ],
              opacity: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.8, 0], 
              }),
            }}
            fadeDuration={0} 
          />
        </Animated.View>
      )}
    </View>
  );
}
