import { useRef, useState } from 'react';

interface MultiFileDropZoneProps {
  accept: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  label: string;
  description: string;
  color: string;
  multiple?: boolean;
}

export function MultiFileDropZone({
  accept,
  files,
  onFilesChange,
  label,
  description,
  color,
  multiple = true,
}: MultiFileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    if (!next.length) {
      return;
    }

    if (multiple) {
      const existing = new Set(files.map((file) => `${file.name}:${file.size}`));
      const merged = [...files];
      for (const file of next) {
        const key = `${file.name}:${file.size}`;
        if (!existing.has(key)) {
          merged.push(file);
          existing.add(key);
        }
      }
      onFilesChange(merged);
      return;
    }

    onFilesChange([next[0]!]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-3 border border-border"
            >
              <span className="text-success flex-shrink-0">✓</span>
              <span className="text-xs text-text-secondary truncate flex-1">{file.name}</span>
              <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
              <button
                onClick={() => removeFile(index)}
                className="text-text-muted hover:text-danger transition-colors text-xs px-1"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) {
            addFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={[
          'flex flex-col items-center gap-1.5 px-3 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150',
          dragging ? 'border-current bg-current/5 opacity-100' : 'border-border hover:border-border-hover',
        ].join(' ')}
        style={dragging ? { color } : {}}
      >
        <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 20 20">
          <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-xs text-text-muted text-center">{label}</span>
        <span className="text-xs text-text-muted opacity-60">{description}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              addFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
