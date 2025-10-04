import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { CreationType, GenerationParams } from "../types";

const getAiClient = (apiKey: string): GoogleGenAI => {
    if (!apiKey) {
        throw new Error("API Key não fornecida.");
    }
    return new GoogleGenAI({ apiKey });
};

const languageMap: { [key: string]: string } = {
    'pt-BR': 'Português do Brasil',
    'en-US': 'Inglês Americano',
    'es-ES': 'Espanhol (Espanha)',
    'fr-FR': 'Francês',
    'de-DE': 'Alemão',
};

const getSystemInstruction = (languageCode: string) => {
    const languageName = languageMap[languageCode] || 'Português do Brasil';
    if (languageCode === 'en-US') {
        return `You are an expert theologian and a deep scholar of the Holy Bible. Your mission is to create inspiring, accurate, and theologically sound content. Your responses should always be in American English, well-structured, and with language that honors the source material. You MUST NOT invent characters, events, or dialogues that are not in the biblical text.`;
    }
    return `Você é um teólogo especialista e profundo conhecedor da Bíblia Sagrada. Sua missão é criar conteúdo inspirador, preciso e teologicamente sólido. Suas respostas devem ser sempre em ${languageName}, bem estruturadas e com uma linguagem que honre o material de origem. Você NÃO DEVE inventar personagens, eventos ou diálogos que não estejam no texto bíblico.`;
};


async function generateWithGemini(apiKey: string, prompt: string, language: string, configOverrides: Record<string, any> = {}): Promise<string> {
    try {
        const ai = getAiClient(apiKey);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: getSystemInstruction(language),
                temperature: 0.75,
                ...configOverrides
            }
        });
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating text with Gemini:", error);
        const errorMessage = error.toString();
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
             throw new Error("Você excedeu sua cota de API. Por favor, aguarde um pouco antes de tentar novamente ou verifique seu plano.");
        }
        if (errorMessage.includes('API key not valid')) {
            throw new Error("Sua chave de API não é válida. Por favor, verifique-a.");
        }
        throw new Error("Falha ao se comunicar com a API do Gemini para gerar texto.");
    }
}

async function generateJsonWithGemini(apiKey: string, prompt: string, language: string, schema: any): Promise<string> {
    try {
        const ai = getAiClient(apiKey);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: getSystemInstruction(language),
                temperature: 0.75,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating JSON with Gemini:", error);
        const errorMessage = error.toString();
         if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
             throw new Error("Você excedeu sua cota de API. Por favor, aguarde um pouco antes de tentar novamente ou verifique seu plano.");
        }
        if (errorMessage.includes('API key not valid')) {
            throw new Error("Sua chave de API não é válida. Por favor, verifique-a.");
        }
        throw new Error("Falha ao gerar dados estruturados com a API do Gemini.");
    }
}

export async function enhanceStoryPrompt(params: GenerationParams, apiKey: string): Promise<string> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const prompt = `Aja como um roteirista e teólogo criativo. Sua tarefa é aprimorar uma ideia para uma história bíblica, mantendo-se estritamente fiel ao texto bíblico original.
Ideia original: "${params.mainPrompt}".

Sua tarefa é expandir esta ideia em um prompt mais rico e detalhado. Você pode sugerir:
- Foco em emoções e pensamentos dos personagens REAIS da passagem.
- Detalhes do cenário e da atmosfera baseados em conhecimentos históricos e bíblicos.
- Um clímax que intensifique o momento central da passagem.

**REGRA CRÍTICA E ABSOLUTA: Não invente personagens, diálogos ou eventos que não estejam explicitamente ou implicitamente na passagem bíblica. A fidelidade ao texto sagrado é a prioridade máxima.**

O resultado deve ser um novo parágrafo único que sirva como um prompt aprimorado.
Retorne APENAS o texto do prompt aprimorado, no idioma ${languageName}.`;
    return generateWithGemini(apiKey, prompt, params.language);
}


export async function generateTitles(params: GenerationParams, apiKey: string, modification?: string): Promise<string[]> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história bíblica' : 'oração';
    let prompt = `Baseado na seguinte ideia: "${params.mainPrompt}", gere 5 sugestões de títulos otimizados para SEO no YouTube. Os títulos devem ser cativantes, gerar curiosidade e incluir palavras-chave relevantes para aumentar a visibilidade e a taxa de cliques (CTR) para uma ${typeText}.`;
    if (params.titlePrompt) prompt += ` Leve em consideração: "${params.titlePrompt}".`;
    if (modification) prompt += ` Modifique com a seguinte instrução: "${modification}".`;
    prompt += ` Gere os títulos no idioma ${languageName}. Responda com um array JSON de strings.`;
    
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    const responseJson = await generateJsonWithGemini(apiKey, prompt, params.language, schema);

    try {
        const titles = JSON.parse(responseJson);
        return Array.isArray(titles) ? titles.slice(0, 5) : [];
    } catch (e) {
        console.error("Failed to parse titles JSON:", e, "Raw response:", responseJson);
        return responseJson.split('\n').map(t => t.replace(/^- /, '').trim()).filter(Boolean).slice(0, 5);
    }
}

