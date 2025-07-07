import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { seedData } from '../data/seedData';

const SeedDataButton: React.FC = () => {
  const [receipts, setReceipts] = useLocalStorage('receipts', []);
  const [targets, setTargets] = useLocalStorage('targets', []);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSeedData = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Simulate loading time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear existing data and load seed data
      setReceipts(seedData.receipts);
      setTargets(seedData.targets);

      setMessage({
        type: 'success',
        text: `Successfully loaded ${seedData.receipts.length} receipts and ${seedData.targets.length} targets!`
      });

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load seed data. Please try again.'
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = receipts.length > 0 || targets.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sample Data</h3>
            <p className="text-sm text-gray-600">
              Load comprehensive sample data to explore all analytics features
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {hasData && (
            <div className="text-sm text-gray-600">
              Current: {receipts.length} receipts, {targets.length} targets
            </div>
          )}
          
          <button
            onClick={handleSeedData}
            disabled={isLoading}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Loading Sample Data...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Load Sample Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Preview */}
      {hasData && !isLoading && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">{receipts.length}</div>
              <div className="text-sm text-blue-600">Total Receipts</div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">
                ₹{(receipts.filter(r => r.natureOfReceipt === 'mf').reduce((sum, r) => sum + r.marketFee, 0) / 10000000).toFixed(1)}Cr
              </div>
              <div className="text-sm text-green-600">Total Market Fee</div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800">{targets.length}</div>
              <div className="text-sm text-purple-600">Target Configurations</div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          )}
          <span className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </span>
        </div>
      )}

      {/* Data Features Preview */}
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Sample Data Includes:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            2,000+ realistic market fee receipts
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Complete target configurations
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            Multi-year data (2024-25 & 2025-26)
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
            All 9 AMC committees
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            13 different commodities
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            Checkpost-wise collections
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedDataButton;