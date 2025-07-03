import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMC Receipt Entry and Report Generation System',
  description: 'Agricultural Marketing Committee Receipt Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}