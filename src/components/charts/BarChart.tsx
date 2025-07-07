import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  title: string;
  color?: string;
  height?: number;
}

const CustomBarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#3B82F6',
  height = 300
}) => {
  // Support grouped/double bar chart if yKey is array
  const isGrouped = Array.isArray(yKey);
  const colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B']; // Add more if needed

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xKey} 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
            labelStyle={{ color: '#374151' }}
          />
          <Legend />
          {isGrouped
            ? (yKey as string[]).map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % colors.length]}
                  radius={[4, 4, 0, 0]}
                  name={key}
                />
              ))
            : <Bar dataKey={yKey as string} fill={color} radius={[4, 4, 0, 0]} />
          }
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;