import React from 'react';

interface ProgressItem {
  name: string;
  achieved: number;
  target: number;
  color: string;
}

interface ProgressChartProps {
  data: ProgressItem[];
  title: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ data, title }) => {
  return (
    <div className="h-full">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>}
      <div className="space-y-3 h-full overflow-y-auto">
        {data.map((item, index) => {
          const percentage = item.target > 0 ? (item.achieved / item.target) * 100 : 0;
          const isOverAchieved = percentage > 100;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {item.name}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {percentage.toFixed(1)}%
                  </span>
                  <div className="text-xs text-gray-500">
                    ₹{(item.achieved / 100000).toFixed(1)}L / ₹{(item.target / 100000).toFixed(1)}L
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    isOverAchieved 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' 
                      : percentage >= 75 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : percentage >= 50
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
                {isOverAchieved && (
                  <div className="absolute top-0 right-0 h-3 w-2 bg-gradient-to-l from-emerald-800 to-emerald-700 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressChart;