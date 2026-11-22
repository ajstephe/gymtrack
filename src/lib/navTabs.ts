import { Home, Dumbbell, History, CalendarDays, ListTree, Disc3, Settings } from 'lucide-react';

export const navTabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/train', label: 'Train', icon: Dumbbell, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/exercises', label: 'Exercises', icon: ListTree, end: false },
  { to: '/plates', label: 'Plates', icon: Disc3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];
