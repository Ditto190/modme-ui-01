import React from 'react';
import { z } from 'zod';

const SectionHeaderPropsSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().optional(),
    badge: z.string().optional(),
});

type SectionHeaderProps = z.infer<typeof SectionHeaderPropsSchema>;

export const SectionHeader: React.FC<SectionHeaderProps> = (rawProps) => {
    const result = SectionHeaderPropsSchema.safeParse(rawProps);

    if (!result.success) {
        console.error('SectionHeader validation failed:', result.error);
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                <p className="font-semibold">Invalid SectionHeader props</p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(result.error.issues, null, 2)}
                </pre>
            </div>
        );
    }

    const { title, subtitle, badge } = result.data;

    return (
        <div className="w-full py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                {badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
        </div>
    );
};
