import { useEffect, useRef, useState } from 'react';
import { Detection } from '@/lib/crowdDetection';
import { cn } from '@/lib/utils';

interface AnnotatedImageProps {
  imageSrc: string;
  detections: Detection[];
  highlightedDetection?: Detection | null;
  showBoxes?: boolean;
  showLabels?: boolean;
}

export function AnnotatedImage({ 
  imageSrc, 
  detections, 
  highlightedDetection,
  showBoxes = true,
  showLabels = true 
}: AnnotatedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const scaleX = dimensions.width / imageNaturalSize.width;
  const scaleY = dimensions.height / imageNaturalSize.height;
  const scale = Math.min(scaleX, scaleY) || 1;

  const scaledWidth = imageNaturalSize.width * scale;
  const scaledHeight = imageNaturalSize.height * scale;
  const offsetX = (dimensions.width - scaledWidth) / 2;
  const offsetY = (dimensions.height - scaledHeight) / 2;

  const renderBox = (detection: Detection, index: number, isHighlight: boolean = false) => {
    const x = offsetX + detection.box.xmin * scale;
    const y = offsetY + detection.box.ymin * scale;
    const width = (detection.box.xmax - detection.box.xmin) * scale;
    const height = (detection.box.ymax - detection.box.ymin) * scale;

    return (
      <div
        key={isHighlight ? 'highlight' : index}
        className={cn(
          'absolute border-2 rounded-sm transition-all duration-200',
          isHighlight 
            ? 'border-green-500 shadow-lg shadow-green-500/30 animate-pulse z-20' 
            : 'border-primary hover:border-accent hover:shadow-lg'
        )}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {showLabels && (
          <div className={cn(
            "absolute -top-6 left-0 px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap",
            isHighlight 
              ? 'bg-green-500 text-white' 
              : 'bg-primary text-primary-foreground'
          )}>
            {isHighlight 
              ? `MATCH (${Math.round(detection.score * 100)}%)`
              : `#${index + 1} (${Math.round(detection.score * 100)}%)`
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[300px] bg-muted/30 rounded-lg overflow-hidden"
    >
      <img
        src={imageSrc}
        alt="Analyzed"
        className="absolute inset-0 w-full h-full object-contain"
        onLoad={(e) => {
          const img = e.currentTarget;
          setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      
      {showBoxes && detections.map((detection, index) => renderBox(detection, index, false))}
      
      {/* Highlighted match detection */}
      {highlightedDetection && renderBox(highlightedDetection, -1, true)}
    </div>
  );
}