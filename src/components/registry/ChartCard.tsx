import React from 'react';
import { z } from 'zod';

// Zod schema for runtime validation
const ChartCardPropsSchema = z.object({
    title: z.string().min(1, "Title is required"),
    chartType: z.enum(['line', 'bar', 'pie']),
    data: z.array(z.any()).min(1, "At least one data point is required"),
});

type ChartCardProps = z.infer<typeof ChartCardPropsSchema>;

export const ChartCard: React.FC<ChartCardProps> = (rawProps) => {
    // Validate props at runtime
    const result = ChartCardPropsSchema.safeParse(rawProps);
    
    if (!result.success) {
        console.error('ChartCard validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid ChartCard props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }
    
    const { title, chartType, data } = result.data;
    return (
        <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col gap-4 min-w-[300px]">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">{title}</h3>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase font-bold">
                    {chartType}
                </span>
            </div>
            <div className="h-48 bg-gray-50 rounded flex items-center justify-center border border-dashed border-gray-200">
                <div className="text-gray-400 text-sm italic">
                    Visualization for {data.length} items would render here.
                </div>
            </div>
        </div>
    );
};
