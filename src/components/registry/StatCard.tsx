import React from 'react';
import { z } from 'zod';

// Zod schema for runtime validation
const StatCardPropsSchema = z.object({
    title: z.string().min(1, "Title is required"),
    value: z.union([z.string(), z.number()]),
    trend: z.string().optional(),
    trendDirection: z.enum(['up', 'down', 'neutral']).optional(),
});

type StatCardProps = z.infer<typeof StatCardPropsSchema>;

export const StatCard: React.FC<StatCardProps> = (rawProps) => {
    // Validate props at runtime
    const result = StatCardPropsSchema.safeParse(rawProps);
    
    if (!result.success) {
        console.error('StatCard validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid StatCard props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }
    
    const { title, value, trend, trendDirection = 'neutral' } = result.data;
    const getTrendColor = () => {
        if (trendDirection === 'up') return 'text-green-500';
        if (trendDirection === 'down') return 'text-red-500';
        return 'text-gray-500';
    };
    
    // Format value (add commas for numbers)
    const formattedValue = typeof value === 'number' 
        ? value.toLocaleString() 
        : value;

    return (
        <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col gap-2 min-w-[200px]">
            <div className="text-sm text-gray-500 font-medium">{title}</div>
            <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
            {trend && (
                <div className={`text-xs font-semibold ${getTrendColor()}`}>
                    {trend}
                </div>
            )}
        </div>
    );
};
