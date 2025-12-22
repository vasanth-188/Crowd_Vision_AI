export interface VideoFrame {
  image: HTMLImageElement;
  timestamp: number;
}

export async function extractVideoFrame(
  file: File,
  timestamp: number = 0
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = timestamp;
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to extract frame'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      }, 'image/jpeg', 0.9);

      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

export async function extractMultipleFrames(
  file: File,
  count: number = 5
): Promise<VideoFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames: VideoFrame[] = [];

      try {
        // Extract frames at evenly spaced intervals
        for (let i = 0; i < count; i++) {
          const timestamp = (duration / (count + 1)) * (i + 1);
          const image = await extractVideoFrame(file, timestamp);
          frames.push({ image, timestamp });
        }
        resolve(frames);
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}
