export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Astăzi';
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bună dimineața';
  if (hour >= 12 && hour < 18) return 'Bună ziua';
  return 'Bună seara';
};