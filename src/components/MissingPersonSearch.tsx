import { useState, useCallback } from 'react';
import { Upload, Search, AlertCircle, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MissingPersonSearchProps {
  onSearch: (referenceImage: File, threshold: number) => void;
  isSearching: boolean;
  disabled?: boolean;
}

export function MissingPersonSearch({ onSearch, isSearching, disabled }: MissingPersonSearchProps) {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.3);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    setReferenceImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

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
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClear = useCallback(() => {
    setReferenceImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleSearch = useCallback(() => {
    if (referenceImage) {
      onSearch(referenceImage, threshold);
    }
  }, [referenceImage, threshold, onSearch]);

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5 text-warning" />
          Missing Person Search
        </CardTitle>
        <CardDescription>
          Upload a photo of the missing person to search in the crowd image
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reference Image Upload */}
        <div className="space-y-2">
          <Label>Reference Photo</Label>
          {previewUrl ? (
            <div className="relative">
              <div className="relative aspect-square w-32 rounded-lg overflow-hidden border-2 border-warning/50 bg-muted">
                <img
                  src={previewUrl}
                  alt="Reference"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
                  disabled={isSearching}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {referenceImage?.name}
              </p>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
                'hover:border-warning/50 hover:bg-warning/5',
                isDragOver ? 'border-warning bg-warning/10' : 'border-border',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={disabled || isSearching}
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-3 rounded-full bg-warning/10">
                  <User className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-sm">Upload Reference Photo</p>
                  <p className="text-xs text-muted-foreground">
                    Drag & drop or click to select
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Similarity Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Match Sensitivity</Label>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(threshold * 100)}%
            </span>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([value]) => setThreshold(value)}
            min={0.1}
            max={0.7}
            step={0.05}
            disabled={isSearching}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Lower values find more potential matches, higher values are more strict
          </p>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={!referenceImage || isSearching || disabled}
          className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
        >
          {isSearching ? (
            <>
              <div className="w-4 h-4 border-2 border-warning-foreground/30 border-t-warning-foreground rounded-full animate-spin mr-2" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search in Crowd
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
