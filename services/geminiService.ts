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
    
    let prompt = `Aja como um especialista em SEO para YouTube. Sua tarefa é gerar uma lista de tags de SEO altamente otimizadas para um vídeo sobre uma ${typeText} com o tema: "${params.mainPrompt}".

**REGRAS OBRIGATÓRIAS:**
1.  **Relevância Máxima:** As tags devem ser extremamente relevantes para o tema principal.
2.  **Mistura Estratégica:** Crie uma mistura inteligente de:
    *   **Tags Específicas (Long-tail):** Frases que um usuário digitaria para encontrar este vídeo específico (ex: "história do irmão do filho pródigo", "oração de agradecimento pela família").
    *   **Tags Abrangentes (Short-tail):** Palavras-chave mais amplas que definem a categoria (ex: "parábolas de Jesus", "oração da noite", "histórias bíblicas").
3.  **Limite de Caracteres:** A soma total de caracteres de TODAS as tags deve ser inferior a 480 caracteres. Isso é crucial para garantir uma margem de segurança dentro do limite de 500 caracteres do YouTube. Seja conciso e priorize as tags mais importantes.
4.  **Idioma:** As tags devem ser no idioma ${languageName}.`;

    if (modification) prompt += ` Modifique com a seguinte instrução: "${modification}".`;
    prompt += ` Responda com um array JSON de strings.`;
    
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    const responseJson = await generateJsonWithGemini(apiKey, prompt, params.language, schema);

    let parsedTags: string[] = [];
    try {
        const rawTags = JSON.parse(responseJson);
        if (Array.isArray(rawTags)) {
            parsedTags = rawTags.map(tag => String(tag).trim()).filter(Boolean);
        }
    } catch (e) {
        console.error("Failed to parse tags JSON:", e, "Raw response:", responseJson);
        parsedTags = responseJson.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    // Enforce YouTube's 500 character limit as a final safeguard
    const YOUTUBE_TAG_CHAR_LIMIT = 500;
    const finalTags: string[] = [];
    let currentLength = 0;

    for (const tag of parsedTags) {
        if (currentLength + tag.length <= YOUTUBE_TAG_CHAR_LIMIT) {
            finalTags.push(tag);
            currentLength += tag.length;
        } else {
            break; // Stop if adding the next tag would exceed the limit
        }
    }

    return finalTags;
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
    const maxRetries = 2; // Total of 3 attempts
    let attempt = 0;
    let generatedText = '';
    const CHARACTER_TOLERANCE = 500;

    const buildPrompt = () => {
        let prompt = `Sua tarefa tem cinco regras ABSOLUTAS e OBRIGATÓRIAS.

REGRA 0 (IDIOMA): A resposta DEVE ser escrita inteiramente em ${languageName}.
`;

        if (creationType === CreationType.Story) {
            prompt += `
REGRA 1 (FIDELIDADE BÍBLICA E EXPANSÃO NARRATIVA): Sua principal diretriz é a fidelidade bíblica. É INACEITÁVEL gerar uma história curta; você DEVE usar as seguintes técnicas para expandir a narrativa e atingir o comprimento solicitado na REGRA 3, fazendo isso EXCLUSIVAMENTE através de:
- **Elaboração Detalhada de Cenas:** Aprofunde CADA cena da história. Em vez de simplesmente narrar um evento, mergulhe nos detalhes. Descreva o cenário (o calor do sol, a textura da areia, os sons do mercado), as vestimentas, a atmosfera baseando-se no contexto histórico e geográfico da passagem.
- **Monólogo Interior Aprofundado:** Dedique parágrafos para explorar os pensamentos, emoções, medos e esperanças dos personagens BÍBLICOS. Infira esses sentimentos a partir de suas ações e do contexto da Escritura. O que Davi sentiu ao ver Golias? Qual a angústia de Jonas no ventre do peixe?
- **Ações Ricas em Detalhes:** Transforme ações simples (ex: 'ele caminhou') em descrições vívidas e prolongadas (ex: 'ele caminhou com passos firmes e hesitantes sobre a poeira da estrada, sentindo cada pedra sob suas sandálias gastas, enquanto o sol forte castigava seu rosto e o vento sussurrava dúvidas em seus ouvidos...').
- **Linguagem Sensorial Imersiva:** Descreva o que os personagens veem, ouvem, cheiram, provam e sentem. Faça o leitor se sentir presente na cena.
- **CRUCIALMENTE: NÃO INVENTE novos personagens, diálogos falados que não estão no texto, ou eventos que contradigam a passagem.** A precisão teológica é primordial, mas a profundidade da narrativa deve ser usada para alcançar o comprimento desejado.

REGRA 2 (ESTRUTURA NARRATIVA COMPLETA): É ABSOLUTAMENTE ESSENCIAL que o texto tenha uma narrativa completa, com um início, meio e fim claros e bem definidos.
- **Início:** Comece com uma introdução curta e cativante que desperte a curiosidade do leitor e estabeleça a cena ou o dilema inicial.
- **Meio:** Desenvolva a história de forma fluida, utilizando as técnicas de expansão da REGRA 1.
- **Fim:** A história DEVE ter uma conclusão satisfatória e com sentido. NÃO INTERROMPA A NARRATIVA abruptamente. O final deve fornecer uma resolução, uma lição ou um momento de reflexão que feche a história de forma coesa. A qualidade da conclusão é mais importante do que atingir a contagem exata de caracteres.
`;
        } else { // Prayer
            prompt += `
REGRA 1 (PROFUNDIDADE E EXPANSÃO DA ORAÇÃO): Sua principal diretriz é criar uma oração sincera, profunda e teologicamente sólida. É INACEITÁVEL gerar uma oração curta; você DEVE usar as seguintes técnicas para expandir a oração e atingir o comprimento solicitado na REGRA 3:
- **Elaboração Detalhada de Temas:** Aprofunde CADA ponto da oração. Se o tema for gratidão, não diga apenas "obrigado pela família", mas descreva momentos específicos de alegria, o que cada membro significa, e a gratidão por sua saúde e união. Se for uma súplica por força, descreva a natureza do desafio, os sentimentos de fraqueza e a confiança específica na intervenção divina, baseando-se em promessas bíblicas.
- **Uso de Metáforas e Linguagem Poética:** Utilize linguagem rica e poética, inspirada nos Salmos. Por exemplo, em vez de "proteja-me", use "seja meu escudo e fortaleza, a rocha em que me firmo, a sombra que me abriga do calor da tribulação".
- **Referências Bíblicas Explícitas:** Incorpore referências ou alusões a passagens bíblicas que sustentem o tema da oração. Diga "Assim como guardaste Daniel na cova dos leões, guarda-me dos perigos que me cercam" ou "Que a Tua paz, que excede todo entendimento, inunde meu coração como prometido em Filipenses".
- **Estrutura Progressiva e Prolongada:** Desenvolve a oração em seções distintas e bem elaboradas. Dedique parágrafos separados para adoração, confissão, gratidão, súplicas e intercessões, concluindo com uma declaração de fé e confiança. Não apresse as transições.
- **CRUCIALMENTE: A oração deve ser respeitosa, reverente e alinhada com os princípios cristãos.**

REGRA 2 (ESTRUTURA COMPLETA DA ORAÇÃO): É ABSOLUTAMENTE ESSENCIAL que a oração seja uma peça completa, com início, meio e fim claros e bem definidos.
- **Início:** Comece com uma introdução curta e reverente, como uma invocação ou adoração, que estabeleça o tom da oração.
- **Meio:** Desenvolva o corpo da oração de forma fluida, abordando os temas de gratidão, súplica ou intercessão com a profundidade descrita na REGRA 1.
- **Fim:** A oração DEVE ter uma conclusão com sentido e que transmita um sentimento de encerramento. NÃO TERMINE A ORAÇÃO abruptamente. Finalize com uma declaração de fé, confiança, ou um "Amém" que se sinta natural e conclusivo. A qualidade do encerramento é mais importante do que atingir a contagem exata de caracteres.
`;
        }

        prompt += `
REGRA 3 (CONTAGEM DE CARACTERES): O resultado final DEVE ter aproximadamente ${characterCount} caracteres (com uma tolerância de +/- ${CHARACTER_TOLERANCE} caracteres). Esta é uma regra CRÍTICA e OBRIGATÓRIA. Use a liberdade criativa descrita na REGRA 1 para expandir o conteúdo e ATINGIR a contagem de caracteres solicitada. É essencial que o texto tenha o comprimento adequado. Repito, o texto final deve ter aproximadamente ${characterCount} caracteres.

REGRA 4 (FORMATO DA RESPOSTA): Sua resposta deve ser EXCLUSIVAMENTE o texto da ${creationType === CreationType.Story ? 'história' : 'oração'}. NÃO inclua nenhum texto introdutório, títulos, explicações, confirmações das regras, ou qualquer outro texto que não seja a criação solicitada. A resposta deve começar diretamente com a primeira palavra da ${creationType === CreationType.Story ? 'história' : 'oração'}.

Agora, seguindo TODAS as regras acima sem exceção, crie a ${creationType === CreationType.Story ? 'história bíblica' : 'oração'} com base no tema: "${mainPrompt}".
${modification ? `\n\nInstrução de modificação: "${modification}". Aplique-a, mas SEMPRE respeitando TODAS as regras.` : ''}
Formate com parágrafos.`;
        return prompt;
    }

    let basePrompt = buildPrompt();

    while (attempt <= maxRetries) {
        attempt++;
        let currentPrompt = basePrompt;

        if (attempt > 1 && generatedText.length > 0) {
             const lengthFeedback = generatedText.length < characterCount - CHARACTER_TOLERANCE
                ? `A tentativa anterior foi muito curta (${generatedText.length} caracteres).`
                : `A tentativa anterior foi muito longa (${generatedText.length} caracteres).`;
            
            const contentWord = creationType === CreationType.Story ? 'a narrativa' : 'a oração';

            currentPrompt += `\n\nAVISO IMPORTANTE: ${lengthFeedback} Expanda ou resuma ${contentWord} para atingir a contagem de caracteres solicitada de aproximadamente ${characterCount} caracteres. A obediência a esta regra é essencial, mas é ainda MAIS IMPORTANTE garantir que a ${contentWord} tenha um final conclusivo.`;
        }
        
        generatedText = await generateWithGemini(apiKey, currentPrompt, language, { temperature: 0.5 });
        
        if (generatedText.length >= characterCount - CHARACTER_TOLERANCE && generatedText.length <= characterCount + CHARACTER_TOLERANCE) {
            return generatedText;
        }
    }

    console.warn(`generateContent: After ${maxRetries + 1} attempts, the content length (${generatedText.length}) is still outside the desired range of ${characterCount} +/- ${CHARACTER_TOLERANCE}. Returning the last attempt without truncation to preserve the narrative ending.`);

    return generatedText;
}


