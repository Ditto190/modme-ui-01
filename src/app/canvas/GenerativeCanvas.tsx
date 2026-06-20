import React from 'react';

interface GenerativeCanvasProps {
    children?: React.ReactNode;
}

export const GenerativeCanvas: React.FC<GenerativeCanvasProps> = ({ children }) => {
    return (
        <div className="w-full h-full min-h-[400px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
            {children ? (
                <div className="w-full h-full p-4 overflow-auto">
                    {children}
                </div>
            ) : (
                <div className="text-slate-400 text-sm">
                    Generative Canvas Empty
                </div>
            )}
        </div>
    );
};
