import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookMetadata, BarcodeScanResponse, HealthResponse } from '../types';

const STORAGE_API_KEY = '@personal_library_api_url';
export const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

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
        throw new Error('Connection timed out. Check ADB reverse proxy and backend server.');
      }
      throw new Error(err.message || 'Unable to reach backend server.');
    }
  }

  async scanBarcodeImage(imageUri: string): Promise<BarcodeScanResponse> {
    const baseUrl = await this.getBaseUrl();
    const formData = new FormData();

    // Prepare image for multipart form upload
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore: React Native FormData accepts uri/type/name object
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseUrl}/scan/barcode`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Scan failed (HTTP ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch {
          // Keep default message
        }
        throw new Error(message);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Barcode scanning timed out. The backend took too long to process.');
      }
      throw err;
    }
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
      const response = await fetch(`${baseUrl}/books/isbn/${encodeURIComponent(cleanIsbn)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 404) {
        throw new Error(`No book found for ISBN ${cleanIsbn} in Open Library or Google Books.`);
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
