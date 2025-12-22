import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface AnalyticsEntry {
  timestamp: Date;
  peopleCount: number;
  processingTime: number;
  alertsTriggered: boolean;
  zoneData?: Record<string, number>;
}

interface AnalyticsContextType {
  totalAnalyses: number;
  totalPeopleDetected: number;
  avgProcessingTime: number;
  criticalAlerts: number;
  weeklyData: Array<{ day: string; count: number; peak: number }>;
  hourlyData: Array<{ hour: string; count: number }>;
  recentEntries: AnalyticsEntry[];
  recordDetection: (peopleCount: number, processingTime: number, alertTriggered?: boolean, zoneData?: Record<string, number>) => void;
  getLastMonth: () => AnalyticsEntry[];
  getLastWeek: () => AnalyticsEntry[];
  getLastDay: () => AnalyticsEntry[];
  clearAnalytics: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('crowd_analytics');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        setEntries(
          parsed.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }))
        );
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    }
  }, []);

  // Persist to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('crowd_analytics', JSON.stringify(entries));
  }, [entries]);

  const recordDetection = useCallback(
    (peopleCount: number, processingTime: number, alertTriggered = false, zoneData?: Record<string, number>) => {
      const entry: AnalyticsEntry = {
        timestamp: new Date(),
        peopleCount,
        processingTime,
        alertsTriggered: alertTriggered,
        zoneData,
      };
      setEntries((prev) => [...prev, entry]);
    },
    []
  );

  const clearAnalytics = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem('crowd_analytics');
    } catch {}
  }, []);

  const getLastDay = useCallback(
    () =>
      entries.filter((e) => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return e.timestamp > oneDayAgo;
      }),
    [entries]
  );

  const getLastWeek = useCallback(
    () =>
      entries.filter((e) => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return e.timestamp > oneWeekAgo;
      }),
    [entries]
  );

  const getLastMonth = useCallback(
    () =>
      entries.filter((e) => {
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return e.timestamp > oneMonthAgo;
      }),
    [entries]
  );

  // Calculate stats
  const totalAnalyses = entries.length;
  const totalPeopleDetected = entries.reduce((sum, e) => sum + e.peopleCount, 0);
  const avgProcessingTime =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.processingTime, 0) / entries.length
      : 0;
  const criticalAlerts = entries.filter((e) => e.alertsTriggered).length;

  // Build weekly data (group by day of week)
  const weeklyData = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap: Record<string, { count: number; peak: number }> = {};

    days.forEach((day) => {
      dayMap[day] = { count: 0, peak: 0 };
    });

    getLastWeek().forEach((entry) => {
      const dayIndex = entry.timestamp.getDay();
      const dayName = days[(dayIndex + 6) % 7]; // Adjust Sunday from 0 to 6
      dayMap[dayName].count += entry.peopleCount;
      dayMap[dayName].peak = Math.max(dayMap[dayName].peak, entry.peopleCount);
    });

    return days.map((day) => ({
      day,
      count: Math.round(dayMap[day].count / Math.max(1, getLastWeek().filter((e) => {
        const dayIndex = e.timestamp.getDay();
        return days[(dayIndex + 6) % 7] === day;
      }).length)),
      peak: dayMap[day].peak,
    }));
  })();

  // Build hourly data
  const hourlyData = (() => {
    const hours = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'];
    const bucketHours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
    const hourMap: Record<string, number[]> = {};

    hours.forEach((h) => {
      hourMap[h] = [];
    });

    const dayEntries = getLastDay();
    dayEntries.forEach((entry) => {
      const h = entry.timestamp.getHours();
      // Find nearest bucket hour
      let nearestIdx = 0;
      let minDist = Infinity;
      bucketHours.forEach((bh, idx) => {
        const dist = Math.abs(h - bh);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });
      const key = hours[nearestIdx];
      hourMap[key].push(entry.peopleCount);
    });

    return hours.map((h) => ({
      hour: h,
      count: hourMap[h].length > 0 ? Math.round(hourMap[h].reduce((a, b) => a + b, 0) / hourMap[h].length) : 0,
    }));
  })();

  return (
    <AnalyticsContext.Provider
      value={{
        totalAnalyses,
        totalPeopleDetected,
        avgProcessingTime,
        criticalAlerts,
        weeklyData,
        hourlyData,
        recentEntries: entries,
        recordDetection,
        getLastMonth,
        getLastWeek,
        getLastDay,
        clearAnalytics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
