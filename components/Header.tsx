import React from 'react';
import { BookOpenIcon, ClockIcon } from './Icons';

interface HeaderProps {
    onToggleHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
    return (
        <header className="bg-gray-800 shadow-lg border-b-4 border-amber-500 sticky top-0 z-40">
            <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center">
                     <BookOpenIcon className="h-10 w-10 text-amber-400 mr-4"/>
                    <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-wider">
                        Gerador de Histórias Bíblicas e Orações
                    </h1>
                </div>
                <button 
                    onClick={onToggleHistory}
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    title="Ver Histórico"
                >
                    <ClockIcon className="h-7 w-7 text-amber-400" />
                </button>
            </div>
        </header>
    );
};

export default Header;
