import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ReceiptEntry from './components/ReceiptEntry';
import TargetManagement from './pages/TargetManagement';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/receipts" />} />
            <Route path="/receipts" element={<ReceiptEntry />} />
            <Route path="/targets" element={<TargetManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;