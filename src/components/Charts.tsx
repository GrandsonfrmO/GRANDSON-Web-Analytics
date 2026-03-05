import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { cn } from '../utils';

interface ChartProps {
  data: any[];
  title?: string;
  description?: string;
  className?: string;
  height?: number;
}

export function PerformanceChart({ data, title, description, className, height = 300 }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white p-6 rounded-2xl border border-slate-200", className)}
    >
      {title && <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
          />
          <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPerf)" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function ComparisonChart({ data, title, description, className, height = 300 }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white p-6 rounded-2xl border border-slate-200", className)}
    >
      {title && <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
          />
          <Legend />
          <Bar dataKey="value1" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          <Bar dataKey="value2" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function DistributionChart({ data, title, description, className, height = 300 }: ChartProps) {
  const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white p-6 rounded-2xl border border-slate-200", className)}
    >
      {title && <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function TrendChart({ data, title, description, className, height = 300 }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white p-6 rounded-2xl border border-slate-200", className)}
    >
      {title && <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
          />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function RadarScoreChart({ data, title, description, className }: ChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white p-6 rounded-2xl border border-slate-200", className)}
    >
      {title && <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
          <PolarRadiusAxis stroke="#94a3b8" />
          <Radar name="Score" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
