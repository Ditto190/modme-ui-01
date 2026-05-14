import React from 'react';
import { z } from 'zod';

const ProgressItemSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    percent: z.number().min(0).max(100),
    status: z.enum(['on_track', 'at_risk', 'blocked', 'complete']).optional(),
});

const ProgressListPropsSchema = z.object({
    title: z.string().optional(),
    items: z.array(ProgressItemSchema).min(1, 'At least one item is required'),
});

type ProgressListProps = z.infer<typeof ProgressListPropsSchema>;
type ProgressStatus = NonNullable<z.infer<typeof ProgressItemSchema>['status']>;

const STATUS_BAR: Record<ProgressStatus, string> = {
    on_track: 'bg-green-500',
    at_risk:  'bg-yellow-400',
    blocked:  'bg-red-500',
    complete: 'bg-indigo-500',
};

const STATUS_LABEL: Record<ProgressStatus, string> = {
    on_track: 'On Track',
    at_risk:  'At Risk',
    blocked:  'Blocked',
    complete: 'Complete',
};

const STATUS_TEXT: Record<ProgressStatus, string> = {
    on_track: 'text-green-700',
    at_risk:  'text-yellow-700',
    blocked:  'text-red-700',
    complete: 'text-indigo-700',
};

export const ProgressList: React.FC<ProgressListProps> = (rawProps) => {
    const result = ProgressListPropsSchema.safeParse(rawProps);

    if (!result.success) {
        console.error('ProgressList validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid ProgressList props</p>
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
            <ul className="space-y-4">
                {items.map((item) => {
                    const barColor = item.status ? STATUS_BAR[item.status] : 'bg-gray-400';
                    const textColor = item.status ? STATUS_TEXT[item.status] : 'text-gray-500';
                    const statusLabel = item.status ? STATUS_LABEL[item.status] : null;

                    return (
                        <li key={item.id}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    {statusLabel && (
                                        <span className={`text-xs font-semibold ${textColor}`}>
                                            {statusLabel}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500">{item.percent}%</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className={`${barColor} h-2 rounded-full transition-all`}
                                    style={{ width: `${item.percent}%` }}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
