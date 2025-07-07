import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DonutChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  title: string;
  colors?: string[];
  height?: number;
  centerText?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  colors = COLORS,
  height = 300,
  centerText
}) => {
  const total = data.reduce((sum, item) => sum + item[dataKey], 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        {centerText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                ₹{total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">{centerText}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonutChart;