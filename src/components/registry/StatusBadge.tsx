import React from 'react';
import { z } from 'zod';

const StatusBadgePropsSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    status: z.enum(['success', 'warning', 'error', 'info', 'neutral']),
    description: z.string().optional(),
});

type StatusBadgeProps = z.infer<typeof StatusBadgePropsSchema>;

const STATUS_STYLES: Record<StatusBadgeProps['status'], { badge: string; dot: string }> = {
    success: { badge: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
    warning: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
    error:   { badge: 'bg-red-100 text-red-800 border-red-200',         dot: 'bg-red-500' },
    info:    { badge: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-500' },
    neutral: { badge: 'bg-gray-100 text-gray-700 border-gray-200',       dot: 'bg-gray-400' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = (rawProps) => {
    const result = StatusBadgePropsSchema.safeParse(rawProps);

    if (!result.success) {
        console.error('StatusBadge validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid StatusBadge props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }

    const { label, status, description } = result.data;
    const { badge: badgeClass, dot: dotClass } = STATUS_STYLES[status];

    return (
        <div className="inline-flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                {label}
            </span>
            {description && (
                <p className="text-xs text-gray-500">{description}</p>
            )}
        </div>
    );
};
