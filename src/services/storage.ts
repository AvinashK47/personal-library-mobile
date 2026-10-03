import AsyncStorage from '@react-native-async-storage/async-storage';
import { LibraryBook, ReadingStatus } from '../types';

const STORAGE_LIBRARY_KEY = '@personal_library_books';

export const storage = {
  async getLibrary(): Promise<LibraryBook[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_LIBRARY_KEY);
      if (!data) return [];
      const books: LibraryBook[] = JSON.parse(data);
      // Sort recently updated or added first
      return books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (e) {
      console.error('Failed to load library from storage', e);
      return [];
    }
  },

  async saveBook(book: LibraryBook): Promise<LibraryBook[]> {
    try {
      const current = await this.getLibrary();
      const existingIndex = current.findIndex(
        (b) => b.id === book.id || (book.isbn13 && b.isbn13 === book.isbn13) || (book.isbn10 && b.isbn10 === book.isbn10)
      );

      const now = new Date().toISOString();
      let updated: LibraryBook[];

      if (existingIndex >= 0) {
        // Update existing entry
        const existing = current[existingIndex];
        const merged: LibraryBook = {
          ...existing,
          ...book,
          updatedAt: now,
        };
        updated = [...current];
        updated[existingIndex] = merged;
      } else {
        const newBook: LibraryBook = {
          ...book,
          addedAt: book.addedAt || now,
          updatedAt: now,
        };
        updated = [newBook, ...current];
      }

      await AsyncStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to save book to storage', e);
      throw new Error('Failed to save book to local bookshelf');
    }
  },

  async deleteBook(id: string): Promise<LibraryBook[]> {
    try {
      const current = await this.getLibrary();
      const updated = current.filter((b) => b.id !== id && b.isbn13 !== id && b.isbn10 !== id);
      await AsyncStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to remove book from storage', e);
      throw new Error('Failed to remove book');
    }
  },

  async getBook(idOrIsbn: string): Promise<LibraryBook | null> {
    try {
      const books = await this.getLibrary();
      return (
        books.find(
          (b) =>
            b.id === idOrIsbn ||
            b.isbn13 === idOrIsbn ||
            b.isbn10 === idOrIsbn ||
            (b.isbn13 && b.isbn13.replace(/-/g, '') === idOrIsbn.replace(/-/g, ''))
        ) || null
      );
    } catch (e) {
      console.error('Failed to get book', e);
      return null;
    }
  },
};
