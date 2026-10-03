export interface BookMetadata {
  isbn10?: string | null;
  isbn13?: string | null;
  title?: string | null;
  authors: string[];
  publisher?: string | null;
  publication_date?: string | null;
  description?: string | null;
  subjects: string[];
  cover_url?: string | null;
  openlibrary_work_id?: string | null;
  openlibrary_edition_id?: string | null;
}

export type ReadingStatus = 'to_read' | 'reading' | 'completed';

export interface LibraryBook extends BookMetadata {
  id: string; // Unique identifier (e.g. ISBN-13 or generated ID)
  readingStatus: ReadingStatus;
  rating: number; // 0-5
  personalNotes: string;
  addedAt: string;
  updatedAt: string;
}

export interface BarcodeCandidate {
  isbn: string;
  format: string;
}

export interface BarcodeScanResponse {
  detected: boolean;
  candidates: BarcodeCandidate[];
}

export interface HealthResponse {
  status: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  BookDetail: {
    isbn?: string;
    book?: BookMetadata | LibraryBook;
    isEditingExisting?: boolean;
  };
};

export type MainTabParamList = {
  Scan: undefined;
  Library: undefined;
  Search: undefined;
};
