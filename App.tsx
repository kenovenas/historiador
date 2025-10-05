import React, { useState, useCallback, useEffect } from 'react';
import { CreationType, GenerationParams, HistoryItem } from './types';
import * as geminiService from './services/geminiService';
import Header from './components/Header';
import Selector from './components/Selector';
import TextAreaInput from './components/TextAreaInput';
import ResultCard from './components/ResultCard';
import LoadingSpinner from './components/LoadingSpinner';
import HistoryPanel from './components/HistoryPanel';
import { BookOpenIcon, SparklesIcon, PencilIcon, TagIcon, ImageIcon, PrayingHandsIcon, DocumentTextIcon, MegaphoneIcon, ClipboardIcon, ClipboardCheckIcon, TrashIcon } from './components/Icons';

type RegenerationField = 'titles' | 'description' | 'tags' | 'thumbnail' | 'content' | 'cta';

const supportedLanguages = [
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'en-US', name: 'Inglês (EUA)' },
    { code: 'es-ES', name: 'Espanhol (Espanha)' },
    { code: 'fr-FR', name: 'Francês (França)' },
    { code: 'de-DE', name: 'Alemão (Alemanha)' },
];

const App: React.FC = () => {
    // Input State
    const [userApiKey, setUserApiKey] = useState('');
    const [projectName, setProjectName] = useState('');
    const [creationType, setCreationType] = useState<CreationType>(CreationType.Story);
    const [mainPrompt, setMainPrompt] = useState('');
    const [titlePrompt, setTitlePrompt] = useState('');
    const [descriptionPrompt, setDescriptionPrompt] = useState('');
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [characterCount, setCharacterCount] = useState(1500);
    const [language, setLanguage] = useState('pt-BR');

    // Output State
    const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [generatedTags, setGeneratedTags] = useState<string[]>([]);
    const [generatedThumbnailPrompt, setGeneratedThumbnailPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [generatedContentCharCount, setGeneratedContentCharCount] = useState(0);
    const [generatedCta, setGeneratedCta] = useState('');

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [regeneratingField, setRegeneratingField] = useState<RegenerationField | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

    // Modal State
    const [regenModalField, setRegenModalField] = useState<RegenerationField | null>(null);
    const [regenModificationPrompt, setRegenModificationPrompt] = useState('');
    
    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const savedApiKey = localStorage.getItem('geminiApiKey');
        if (savedApiKey) {
            setUserApiKey(savedApiKey);
        }
        
        try {
            const savedHistory = localStorage.getItem('geminiStoryGeneratorHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Erro ao carregar o histórico:", e);
            setHistory([]);
        }
    }, []);

    const updateHistory = (newHistory: HistoryItem[]) => {
        setHistory(newHistory);
        localStorage.setItem('geminiStoryGeneratorHistory', JSON.stringify(newHistory));
    };
    
    const handleLoadHistoryItem = (id: string) => {
        const itemToLoad = history.find(item => item.id === id);
        if (itemToLoad) {
            // Set inputs
            setProjectName(itemToLoad.projectName || '');
            setCreationType(itemToLoad.creationType);
            setMainPrompt(itemToLoad.mainPrompt);
            setTitlePrompt(itemToLoad.titlePrompt);
            setDescriptionPrompt(itemToLoad.descriptionPrompt);
            setThumbnailPrompt(itemToLoad.thumbnailPrompt);
            setCharacterCount(itemToLoad.characterCount);
            setLanguage(itemToLoad.language);
            
            // Set outputs
            setGeneratedTitles(itemToLoad.generatedTitles);
            setGeneratedDescription(itemToLoad.generatedDescription);
            setGeneratedTags(itemToLoad.generatedTags);
            setGeneratedThumbnailPrompt(itemToLoad.generatedThumbnailPrompt);
            setGeneratedContent(itemToLoad.generatedContent);
            setGeneratedContentCharCount(itemToLoad.generatedContent.length);
            setGeneratedCta(itemToLoad.generatedCta);
            
            setError(null);
            setIsHistoryPanelOpen(false);
        }
    };
    
    const handleDeleteHistoryItem = (id: string) => {
        if (window.confirm("Tem certeza de que deseja excluir este item do histórico?")) {
            const newHistory = history.filter(item => item.id !== id);
            updateHistory(newHistory);
        }
    };

    const handleClearHistory = () => {
        if (window.confirm("Tem certeza de que deseja limpar todo o histórico? Esta ação não pode ser desfeita.")) {
            updateHistory([]);
        }
    };

    const handleNewChat = () => {
        clearProject();
        setIsHistoryPanelOpen(false);
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserApiKey(e.target.value);
    };

    const handleSaveApiKey = () => {
        if (userApiKey) {
            localStorage.setItem('geminiApiKey', userApiKey);
            alert('Chave de API salva com sucesso!');
        }
    };

    const handleRemoveApiKey = () => {
        localStorage.removeItem('geminiApiKey');
        setUserApiKey('');
        alert('Chave de API removida.');
    };

    const getGenerationParams = useCallback((): GenerationParams => ({
        projectName, creationType, mainPrompt, titlePrompt, descriptionPrompt, thumbnailPrompt, characterCount, language
    }), [projectName, creationType, mainPrompt, titlePrompt, descriptionPrompt, thumbnailPrompt, characterCount, language]);
    
    const validateApiKey = () => {
        if (!userApiKey) {
            setError("Por favor, insira e salve sua chave de API do Google AI Studio para continuar.");
            return false;
        }
        setError(null);
        return true;
    };

    const handleEnhancePrompt = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!validateApiKey()) return;
        if (!mainPrompt) {
            setError("Por favor, insira uma ideia para aprimorar.");
            return;
        }
        setIsEnhancing(true);
        setError(null);
        try {
            const params = getGenerationParams();
            const enhanced = await geminiService.enhanceStoryPrompt(params, userApiKey);
            setMainPrompt(enhanced);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? `Erro ao aprimorar ideia: ${err.message}` : "Ocorreu um erro desconhecido.");
        } finally {
            setIsEnhancing(false);
        }
    }, [mainPrompt, getGenerationParams, userApiKey]);
    
    const clearProject = () => {
        setProjectName('');
        setMainPrompt('');
        setTitlePrompt('');
        setDescriptionPrompt('');
        setThumbnailPrompt('');
        setGeneratedTitles([]);
        setGeneratedDescription('');
        setGeneratedTags([]);
        setGeneratedThumbnailPrompt('');
        setGeneratedContent('');
        setGeneratedContentCharCount(0);
        setGeneratedCta('');
        setError(null);
    };
    
    const handleGenerateAll = async () => {
        if (!validateApiKey() || !mainPrompt) {
            if (!mainPrompt) setError("Por favor, insira la ideia principal para la generación.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        
        // Clear only previous results, not all inputs
        setGeneratedTitles([]);
        setGeneratedDescription('');
        setGeneratedTags([]);
        setGeneratedThumbnailPrompt('');
        setGeneratedContent('');
        setGeneratedContentCharCount(0);
        setGeneratedCta('');

        try {
            const params = getGenerationParams();
            
            setGenerationStatus(`Gerando ${creationType === CreationType.Story ? 'história' : 'oração'}...`);
            const content = await geminiService.generateContent(params, userApiKey);
            setGeneratedContent(content);
            setGeneratedContentCharCount(content.length);

            setGenerationStatus('Gerando metadados (títulos, descrição, etc.)...');
            const [titles, description, tags, cta] = await Promise.all([
                geminiService.generateTitles(params, userApiKey),
                geminiService.generateDescription(params, userApiKey),
                geminiService.generateTags(params, userApiKey),
                geminiService.generateCta(params, userApiKey)
            ]);
            setGeneratedTitles(titles);
            setGeneratedDescription(description);
            setGeneratedTags(tags);
            setGeneratedCta(cta);

            setGenerationStatus('Gerando prompt para thumbnail...');
            const thumbPrompt = await geminiService.generateThumbnailPrompt(params, content, userApiKey);
            setGeneratedThumbnailPrompt(thumbPrompt);
            
            // Save to history on success
            const newHistoryItem: HistoryItem = {
                ...params,
                id: `history-${Date.now()}`,
                timestamp: Date.now(),
                generatedTitles: titles,
                generatedDescription: description,
                generatedTags: tags,
                generatedThumbnailPrompt: thumbPrompt,
                generatedContent: content,
                generatedCta: cta,
            };
            updateHistory([newHistoryItem, ...history]);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a geração.");
        } finally {
            setIsGenerating(false);
            setGenerationStatus(null);
        }
    };

    const handleRegenerate = useCallback(async () => {
        if (!regenModalField || !validateApiKey()) return;

        setRegeneratingField(regenModalField);
        const fieldToRegen = regenModalField;
        setRegenModalField(null);
        setError(null);

        try {
            const params = getGenerationParams();
            let contentForThumbnail = generatedContent;

            switch (fieldToRegen) {
                case 'titles':
                    setGeneratedTitles(await geminiService.generateTitles(params, userApiKey, regenModificationPrompt));
                    break;
                case 'description':
                    setGeneratedDescription(await geminiService.generateDescription(params, userApiKey, regenModificationPrompt));
                    break;
                case 'tags':
                    setGeneratedTags(await geminiService.generateTags(params, userApiKey, regenModificationPrompt));
                    break;
                case 'thumbnail':
                    setGeneratedThumbnailPrompt(await geminiService.generateThumbnailPrompt(params, contentForThumbnail, userApiKey, regenModificationPrompt));
                    break;
                case 'content':
                    const newContent = await geminiService.generateContent(params, userApiKey, regenModificationPrompt);
                    setGeneratedContent(newContent);
                    setGeneratedContentCharCount(newContent.length);
                    contentForThumbnail = newContent;
                    break;
                case 'cta':
                    setGeneratedCta(await geminiService.generateCta(params, userApiKey, regenModificationPrompt));
                    break;
            }
        } catch (err) {
             console.error(err);
            setError(err instanceof Error ? `Erro ao regenerar: ${err.message}` : "Ocorreu um erro desconhecido.");
        } finally {
            setRegeneratingField(null);
            setRegenModificationPrompt('');
        }
    }, [regenModalField, getGenerationParams, regenModificationPrompt, generatedContent, userApiKey]);

    const handleCopy = useCallback((field: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }, []);



    const isLoading = isGenerating || !!regeneratingField || isEnhancing;

    const renderRegenerationModal = () => {
        if (!regenModalField) return null;

        const fieldLabels: Record<RegenerationField, string> = {
            titles: 'Títulos',
            description: 'Descrição',
            tags: 'Tags de SEO',
            thumbnail: 'Prompt para Thumbnail',
            content: creationType === CreationType.Story ? 'História' : 'Oração',
            cta: 'Chamada para Ação (CTA)'
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setRegenModalField(null)}>
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-amber-400 mb-4">Modificar {fieldLabels[regenModalField]}</h3>
                    <TextAreaInput
                        label="O que você deseja modificar ou melhorar?"
                        value={regenModificationPrompt}
                        onChange={(e) => setRegenModificationPrompt(e.target.value)}
                        placeholder="Ex: Tente um tom mais dramático, foque no personagem X..."
                        rows={4}
                    />
                    <div className="flex justify-end gap-4 mt-4">
                        <button onClick={() => setRegenModalField(null)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={handleRegenerate} className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-lg transition-colors">Gerar</button>
                    </div>
                </div>
            </div>
        );
    };

    const mainPromptLabel = (
        <div className="flex justify-between items-center">
            <span>{`4. Ideia Principal para a ${creationType === CreationType.Story ? 'História' : 'Oração'}`}</span>
            {creationType === CreationType.Story && (
                <button 
                    onClick={handleEnhancePrompt} 
                    disabled={isLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-amber-400 font-bold py-1 px-2 rounded-lg transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                    title="Aprimorar Ideia"
                >
                    {isEnhancing ? <LoadingSpinner/> : <><SparklesIcon className="h-4 w-4" /> Aprimorar</>}
                </button>
            )}
        </div>
    );
    
    const editableTextAreaClass = "w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition placeholder-gray-500 font-sans resize-y min-h-[120px] leading-relaxed";
    const editableInputClass = "w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition placeholder-gray-500 font-sans";

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            {renderRegenerationModal()}
            <HistoryPanel 
                isOpen={isHistoryPanelOpen}
                onClose={() => setIsHistoryPanelOpen(false)}
                history={history}
                onLoadItem={handleLoadHistoryItem}
                onDeleteItem={handleDeleteHistoryItem}
                onClearAll={handleClearHistory}
                onNewChat={handleNewChat}
            />
            <Header onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
            <main className="container mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls Column */}
                <div className="flex flex-col gap-6 bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700">
                    <h2 className="text-2xl font-bold text-amber-400 border-b-2 border-amber-500 pb-2">Configurações de Geração</h2>
                    
                     <div>
                        <label htmlFor="api-key-input" className="block text-lg font-semibold mb-2 text-gray-300">
                            1. Chave de API (Google AI Studio) <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="api-key-input"
                                type="password"
                                value={userApiKey}
                                onChange={handleApiKeyChange}
                                placeholder="Cole sua chave de API aqui"
                                className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                            />
                            <button
                                onClick={handleSaveApiKey}
                                disabled={!userApiKey}
                                className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                title="Salvar Chave"
                            >
                                Salvar
                            </button>
                            <button
                                onClick={handleRemoveApiKey}
                                disabled={!userApiKey}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                title="Remover Chave"
                            >
                                Remover
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="project-name-input" className="block text-lg font-semibold mb-2 text-gray-300">
                            2. Nome do Projeto (Opcional)
                        </label>
                        <input
                            id="project-name-input"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Ex: Parábola do Filho Pródigo - Série"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-lg font-semibold mb-2 text-gray-300">3. Escolha o Tipo de Criação</label>
                        <Selector<CreationType>
                            options={[
                                { value: CreationType.Story, label: 'História Bíblica', icon: <BookOpenIcon /> },
                                { value: CreationType.Prayer, label: 'Oração', icon: <PrayingHandsIcon /> },
                            ]}
                            selectedValue={creationType}
                            onChange={setCreationType}
                        />
                    </div>

                    <div>
                         <TextAreaInput
                            label={mainPromptLabel}
                            value={mainPrompt}
                            onChange={(e) => setMainPrompt(e.target.value)}
                            placeholder="Ex: A parábola do filho pródigo, mas contada pela perspectiva do irmão mais velho."
                            rows={4}
                            required
                        />
                    </div>

                     <div>
                        <label htmlFor="language-select" className="block text-lg font-semibold mb-2 text-gray-300">5. Idioma do Conteúdo</label>
                        <select
                            id="language-select"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                        >
                            {supportedLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="char-count" className="block text-lg font-semibold mb-2 text-gray-300">6. Contagem de Caracteres</label>
                        <input
                            id="char-count"
                            type="number"
                            value={characterCount}
                            onChange={(e) => setCharacterCount(Number(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                            min="100"
                            step="50"
                        />
                    </div>

                    <div className="border-t border-gray-600 pt-4">
                        <h3 className="text-xl font-semibold text-amber-400 mb-3">Opcional: Refinar Resultados</h3>
                        <TextAreaInput label="Desejo para o Título" value={titlePrompt} onChange={(e) => setTitlePrompt(e.target.value)} placeholder="Ex: Um título que evoque mistério e redenção." rows={2}/>
                        <TextAreaInput label="Desejo para a Descrição" value={descriptionPrompt} onChange={(e) => setDescriptionPrompt(e.target.value)} placeholder="Ex: Focar na jornada emocional do personagem." rows={2}/>
                        <TextAreaInput label="Desejo para a Thumbnail" value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Ex: Estilo de pintura a óleo, com iluminação dramática." rows={2}/>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleGenerateAll} disabled={isLoading} className="flex-grow bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                            {isLoading ? <LoadingSpinner /> : 'Gerar Conteúdo'}
                        </button>
                         <button onClick={clearProject} disabled={isLoading} title="Limpar Projeto" className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center">
                            <TrashIcon className="h-6 w-6"/>
                        </button>
                    </div>
                    
                    {isGenerating && generationStatus && (
                        <p className="text-amber-300 mt-2 text-center animate-pulse">{generationStatus}</p>
                    )}
                    {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                </div>

                {/* Results Column */}
                <div className="flex flex-col gap-6">
                    <ResultCard title="Títulos Sugeridos" icon={<PencilIcon />} isLoading={isGenerating && !generatedTitles.length} onRegenerate={() => setRegenModalField('titles')} hasContent={generatedTitles.length > 0} actionsDisabled={isLoading}>
                        {generatedTitles.length > 0 && (
                            <ul className="space-y-2">
                                {generatedTitles.map((title, index) => (
                                    <li key={index} className="flex items-center justify-between gap-2 bg-gray-700/50 p-2 rounded-md group">
                                        <input 
                                            type="text"
                                            value={title}
                                            onChange={(e) => {
                                                const newTitles = [...generatedTitles];
                                                newTitles[index] = e.target.value;
                                                setGeneratedTitles(newTitles);
                                            }}
                                            className={`${editableInputClass} p-1`}
                                            aria-label={`Editar título ${index + 1}`}
                                        />
                                        <button onClick={() => handleCopy(`title-${index}`, title)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white flex-shrink-0" title="Copiar título">
                                            {copiedField === `title-${index}` ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ResultCard>

                    <ResultCard title="Descrição" icon={<DocumentTextIcon />} isLoading={isGenerating && !generatedDescription} onRegenerate={() => setRegenModalField('description')} onCopy={() => handleCopy('description', generatedDescription)} isCopied={copiedField === 'description'} actionsDisabled={isLoading} hasContent={generatedDescription.length > 0}>
                        {generatedDescription.length > 0 && (
                            <textarea
                                value={generatedDescription}
                                onChange={(e) => setGeneratedDescription(e.target.value)}
                                className={editableTextAreaClass}
                                aria-label="Editar descrição"
                            />
                        )}
                    </ResultCard>

                    <ResultCard title={creationType === CreationType.Story ? 'História Bíblica' : 'Oração'} icon={creationType === CreationType.Story ? <BookOpenIcon /> : <PrayingHandsIcon />} isLoading={isGenerating && !generatedContent} footerText={generatedContentCharCount > 0 ? `${generatedContentCharCount} caracteres` : ''} onRegenerate={() => setRegenModalField('content')} onCopy={() => handleCopy('content', generatedContent)} isCopied={copiedField === 'content'} hasContent={!!generatedContent} actionsDisabled={isLoading}>
                        {generatedContent.length > 0 && (
                            <textarea 
                                className={`${editableTextAreaClass} min-h-[200px] font-serif`}
                                value={generatedContent}
                                onChange={(e) => {
                                    setGeneratedContent(e.target.value);
                                    setGeneratedContentCharCount(e.target.value.length);
                                }}
                                aria-label="Editar conteúdo principal"
                            />
                        )}
                    </ResultCard>

                    <ResultCard title="Chamada para Ação (CTA)" icon={<MegaphoneIcon />} isLoading={isGenerating && !generatedCta} onRegenerate={() => setRegenModalField('cta')} onCopy={() => handleCopy('cta', generatedCta)} isCopied={copiedField === 'cta'} actionsDisabled={isLoading} hasContent={generatedCta.length > 0}>
                         {generatedCta.length > 0 && (
                            <textarea
                                value={generatedCta}
                                onChange={(e) => setGeneratedCta(e.target.value)}
                                className={editableTextAreaClass}
                                aria-label="Editar chamada para ação"
                            />
                        )}
                    </ResultCard>

                    <ResultCard title="Tags de SEO" icon={<TagIcon />} isLoading={isGenerating && !generatedTags.length} onRegenerate={() => setRegenModalField('tags')} onCopy={() => handleCopy('tags', generatedTags.join(', '))} isCopied={copiedField === 'tags'} hasContent={generatedTags.length > 0} actionsDisabled={isLoading}>
                        {generatedTags.length > 0 && (
                             <input 
                                type="text"
                                value={generatedTags.join(', ')}
                                onChange={(e) => setGeneratedTags(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                                className={editableInputClass}
                                placeholder="Tags separadas por vírgula"
                                aria-label="Editar tags de SEO"
                            />
                        )}
                    </ResultCard>

                    <ResultCard title="Prompt para Thumbnail" icon={<ImageIcon />} isLoading={isGenerating && !generatedThumbnailPrompt} onRegenerate={() => setRegenModalField('thumbnail')} onCopy={() => handleCopy('thumbnail', generatedThumbnailPrompt)} isCopied={copiedField === 'thumbnail'} actionsDisabled={isLoading} hasContent={generatedThumbnailPrompt.length > 0}>
                        {generatedThumbnailPrompt.length > 0 && (
                            <textarea
                                value={generatedThumbnailPrompt}
                                onChange={(e) => setGeneratedThumbnailPrompt(e.target.value)}
                                className={editableTextAreaClass}
                                aria-label="Editar prompt para thumbnail"
                            />
                        )}
                    </ResultCard>
                </div>
            </main>
        </div>
    );
};

export default App;
