import { Platform } from 'react-native';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookMetadata,
  BarcodeScanResponse,
  HealthResponse,
  OCRIdentificationResponse,
  OCRResponse,
} from '../types';

const STORAGE_API_KEY = '@personal_library_api_url';
export const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiService {
  private customBaseUrl: string | null = null;

  async getBaseUrl(): Promise<string> {
    if (this.customBaseUrl) {
      return this.customBaseUrl;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_API_KEY);
      if (stored) {
        this.customBaseUrl = stored;
        return stored;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_API_BASE_URL;
  }

  async setBaseUrl(url: string): Promise<void> {
    const cleanUrl = url.replace(/\/+$/, '');
    this.customBaseUrl = cleanUrl;
    await AsyncStorage.setItem(STORAGE_API_KEY, cleanUrl);
  }

  async resetBaseUrl(): Promise<void> {
    this.customBaseUrl = null;
    await AsyncStorage.removeItem(STORAGE_API_KEY);
  }

  async checkHealth(): Promise<HealthResponse> {
    const baseUrl = await this.getBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Check ADB reverse proxy or backend server.');
      }
      throw new Error(err.message || 'Unable to reach backend server.');
    }
  }

  async testConnection(
    targetUrl: string
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const cleanUrl = targetUrl.replace(/\/+$/, '');
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${cleanUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${response.status} ${response.statusText}`,
        };
      }
      return { success: true, latencyMs };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error:
          err.name === 'AbortError'
            ? 'Connection timed out (>5000ms)'
            : err.message || 'Network unreachable',
      };
    }
  }

  private async uploadImageMultipart<T>(
    endpoint: string,
    imageUri: string
  ): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    if (Platform.OS === 'web') {
      const formData = new FormData();
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('image', blob, 'capture.jpg');

      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Upload failed (HTTP ${res.status})`;
        try {
          const p = JSON.parse(text);
          if (p.detail) msg = p.detail;
        } catch {}
        throw new Error(msg);
      }
      return await res.json();
    }

    // Native iOS and Android streaming upload via expo-file-system
    const result = await uploadAsync(url, imageUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      headers: {
        Accept: 'application/json',
      },
    });

    if (result.status < 200 || result.status >= 300) {
      let msg = `Request failed (HTTP ${result.status})`;
      try {
        const p = JSON.parse(result.body);
        if (p.detail) msg = p.detail;
      } catch {}
      throw new Error(msg);
    }

    return JSON.parse(result.body) as T;
  }

  async scanBarcodeImage(imageUri: string): Promise<BarcodeScanResponse> {
    return await this.uploadImageMultipart<BarcodeScanResponse>('/scan/barcode', imageUri);
  }

  async identifyBookFromOcr(imageUri: string): Promise<OCRIdentificationResponse> {
    return await this.uploadImageMultipart<OCRIdentificationResponse>(
      '/scan/identify-ocr',
      imageUri
    );
  }

  async scanOcrText(imageUri: string): Promise<OCRResponse> {
    return await this.uploadImageMultipart<OCRResponse>('/scan/ocr', imageUri);
  }

  async getBookByIsbn(isbn: string): Promise<BookMetadata> {
    const cleanIsbn = isbn.replace(/[-\s]/g, '').trim();
    if (!cleanIsbn) {
      throw new Error('Please provide a valid ISBN number.');
    }

    const baseUrl = await this.getBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        `${baseUrl}/books/isbn/${encodeURIComponent(cleanIsbn)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.status === 404) {
        throw new Error(
          `No book found for ISBN ${cleanIsbn} in Open Library or Google Books.`
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Failed to fetch book metadata (HTTP ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch {}
        throw new Error(message);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Metadata lookup timed out.');
      }
      throw err;
    }
  }
}

export const api = new ApiService();
