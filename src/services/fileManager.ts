import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api/client';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}kendibo/`;
const OUTBOX_KEY = '@kendibo_file_outbox';

export interface FileOutboxItem {
  id: string;
  localUri: string;
  endpoint: string;
  mimeType: string;
  fieldName: string;
  additionalData?: Record<string, string>;
  createdAt: number;
}

class FileManager {
  async init() {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }
  }

  /**
   * Save a file to the local cache directory.
   */
  async cacheFile(uri: string, filename: string): Promise<string> {
    await this.init();
    const dest = `${CACHE_FOLDER}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }

  /**
   * Add a file to the offline outbox for later upload.
   */
  async queueForUpload(item: Omit<FileOutboxItem, 'id' | 'createdAt'>): Promise<void> {
    const outbox = await this.getOutbox();
    const newItem: FileOutboxItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now(),
    };
    outbox.push(newItem);
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  }

  /**
   * Get all items in the file outbox.
   */
  async getOutbox(): Promise<FileOutboxItem[]> {
    const data = await AsyncStorage.getItem(OUTBOX_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Attempt to upload all files in the outbox.
   * If successful, removes the item from the outbox.
   */
  async processOutbox(): Promise<void> {
    const outbox = await this.getOutbox();
    if (outbox.length === 0) return;

    const remaining = [];
    for (const item of outbox) {
      try {
        await this.uploadFile(item);
      } catch (error) {
        console.error(`Failed to upload file ${item.id}:`, error);
        remaining.push(item);
      }
    }
    
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
  }

  /**
   * Direct upload function using expo-file-system
   */
  private async uploadFile(item: FileOutboxItem) {
    const formData = new FormData();
    formData.append(item.fieldName, {
      uri: item.localUri,
      name: item.localUri.split('/').pop() || 'upload.jpg',
      type: item.mimeType,
    } as any);

    if (item.additionalData) {
      Object.entries(item.additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await api.post(item.endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export const fileManager = new FileManager();
