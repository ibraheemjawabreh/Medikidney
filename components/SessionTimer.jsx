import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL_DURATION = 10800; // 3 ساعات بالثواني

/**
 * تايمر عد تنازلي للجلسة الجارية
 * يحفظ وقت البدء في AsyncStorage عشان يضل يعد حتى لو المستخدم طلع ورجع
 */
const SessionTimer = ({ session, size = 'small' }) => {
  const [remaining, setRemaining] = useState(TOTAL_DURATION);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const sessionId = session?.session_id || session?.id;

  // أنيميشن النبض للأيقونة
  useEffect(() => {
    if (!ready || remaining <= 0) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [ready, remaining > 0]);

  useEffect(() => {
    if (!sessionId) return;

    const initTimer = async () => {
      const storageKey = `timer_start_${sessionId}`;

      try {
        let savedStart = await AsyncStorage.getItem(storageKey);
        let startTimestamp;

        if (savedStart) {
          startTimestamp = parseInt(savedStart, 10);
        } else {
          startTimestamp = Date.now();
          await AsyncStorage.setItem(storageKey, startTimestamp.toString());
        }

        const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        const rem = Math.max(0, TOTAL_DURATION - elapsed);
        setRemaining(rem);
        setReady(true);

        if (rem > 0) {
          timerRef.current = setInterval(() => {
            setRemaining(prev => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (e) {
        setRemaining(TOTAL_DURATION);
        setReady(true);
      }
    };

    initTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionId]);

  if (!ready) return null;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const timeStr = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const progress = Math.min(1, 1 - (remaining / TOTAL_DURATION));
  const barColor = remaining > 1800 ? '#26CDD6' : remaining > 600 ? '#BCEFF3' : '#DE1A1C';

  const isLarge = size === 'large';

  // ─── الحجم الكبير (هيدر الممرض) ──────────────────────────────
  if (isLarge) {
    return (
      <View style={largeStyles.container}>
        {/* الوقت + أيقونة */}
        <View style={largeStyles.timeRow}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons
              name={remaining > 0 ? 'timer-sand' : 'timer-sand-complete'}
              size={28}
              color={barColor}
            />
          </Animated.View>
          <Text style={largeStyles.timeText}>{timeStr}</Text>
        </View>

        {/* شريط التحميل */}
        <View style={largeStyles.barContainer}>
          <View style={largeStyles.barBg}>
            <View style={[largeStyles.barFill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
            {/* نقطة مضيئة على رأس الشريط */}
            {remaining > 0 && progress > 0 && (
              <View style={[largeStyles.barGlow, { left: `${progress * 100}%`, backgroundColor: barColor }]} />
            )}
          </View>
          {/* أرقام الشريط */}
          <View style={largeStyles.barLabels}>
            <Text style={largeStyles.barLabelText}>0:00</Text>
            <Text style={[largeStyles.barLabelCenter, { color: barColor }]}>
              {remaining > 0 ? 'الوقت المتبقي' : '⏰ انتهى الوقت'}
            </Text>
            <Text style={largeStyles.barLabelText}>3:00</Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── الحجم الصغير (كارد) ──────────────────────────────────────
  return (
    <View style={smallStyles.container}>
      <View style={smallStyles.row}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <MaterialCommunityIcons
            name={remaining > 0 ? 'timer-sand' : 'timer-sand-complete'}
            size={18}
            color={barColor}
          />
        </Animated.View>
        <Text style={[smallStyles.timeText, { color: barColor }]}>{timeStr}</Text>
        <Text style={smallStyles.label}>
          {remaining > 0 ? 'الوقت المتبقي' : 'انتهى الوقت'}
        </Text>
      </View>
      <View style={smallStyles.barBg}>
        <View style={[smallStyles.barFill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

/**
 * مسح بيانات التايمر عند إنهاء الجلسة
 */
SessionTimer.clearTimer = async (sessionId) => {
  try {
    await AsyncStorage.removeItem(`timer_start_${sessionId}`);
  } catch (e) {
    console.log('Clear timer error:', e.message);
  }
};

// ─── Styles: Large (Header) ─────────────────────────────────────────
const largeStyles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  timeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  timeText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  barContainer: {
    width: '100%',
  },
  barBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barGlow: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    opacity: 0.6,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  barLabelText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  barLabelCenter: {
    fontSize: 12,
    fontWeight: '800',
  },
});

// ─── Styles: Small (Card) ───────────────────────────────────────────
const smallStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BCEFF3',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  label: {
    fontSize: 11,
    color: '#8296B1',
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
  },
  barBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default SessionTimer;
