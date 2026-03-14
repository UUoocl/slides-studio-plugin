import { Command } from 'obsidian';
import slidesStudioPlugin from '../main';

export const OpenAppsGalleryCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'open-apps-gallery',
    name: 'Open Slides Studio Apps Gallery',
    callback: async () => {
        await plugin.openAppsGallery();
    }
});
