import React from 'react';
import { z } from 'zod';

const AlertItemSchema = z.object({
    id: z.string().min(1),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    title: z.string().min(1),
    message: z.string().optional(),
    timestamp: z.string().optional(),
});

const AlertListPropsSchema = z.object({
    title: z.string().optional(),
    items: z.array(AlertItemSchema).min(1, 'At least one item is required'),
});

type AlertListProps = z.infer<typeof AlertListPropsSchema>;
type AlertSeverity = z.infer<typeof AlertItemSchema>['severity'];

const SEVERITY_STYLES: Record<AlertSeverity, { container: string; badge: string; label: string }> = {
    critical: { container: 'bg-red-50 border-red-200',    badge: 'bg-red-600 text-white',    label: 'Critical' },
    high:     { container: 'bg-orange-50 border-orange-200', badge: 'bg-orange-500 text-white', label: 'High' },
    medium:   { container: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-400 text-gray-900', label: 'Medium' },
    low:      { container: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-400 text-white',   label: 'Low' },
    info:     { container: 'bg-gray-50 border-gray-200',   badge: 'bg-gray-400 text-white',   label: 'Info' },
};

export const AlertList: React.FC<AlertListProps> = (rawProps) => {
    const result = AlertListPropsSchema.safeParse(rawProps);

    if (!result.success) {
        console.error('AlertList validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid AlertList props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }

    const { title, items } = result.data;

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 min-w-[300px]">
            {title && (
                <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
            )}
            <ul className="space-y-3">
                {items.map((item) => {
                    const { container, badge, label } = SEVERITY_STYLES[item.severity];
                    return (
                        <li key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${container}`}>
                            <span className={`mt-0.5 px-2 py-0.5 text-xs font-bold rounded ${badge} shrink-0`}>
                                {label}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                                {item.message && (
                                    <p className="text-xs text-gray-600 mt-0.5">{item.message}</p>
                                )}
                                {item.timestamp && (
                                    <time className="text-xs text-gray-400 mt-1 block">{item.timestamp}</time>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
