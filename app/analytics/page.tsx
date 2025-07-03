'use client';

import Navigation from '../../components/Navigation';
import Analytics from '../../pages/Analytics';

export default function AnalyticsPage() {
  return (
    <>
      <Navigation />
      <main className="py-6">
        <Analytics />
      </main>
    </>
  );
}