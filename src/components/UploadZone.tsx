import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, accept = 'image/*,video/*', disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setFileName(null);
  }, []);

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-300',
        'flex flex-col items-center justify-center p-8 text-center',
        isDragOver && !disabled
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
        preview ? 'min-h-[300px]' : 'min-h-[250px]'
      )}
      onDrop={!disabled ? handleDrop : undefined}
      onDragOver={!disabled ? handleDragOver : undefined}
      onDragLeave={!disabled ? handleDragLeave : undefined}
    >
      {preview ? (
        <div className="relative w-full">
          <button
            onClick={clearPreview}
            className="absolute -top-2 -right-2 z-10 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={preview}
            alt="Preview"
            className="max-h-[250px] mx-auto rounded-lg object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground truncate max-w-full">{fileName}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 rounded-full bg-primary/10">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Drop your image or video here
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Supports JPG, PNG, WEBP images and MP4, WEBM videos
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              <span>Images</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1">
              <Film className="w-4 h-4" />
              <span>Videos</span>
            </div>
          </div>
          <label className={cn(
            'px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            disabled && 'pointer-events-none'
          )}>
            Browse Files
            <input
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled}
            />
          </label>
        </>
      )}
    </div>
  );
}