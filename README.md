# Personal Library Mobile 📚

A modern, offline-first React Native mobile application for managing a personal physical book collection. Built with Expo, React Navigation, and Lucide Icons, featuring advanced optical capabilities for seamless cataloging.

## Features ✨
- **Barcode & ISBN Scanner:** Instant optical detection of ISBN-10 and ISBN-13 barcodes using the native device camera.
- **Computer Vision OCR (Cover / Spine Recognition):** Snap a photo of a book's cover or spine. The app uploads the high-res image to the Python FastAPI backend, which uses Tesseract OCR to extract title and author signals, matching them against Open Library and Google Books to automatically catalog the volume.
- **Glassmorphism UI:** Premium, native-feeling interface built with `expo-blur` and custom reticle animations.
- **Offline Reliability:** Fully featured SQLite offline persistence for cataloging books without internet.
- **ADB Tunneling:** Ready to connect to local and remote backend servers (pre-configured for `adb reverse tcp:8000 tcp:8000`).

## Tech Stack 🛠️
- **Framework:** React Native / Expo (SDK 51+)
- **Navigation:** React Navigation (Native Stack & Bottom Tabs)
- **Camera & Storage:** `expo-camera`, `expo-file-system`, `expo-image`
- **Styling:** Custom theme engine with Apple HIG and Material You influences
- **Icons:** `lucide-react-native`

## Development 🚀

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Setup ADB Reverse Tunnel (if running backend locally via USB):
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

4. Connect via the **Expo Go** app on your Android or iOS device.

## Build for Production 📦

This project is configured to be built securely in the cloud using **EAS (Expo Application Services)**.

To build an Android APK (v1 release):
```bash
eas build -p android --profile preview
```

To build for the Google Play Store (AAB):
```bash
eas build -p android --profile production
```

## Architecture 🏗️
- `/src/components`: Reusable, highly polished UI components (HeaderBadge, OcrResultModal).
- `/src/screens`: Main feature screens (Library, Scanner, Book Detail).
- `/src/services`: API abstraction layer featuring robust multi-part streaming for large optical payloads without memory leaks.
- `/src/theme`: Centralized design system with semantic color tokens.

---
*Built as the client interface for the Personal Library FastAPI ecosystem.*
