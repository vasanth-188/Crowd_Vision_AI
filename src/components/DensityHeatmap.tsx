import { useEffect, useRef } from 'react';

interface DensityHeatmapProps {
  imageSrc: string;
  heatmapData: number[][];
  opacity?: number;
}

export function DensityHeatmap({ imageSrc, heatmapData, opacity = 0.6 }: DensityHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !heatmapData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match container
      const rect = container.getBoundingClientRect();
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      
      let width = rect.width;
      let height = width / aspectRatio;
      
      if (height > rect.height) {
        height = rect.height;
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Draw heatmap overlay
      const rows = heatmapData.length;
      const cols = heatmapData[0]?.length || 0;
      const cellWidth = width / cols;
      const cellHeight = height / rows;

      // Find max value for normalization
      let maxVal = 0;
      for (const row of heatmapData) {
        for (const val of row) {
          if (val > maxVal) maxVal = val;
        }
      }

      if (maxVal === 0) return;

      // Draw heatmap cells
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const value = heatmapData[row][col] / maxVal;
          if (value > 0.05) {
            const x = col * cellWidth;
            const y = row * cellHeight;

            // Color gradient: blue -> yellow -> red
            let r, g, b;
            if (value < 0.5) {
              // Blue to yellow
              const t = value * 2;
              r = Math.round(59 + t * (245 - 59));
              g = Math.round(130 + t * (158 - 130));
              b = Math.round(246 + t * (11 - 246));
            } else {
              // Yellow to red
              const t = (value - 0.5) * 2;
              r = Math.round(245 + t * (239 - 245));
              g = Math.round(158 + t * (68 - 158));
              b = Math.round(11 + t * (68 - 11));
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * value})`;
            ctx.beginPath();
            ctx.arc(
              x + cellWidth / 2,
              y + cellHeight / 2,
              Math.max(cellWidth, cellHeight) * 0.8,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    };
    img.src = imageSrc;
  }, [imageSrc, heatmapData, opacity]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[300px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center"
    >
      <canvas ref={canvasRef} className="max-w-full max-h-full" />
    </div>
  );
}