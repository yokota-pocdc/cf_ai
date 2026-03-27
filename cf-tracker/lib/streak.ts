/**
 * Streak tracking via localStorage
 * Stores: { currentStreak, lastRecordDate, longestStreak }
 */

const STREAK_KEY = 'cf-streak';

export interface StreakData {
  currentStreak: number;
  lastRecordDate: string; // YYYY-MM-DD
  longestStreak: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export function loadStreak(): StreakData {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, lastRecordDate: '', longestStreak: 0 };
  }
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) {
      const data: StreakData = JSON.parse(stored);
      // Check if streak has broken (more than 1 day gap)
      if (data.lastRecordDate && daysBetween(data.lastRecordDate, today()) > 1) {
        return { currentStreak: 0, lastRecordDate: data.lastRecordDate, longestStreak: data.longestStreak };
      }
      return data;
    }
  } catch {}
  return { currentStreak: 0, lastRecordDate: '', longestStreak: 0 };
}

export function recordToday(): StreakData {
  const data = loadStreak();
  const todayStr = today();

  // Already recorded today
  if (data.lastRecordDate === todayStr) {
    return data;
  }

  // Continue streak (yesterday or today is first)
  if (data.lastRecordDate === yesterday() || data.lastRecordDate === '') {
    data.currentStreak += 1;
  } else if (daysBetween(data.lastRecordDate, todayStr) > 1) {
    // Streak broken, restart
    data.currentStreak = 1;
  } else {
    data.currentStreak += 1;
  }

  data.lastRecordDate = todayStr;
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  return data;
}

export function getDaysSinceLastRecord(): number {
  const data = loadStreak();
  if (!data.lastRecordDate) return 999;
  return daysBetween(data.lastRecordDate, today());
}
