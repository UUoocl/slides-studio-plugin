import { App, Platform, PluginSettingTab, Setting, Notice, FileSystemAdapter, TFolder, TFile } from "obsidian";
import type slidesStudioPlugin from "./main";
import { ServerManager } from "./utils/serverLogic";
import { SlidesStudioPluginSettings } from "./types";
import { exec } from "child_process";
import * as net from "net";

export class slidesStudioSettingsTab extends PluginSettingTab {
    plugin: slidesStudioPlugin;
    private pythonStatusEl: HTMLElement;
    private discoveredUvcDevices: { index: number, name: string }[] = [];
    private sectionState: Map<string, boolean> = new Map();

    constructor(app: App, plugin: slidesStudioPlugin) {
        super(app, plugin);
        this.plugin = plugin;

        // Listen for gamepad events to refresh the settings UI
        window.addEventListener("gamepadconnected", () => this.display());
        window.addEventListener("gamepaddisconnected", () => this.display());

        // Listen for UVC device discovery
        this.plugin.app.workspace.on("slides-studio:uvc-devices", (devices: { index: number, name: string }[]) => {
            console.warn("[Settings] Received discovered UVC devices:", devices);
            this.discoveredUvcDevices = devices;
            this.display();
        });
    }

    private updateBridgeConfig() {
        if (this.plugin.serverManager && this.plugin.settings.uvcUtilEnabled) {
            const enabledDevices = this.plugin.settings.uvcDevices.filter(d => d.enabled);
            this.plugin.serverManager.broadcastUvcCommand({
                action: "configure",
                devices: enabledDevices
            });
        }
    }

    private validatePythonPath(path: string) {
        if (!this.pythonStatusEl) return;

        if (!path) {
            this.pythonStatusEl.setText("No python path provided.");
            this.pythonStatusEl.setCssProps({
                'color': 'var(--text-muted)'
            });
            return;
        }

        // Use double quotes around the path to handle spaces
        exec(`"${path}" --version`, (error, stdout, stderr) => {
            if (error) {
                this.pythonStatusEl.setText("Python not found or invalid path.");
                this.pythonStatusEl.setCssProps({
                    'color': 'red'
                });
            } else {
                const version = stdout.trim() || stderr.trim();
                this.pythonStatusEl.setText(`Python loaded: ${version}`);
                this.pythonStatusEl.setCssProps({
                    'color': 'green'
                });
            }
        });
    }

