import React from 'react';
import { StyleSheet, View, useColorScheme, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanLine, BookOpen, Compass } from 'lucide-react-native';
import { colors, typography } from '../theme/colors';
import { ScanScreen } from '../screens/ScanScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { RootStackParamList, MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      initialRouteName="Scan"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarActiveTintColor: colors.primary as string,
        tabBarInactiveTintColor: colors.textMuted as string,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <ScanLine size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'My Library',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <BookOpen size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Discovery',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Compass size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const isDark = useColorScheme() === 'dark';

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary as string,
          background: colors.background as string,
          card: colors.card as string,
          text: colors.text as string,
          border: colors.border as string,
          notification: colors.primaryLight as string,
        },
        fonts: {
          regular: { fontFamily: typography.sans, fontWeight: '400' },
          medium: { fontFamily: typography.sansMedium, fontWeight: '500' },
          bold: { fontFamily: typography.sansSemiBold, fontWeight: '700' },
          heavy: { fontFamily: typography.serifBold, fontWeight: '800' },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background as string },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: typography.sansMedium,
    letterSpacing: 0.2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  iconWrapperActive: {
    backgroundColor: colors.primaryMuted,
  },
});
