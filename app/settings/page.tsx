'use client';

import Navigation from '../../components/Navigation';
import Settings from '../../pages/Settings';

export default function SettingsPage() {
  return (
    <>
      <Navigation />
      <main className="py-6">
        <Settings />
      </main>
    </>
  );
}