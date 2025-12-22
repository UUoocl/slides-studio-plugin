import { Command, Notice, Platform } from 'obsidian';
import slidesStudioPlugin from '../main';
import path from 'node:path'; 
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export const OpenObsCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'open-obs',
    name: 'Open OBS',
    callback: async () => {
        new Notice("Trying to launch obs");
        let commandString = "";
        const settings = plugin.settings;

        if (Platform.isMacOS) {
            commandString = `open -n -a "${settings.obsAppName_Text}"`;
            commandString += ` --args --collection "${settings.obsCollection_Text}"`;
            commandString += ` --remote-debugging-port=${settings.obsDebugPort_Text}`;
            commandString += ` --remote-allow-origins=http://localhost:${settings.obsDebugPort_Text}`;
            commandString += ` --websocket_port "${settings.websocketPort_Text}"`;
            commandString += ` --websocket_password "${settings.websocketPW_Text}"`;
            commandString += ` --multi`;
            void execAsync(commandString);
        }
        if (Platform.isWin) {
            const obsPath = `${settings.obsAppPath_Text}${settings.obsAppName_Text}`;
            const obsDir = path.dirname(obsPath);
            process.chdir(obsDir);

            commandString = `${settings.obsAppName_Text}`;
            commandString += ` --args --collection "${settings.obsCollection_Text}"`;
            commandString += ` --remote-debugging-port=${settings.obsDebugPort_Text}`;
            commandString += ` --remote-allow-origins=http://localhost:${settings.obsDebugPort_Text}`;
            commandString += ` --websocket_port "${settings.websocketPort_Text}"`;
            commandString += ` --websocket_password "${settings.websocketPW_Text}"`;
            commandString += ` --multi`;

            void execAsync(commandString);
        }
    }
});