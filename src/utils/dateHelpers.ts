import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from 'date-fns';

export function formatWorkoutDate(date: Date): string {
  if (isNaN(date.getTime())) {return 'Invalid Date';}
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }
  if (isThisMonth(date)) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}

export function formatRelativeTime(date: Date): string {
  if (isNaN(date.getTime())) {return '';}
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
  return eachDayOfInterval({ start: startDate, end: endDate });
}

export function getDaysBetween(startDate: Date, endDate: Date): number {
  return differenceInDays(endDate, startDate);
}

export function getStartOfDay(date: Date): Date {
  return startOfDay(date);
}

export function getEndOfDay(date: Date): Date {
  return endOfDay(date);
}

export function formatTime(date: Date): string {
  if (isNaN(date.getTime())) {return '';}
  return format(date, 'h:mm a');
}

export function formatDateShort(date: Date): string {
  if (isNaN(date.getTime())) {return '';}
  return format(date, 'MMM d');
}

export function formatDateLong(date: Date): string {
  if (isNaN(date.getTime())) {return '';}
  return format(date, 'MMMM d, yyyy');
}

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