export async function generateCta(params: GenerationParams, apiKey: string, modification?: string): Promise<string> {
    const languageName = languageMap[params.language] || 'Português do Brasil';
    const typeText = params.creationType === CreationType.Story ? 'história' : 'oração';
    let prompt = `Baseado no tema "${params.mainPrompt}" para uma ${typeText}, crie uma "call to action" (CTA) persuasiva e otimizada para o engajamento no YouTube. A CTA deve incentivar o espectador a se inscrever no canal, ativar as notificações, curtir o vídeo e deixar um comentário com suas reflexões. Seja criativo e pessoal. O resultado final DEVE ter no máximo 500 caracteres.`;
    if (modification) {
        prompt += ` Modifique com a instrução: "${modification}".`;
    }
    prompt += ` Escreva a resposta no idioma ${languageName}. Retorne apenas o texto da CTA.`;

    let ctaText = await generateWithGemini(apiKey, prompt, params.language);

    // Safeguard to enforce character limit
    if (ctaText.length > 500) {
        const hardLimit = 500;
        let cutIndex = ctaText.lastIndexOf('.', hardLimit); // Try to cut at a sentence end
        if (cutIndex === -1 || cutIndex < hardLimit - 50) { // Look for a period in a reasonable range
            cutIndex = ctaText.lastIndexOf(' ', hardLimit);
        }
        if (cutIndex === -1) { // If no space, hard cut
            cutIndex = hardLimit;
        }
        ctaText = ctaText.substring(0, cutIndex).trim();
    }

    return ctaText;
}