'use client';

import Navigation from '../../components/Navigation';
import TargetManagement from '../../pages/TargetManagement';

export default function TargetsPage() {
  return (
    <>
      <Navigation />
      <main className="py-6">
        <TargetManagement />
      </main>
    </>
  );
}