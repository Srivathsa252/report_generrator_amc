import React from 'react';

interface HeatmapData {
  month: string;
  committee: string;
  value: number;
  percentage: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title: string;
  months: string[];
  committees: string[];
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({ data, title, months, committees }) => {
  const getIntensity = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-600';
    if (percentage >= 80) return 'bg-green-400';
    if (percentage >= 60) return 'bg-yellow-400';
    if (percentage >= 40) return 'bg-orange-400';
    if (percentage >= 20) return 'bg-red-400';
    return 'bg-red-600';
  };

  const getOpacity = (percentage: number) => {
    return Math.max(0.3, Math.min(1, percentage / 100));
  };

  const getCellData = (month: string, committee: string) => {
    return data.find(d => d.month === month && d.committee === committee);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-1 gap-2">
            {/* Header */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${months.length}, 80px)` }}>
              <div className="p-2 font-medium text-gray-700">Committee</div>
              {months.map(month => (
                <div key={month} className="p-2 text-xs font-medium text-gray-700 text-center">
                  {month.slice(0, 3)}
                </div>
              ))}
            </div>
            
            {/* Data Rows */}
            {committees.map(committee => (
              <div key={committee} className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${months.length}, 80px)` }}>
                <div className="p-2 text-sm font-medium text-gray-900 truncate" title={committee}>
                  {committee.length > 25 ? `${committee.slice(0, 25)}...` : committee}
                </div>
                {months.map(month => {
                  const cellData = getCellData(month, committee);
                  const percentage = cellData?.percentage || 0;
                  const value = cellData?.value || 0;
                  
                  return (
                    <div
                      key={`${committee}-${month}`}
                      className={`p-2 text-xs text-white text-center rounded cursor-pointer transition-all duration-200 hover:scale-105 ${getIntensity(percentage)}`}
                      style={{ opacity: getOpacity(percentage) }}
                      title={`${committee} - ${month}: ₹${value.toLocaleString()} (${percentage.toFixed(1)}%)`}
                    >
                      {percentage.toFixed(0)}%
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-600">Achievement:</span>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-xs text-gray-600">0-20%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-400 rounded"></div>
              <span className="text-xs text-gray-600">20-40%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span className="text-xs text-gray-600">40-60%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span className="text-xs text-gray-600">60-80%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span className="text-xs text-gray-600">80-100%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-xs text-gray-600">100%+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;