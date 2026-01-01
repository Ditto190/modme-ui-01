import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendDirection = 'neutral' }) => {
    const getTrendColor = () => {
        if (trendDirection === 'up') return 'text-green-500';
        if (trendDirection === 'down') return 'text-red-500';
        return 'text-gray-500';
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col gap-2 min-w-[200px]">
            <div className="text-sm text-gray-500 font-medium">{title}</div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            {trend && (
                <div className={`text-xs font-semibold ${getTrendColor()}`}>
                    {trend}
                </div>
            )}
        </div>
    );
};
