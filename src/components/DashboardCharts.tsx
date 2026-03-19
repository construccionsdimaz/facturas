"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface ChartData {
  name: string;
  total: number;
}

interface DashboardChartsProps {
  monthlyData: ChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ monthlyData }: DashboardChartsProps) {
  return (
    <div style={{ width: '100%', height: 180, marginTop: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}
            dy={10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDistributionChart({ data }: { data: { name: string, value: number, color: string }[] }) {
  return (
    <div style={{ width: '100%', height: 120, marginTop: '1rem' }}>
       <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            hide={false} 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: 500 }}
            width={100}
          />
          <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
