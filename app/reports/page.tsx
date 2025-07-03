'use client';

import Navigation from '../../components/Navigation';
import Reports from '../../pages/Reports';

export default function ReportsPage() {
  return (
    <>
      <Navigation />
      <main className="py-6">
        <Reports />
      </main>
    </>
  );
}