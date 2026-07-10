export const formatTime = (date: Date, locale: string = 'en') => {
  const targetLocale = locale === 'ro' ? 'ro-RO' : 'en-US';
  return date.toLocaleTimeString(targetLocale, { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date, locale: string = 'en') => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  // Handle the relative date strings based on the language
  if (date.toDateString() === today.toDateString()) {
    return locale === 'ro' ? 'Astăzi' : 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return locale === 'ro' ? 'Ieri' : 'Yesterday';
  }

  // Handle standard calendar formatting using native JS Internationalization
  const targetLocale = locale === 'ro' ? 'ro-RO' : 'en-US';
  return date.toLocaleDateString(targetLocale, { day: '2-digit', month: 'long', year: 'numeric' });
};

export const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bună dimineața';
  if (hour >= 12 && hour < 18) return 'Bună ziua';
  return 'Bună seara';
};