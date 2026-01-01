import React from 'react';

interface ChartCardProps {
    title: string;
    chartType: 'line' | 'bar' | 'pie';
    data: any[];
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, chartType, data }) => {
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
