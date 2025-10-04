import React from 'react';
import { HistoryItem } from '../types';
import { TrashIcon } from './Icons';

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onLoadItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onClearAll: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onLoadItem, onDeleteItem, onClearAll }) => {
    
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteItem(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLoadItem(id);
        }
    };

    return (
        <>
            {/* Overlay */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className={`fixed top-0 left-0 h-full w-full max-w-sm bg-gray-800 border-r border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-amber-400">Histórico de Criações</h2>
                        {history.length > 0 && (
                            <button
                                onClick={onClearAll}
                                className="text-sm text-red-400 hover:text-red-300 hover:bg-red-900/50 py-1 px-2 rounded-md transition-colors"
                            >
                                Limpar Tudo
                            </button>
                        )}
                    </div>

                    <div className="flex-grow overflow-y-auto p-2">
                        {history.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Nenhuma criação ainda.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {history.map(item => (
                                    <li key={item.id}>
                                        <div 
                                            onClick={() => onLoadItem(item.id)}
                                            onKeyDown={(e) => handleKeyDown(e, item.id)}
                                            className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-grow mr-2">
                                                    <p className="font-semibold text-gray-200 truncate">{item.projectName || item.mainPrompt || 'Criação sem título'}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleDelete(e, item.id)}
                                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-1 rounded-full hover:bg-gray-800 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                                    title="Excluir item"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default HistoryPanel;