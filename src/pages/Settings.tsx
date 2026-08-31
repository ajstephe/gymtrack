import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ShieldCheck, ShieldAlert, Download, Upload, BellRing, BellOff } from 'lucide-react';
import { db } from '../data/db';
import { isStoragePersisted, requestPersistentStorage } from '../lib/storagePersistence';
import { buildBackup, downloadBackup, isValidBackup, restoreBackup } from '../lib/backup';
import { notificationStatus, requestNotificationPermission, type NotificationStatus } from '../lib/notifications';

export function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(() => notificationStatus());

  const exerciseCount = useLiveQuery(() => db.exercises.count(), []) ?? 0;
  const sessionCount = useLiveQuery(() => db.sessions.count(), []) ?? 0;
  const setCount = useLiveQuery(() => db.sets.count(), []) ?? 0;
  const photoCount = useLiveQuery(() => db.photos.count(), []) ?? 0;

  useEffect(() => {
    isStoragePersisted().then(setPersisted);
  }, []);

  async function handleRequestPersist() {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
  }

  async function handleEnableNotifications() {
    const status = await requestNotificationPermission();
    setNotifStatus(status);
  }

  async function handleExport() {
    setBusy('export');
    try {
      const data = await buildBackup();
      downloadBackup(data);
    } finally {
      setBusy(null);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidBackup(parsed)) {
        alert("This doesn't look like a valid Gym Tracker backup file.");
        return;
      }
      const summary = `${parsed.exercises.length} exercises, ${parsed.sessions.length} workouts, ${parsed.sets.length} sets, ${parsed.photos.length} photos`;
      if (!confirm(`Restore this backup (${summary})? This replaces all data currently in the app.`)) {
        return;
      }
      await restoreBackup(parsed);
      alert('Backup restored.');
      window.location.href = '/';
    } catch {
      alert('Could not read that file — make sure it\'s an unmodified Gym Tracker backup.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pt-5">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-[var(--color-text-dim)]">
        <ArrowLeft size={18} />
      </button>

      <h1 className="mb-5 text-2xl font-bold">Settings</h1>

      <div className="mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-dim)]">Storage</h2>
        <div className="mb-3 flex items-center gap-2.5">
          {persisted ? (
            <ShieldCheck size={18} className="shrink-0 text-[var(--color-lime)]" />
          ) : (
            <ShieldAlert size={18} className="shrink-0 text-[var(--color-amber)]" />
          )}
          <p className="text-sm text-[var(--color-text-dim)]">
            {persisted == null
              ? 'Checking…'
              : persisted
                ? "Your data is protected from automatic cleanup on this device's browser."
                : "Not yet protected — the browser could clear your data under storage pressure."}
          </p>
        </div>
        {!persisted && (
          <button
            onClick={handleRequestPersist}
            className="w-full rounded-lg bg-[var(--color-surface-2)] py-2 text-sm font-medium"
          >
            Enable protection
          </button>
        )}
      </div>

      <div className="mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-dim)]">Rest Timer Alerts</h2>
        <div className="mb-3 flex items-center gap-2.5">
          {notifStatus === 'granted' ? (
            <BellRing size={18} className="shrink-0 text-[var(--color-lime)]" />
          ) : (
            <BellOff size={18} className="shrink-0 text-[var(--color-amber)]" />
          )}
          <p className="text-sm text-[var(--color-text-dim)]">
            {notifStatus === 'unsupported'
              ? "This browser doesn't support notifications."
              : notifStatus === 'granted'
                ? "You'll get a notification when a rest timer finishes, even if you've switched apps."
                : notifStatus === 'denied'
                  ? 'Blocked — re-enable notifications for this site in your browser settings.'
                  : "Turn on alerts so you don't miss your rest timer if you switch apps. Won't fire if the screen is off."}
          </p>
        </div>
        {notifStatus === 'default' && (
          <button
            onClick={handleEnableNotifications}
            className="w-full rounded-lg bg-[var(--color-surface-2)] py-2 text-sm font-medium"
          >
            Enable alerts
          </button>
        )}
      </div>

      <div className="mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-dim)]">Backup</h2>
        <p className="mb-3 text-xs text-[var(--color-text-faint)]">
          {exerciseCount} exercises · {sessionCount} workouts · {setCount} sets · {photoCount} photos
        </p>
        <p className="mb-3 text-xs text-[var(--color-text-faint)]">
          Everything lives only on this device. Export a backup file regularly, and if you ever lose your browser
          data, import it to restore everything — including photos.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={busy != null}
            className="btn-glow-primary flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm disabled:opacity-40 disabled:shadow-none"
          >
            <Download size={15} /> {busy === 'export' ? 'Exporting…' : 'Export'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy != null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            <Upload size={15} /> {busy === 'import' ? 'Importing…' : 'Import'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
}
