import { Command } from 'obsidian';
import slidesStudioPlugin from '../main';

export const OpenWebviewCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'open-slide-studio-webview',
    name: 'Open Slides Studio Webview',
    callback: async () => {
        await plugin.openWebView();
    }
});