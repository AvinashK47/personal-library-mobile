import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  RefreshCw,
  Server,
  Check,
  X,
  ShieldAlert,
  Globe,
  Laptop,
  Radio,
} from 'lucide-react-native';
import { colors, typography } from '../theme/colors';
import { api, DEFAULT_API_BASE_URL } from '../services/api';

interface HeaderBadgeProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export const HeaderBadge: React.FC<HeaderBadgeProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>(DEFAULT_API_BASE_URL);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const checkConnection = async (targetUrl?: string) => {
    setChecking(true);
    const url = targetUrl || (await api.getBaseUrl());
    try {
      const result = await api.testConnection(url);
      if (result.success) {
        setIsOnline(true);
        setLatency(result.latencyMs);
        onStatusChange?.(true);
      } else {
        setIsOnline(false);
        setLatency(null);
        onStatusChange?.(false);
      }
    } catch {
      setIsOnline(false);
      setLatency(null);
      onStatusChange?.(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    api.getBaseUrl().then((url) => {
      setCurrentUrl(url);
      setInputUrl(url);
      checkConnection(url);
    });
    const interval = setInterval(() => {
      checkConnection();
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTestResult(null);
    setInputUrl(currentUrl);
    setModalVisible(true);
  };

  const handleTestInputUrl = async () => {
    if (!inputUrl.trim()) return;
    setChecking(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(inputUrl.trim());
      setTestResult({
        tested: true,
        success: res.success,
        latencyMs: res.latencyMs,
        error: res.error,
      });
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSaveUrl = async () => {
    const clean = inputUrl.trim().replace(/\/+$/, '');
    if (!clean) return;
    await api.setBaseUrl(clean);
    setCurrentUrl(clean);
    setModalVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    checkConnection(clean);
    Alert.alert('Server Configuration Saved', `App backend URL set to:\n${clean}`);
  };

  const handleApplyPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    setTestResult(null);
  };

  const handleResetUrl = async () => {
    await api.resetBaseUrl();
    const defaultUrl = await api.getBaseUrl();
    setCurrentUrl(defaultUrl);
    setInputUrl(defaultUrl);
    setTestResult(null);
    setModalVisible(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    checkConnection(defaultUrl);
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.badge,
          isOnline === true && styles.badgeOnline,
          isOnline === false && styles.badgeOffline,
          isOnline === null && styles.badgeChecking,
          pressed && styles.badgePressed,
        ]}
      >
        <View
          style={[
            styles.dot,
            isOnline === true && styles.dotOnline,
            isOnline === false && styles.dotOffline,
            isOnline === null && styles.dotChecking,
          ]}
        />
        <Text style={styles.text}>
          {checking
            ? 'Checking'
            : isOnline
            ? latency !== null
              ? `API Online (${latency}ms)`
              : 'API Online'
            : 'API Offline'}
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <Server size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Backend Service Settings</Text>
                <Text style={styles.modalSubtitle}>FastAPI Vision & Metadata Layer</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Status card */}
            <View style={styles.statusBox}>
              <View
                style={[
                  styles.statusDotLarge,
                  { backgroundColor: isOnline ? colors.success : colors.danger },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusBoxTitle}>
                  {isOnline
                    ? `Connected${latency !== null ? ` • ${latency}ms latency` : ''}`
                    : 'Service Unreachable'}
                </Text>
                <Text style={styles.statusBoxSubtitle} numberOfLines={2}>
                  {isOnline
                    ? `Ready for OCR and barcode detection at ${currentUrl}`
                    : 'Verify server is running and ADB reverse tunnel is active.'}
                </Text>
              </View>
            </View>

            {/* Quick Presets */}
            <Text style={styles.inputLabel}>Quick Presets</Text>
            <View style={styles.presetsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.presetChip,
                  inputUrl.includes('localhost:8000') && styles.presetChipActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => handleApplyPreset('http://localhost:8000/api')}
              >
                <Laptop size={13} color={colors.primary} />
                <Text style={styles.presetText}>Local USB / ADB</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.presetChip,
                  inputUrl.includes('onrender.com') && styles.presetChipActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() =>
                  handleApplyPreset('https://personal-library-api.onrender.com/api')
                }
              >
                <Globe size={13} color={colors.primary} />
                <Text style={styles.presetText}>Render Cloud</Text>
              </Pressable>
            </View>

            <View style={styles.tipBox}>
              <ShieldAlert size={14} color={colors.primaryLight} style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                Laptop ADB tunnel: <Text style={styles.tipCode}>adb reverse tcp:8000 tcp:8000</Text>
              </Text>
            </View>

            <Text style={styles.inputLabel}>Custom API Base URL</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputUrl}
                onChangeText={(text) => {
                  setInputUrl(text);
                  setTestResult(null);
                }}
                placeholder="http://localhost:8000/api"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.testPingBtn,
                  pressed && { opacity: 0.7 },
                  checking && { opacity: 0.5 },
                ]}
                onPress={handleTestInputUrl}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Radio size={13} color={colors.primary} />
                    <Text style={styles.testPingBtnText}>Test</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Test connection result pill */}
            {testResult?.tested && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testResultSuccess : styles.testResultError,
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.success ? colors.success : colors.danger },
                  ]}
                >
                  {testResult.success
                    ? `✓ Reachable! Response in ${testResult.latencyMs}ms`
                    : `✗ Failed: ${testResult.error || 'Connection refused'}`}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
                onPress={handleResetUrl}
              >
                <Text style={styles.resetBtnText}>Reset Default</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={handleSaveUrl}
              >
                <Check size={14} color={colors.background as string} />
                <Text style={styles.primaryBtnText}>Save & Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 22, 26, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
  },
  badgePressed: {
    opacity: 0.75,
  },
  badgeOnline: {
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  badgeOffline: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  badgeChecking: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 7,
  },
  dotOnline: {
    backgroundColor: '#34D399',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  dotOffline: {
    backgroundColor: '#F87171',
    shadowColor: '#F87171',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  dotChecking: {
    backgroundColor: '#94A3B8',
  },
  text: {
    fontSize: 11.5,
    fontFamily: typography.sansSemiBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.cardElevated,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundElevated,
    padding: 13,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 4,
  },
  statusBoxTitle: {
    fontSize: 13,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  statusBoxSubtitle: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  presetText: {
    fontSize: 11,
    fontFamily: typography.sansMedium,
    color: colors.text,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    gap: 8,
  },
  tipText: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  tipCode: {
    fontFamily: 'monospace',
    color: colors.primaryLight,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: typography.sansMedium,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
    fontFamily: typography.sans,
  },
  testPingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testPingBtnText: {
    fontSize: 12,
    fontFamily: typography.sansSemiBold,
    color: colors.primary,
  },
  testResultBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  testResultText: {
    fontSize: 11,
    fontFamily: typography.sansMedium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  resetBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: typography.sans,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: 12,
    fontFamily: typography.sansSemiBold,
  },
});
