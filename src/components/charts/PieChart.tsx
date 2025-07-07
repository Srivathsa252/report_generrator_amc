import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  title: string;
  colors?: string[];
  height?: number;
}

const COLORS = ['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#65A30D', '#EA580C'];

const CustomPieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  colors = COLORS,
  height = 300
}) => {
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom Legend with Colors */}
        <div className="mt-4 grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-gray-700 truncate" title={entry[nameKey]}>
                {entry[nameKey]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomPieChart;