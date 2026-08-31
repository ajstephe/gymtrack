export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationStatus(): NotificationStatus {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationStatus();
  }
}

/**
 * Fires a system notification when a rest timer completes, in addition to the in-app
 * chime/vibration. Prefers the service worker registration (required by some mobile
 * browsers for installed PWAs) and falls back to the plain Notification constructor.
 * Best-effort only: browsers throttle or fully suspend background tabs, so this can't
 * guarantee delivery when the screen is off — it mainly covers switching to another app
 * or tab while the browser stays alive.
 */
export async function notifyRestDone(label?: string | null) {
  if (notificationStatus() !== 'granted') return;
  const body = label ? `Time to get back to ${label}` : 'Time for your next set';
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification('Rest complete', { body, tag: 'gym-tracker-rest' });
        return;
      }
    }
    new Notification('Rest complete', { body, tag: 'gym-tracker-rest' });
  } catch {
    // best effort — ignore environments that reject direct Notification construction
  }
}
