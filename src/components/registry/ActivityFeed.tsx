import React from 'react';
import { z } from 'zod';

const ActivityFeedItemSchema = z.object({
    id: z.string().min(1),
    actor: z.string().min(1),
    action: z.string().min(1),
    target: z.string().optional(),
    timestamp: z.string().min(1),
    icon: z.string().optional(),
});

const ActivityFeedPropsSchema = z.object({
    title: z.string().optional(),
    items: z.array(ActivityFeedItemSchema).min(1, 'At least one item is required'),
});

type ActivityFeedProps = z.infer<typeof ActivityFeedPropsSchema>;

export const ActivityFeed: React.FC<ActivityFeedProps> = (rawProps) => {
    const result = ActivityFeedPropsSchema.safeParse(rawProps);

    if (!result.success) {
        console.error('ActivityFeed validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid ActivityFeed props</p>
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
            <ol className="relative border-l border-gray-200 space-y-4 ml-2">
                {items.map((item) => (
                    <li key={item.id} className="ml-4">
                        <span className="absolute -left-1.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-200 ring-2 ring-white" />
                        <p className="text-sm text-gray-800">
                            <span className="font-semibold">{item.actor}</span>{' '}
                            {item.action}
                            {item.target && (
                                <span className="font-medium text-indigo-600"> {item.target}</span>
                            )}
                        </p>
                        <time className="text-xs text-gray-400">{item.timestamp}</time>
                    </li>
                ))}
            </ol>
        </div>
    );
};
