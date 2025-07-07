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
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const name = data[index][nameKey];
    return (
      <text
        x={x}
        y={y}
        fill="#222"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight="bold"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-row items-start" style={{ minHeight: 340 }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', minWidth: 0 }}>
        <ResponsiveContainer width={260} height={260}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', minWidth: 0 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ alignSelf: 'flex-start' }}>{title}</h3>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <Legend layout="horizontal" verticalAlign="bottom" align="right" />
        </div>
      </div>
    </div>
  );
};

export default CustomPieChart;