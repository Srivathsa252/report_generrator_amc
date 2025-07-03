'use client';

import Navigation from '../../components/Navigation';
import ReceiptEntry from '../../components/ReceiptEntry';

export default function ReceiptsPage() {
  return (
    <>
      <Navigation />
      <main className="py-6">
        <ReceiptEntry />
      </main>
    </>
  );
}