import React from 'react';

interface DataTableProps {
    columns: string[];
    data: any[];
}

export const DataTable: React.FC<DataTableProps> = ({ columns, data }) => {
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
