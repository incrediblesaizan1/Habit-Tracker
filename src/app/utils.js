export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

export function getDayOfWeek(year, month, day) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date(year, month, day).getDay()];
}

export function getDayOfWeekShort(year, month, day) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return days[new Date(year, month, day).getDay()];
}

export function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getWeeksInMonth(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const weeks = [];
  let currentWeek = [];

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek === 0 || day === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return weeks;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function getProgressColor(percentage) {
  if (percentage >= 90) return '#10b981';
  if (percentage >= 75) return '#34d399';
  if (percentage >= 60) return '#f59e0b';
  if (percentage >= 40) return '#f97316';
  return '#ef4444';
}

export function getTodayString() {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth(), now.getDate());
}