    private async checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => {
                resolve(false);
            });
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '127.0.0.1');
        });
    }

    private async updatePortStatus(port: string, setting: Setting, baseDesc: string) {
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            setting.setDesc(`${baseDesc} (Invalid port number)`);
            return;
        }

        const isAvailable = await this.checkPort(portNum);
        if (isAvailable) {
            setting.setDesc(`${baseDesc} (Port ${portNum} is available)`);
        } else {
            setting.setDesc(`${baseDesc} (Port ${portNum} is IN USE)`);
        }
    }

    private createSection(containerEl: HTMLElement, name: string, id: string): HTMLElement {
        const details = containerEl.createEl("details", {
            cls: "slides-studio-settings-section"
        });

        if (this.sectionState.get(id) !== false) {
            details.setAttribute("open", "");
        }

        details.addEventListener("toggle", () => {
            this.sectionState.set(id, details.open);
        });

        const summary = details.createEl("summary");
        summary.createEl("span", { text: name });

        return details.createDiv();
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        console.debug("[SlidesStudioSettings] Refreshing display...");

        // #region Settings Manager
        try {
            new Setting(containerEl)
                .setName("Configuration manager")
                .setHeading();
        } catch (e) {
            console.error("[SlidesStudioSettings] Error creating Configuration manager heading", e);
        }

        const allFolders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder);

        const settingsFolderOptions: Record<string, string> = { "": "Select a folder" };
        allFolders.forEach(f => settingsFolderOptions[f.path] = f.path);

        try {
            const configSection = this.createSection(containerEl, "Settings Manager", "config_manager");

            new Setting(configSection)
                .setName("Settings folder")
                .setDesc("Folder where settings files are stored")
                .addDropdown(dropdown => {
                    dropdown.addOptions(settingsFolderOptions)
                        .setValue(this.plugin.settings.settingsFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.settingsFolder = value;
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });

            if (this.plugin.settings.settingsFolder) {
                const folderFiles = this.app.vault.getFiles()
                    .filter(f => f.path.startsWith(this.plugin.settings.settingsFolder) && f.name.endsWith('.md'));

                const fileOptions: Record<string, string> = { "": "Select an existing file (optional)" };
                folderFiles.forEach(f => fileOptions[f.name] = f.name);

                new Setting(configSection)
                    .setName("Settings file (existing)")
                    .setDesc("Select an existing configuration file to load or target")
                    .addDropdown(dropdown => dropdown
                        .addOptions(fileOptions)
                        .setValue(this.plugin.settings.settingsFile)
                        .onChange((value) => {
                            if (value) {
                                // Update the text input below if a file is selected
                                this.plugin.settings.settingsFile = value;
                                this.display();
                            }
                        })
                    )
                    .addButton(btn => btn
                        .setIcon("refresh-cw")
                        .setTooltip("Refresh file list")
                        .onClick(() => this.display())
                    );

                new Setting(configSection)
                    .setName("Settings file (current)")
                    .setDesc("File name for current configuration (eg slides-studio-settings.md)")
                    .addText(text => text
                        .setValue(this.plugin.settings.settingsFile)
                        .onChange(async (value) => {
                            this.plugin.settings.settingsFile = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(configSection)
                    .setName("Actions")
                    .addButton(btn => btn
                        .setButtonText("Save configuration")
                        .setCta()
                        .onClick(async () => {
                            const { settingsFolder, settingsFile } = this.plugin.settings;
                            if (settingsFolder && settingsFile) {
                                let filePath = `${settingsFolder}/${settingsFile}`;
                                if (!filePath.endsWith('.md')) filePath += '.md';

                                const content = JSON.stringify(this.plugin.settings, null, 2);

                                try {
                                    const file = this.app.vault.getAbstractFileByPath(filePath);
                                    if (file instanceof TFile) {
                                        await this.app.vault.modify(file, content);
                                    } else {
                                        await this.app.vault.create(filePath, content);
                                    }
                                    new Notice("Settings saved to " + filePath);
                                } catch (error) {
                                    console.error("Error saving settings file", error);
                                    new Notice("Error saving settings file");
                                }
                            } else {
                                new Notice("Please select a folder and file name");
                            }
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText("Load configuration")
                        .setWarning()
                        .onClick(async () => {
                            const { settingsFolder, settingsFile } = this.plugin.settings;
                            if (settingsFolder && settingsFile) {
                                let filePath = `${settingsFolder}/${settingsFile}`;
                                if (!filePath.endsWith('.md')) filePath += '.md';

                                const file = this.app.vault.getAbstractFileByPath(filePath);
                                if (file instanceof TFile) {
                                    try {
                                        const content = await this.app.vault.read(file);
                                        const loadedSettings = JSON.parse(content) as SlidesStudioPluginSettings;

                                        // Merge loaded settings but preserve current settingsFolder/File to avoid confusion? 
                                        // User probably wants to load EVERYTHING including device setups.
                                        // Let's just load everything.
                                        this.plugin.settings = loadedSettings;

                                        // Ensure these are kept consistent with what was just used to load, 
                                        // unless we explicitly want the loaded file to override where we save next.
                                        // Usually "Load" implies "State Restore", so we take what's in the file.

                                        await this.plugin.saveSettings();
                                        this.plugin.onunload(); // Restart services
                                        await this.plugin.onload();   // Restart services
                                        this.display();
                                        new Notice("Settings loaded from " + filePath);
                                    } catch (error) {
                                        console.error("Error loading settings file", error);
                                        new Notice("Error loading settings file. Is it valid JSON?");
                                    }
                                } else {
                                    new Notice("File not found: " + filePath);
                                }
                            }
                        })
                    );
            }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Settings Manager section", e);
        }
        // #endregion

        // #region Server Settings
        try {
            const webServerSection = this.createSection(containerEl, "Web Server", "web_server");

        new Setting(webServerSection)
            .setName("Enable plugin web server")
            .setDesc("Start a local web server to serve the slides studio apps")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.serverEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.serverEnabled = value;
                    await this.plugin.saveSettings();

                    if (value) {
                        const port = parseInt(this.plugin.settings.serverPort) || 57000;
                        if (!this.plugin.serverManager) {
                            this.plugin.serverManager = new ServerManager(this.plugin.app, this.plugin, port);
                        }
                        void this.plugin.serverManager.start();
                    } else {
                        if (this.plugin.serverManager) {
                            void this.plugin.serverManager.stop();
                            this.plugin.serverManager = null;
                        }
                    }
                    this.display();
                })
            );

        if (this.plugin.settings.serverEnabled) {
            const serverPortSetting = new Setting(webServerSection)
                .setName("Server port 1")
                .setDesc("Port for the plugin web and socket server")
                .addText((text) => {
                    text.setValue(this.plugin.settings.serverPort)
                        .onChange(async (value) => {
                            this.plugin.settings.serverPort = value;
                            await this.plugin.saveSettings();
                            void this.updatePortStatus(value, serverPortSetting, "Port for the plugin web and socket server");
                        });
                })
                .addButton(btn => btn
                    .setButtonText("Restart server")
                    .onClick(() => {
                        const port = parseInt(this.plugin.settings.serverPort);
                        if (this.plugin.serverManager) {
                            void this.plugin.serverManager.restart(port);
                        }
                    })
                );
            void this.updatePortStatus(this.plugin.settings.serverPort, serverPortSetting, "Port for the plugin web and socket server");
        }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Server Settings section", e);
        }
        // #endregion

        // #region OBS Settings
        try {
            const obsSection = this.createSection(containerEl, "OBS", "obs_launch");

            new Setting(obsSection)
                .setName("Obs launch parameters")
                .setHeading()
                .setDesc("Open obs with these options.");

            if (Platform.isMacOS) {
                new Setting(obsSection)
                    .setName("Name")
                    .setDesc("Enter 'obs' or a custom name")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppName_Text = value;
                                void this.plugin.saveSettings();
                            });
                    });
            }

            if (Platform.isWin) {
                new Setting(obsSection)
                    .setName("Name")
                    .setDesc("Enter 'obs64.exe' or a custom name")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppName_Text = value;
                                void this.plugin.saveSettings();
                            });
                    });

                new Setting(obsSection)
                    .setName("Path to obs app")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppPath_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppPath_Text = value;
                                void this.plugin.saveSettings();
                            });
                    });
            }

            new Setting(obsSection)
                .setName("Collection")
                .setDesc("The OBS scene collection to use on launch. Select from the list or enter manually.")
                .addText(text => text
                    .setPlaceholder("Scene Collection Name")
                    .setValue(this.plugin.settings.obsCollection_Text)
                    .onChange(async (value) => {
                        this.plugin.settings.obsCollection_Text = value;
                        await this.plugin.saveSettings();
                    }))
                .addDropdown(dropdown => {
                    const collections = this.plugin.settings.obsCollections_List || [];
                    const options: Record<string, string> = { "": "Select a known collection..." };
                    collections.forEach(c => options[c] = c);
                    
                    dropdown.addOptions(options)
                        .setValue("") // Always show placeholder
                        .onChange(async (value) => {
                            if (value) {
                                this.plugin.settings.obsCollection_Text = value;
                                await this.plugin.saveSettings();
                                this.display(); // Refresh to show the updated text value
                            }
                        });
                });

            new Setting(obsSection)
                .setName("Profile")
                .setDesc("Select the OBS profile to use on launch")
                .addDropdown(dropdown => {
                    const profiles = this.plugin.settings.obsProfiles_List || [];
                    const options: Record<string, string> = {};
                    if (profiles.length === 0) {
                        options[this.plugin.settings.obsProfile_Text] = this.plugin.settings.obsProfile_Text;
                    } else {
                        profiles.forEach(p => options[p] = p);
                    }
                    dropdown.addOptions(options)
                        .setValue(this.plugin.settings.obsProfile_Text)
                        .onChange(async (value) => {
                            this.plugin.settings.obsProfile_Text = value;
                            await this.plugin.saveSettings();
                        });
                });

            // FIX: Use getBasePath() and avoid unsafe member access
            let collectionPath = "";
            if (this.app.vault.adapter instanceof FileSystemAdapter) {
                collectionPath = this.app.vault.adapter.getBasePath();
            }
            collectionPath += `/${this.plugin.manifest.dir}/obs_collections/SlidesStudio.json`;
            collectionPath = Platform.isWin ? collectionPath.replace(/\//g, '\\') : collectionPath;

            new Setting(obsSection)
                .setName("Obs collection")
                .setDesc("Copy the path to the slide studio collection and import the collection in obs")
                .addText((item) => {
                    item.setValue(collectionPath)
                        .setDisabled(true);
                });

            const obsDebugPortSetting = new Setting(obsSection)
                .setName("Obs browser source debug port")
                .setDesc("Enter a port for the remote debugger or leave blank to skip")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsDebugPort_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsDebugPort_Text = value;
                            void this.plugin.saveSettings();
                            if (value) {
                                void this.updatePortStatus(value, obsDebugPortSetting, "Enter a port for the remote debugger or leave blank to skip");
                            } else {
                                obsDebugPortSetting.setDesc("Enter a port for the remote debugger or leave blank to skip");
                            }
                        });
                });
            if (this.plugin.settings.obsDebugPort_Text) {
                void this.updatePortStatus(this.plugin.settings.obsDebugPort_Text, obsDebugPortSetting, "Enter a port for the remote debugger or leave blank to skip");
            }

            // Nest WebSocket section here
            new Setting(obsSection)
                .setName("Obs websocket server")
                .setHeading();

            new Setting(obsSection)
                .setName("Enable auto connect")
                .setDesc("Automatically connect to OBS on plugin startup")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.obsAutoConnect)
                    .onChange(async (value) => {
                        this.plugin.settings.obsAutoConnect = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(obsSection)
                .setName("Obs websocket server IP")
                .setDesc("Enter '127.0.0.1'")
                .addText((item) => {
                    item.setValue(this.plugin.settings.websocketIP_Text).onChange(
                        (value) => {
                            this.plugin.settings.websocketIP_Text = value;
                            void this.plugin.saveSettings();
                        });
                });

            const obsPortSetting = new Setting(obsSection)
                .setName("Obs websocket server port")
                .setDesc("The port obs websocket is listening on")
                .addText((item) => {
                    item.setValue(this.plugin.settings.websocketPort_Text).onChange(
                        (value) => {
                            this.plugin.settings.websocketPort_Text = value;
                            void this.plugin.saveSettings();
                            void this.updatePortStatus(value, obsPortSetting, "The port OBS WebSocket is listening on");
                        });
                });
            void this.updatePortStatus(this.plugin.settings.websocketPort_Text, obsPortSetting, "The port OBS WebSocket is listening on");

            new Setting(obsSection)
                .setName("Obs websocket server password")
                .setDesc("Strong passwords are encouraged. Use the regenerate button to create a random UUID.")
                .addText((item) => {
                    item.inputEl.type = 'password';
                    item.setValue(this.plugin.settings.websocketPW_Text).onChange(
                        (value) => {
                            this.plugin.settings.websocketPW_Text = value;
                            void this.plugin.saveSettings();
                        });
                })
                .addButton(btn => btn
                    .setIcon("refresh-cw")
                    .setTooltip("Regenerate password (UUID)")
                    .onClick(async () => {
                        const newPw = crypto.randomUUID();
                        this.plugin.settings.websocketPW_Text = newPw;
                        await this.plugin.saveSettings();
                        this.display();
                        new Notice("New password generated and saved.");
                    })
                );

            new Setting(obsSection)
                .setName("Obs request limit (per second)")
                .setDesc("Limit the number of requests sent to obs per second. High volume requests will be bundled.")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsRequestLimit?.toString() || "10").onChange(
                        (value) => {
                            this.plugin.settings.obsRequestLimit = parseInt(value) || 10;
                            void this.plugin.saveSettings();
                        });
                });

            new Setting(obsSection)
                .setName("Connect to obs websocket server")
                .addButton((button) => {
                    const isConnected = this.plugin.isObsConnected;

                    button.setButtonText(isConnected ? "Connected" : "Connect")
                        .onClick(() => {
                            void this.app.commands.executeCommandById('slides-studio:connect-to-obs-websocket');
                            setTimeout(() => this.display(), 1000);
                        });

                    if (isConnected) {
                        button.setCta();
                        button.buttonEl.setCssProps({
                            'background-color': 'green',
                            'border-color': 'green',
                            'color': 'white'
                        });
                    }
                });

            new Setting(obsSection)
                .setName("Open obs")
                .addButton((button) => {
                    button.setButtonText("Launch")
                        .setCta()
                        .onClick(() => {
                            void this.app.commands.executeCommandById('slides-studio:open-obs');
                        });
                });
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in OBS section", e);
        }
        // #endregion

        // #region OSC Settings
        try {
            const oscSection = this.createSection(containerEl, "OSC Devices", "osc_devices");

        new Setting(oscSection)
            .setName("Osc devices")
            .setHeading();

        oscSection.createEl("p", { text: "Add osc inputs and outputs." });

        this.plugin.settings.oscDevices.forEach((device, index) => {
            const deviceDiv = oscSection.createDiv();
            deviceDiv.setCssProps({
                'border': '1px solid var(--background-modifier-border)',
                'padding': '10px',
                'margin-bottom': '10px',
                'border-radius': '5px'
            });

            new Setting(deviceDiv)
                .setName("Osc device name")
                .setDesc("Unique device name (used for WebSocket channels); enable auto-connect on load")
                .addText(text => text
                    .setValue(device.name)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].name = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setTooltip("Auto-connect on plugin load")
                    .setValue(device.autoStart)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].autoStart = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(deviceDiv)
                .setName("Input port")
                .setDesc("The port where this plugin listens for incoming OSC (Hardware -> Plugin)")
                .addText(text => text
                    .setValue(device.inputPort?.toString() || "")
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].inputPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                    }));

            new Setting(deviceDiv)
                .setName("Output address")
                .setDesc("The IP address of the target OSC device")
                .addText(text => text
                    .setValue(device.outputAddress)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].outputAddress = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(deviceDiv)
                .setName("Output port")
                .setDesc("The port where the remote device is listening (Plugin -> Hardware)")
                .addText(text => text
                    .setValue(device.outputPort?.toString() || "")
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].outputPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                    }));

                new Setting(deviceDiv)
                    .setName("Console logging")
                    .setDesc("Enable detailed OSC message logging in the Obsidian developer console")
                    .addToggle(toggle => toggle
                        .setValue(device.consoleLogEnabled || false)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].consoleLogEnabled = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Connect")
                        .onClick(() => {
                            if (this.plugin.oscManager) {
                                this.plugin.oscManager.connectDevice(device);
                            }
                        }))
                    .addButton(btn => btn
                        .setButtonText("Disconnect")
                        .onClick(() => {
                            if (this.plugin.oscManager) {
                                this.plugin.oscManager.disconnectDevice(device);
                            }
                        }))
                    .addButton(btn => btn
                        .setButtonText("Remove")
                        .setWarning()
                        .onClick(async () => {
                            if (this.plugin.oscManager) {
                                this.plugin.oscManager.disconnectDevice(device);
                            }
                            this.plugin.settings.oscDevices.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }));
            });

        new Setting(oscSection)
            .addButton(btn => btn
                .setButtonText("Add osc device")
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.oscDevices.push({
                        name: "NewDevice",
                        inputPort: 8000,
                        outputAddress: "127.0.0.1",
                        outputPort: 9000,
                        autoStart: false
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in OSC section", e);
        }
        // #endregion

        try {
            const midiSection = this.createSection(containerEl, "MIDI Devices", "midi_devices");

            new Setting(midiSection)
                .setName("Midi devices")
                .setHeading();

            midiSection.createEl("p", { text: "Add midi inputs and outputs." });

            if (!this.plugin.midiManager) {
                midiSection.createEl("p", { text: "MIDI manager not initialized.", cls: "error" });
            } else {
                const availableInputs = this.plugin.midiManager.getInputs();
                const availableOutputs = this.plugin.midiManager.getOutputs();

                this.plugin.settings.midiDevices.forEach((device, index) => {
                    const deviceDiv = midiSection.createDiv();
                    deviceDiv.setCssProps({
                        'border': '1px solid var(--background-modifier-border)',
                        'padding': '10px',
                        'margin-bottom': '10px',
                        'border-radius': '5px'
                    });

                    new Setting(deviceDiv)
                        .setName(`MIDI Device ${index + 1}`)
                        .setHeading();

                    new Setting(deviceDiv)
                        .setName("Device name")
                        .setDesc("Unique device name (WebSocket channel); enable auto-connect on load")
                        .addText(text => text
                            .setValue(device.name)
                            .onChange((value) => {
                                this.plugin.settings.midiDevices[index].name = value;
                                void this.plugin.saveSettings();
                            })
                        )
                        .addButton(btn => btn
                            .setButtonText("Connect")
                            .onClick(() => {
                                if (this.plugin.midiManager) {
                                    this.plugin.midiManager.connectDevice(this.plugin.settings.midiDevices[index]);
                                }
                            })
                        )
                        .addToggle(toggle => toggle
                            .setTooltip("Auto-start on plugin load")
                            .setValue(device.autoStart || false)
                            .onChange(async (value) => {
                                this.plugin.settings.midiDevices[index].autoStart = value;
                                await this.plugin.saveSettings();
                            })
                        );

                    new Setting(deviceDiv)
                        .setName("Input device")
                        .addDropdown(dropdown => {
                            dropdown.addOption("", "Select input");
                            for (const input of availableInputs) {
                                dropdown.addOption(input, input);
                            }
                            dropdown.setValue(device.inputName);
                            dropdown.onChange((value) => {
                                this.plugin.settings.midiDevices[index].inputName = value;
                                void this.plugin.saveSettings();
                            });
                        });

                    new Setting(deviceDiv)
                        .setName("Output device")
                        .addDropdown(dropdown => {
                            dropdown.addOption("", "Select output");
                            for (const output of availableOutputs) {
                                dropdown.addOption(output, output);
                            }
                            dropdown.setValue(device.outputName);
                            dropdown.onChange((value) => {
                                this.plugin.settings.midiDevices[index].outputName = value;
                                void this.plugin.saveSettings();
                            });
                        });

                    new Setting(deviceDiv)
                        .setName("Console logging")
                        .setDesc("Enable detailed MIDI message logging in the Obsidian developer console")
                        .addToggle(toggle => toggle
                            .setValue(device.consoleLogEnabled || false)
                            .onChange(async (value) => {
                                this.plugin.settings.midiDevices[index].consoleLogEnabled = value;
                                await this.plugin.saveSettings();
                            }));

                    new Setting(deviceDiv)
                        .addButton(btn => btn
                            .setButtonText("Remove midi device")
                            .setWarning()
                            .onClick(async () => {
                                if (this.plugin.midiManager) {
                                    this.plugin.midiManager.disconnectDevice(device);
                                }
                                this.plugin.settings.midiDevices.splice(index, 1);
                                await this.plugin.saveSettings();
                                this.display();
                            })
                        );
                });

                new Setting(midiSection)
                    .setName("Add new midi device")
                    .addButton(btn => btn
                        .setButtonText("Add device")
                        .setCta()
                        .onClick(async () => {
                            this.plugin.settings.midiDevices.push({
                                name: "MyMidiDevice",
                                inputName: "",
                                outputName: ""
                            });
                            await this.plugin.saveSettings();
                            this.display();
                        })
                    );
            }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in MIDI section", e);
        }
        // #endregion

        // #region Keyboard and Mouse
        try {
            const monitorsSection = this.createSection(containerEl, "Keyboard and Mouse", "python_monitors");

        new Setting(monitorsSection)
            .setName("Python installation")
            .setHeading();

        new Setting(monitorsSection)
            .setName("Python install path")
            .setDesc("The full path to the python executable. macOS example: /Library/Frameworks/Python.framework/Versions/3.12/bin/python3")
            .addText(text => text
                .setPlaceholder("/usr/bin/python3")
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = value;
                    await this.plugin.saveSettings();
                    this.validatePythonPath(value);
                    if (this.plugin.settings.mouseMonitorEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartMouseMonitor();
                    }
                })
            );

        this.pythonStatusEl = monitorsSection.createEl("p", {
            text: "Checking python...",
            cls: "python-status"
        });
        this.pythonStatusEl.setCssProps({
            'font-size': '0.8em',
            'margin-top': '-10px',
            'margin-bottom': '20px'
        });
        this.validatePythonPath(this.plugin.settings.pythonPath);

        new Setting(monitorsSection)
            .setName("Mouse monitor")
            .setHeading();

        new Setting(monitorsSection)
            .setName("Enable mouse monitor")
            .setDesc("Monitor global mouse input via a python script.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseMonitorEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.mouseMonitorEnabled = value;
                    await this.plugin.saveSettings();

                    if (this.plugin.serverManager) {
                        if (value) {
                            void this.plugin.serverManager.startMouseMonitor();
                        } else {
                            void this.plugin.serverManager.stopMouseMonitor();
                        }
                    } else if (value) {
                        new Notice("Server must be enabled to use mouse monitor.");
                    }
                })
            );

        new Setting(monitorsSection)
            .setName("Monitor position")
            .setDesc("Monitor mouse movement.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseMonitorPosition)
                .onChange(async (value) => {
                    this.plugin.settings.mouseMonitorPosition = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.mouseMonitorEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartMouseMonitor();
                    }
                    this.display(); // Refresh to show/hide PPS
                })
            );

        if (this.plugin.settings.mouseMonitorPosition) {
            new Setting(monitorsSection)
                .setName("Posts per second")
                .setDesc("Number of mouse position updates to broadcast per second.")
                .addText(text => text
                    .setValue(this.plugin.settings.mouseMonitorPPS?.toString() || "20")
                    .onChange(async (value) => {
                        const val = parseInt(value);
                        if (!isNaN(val) && val > 0) {
                            this.plugin.settings.mouseMonitorPPS = val;
                            await this.plugin.saveSettings();
                            if (this.plugin.settings.mouseMonitorEnabled && this.plugin.serverManager) {
                                void this.plugin.serverManager.restartMouseMonitor();
                            }
                        }
                    })
                );
        }

        new Setting(monitorsSection)
            .setName("Monitor clicks")
            .setDesc("Monitor mouse button clicks.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseMonitorClicks)
                .onChange(async (value) => {
                    this.plugin.settings.mouseMonitorClicks = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.mouseMonitorEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartMouseMonitor();
                    }
                })
            );

        new Setting(monitorsSection)
            .setName("Monitor scroll")
            .setDesc("Monitor mouse scroll wheel.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseMonitorScroll)
                .onChange(async (value) => {
                    this.plugin.settings.mouseMonitorScroll = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.mouseMonitorEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartMouseMonitor();
                    }
                })
            );

        new Setting(monitorsSection)
            .setName("Keyboard monitor")
            .setHeading();

        new Setting(monitorsSection)
            .setName("Enable keyboard monitor")
            .setDesc("Monitor global keyboard input via a python script.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keyboardMonitorEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.keyboardMonitorEnabled = value;
                    await this.plugin.saveSettings();

                    if (this.plugin.serverManager) {
                        if (value) {
                            void this.plugin.serverManager.startKeyboardMonitor();
                        } else {
                            void this.plugin.serverManager.stopKeyboardMonitor();
                        }
                    } else if (value) {
                        new Notice("Server must be enabled to use keyboard monitor.");
                    }
                })
            );

        new Setting(monitorsSection)
            .setName("Show combinations")
            .setDesc("Capture and display keyboard combinations (eg Ctrl+C).")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keyboardMonitorShowCombinations)
                .onChange(async (value) => {
                    this.plugin.settings.keyboardMonitorShowCombinations = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.keyboardMonitorEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartKeyboardMonitor();
                    }
                })
            );

        // Collapsible Logging Subsection
        const loggingDetails = monitorsSection.createEl("details", { 
            cls: "slides-studio-settings-section" 
        });
        const loggingSummary = loggingDetails.createEl("summary");
        loggingSummary.createEl("span", { text: "Console Logging Settings" });

        const loggingContent = loggingDetails.createDiv();
        loggingContent.createEl("p", { 
            text: "Enable these to see detailed traffic in the Obsidian developer console (Cmd + Option + I).", 
            cls: "setting-item-description" 
        });

        new Setting(loggingContent)
            .setName("Log mouse position")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseConsoleLogPosition || false)
                .onChange(async (value) => {
                    this.plugin.settings.mouseConsoleLogPosition = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(loggingContent)
            .setName("Log mouse clicks")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseConsoleLogClicks || false)
                .onChange(async (value) => {
                    this.plugin.settings.mouseConsoleLogClicks = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(loggingContent)
            .setName("Log mouse scroll")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseConsoleLogScroll || false)
                .onChange(async (value) => {
                    this.plugin.settings.mouseConsoleLogScroll = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(loggingContent)
            .setName("Log keyboard events")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keyboardConsoleLogEnabled || false)
                .onChange(async (value) => {
                    this.plugin.settings.keyboardConsoleLogEnabled = value;
                    await this.plugin.saveSettings();
                })
            );
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Monitors section", e);
        }
        // #endregion

        // #region UVC Bridge Settings
        try {
            const uvcSection = this.createSection(containerEl, "UVC Bridge", "uvc_bridge");

        new Setting(uvcSection)
            .setName("UVC bridge")
            .setHeading();

        new Setting(uvcSection)
            .setName("Enable uvc bridge")
            .setDesc("Bridge uvc controls (pan, tilt, zoom) via a python script and libuvc.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.uvcUtilEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.uvcUtilEnabled = value;
                    await this.plugin.saveSettings();

                    if (this.plugin.serverManager) {
                        if (value) {
                            void this.plugin.serverManager.startUvcUtilBridge();
                        } else {
                            void this.plugin.serverManager.stopUvcUtilBridge();
                        }
                    } else if (value) {
                        new Notice("Server must be enabled to use UVC bridge.");
                    }
                    this.display();
                })
            );

        if (this.plugin.settings.uvcUtilEnabled) {
            new Setting(uvcSection)
                .setName("Refresh devices")
                .setDesc("Scan for connected UVC devices.")
                .addButton(btn => btn
                    .setButtonText("Scan")
                    .onClick(() => {
                        if (this.plugin.serverManager) {
                            this.plugin.serverManager.broadcastUvcCommand({ action: "list_devices" });
                        }
                    })
                );

            if (this.discoveredUvcDevices.length > 0) {
                new Setting(uvcSection)
                    .setName("Discovered uvc devices")
                    .setHeading();

                this.discoveredUvcDevices.forEach(dev => {
                    const devDiv = uvcSection.createDiv();
                    devDiv.setCssProps({
                        'border': '1px solid var(--background-modifier-border)',
                        'padding': '10px',
                        'margin-bottom': '10px',
                        'border-radius': '5px'
                    });

                    let deviceSetting = this.plugin.settings.uvcDevices.find(d => d.index === dev.index);

                    new Setting(devDiv)
                        .setName(`${dev.name}`)
                        .setDesc(`Index: ${dev.index}`)
                        .addToggle(toggle => toggle
                            .setTooltip("Enable this device for UVC control")
                            .setValue(!!deviceSetting?.enabled)
                            .onChange(async (value) => {
                                if (value) {
                                    if (!deviceSetting) {
                                        deviceSetting = {
                                            index: dev.index,
                                            name: dev.name,
                                            enabled: true
                                        };
                                        this.plugin.settings.uvcDevices.push(deviceSetting);
                                    } else {
                                        deviceSetting.enabled = true;
                                    }
                                } else if (deviceSetting) {
                                    deviceSetting.enabled = false;
                                }
                                await this.plugin.saveSettings();
                                this.updateBridgeConfig();
                                this.display();
                            })
                        );

                    if (deviceSetting && deviceSetting.enabled) {
                        new Setting(devDiv)
                            .setName("Channel name")
                            .setDesc("uvc_in_{name} and uvc_out_{name}")
                            .addText(text => text
                                .setValue(deviceSetting.name)
                                .onChange(async (value) => {
                                    deviceSetting.name = value;
                                    await this.plugin.saveSettings();
                                    this.updateBridgeConfig();
                                })
                            );

                        new Setting(devDiv)
                            .setName("Enable polling")
                            .setDesc("Automatically fetch camera controls periodically.")
                            .addToggle(toggle => toggle
                                .setValue(deviceSetting.pollingEnabled)
                                .onChange(async (value) => {
                                    deviceSetting.pollingEnabled = value;
                                    await this.plugin.saveSettings();
                                    this.updateBridgeConfig();
                                    this.display();
                                })
                            );


                        if (deviceSetting.pollingEnabled) {
                            new Setting(devDiv)
                                .setName("Polls per second")
                                .addText(text => text
                                    .setValue(deviceSetting.pollsPerSecond.toString())
                                    .onChange(async (value) => {
                                        const val = parseFloat(value);
                                        if (!isNaN(val)) {
                                            deviceSetting.pollsPerSecond = val;
                                            await this.plugin.saveSettings();
                                            this.updateBridgeConfig();
                                        }
                                    })
                                );
                        }

                        // Mapping settings
                        new Setting(devDiv)
                            .setName("Enable value mapping")
                            .setDesc("Map all raw device values to a user-defined range.")
                            .addToggle(toggle => toggle
                                .setValue(!!deviceSetting.mapEnabled)
                                .onChange(async (value) => {
                                    deviceSetting.mapEnabled = value;
                                    await this.plugin.saveSettings();
                                    this.updateBridgeConfig();
                                    this.display();
                                })
                            );

                        if (deviceSetting.mapEnabled) {
                            new Setting(devDiv)
                                .setName("Mapped range")
                                .setDesc("Set the target min and max values for mapping.")
                                .addText(text => text
                                    .setPlaceholder("Min (eg 0)")
                                    .setValue(deviceSetting.mapMin?.toString() ?? "0")
                                    .onChange(async (value) => {
                                        const val = parseFloat(value);
                                        if (!isNaN(val)) {
                                            deviceSetting.mapMin = val;
                                            await this.plugin.saveSettings();
                                            this.updateBridgeConfig();
                                        }
                                    })
                                )
                                .addText(text => text
                                    .setPlaceholder("Max (eg 1)")
                                    .setValue(deviceSetting.mapMax?.toString() ?? "1")
                                    .onChange(async (value) => {
                                        const val = parseFloat(value);
                                        if (!isNaN(val)) {
                                            deviceSetting.mapMax = val;
                                            await this.plugin.saveSettings();
                                            this.updateBridgeConfig();
                                        }
                                    })
                                );
                        }

                        new Setting(devDiv)
                            .setName("Enable console logging")
                            .setDesc("Log incoming UVC data for this device to the Obsidian console.")
                            .addToggle(toggle => toggle
                                .setValue(!!deviceSetting.consoleLogEnabled)
                                .onChange(async (value) => {
                                    deviceSetting.consoleLogEnabled = value;
                                    await this.plugin.saveSettings();
                                })
                            );
                    }
                });
            }
        }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in UVC section", e);
        }
        // #endregion

        // #region Audio Settings
        try {
            const audioSection = this.createSection(containerEl, "Audio Input Devices", "audio_devices");

            if (this.plugin.audioManager) {
                new Setting(audioSection)
                    .setName("Audio input devices")
                    .setHeading();

                audioSection.createEl("p", { text: "Add audio inputs (microphones, etc) and transform via fft." });

            void (async () => {
                const audioInputs = await this.plugin.audioManager.getDevices();
                const inputOptions: Record<string, string> = { "": "Select device" };
                audioInputs.forEach(d => {
                    inputOptions[d.deviceId] = d.label || `Device ${d.deviceId.slice(0, 5)}...`;
                });

                this.plugin.settings.audioDevices.forEach((device, index) => {
                    const deviceDiv = audioSection.createDiv();
                    deviceDiv.setCssProps({
                        'border': '1px solid var(--background-modifier-border)',
                        'padding': '10px',
                        'margin-bottom': '10px',
                        'border-radius': '5px'
                    });

                    new Setting(deviceDiv)
                        .setName(`Audio Device ${index + 1}`)
                        .setHeading();

                    new Setting(deviceDiv)
                        .setName("Device name (WebSocket channel)")
                        .setDesc("Unique name used as the WebSocket channel name (eg 'vocals'); enable auto-connect on load")
                        .addText(text => text
                            .setValue(device.name)
                            .onChange(async (value) => {
                                this.plugin.settings.audioDevices[index].name = value;
                                await this.plugin.saveSettings();
                            })
                        )
                        .addButton(btn => btn
                            .setButtonText("Connect")
                            .onClick(() => {
                                void this.plugin.audioManager.connectDevice(this.plugin.settings.audioDevices[index]);
                            })
                        )
                        .addToggle(toggle => toggle
                            .setTooltip("Auto-start on plugin load")
                            .setValue(device.autoStart || false)
                            .onChange(async (value) => {
                                this.plugin.settings.audioDevices[index].autoStart = value;
                                await this.plugin.saveSettings();
                            })
                        );

                    new Setting(deviceDiv)
                        .setName("Input device")
                        .addDropdown(dropdown => dropdown
                            .addOptions(inputOptions)
                            .setValue(device.deviceId)
                            .onChange(async (value) => {
                                this.plugin.settings.audioDevices[index].deviceId = value;
                                await this.plugin.saveSettings();
                            })
                        );

                    new Setting(deviceDiv)
                        .setName("Enable fft")
                        .setDesc("Transform audio into frequency data")
                        .addToggle(toggle => toggle
                            .setValue(device.fftEnabled)
                            .onChange(async (value) => {
                                this.plugin.settings.audioDevices[index].fftEnabled = value;
                                await this.plugin.saveSettings();
                                this.display();
                            })
                        );

                    if (device.fftEnabled) {
                        new Setting(deviceDiv)
                            .setName("Fft size")
                            .setDesc("Must be power of 2 (e.g. 2048, 4096)")
                            .addText(text => text
                                .setValue(device.fftSize ? device.fftSize.toString() : "2048")
                                .onChange(async (value) => {
                                    const val = parseInt(value);
                                    if (!isNaN(val)) {
                                        this.plugin.settings.audioDevices[index].fftSize = val;
                                        await this.plugin.saveSettings();
                                    }
                                })
                            );

                        new Setting(deviceDiv)
                            .setName("Smoothing (0-1)")
                            .setDesc("Time constant for smoothing")
                            .addText(text => text
                                .setValue(device.smoothingTimeConstant !== undefined ? device.smoothingTimeConstant.toString() : "0.8")
                                .onChange(async (value) => {
                                    const val = parseFloat(value);
                                    if (!isNaN(val) && val >= 0 && val < 1) {
                                        this.plugin.settings.audioDevices[index].smoothingTimeConstant = val;
                                        await this.plugin.saveSettings();
                                    }
                                })
                            );
                    }

                    new Setting(deviceDiv)
                        .setName("Enable console logging")
                        .setDesc("Log incoming FFT/STT data to the Obsidian console")
                        .addToggle(toggle => toggle
                            .setValue(device.consoleLogEnabled || false)
                            .onChange(async (value) => {
                                this.plugin.settings.audioDevices[index].consoleLogEnabled = value;
                                await this.plugin.saveSettings();
                            })
                        );

                    new Setting(deviceDiv)
                        .addButton(btn => btn
                            .setButtonText("Remove device")
                            .setWarning()
                            .onClick(async () => {
                                this.plugin.audioManager.disconnectDevice(device.name);
                                this.plugin.settings.audioDevices.splice(index, 1);
                                await this.plugin.saveSettings();
                                this.display();
                            })
                        );
                });

                new Setting(audioSection)
                    .setName("Add new audio device")
                    .addButton(btn => btn
                        .setButtonText("Add device")
                        .setCta()
                        .onClick(async () => {
                            this.plugin.settings.audioDevices.push({
                                name: "NewMic",
                                deviceId: "",
                                sampleRate: 44100,
                                fftSize: 2048,
                                smoothingTimeConstant: 0.8,
                                fftEnabled: true,
                                sttEnabled: false
                            });
                            await this.plugin.saveSettings();
                            this.display();
                        })
                    );

            })();
            }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Audio section", e);
        }
        // #endregion
        // #endregion

        // #region Speech to Text Settings
        try {
            const sttSection = this.createSection(containerEl, "Speech to Text", "stt_settings");
            
            new Setting(sttSection)
                .setName("STT channel name")
                .setDesc("The WebSocket channel name to broadcast transcriptions on")
                .addText(text => text
                    .setValue(this.plugin.settings.sttChannelName || "stt_broadcast")
                    .onChange(async (value) => {
                        this.plugin.settings.sttChannelName = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(sttSection)
                .setName("Enable console logging")
                .setDesc("Log incoming transcriptions to the Obsidian console")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.sttConsoleLogEnabled || false)
                    .onChange(async (value) => {
                        this.plugin.settings.sttConsoleLogEnabled = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(sttSection)
                .setName("Speech to text transcriber")
                .setDesc("Open the speech to text transcriber in your default browser. Transcription results will be sent to the channel above.")
                .addButton(btn => btn
                    .setButtonText("Open transcriber")
                    .setCta()
                    .onClick(() => {
                        const port = this.plugin.settings.serverPort;
                        const channel = this.plugin.settings.sttChannelName || "stt_broadcast";
                        const url = `http://127.0.0.1:${port}/apps/speech-to-text/stt_transcriber.html?channel=${encodeURIComponent(channel)}`;
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-extraneous-dependencies
                            const { shell } = require('electron');
                            void shell.openExternal(url);
                        } catch {
                            window.open(url);
                        }
                    })
                );
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in STT section", e);
        }
        // #endregion

        // #region Apple Shortcuts Settings
        try {
            const shortcutsSection = this.createSection(containerEl, "Apple Shortcuts", "apple_shortcuts");

            new Setting(shortcutsSection)
                .setName("Enable Shortcuts bridge")
                .setDesc("Allow web overlays to trigger Apple Shortcuts via the API.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.appleShortcutsEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.appleShortcutsEnabled = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(shortcutsSection)
                .setName("Apple Shortcuts bridge")
                .setDesc("Trigger Apple Shortcuts from web overlays via the CLI. Results are published to 'shortcuts_callback'.")
                .setHeading();

            new Setting(shortcutsSection)
                .setName("Enable console logging")
                .setDesc("Log shortcut execution and callbacks to the Obsidian console and show notices.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.appleShortcutsLoggingEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.appleShortcutsLoggingEnabled = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(shortcutsSection)
                .setName("Open Shortcuts utility")
                .setDesc("Open the test page to trigger and monitor shortcuts.")
                .addButton(btn => btn
                    .setButtonText("Open utility")
                    .setCta()
                    .onClick(() => {
                        const port = this.plugin.settings.serverPort;
                        const url = `http://127.0.0.1:${port}/apps/apple_shortcuts/shortcuts_test.html`;
                        try {
                            const { shell } = require('electron');
                            void shell.openExternal(url);
                        } catch {
                            window.open(url);
                        }
                    })
                );
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Apple Shortcuts section", e);
        }
        // #endregion

        // #region Gamepad Settings
        try {
            const gamepadSection = this.createSection(containerEl, "Gamepad Devices", "gamepad_devices");

        new Setting(gamepadSection)
            .setName("Gamepad devices")
            .setHeading();

        new Setting(gamepadSection)
            .setDesc("Manage connected gamepads and map them to WebSocket channels. Use the gamepad input app to broadcast data.")
            .addButton(btn => btn
                .setButtonText("Refresh gamepads")
                .onClick(() => {
                    console.warn("[Settings] Manual gamepad refresh requested");
                    this.display();
                })
            );

        const connectedGamepads = navigator.getGamepads();
        let hasConnectedGamepad = false;

        // Process connected gamepads
        for (let i = 0; i < connectedGamepads.length; i++) {
            const gp = connectedGamepads[i];
            if (!gp) continue;
            hasConnectedGamepad = true;

            let deviceSetting = this.plugin.settings.gamepadDevices.find(d => d.index === gp.index);
            if (!deviceSetting) {
                deviceSetting = {
                    name: gp.id.replace(/\s+/g, '_').toLowerCase(),
                    index: gp.index,
                    enabled: false
                };
                this.plugin.settings.gamepadDevices.push(deviceSetting);
                void this.plugin.saveSettings();
            }

            const deviceDiv = gamepadSection.createDiv();
            deviceDiv.setCssProps({
                'border': '1px solid var(--background-modifier-border)',
                'padding': '10px',
                'margin-bottom': '10px',
                'border-radius': '5px'
            });

            new Setting(deviceDiv)
                .setName(`Gamepad ${gp.index}: ${gp.id}`)
                .setHeading();

            new Setting(deviceDiv)
                .setName("Enable broadcasting")
                .setDesc("Allow this controller to send data to WebSocket")
                .addToggle(toggle => toggle
                    .setValue(deviceSetting.enabled)
                    .onChange(async (value) => {
                        deviceSetting.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

            if (deviceSetting.enabled) {
                new Setting(deviceDiv)
                    .setName("Channel name")
                    .setDesc("Channel: gamepad_in_{name}")
                    .addText(text => text
                        .setValue(deviceSetting.name)
                        .onChange(async (value) => {
                            deviceSetting.name = value;
                            await this.plugin.saveSettings();
                        })
                    );
            }

        new Setting(deviceDiv)
            .setName("Enable console logging")
            .setDesc("Log incoming gamepad data to the Obsidian console for debugging.")
            .addToggle(toggle => toggle
                .setValue(!!deviceSetting.consoleLogEnabled)
                .onChange(async (value) => {
                    deviceSetting.consoleLogEnabled = value;
                    await this.plugin.saveSettings();
                })
            );
        }

        if (!hasConnectedGamepad) {
            gamepadSection.createEl("p", {
                text: "No gamepads detected. Press a button on your controller to wake it up.",
                cls: "text-muted"
            });
        }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Gamepad section", e);
        }
        // #endregion

        // #region MediaPipe Settings
        try {
            const mediapipeSection = this.createSection(containerEl, "Mediapipe Vision Tasks", "mediapipe_tasks");

        new Setting(mediapipeSection)
            .setName("Mediapipe vision tasks")
            .setHeading();

        if (!this.plugin.isObsConnected) {
            mediapipeSection.createEl("p", {
                text: "Mediapipe requires an active obs websocket connection. Please connect to obs above first.",
                cls: "text-muted"
            });
        } else {
            mediapipeSection.createEl("p", { text: "Process obs screenshots with mediapipe (face, hand, pose) and broadcast results." });

            const sourceOptions: Record<string, string> = { "": "Select source" };
            this.plugin.settings.all_sources.forEach(s => sourceOptions[s] = s);

            this.plugin.settings.mediapipeDevices.forEach((device, index) => {
                const deviceDiv = mediapipeSection.createDiv();
                deviceDiv.setCssProps({
                    'border': '1px solid var(--background-modifier-border)',
                    'padding': '10px',
                    'margin-bottom': '10px',
                    'border-radius': '5px'
                });

                new Setting(deviceDiv)
                    .setName(`Vision Task ${index + 1}`)
                    .setHeading();

                new Setting(deviceDiv)
                    .setName("Task name (channel)")
                    .setDesc("Results on channel: mediapipe_{name}")
                    .addText(text => text
                        .setValue(device.name)
                        .onChange(async (value) => {
                            this.plugin.settings.mediapipeDevices[index].name = value;
                            await this.plugin.saveSettings();
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText("Start task")
                        .onClick(() => {
                            void this.plugin.mediapipeManager.startTask(this.plugin.settings.mediapipeDevices[index]);
                        })
                    )
                    .addToggle(toggle => toggle
                        .setTooltip("Auto-start on plugin load")
                        .setValue(device.autoStart || false)
                        .onChange(async (value) => {
                            this.plugin.settings.mediapipeDevices[index].autoStart = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Task type")
                    .addDropdown(dropdown => dropdown
                        .addOptions({
                            'face': 'Face Landmarker',
                            'hand': 'Hand Landmarker',
                            'pose': 'Pose Landmarker'
                        })
                        .setValue(device.type)
                        .onChange(async (value: 'face' | 'hand' | 'pose') => {
                            this.plugin.settings.mediapipeDevices[index].type = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Obs source")
                    .addDropdown(dropdown => dropdown
                        .addOptions(sourceOptions)
                        .setValue(device.sourceName)
                        .onChange(async (value) => {
                            this.plugin.settings.mediapipeDevices[index].sourceName = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Frames per second")
                    .addText(text => text
                        .setValue(device.fps.toString())
                        .onChange(async (value) => {
                            const val = parseFloat(value);
                            if (!isNaN(val)) {
                                this.plugin.settings.mediapipeDevices[index].fps = val;
                                await this.plugin.saveSettings();
                            }
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Screenshot width")
                    .setDesc("Input width for mediapipe (lower is faster)")
                    .addText(text => text
                        .setValue(device.width.toString())
                        .onChange(async (value) => {
                            const val = parseInt(value);
                            if (!isNaN(val)) {
                                this.plugin.settings.mediapipeDevices[index].width = val;
                                await this.plugin.saveSettings();
                            }
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Enabled")
                    .addToggle(toggle => toggle
                        .setValue(device.enabled)
                        .onChange(async (value) => {
                            this.plugin.settings.mediapipeDevices[index].enabled = value;
                            await this.plugin.saveSettings();
                            if (!value) {
                                this.plugin.mediapipeManager.stopTask(device.name);
                            }
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Enable console logging")
                    .setDesc("Log processed landmarks to the Obsidian console")
                    .addToggle(toggle => toggle
                        .setValue(device.consoleLogEnabled || false)
                        .onChange(async (value) => {
                            this.plugin.settings.mediapipeDevices[index].consoleLogEnabled = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Remove task")
                        .setWarning()
                        .onClick(async () => {
                            this.plugin.mediapipeManager.stopTask(device.name);
                            this.plugin.settings.mediapipeDevices.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        })
                    );
            });

            new Setting(mediapipeSection)
                .setName("Add new vision task")
                .addButton(btn => btn
                    .setButtonText("Add task")
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.mediapipeDevices.push({
                            name: "MyVisionTask",
                            type: "face",
                            sourceName: "",
                            fps: 1,
                            width: 200,
                            enabled: false,
                            autoStart: false
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    })
                )
                .addButton(btn => btn
                    .setButtonText("Refresh sources")
                    .onClick(async () => {
                        await this.plugin.getObsTags();
                        this.display();
                    })
                );
        }
        } catch (e) {
            console.error("[SlidesStudioSettings] Error in Mediapipe section", e);
        }
        // #endregion
        // #endregion
    }
}
