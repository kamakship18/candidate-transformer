import { useCallback, useRef, useState } from 'react';

interface UseFileReaderResult {
  readFile: (file: File) => Promise<string>;
  isReading: boolean;
  error: string | null;
}

/**
 * React hook for reading files using the FileReader API.
 * Returns the file content as a string.
 */
export function useFileReader(): UseFileReaderResult {
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);

  const readFile = useCallback((file: File): Promise<string> => {
    setIsReading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      readerRef.current = reader;

      reader.onload = (event) => {
        setIsReading(false);
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          const msg = 'FileReader returned unexpected result type';
          setError(msg);
          reject(new Error(msg));
        }
      };

      reader.onerror = () => {
        setIsReading(false);
        const msg = `Failed to read file: ${file.name}`;
        setError(msg);
        reject(new Error(msg));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }, []);

  return { readFile, isReading, error };
}
