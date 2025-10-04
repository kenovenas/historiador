import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RefreshIcon, ClipboardIcon, ClipboardCheckIcon } from './Icons';

interface ResultCardProps {
    title: string;
    icon: React.ReactNode;
    isLoading: boolean;
    content?: string;
    footerText?: string;
    children?: React.ReactNode;
    onRegenerate?: () => void;
    onCopy?: () => void;
    isCopied?: boolean;
    hasContent?: boolean;
    actionsDisabled?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ 
    title, 
    icon, 
    isLoading, 
    content, 
    footerText, 
    children, 
    onRegenerate, 
    onCopy, 
    isCopied,
    hasContent: externalHasContent,
    actionsDisabled,
}) => {
    const internalHasContent = content || (React.Children.count(children) > 0);
    const showContent = externalHasContent ?? internalHasContent;

    return (
        <div className="bg-gray-800 p-5 rounded-lg shadow-lg border border-gray-700 min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <span className="h-6 w-6 text-amber-400 mr-3">{icon}</span>
                    <h3 className="text-xl font-semibold text-amber-400">{title}</h3>
                </div>
                {!isLoading && (
                     <div className="flex items-center gap-3">
                        {onRegenerate && (
                            <button 
                                onClick={onRegenerate} 
                                disabled={actionsDisabled}
                                className="text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                title="Gerar novamente"
                            >
                                <RefreshIcon className="h-5 w-5" />
                            </button>
                        )}
                        {onCopy && (
                            <button 
                                onClick={onCopy} 
                                disabled={actionsDisabled}
                                className="text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                title="Copiar"
                            >
                                {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex-grow">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                    </div>
                ) : (
                    showContent ? (
                        <>
                            {content && <p className="text-gray-300 whitespace-pre-wrap">{content}</p>}
                            {children}
                        </>
                    ) : (
                        <p className="text-gray-500 italic">O conteúdo gerado aparecerá aqui...</p>
                    )
                )}
            </div>
            {footerText && !isLoading && (
                 <div className="text-right text-sm text-gray-500 mt-4 pt-2 border-t border-gray-700">
                    {footerText}
                </div>
            )}
        </div>
    );
};

export default ResultCard;