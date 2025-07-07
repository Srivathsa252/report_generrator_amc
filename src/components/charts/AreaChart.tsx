import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  height?: number;
}

const CustomAreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#3B82F6',
  height = 300
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
            labelStyle={{ color: '#374151' }}
          />
          <Area 
            type="monotone" 
            dataKey={yKey} 
            stroke={color} 
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomAreaChart;