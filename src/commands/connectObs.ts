import { Command, Notice } from 'obsidian';
import slidesStudioPlugin from '../main';

export const ConnectObsCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'connect-to-obs-websocket',
    name: 'Connect to the OBS Websocket Server',
    callback: () => {
        new Notice("Connecting to the obs websocket server");
        const wssDetails = {
            IP: plugin.settings.websocketIP_Text,
            PORT: plugin.settings.websocketPort_Text,
            PW: plugin.settings.websocketPW_Text
        };
        void plugin.obsWSSconnect(wssDetails);
    }
});