export async function generateDescription(params: GenerationParams, apiKey: string, modification?: string): Promise<string> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história bíblica' : 'oração';
    let prompt = `Baseado na seguinte ideia: "${params.mainPrompt}", escreva uma descrição otimizada para SEO de um vídeo no YouTube sobre uma ${typeText}. A descrição deve ser envolvente, rica em palavras-chave relevantes e estruturada para maximizar a descoberta e o engajamento na plataforma.`;
    if (params.descriptionPrompt) prompt += ` Leve em consideração: "${params.descriptionPrompt}".`;
    if (modification) prompt += ` Modifique com a seguinte instrução: "${modification}".`;
    prompt += ` Escreva a resposta no idioma ${languageName}. Retorne apenas o texto da descrição, pronta para ser copiada e colada no YouTube.`;
    return generateWithGemini(apiKey, prompt, params.language);
}

export async function generateTags(params: GenerationParams, apiKey: string, modification?: string): Promise<string[]> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história bíblica' : 'oração';
    let prompt = `Para um vídeo do YouTube sobre uma ${typeText} com o tema "${params.mainPrompt}", gere uma lista de tags de SEO altamente relevantes. A tarefa tem uma regra crítica: a soma total de caracteres de todas as tags geradas deve estar entre 450 e 500 caracteres, para maximizar o aproveitamento do limite do YouTube. Inclua uma mistura de tags específicas (cauda longa) e genéricas (cauda curta) que os usuários provavelmente pesquisariam. Otimize para relevância e densidade de palavras-chave.`;
    if (modification) prompt += ` Modifique com a seguinte instrução: "${modification}".`;
    prompt += ` As tags devem ser relevantes e no idioma ${languageName}. Responda com um array JSON de strings.`;
    
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    const responseJson = await generateJsonWithGemini(apiKey, prompt, params.language, schema);

    try {
        const tags = JSON.parse(responseJson);
        return Array.isArray(tags) ? tags.filter(Boolean) : [];
    } catch (e) {
        console.error("Failed to parse tags JSON:", e, "Raw response:", responseJson);
        return responseJson.split(',').map(tag => tag.trim()).filter(Boolean);
    }
}

export async function generateThumbnailPrompt(params: GenerationParams, generatedContent: string, apiKey: string, modification?: string): Promise<string> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história bíblica' : 'oração';
    let prompt = `Your task is to create a detailed prompt, written entirely IN ENGLISH, for an image generation AI. This prompt will be used to generate a thumbnail for a YouTube video about a ${typeText} about "${params.mainPrompt}". The thumbnail must be optimized for YouTube: high-contrast, emotionally engaging, and designed to maximize click-through rate (CTR). The story/prayer content begins with: "${generatedContent.substring(0, 300)}...".\n\n`;
    
    prompt += `The final ENGLISH prompt you generate must follow two CRITICAL rules:\n\n`;
    
    prompt += `RULE 1: VISUAL DESCRIPTION. You must describe a compelling, high-contrast scene with details about the artistic style, dramatic lighting, and clear composition, focusing on emotionally resonant subjects suitable for a YouTube thumbnail.\n`;
    
    prompt += `RULE 2: TEXT INTEGRATION. This is the most important rule. You MUST invent a short, powerful, and curiosity-arousing text phrase (3 to 5 words long) in the ${languageName} language, relevant to the content. This text must be easily readable on small screens. Then, you MUST include an explicit instruction in your prompt to render this EXACT text phrase onto the image using a bold, clear font. The instruction for the text must be very clear and direct. For example: "The text '${"UM EXEMPLO EM " + languageName}' should be emblazoned across the image in a cinematic, golden, and highly readable font." or "Featuring the words '${"OUTRO EXEMPLO EM " + languageName}' in a gritty, hand-written style at the bottom that is still easy to read."\n\n`;

    if (params.thumbnailPrompt) prompt += `The user has provided a style preference to consider: "${params.thumbnailPrompt}".\n`;
    if (modification) prompt += `Apply this modification to your generation: "${modification}".\n`;
    
    prompt += "\nNow, generate ONLY the final text prompt for the image AI, following all rules. Do not add any conversational text or explanations before or after the prompt.";

    return generateWithGemini(apiKey, prompt, 'en-US');
}

