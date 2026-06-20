import React from 'react';
import { z } from 'zod';

// Zod schema for runtime validation
const DataTablePropsSchema = z.object({
    columns: z.array(z.string()).min(1, "At least one column is required"),
    data: z.array(z.record(z.any())),
});

type DataTableProps = z.infer<typeof DataTablePropsSchema>;

export const DataTable: React.FC<DataTableProps> = (rawProps) => {
    // Validate props at runtime
    const result = DataTablePropsSchema.safeParse(rawProps);
    
    if (!result.success) {
        console.error('DataTable validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid DataTable props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }
    
    const { columns, data } = result.data;
    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-500">
                    <tr>
                        {columns.map((col) => (
                            <th key={col} className="px-6 py-3 border-b border-gray-100">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                            {columns.map((col) => (
                                <td key={col} className="px-6 py-4 border-b border-gray-100">
                                    {String(row[col] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
