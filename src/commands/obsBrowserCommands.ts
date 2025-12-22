import { Command } from 'obsidian';
import type slidesStudioPlugin from '../main';

// Define interfaces to avoid 'any'
interface OBSSource {
    inputUuid: string;
    inputName: string;
}

interface OBSInputListResponse {
    inputs: OBSSource[];
}

interface OBSInputSettings {
    inputSettings: {
        url: string;
        css: string;
    };
}

export const SetObsReceiverCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'set-slides-studio-obs-receiver',
    name: 'Set the URL for slides studio receiver OBS browser source',
    callback: () => {
        const port = plugin.settings.serverPort;
        const obsURL = `http://localhost:${port}/${plugin.manifest.dir}/slides_studio/slides_studio_OBS_browser_source.html`;
        
        // Use void for floating promise and handle error properly
        void plugin.obs.call("SetInputSettings", {
            inputName: 'slides',
            inputSettings: {
                url: obsURL,
            },
        }).catch((err) => {
            console.error('Failed set slides studio receiver: ', err);
        });
    }
});

export const UpdateBrowsersUrlCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'update-browsers-url',
    name: 'Update slides studio OBS browsers URL',
    callback: async () => {
        const port = plugin.settings.serverPort;
        
        try {
            // Cast response to our interface instead of any
            const response = await plugin.obs.call("GetInputList", { inputKind: "browser_source" }) as unknown as OBSInputListResponse;

            for (const input of response.inputs) {
                try {
                    const settings = await plugin.obs.call("GetInputSettings", {
                        inputUuid: input.inputUuid,
                    }) as unknown as OBSInputSettings;

                    if (settings.inputSettings.css.includes("--slides-studio-refresh")) {
                        const browserURL = new URL(settings.inputSettings.url);
                        const newURL = `http://localhost:${port}${browserURL.pathname}`;

                        // Await the call inside the loop
                        await plugin.obs.call("SetInputSettings", {
                            inputUuid: input.inputUuid,
                            inputSettings: {
                                url: newURL,
                            },
                        });
                    }
                } catch (err) {
                    console.error("Error updating specific browser source:", err);
                }
            }
        } catch (err) {
            console.error("Failed to get OBS input list:", err);
        }
    }
});

export const RefreshObsBrowsersCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'refresh-obs-browsers',
    name: 'Refresh all OBS browser sources',
    callback: async () => {
        try {
            const response = await plugin.obs.call("GetInputList", { inputKind: "browser_source" }) as unknown as OBSInputListResponse;

            // Use for...of instead of forEach for async operations
            for (const browser of response.inputs) {
                await plugin.obs.call("PressInputPropertiesButton", {
                    inputUuid: browser.inputUuid,
                    propertyName: "refreshnocache",
                });
            }
        } catch (err) {
            console.error("Failed to refresh OBS browsers:", err);
        }
    }
});