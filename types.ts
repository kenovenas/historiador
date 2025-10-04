export enum CreationType {
  Story = 'story',
  Prayer = 'prayer',
}

export interface GenerationParams {
    creationType: CreationType;
    mainPrompt: string;
    titlePrompt: string;
    descriptionPrompt: string;
    thumbnailPrompt: string;
    characterCount: number;
    language: string;
}

export interface HistoryItem extends GenerationParams {
    id: string;
    timestamp: number;
    generatedTitles: string[];
    generatedDescription: string;
    generatedTags: string[];
    generatedThumbnailPrompt: string;
    generatedContent: string;
    generatedCta: string;
}
