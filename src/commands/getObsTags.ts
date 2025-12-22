import { Command } from 'obsidian';
import slidesStudioPlugin from '../main';

export const GetObsTagsCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'get-obs-scene-tags',
    name: 'Get OBS tags',
    callback: async () => {
        await plugin.getObsTags();
    }
});