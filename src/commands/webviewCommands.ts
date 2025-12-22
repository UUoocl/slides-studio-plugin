import { Command, Notice } from 'obsidian';
import slidesStudioPlugin from '../main';

export const OpenWebviewCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'open-slide-studio-webview',
    name: 'Open Slides Studio Webview',
    callback: async () => {
        await plugin.openWebView();
    }
});

export const CopyObsLinkCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'copy-obs-browser-source-link',
    name: 'Copy the Slides Url for OBS to the clipboard',
    callback: async () => {
        const port = plugin.settings.serverPort;
        const obsURL = `http://localhost:${port}/${plugin.manifest.dir}/slides_studio/slides_studio_OBS_browser_source.html`;
        try {
            await navigator.clipboard.writeText(obsURL);
            new Notice('URL copied to clipboard successfully!');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
});