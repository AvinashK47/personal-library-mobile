import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RefreshCw, Server, Check, X, ShieldAlert, Sparkles } from 'lucide-react-native';
import { colors, typography } from '../theme/colors';
import { api, DEFAULT_API_BASE_URL } from '../services/api';

interface HeaderBadgeProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export const HeaderBadge: React.FC<HeaderBadgeProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>(DEFAULT_API_BASE_URL);
  const [inputUrl, setInputUrl] = useState<string>('');

  const checkConnection = async () => {
    setChecking(true);
    try {
      await api.checkHealth();
      setIsOnline(true);
      onStatusChange?.(true);
    } catch {
      setIsOnline(false);
      onStatusChange?.(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    api.getBaseUrl().then((url) => {
      setCurrentUrl(url);
      setInputUrl(url);
    });
    checkConnection();
    const interval = setInterval(checkConnection, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setModalVisible(true);
  };

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    await api.setBaseUrl(inputUrl.trim());
    setCurrentUrl(inputUrl.trim());
    setModalVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    checkConnection();
    Alert.alert('Configuration Saved', `API Base URL updated to:\n${inputUrl.trim()}`);
  };

  const handleResetUrl = async () => {
    await api.resetBaseUrl();
    setCurrentUrl(DEFAULT_API_BASE_URL);
    setInputUrl(DEFAULT_API_BASE_URL);
    setModalVisible(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    checkConnection();
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
          {checking ? 'Checking' : isOnline ? 'Service Online' : 'Offline'}
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
                <Text style={styles.modalTitle}>Backend Service</Text>
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
                  {isOnline ? 'Active Connection' : 'Service Unreachable'}
                </Text>
                <Text style={styles.statusBoxSubtitle}>
                  {isOnline
                    ? 'CV Barcode decoding & dual-provider book resolution ready'
                    : 'Ensure server is running and ADB reverse proxy is active'}
                </Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <ShieldAlert size={15} color={colors.primaryLight} style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                Pixel 9 USB tunnel:{' '}
                <Text style={styles.tipCode}>adb reverse tcp:8000 tcp:8000</Text>
              </Text>
            </View>

            <Text style={styles.inputLabel}>Endpoint URL</Text>
            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://localhost:8000/api"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
                onPress={checkConnection}
              >
                <RefreshCw size={14} color={colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Ping</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
                onPress={handleResetUrl}
              >
                <Text style={styles.resetBtnText}>Default</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={handleSaveUrl}
              >
                <Check size={14} color={colors.background as string} />
                <Text style={styles.primaryBtnText}>Apply</Text>
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
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  badgePressed: {
    opacity: 0.75,
  },
  badgeOnline: {
    borderColor: 'rgba(45, 212, 191, 0.28)',
  },
  badgeOffline: {
    borderColor: 'rgba(244, 63, 94, 0.28)',
  },
  badgeChecking: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  dotOffline: {
    backgroundColor: colors.danger,
  },
  dotChecking: {
    backgroundColor: colors.textMuted,
  },
  text: {
    fontSize: 11,
    fontFamily: typography.sansMedium,
    color: colors.text,
    letterSpacing: 0.2,
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
    maxWidth: 360,
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
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
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
  tipBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
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
  input: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    fontFamily: typography.sans,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.cardElevated,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: typography.sansMedium,
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
    paddingVertical: 9,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: 12,
    fontFamily: typography.sansSemiBold,
  },
});