export async function generateContent(params: GenerationParams, apiKey: string, modification?: string): Promise<string> {
    const { creationType, mainPrompt, characterCount, language } = params;
    const languageName = languageMap[language] || 'Português do Brasil';
    
    const prompt = `Sua tarefa tem cinco regras ABSOLUTAS e OBRIGATÓRIAS.

REGRA 0 (IDIOMA): A resposta DEVE ser escrita inteiramente em ${languageName}.

REGRA 1 (FIDELIDADE BÍBLICA E EXPANSÃO NARRATIVA): Sua principal diretriz é a fidelidade bíblica. Ao criar uma história, você deve expandir a narrativa, mas fazendo isso EXCLUSIVAMENTE através de:
- **Detalhes Descritivos:** Descreva o cenário, as vestimentas, a atmosfera baseando-se no contexto histórico e geográfico da passagem.
- **Monólogo Interior:** Explore os possíveis pensamentos, emoções, medos e esperanças dos personagens BÍBLICOS, inferindo-os a partir de suas ações e do contexto da Escritura.
- **Ações Detalhadas:** Transforme uma ação simples (ex: 'ele caminhou') em uma descrição mais rica e vívida (ex: 'ele caminhou com passos firmes sobre a poeira da estrada, o sol forte em seu rosto...').
- **Linguagem Sensorial:** Descreva o que os personagens veem, ouvem, cheiram e sentem.
- **CRUCIALMENTE: NÃO INVENTE novos personagens, diálogos falados que não estão no texto, ou eventos que contradigam a passagem.** A precisão teológica é primordial.

REGRA 2 (ESTRUTURA): O texto deve ter uma estrutura clara de início, meio e fim.
- Para uma história: apresentação, desenvolvimento/conflito e resolução.
- Para uma oração: introdução, corpo da petição e conclusão.

REGRA 3 (CONTAGEM DE CARACTERES): O resultado final DEVE ter aproximadamente ${characterCount} caracteres (com uma tolerância de +/- 100 caracteres). Esta é uma regra tão importante quanto a fidelidade bíblica. Use a liberdade criativa descrita na REGRA 1 para expandir a narrativa e ATINGIR a contagem de caracteres solicitada. É essencial que o texto tenha o comprimento adequado.

REGRA 4 (FORMATO DA RESPOSTA): A resposta deve conter APENAS o texto da ${creationType === CreationType.Story ? 'história' : 'oração'}. Não inclua nenhum texto extra, como títulos ou introduções.

Após confirmar que entendeu e irá seguir estas cinco regras, crie uma ${creationType === CreationType.Story ? 'história bíblica' : 'oração'} com base no tema: "${mainPrompt}".
${modification ? `\n\nInstrução de modificação: "${modification}". Aplique-a, mas SEMPRE respeitando TODAS as regras.` : ''}
Formate com parágrafos.`;
    
    let generatedText = await generateWithGemini(apiKey, prompt, language, { temperature: 0.4 });

    // This logic is a safety net. If the AI still generates text that is too long, we truncate it gracefully.
    if (generatedText.length > characterCount + 100) {
        const hardLimit = characterCount + 100;
        let cutIndex = generatedText.lastIndexOf('.', hardLimit);
        if (cutIndex === -1 || cutIndex < hardLimit - 50) { // Look for a period in a reasonable range
            cutIndex = generatedText.lastIndexOf(' ', hardLimit);
        }
        if (cutIndex === -1) {
            cutIndex = hardLimit;
        }
        generatedText = generatedText.substring(0, cutIndex).trim();
    }

    return generatedText;
}

export async function generateCta(params: GenerationParams, apiKey: string, modification?: string): Promise<string> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história' : 'oração';
    let prompt = `Baseado no tema "${params.mainPrompt}" para uma ${typeText}, crie uma "call to action" (CTA) persuasiva e otimizada para o engajamento no YouTube. A CTA deve incentivar o espectador a se inscrever no canal, ativar as notificações, curtir o vídeo e deixar um comentário com suas reflexões. Seja criativo e pessoal.`;
    if (modification) {
        prompt += ` Modifique com a instrução: "${modification}".`;
    }
    prompt += ` Escreva a resposta no idioma ${languageName}. Retorne apenas o texto da CTA.`;
    return generateWithGemini(apiKey, prompt, params.language);
}