import { App, Platform, PluginSettingTab, Setting, Notice, FileSystemAdapter, TFolder, TFile } from "obsidian";
import type slidesStudioPlugin from "./main";
import { ServerManager } from "./utils/serverLogic";
import { SlidesStudioPluginSettings } from "./types";
import { exec } from "child_process";
import * as net from "net";

export class slidesStudioSettingsTab extends PluginSettingTab {
    plugin: slidesStudioPlugin;
    private pythonStatusEl: HTMLElement;

    constructor(app: App, plugin: slidesStudioPlugin) {
        super(app, plugin);
        this.plugin = plugin;
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

    display() {
        const { containerEl } = this;
        containerEl.empty();

        // #region Settings Manager
        new Setting(containerEl)
            .setName("Configuration manager")
            .setHeading();

        const allFolders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder);
        
        const settingsFolderOptions: Record<string, string> = { "": "Select a folder" };
        allFolders.forEach(f => settingsFolderOptions[f.path] = f.path);

        new Setting(containerEl)
            .setName("Configurations folder")
            .setDesc("Select folder to save/load configuration")
            .addDropdown(dropdown => dropdown
                .addOptions(settingsFolderOptions)
                .setValue(this.plugin.settings.settingsFolder)
                .onChange(async (value) => {
                    this.plugin.settings.settingsFolder = value;
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        if (this.plugin.settings.settingsFolder) {
            const folderFiles = this.app.vault.getFiles()
                .filter(f => f.path.startsWith(this.plugin.settings.settingsFolder) && f.name.endsWith('.md'));
            
            const fileOptions: Record<string, string> = { "": "Select an existing file (optional)" };
            folderFiles.forEach(f => fileOptions[f.name] = f.name);

            new Setting(containerEl)
                .setName("Configuration file name")
                .setDesc("Select existing or type new file name (ends in .md)")
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
                .addText(text => text
                    .setValue(this.plugin.settings.settingsFile)
                    .onChange(async (value) => {
                        this.plugin.settings.settingsFile = value;
                        await this.plugin.saveSettings();
                    })
                );

             new Setting(containerEl)
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
                                    new Notice(`Configuration saved to ${filePath}`);
                                } else {
                                    await this.app.vault.create(filePath, content);
                                    new Notice(`Configuration saved to new file ${filePath}`);
                                }
                            } catch (error) {
                                new Notice("Error saving configuration: " + error);
                                console.error(error);
                            }
                        } else {
                            new Notice("Please select a folder and file name");
                        }
                    })
                )
                .addButton(btn => btn
                    .setButtonText("Load settings")
                    .setWarning()
                    .onClick(async () => {
                        const { settingsFolder, settingsFile } = this.plugin.settings;
                         if (settingsFolder && settingsFile) {
                            let filePath = `${settingsFolder}/${settingsFile}`;
                            // Handle if user didn't type extension in text box but it was saved with one or selected from dropdown
                            if (!this.app.vault.getAbstractFileByPath(filePath) && this.app.vault.getAbstractFileByPath(filePath + '.md')) {
                                filePath += '.md';
                            }

                            const file = this.app.vault.getAbstractFileByPath(filePath);
                            if (file instanceof TFile) {
                                try {
                                    const content = await this.app.vault.read(file);
                                    const loadedSettings = JSON.parse(content) as SlidesStudioPluginSettings;
                                    
                                    // Merge loaded settings but preserve current settingsFolder/File to avoid confusion? 
                                    // User probably wants to load EVERYTHING including device setups.
                                    // Let's just load everything.
                                    Object.assign(this.plugin.settings, loadedSettings);
                                    
                                    // Ensure these are kept consistent with what was just used to load, 
                                    // unless we explicitly want the loaded file to override where we save next.
                                    // Usually "Load" implies "State Restore", so we take what's in the file.
                                    
                                    await this.plugin.saveSettings();
                                    this.plugin.onunload(); // Restart services
                                    await this.plugin.onload();   // Restart services
                                    this.display();
                                    new Notice("Settings loaded successfully");
                                } catch (error) {
                                    new Notice("Error loading settings: " + error);
                                    console.error(error);
                                }
                            } else {
                                new Notice("File not found: " + filePath);
                            }
                         }
                    })
                );
        }
        // #endregion

        // #region Server Settings
        new Setting(containerEl)
            .setName("Web server")
            .setHeading();

        new Setting(containerEl)
            .setName("Enable plugin server")
            .setDesc("Start the plugin server to host the studio view.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.serverEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.serverEnabled = value;
                    await this.plugin.saveSettings();
                    
                    if (value) {
                        const port = parseInt(this.plugin.settings.serverPort) || 57000;
                        if (!this.plugin.serverManager) {
                            // FIX: Added 'this.plugin' as the second argument
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
            const serverPortSetting = new Setting(containerEl)
                .setName("Server port")
                .setDesc("Port for the plugin server")
                .addText((text) => {
                    text.setValue(this.plugin.settings.serverPort)
                        .onChange(async (value) => {
                            this.plugin.settings.serverPort = value;
                            await this.plugin.saveSettings();
                            void this.updatePortStatus(value, serverPortSetting, "Port for the plugin server");
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
            void this.updatePortStatus(this.plugin.settings.serverPort, serverPortSetting, "Port for the plugin server");
        }
        // #endregion

        // #region Obs WSS Settings
        new Setting(containerEl)
            .setName("Obs websocket server")
            .setHeading();
        
        new Setting(containerEl)
            .setName("Obs websocket server IP")
            .setDesc("Enter '127.0.0.1'")
            .addText((item) => {
                item.setValue(this.plugin.settings.websocketIP_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketIP_Text = value;
                        void this.plugin.saveSettings();
                    });
            });
            
        const obsPortSetting = new Setting(containerEl)
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
            
        new Setting(containerEl)
            .setName("Obs websocket server password")
            .addText((item) => {
                item.inputEl.type = 'password';
                item.setValue(this.plugin.settings.websocketPW_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketPW_Text = value;
                        void this.plugin.saveSettings();
                    });
            }); 
        // #endregion
                    
        // #region ObsLaunch Parameters
        new Setting(containerEl)
            .setName("Obs launch parameters")
            .setHeading()
            .setDesc("Open obs with these options.");
                
        if (Platform.isMacOS) {
            new Setting(containerEl)
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
            new Setting(containerEl)
                .setName("Name")
                .setDesc("Enter 'obs64.exe' or a custom name")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsAppName_Text = value;
                            void this.plugin.saveSettings();
                        });
                });
        
            new Setting(containerEl)
                .setName("Path to obs app")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsAppPath_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsAppPath_Text = value;
                            void this.plugin.saveSettings();
                        });
                });
        }
        
        new Setting(containerEl)
            .setName("Collection")
            .addText((item) => {
                item.setValue(this.plugin.settings.obsCollection_Text).onChange(
                    (value) => {
                        this.plugin.settings.obsCollection_Text = value;
                        void this.plugin.saveSettings();
                    });
            });

        // FIX: Use getBasePath() and avoid unsafe member access
        let collectionPath = "";
        if (this.app.vault.adapter instanceof FileSystemAdapter) {
            collectionPath = this.app.vault.adapter.getBasePath();
        }
        collectionPath += `/${this.plugin.manifest.dir}/obs_collections/SlidesStudio.json`;
        collectionPath = Platform.isWin ? collectionPath.replace(/\//g, '\\') : collectionPath;

        new Setting(containerEl)
            .setName("Obs collection")
            .setDesc("Copy the path to the slide studio collection and import the collection in obs")
            .addText((item) => {
                item.setValue(collectionPath)
                    .setDisabled(true);
            });
        
        const obsDebugPortSetting = new Setting(containerEl)
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
                    
        new Setting(containerEl)
            .setName("Open obs")
            .addButton((button) => {
                button.setButtonText("Launch")
                .setCta()
                    .onClick(() => { 
                        void this.app.commands.executeCommandById('slides-studio:open-obs');
                    });
            });

        new Setting(containerEl)
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
        // #endregion    

        // #region osc Settings
        new Setting(containerEl)
            .setName("Osc devices")
            .setHeading();

        containerEl.createEl("p", { text: "Add as many osc devices as needed." });

        this.plugin.settings.oscDevices.forEach((device, index) => {
            const deviceDiv = containerEl.createDiv();
            deviceDiv.setCssProps({
                'border': '1px solid var(--background-modifier-border)',
                'padding': '10px',
                'margin-bottom': '10px',
                'border-radius': '5px'
            });

            new Setting(deviceDiv)
                .setName(`Device ${index + 1}`)
                .setHeading();

            new Setting(deviceDiv)
                .setName("Osc device name")
                .setDesc("Unique device name (used in server sent events)")
                .addText(text => text
                    .setValue(device.name)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].name = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addButton(btn => btn
                    .setButtonText("Connect device")
                    .onClick(() => {
                        if (this.plugin.oscManager) {
                            this.plugin.oscManager.connectDevice(this.plugin.settings.oscDevices[index]);
                        } else {
                            new Notice("Plugin not fully loaded");
                        }
                    })
                );

            new Setting(deviceDiv)
                .setName("Osc IP address")
                .setDesc("Enter the IP address or '127.0.0.1'")
                .addText(text => text
                    .setValue(device.ip)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].ip = value;
                        await this.plugin.saveSettings();
                    })
                );

            const oscInPortSetting = new Setting(deviceDiv)
                .setName("Osc incoming port")
                .setDesc("Port to receive osc messages")
                .addText(text => text
                    .setValue(device.inPort.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].inPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                        void this.updatePortStatus(value, oscInPortSetting, "Port to receive OSC messages");
                    })
                );
            void this.updatePortStatus(device.inPort.toString(), oscInPortSetting, "Port to receive OSC messages");

            new Setting(deviceDiv)
                .setName("Osc outgoing port")
                .addText(text => text
                    .setValue(device.outPort.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].outPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                    })
                );

            const oscWsPortSetting = new Setting(deviceDiv)
                .setName("Osc websocket port")
                .setDesc("Port for websocket communication")
                .addText(text => text
                    .setValue(device.wsPort ? device.wsPort.toString() : "")
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].wsPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                        void this.updatePortStatus(value, oscWsPortSetting, "Port for WebSocket communication");
                    })
                );
            if (device.wsPort) void this.updatePortStatus(device.wsPort.toString(), oscWsPortSetting, "Port for WebSocket communication");

            new Setting(deviceDiv)
                .addButton(btn => btn
                    .setButtonText("Remove device")
                    .setWarning()
                    .onClick(async () => {
                        if (this.plugin.oscManager) {
                            this.plugin.oscManager.disconnectDevice(device.name);
                        }
                        this.plugin.settings.oscDevices.splice(index, 1);
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.serverEnabled && this.plugin.serverManager) {
                            await this.plugin.serverManager.restart(parseInt(this.plugin.settings.serverPort));
                        }
                        this.display();
                    })
                );
        });

        new Setting(containerEl)
            .setName("Add new osc device")
            .addButton(btn => btn
                .setButtonText("Add device")
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.oscDevices.push({
                        name: "NewDevice",
                        ip: "127.0.0.1",
                        inPort: 8000,
                        outPort: 9000,
                        wsPort: 8080
                    });
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.serverEnabled && this.plugin.serverManager) {
                        await this.plugin.serverManager.restart(parseInt(this.plugin.settings.serverPort));
                    }
                    this.display();
                })
            );
        // #endregion

        // #region MIDI Settings
        if (this.plugin.midiManager) {
            new Setting(containerEl)
                .setName("Midi devices")
                .setHeading();
            
            containerEl.createEl("p", { text: "Add midi inputs and outputs." });

            const availableInputs = this.plugin.midiManager.getInputs();
            const availableOutputs = this.plugin.midiManager.getOutputs();

            this.plugin.settings.midiDevices.forEach((device, index) => {
                const deviceDiv = containerEl.createDiv();
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
                    .setDesc("Unique device name (used in server sent events)")
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
                            this.plugin.midiManager.connectDevice(this.plugin.settings.midiDevices[index]);
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
                        // FIX: Removed async
                        dropdown.onChange((value) => {
                            this.plugin.settings.midiDevices[index].outputName = value;
                            void this.plugin.saveSettings();
                        });
                    });

                const midiWsPortSetting = new Setting(deviceDiv)
                    .setName("Midi websocket port")
                    .setDesc("Port for websocket communication")
                    .addText(text => text
                        .setValue(device.wsPort ? device.wsPort.toString() : "")
                        .onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].wsPort = parseInt(value) || 0;
                            await this.plugin.saveSettings();
                            void this.updatePortStatus(value, midiWsPortSetting, "Port for WebSocket communication");
                        })
                    );
                if (device.wsPort) void this.updatePortStatus(device.wsPort.toString(), midiWsPortSetting, "Port for WebSocket communication");

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
                            if (this.plugin.settings.serverEnabled && this.plugin.serverManager) {
                                await this.plugin.serverManager.restart(parseInt(this.plugin.settings.serverPort));
                            }
                            this.display();
                        })
                    );
            });

            new Setting(containerEl)
                .setName("Add new midi device")
                .addButton(btn => btn
                    .setButtonText("Add device")
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.midiDevices.push({
                            name: "MyMidiDevice",
                            inputName: "",
                            outputName: "",
                            wsPort: 59000
                        });
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.serverEnabled && this.plugin.serverManager) {
                            await this.plugin.serverManager.restart(parseInt(this.plugin.settings.serverPort));
                        }
                        this.display();
                    })
                );
        }
        // #endregion

        // #region Mouse Monitor Settings
        new Setting(containerEl)
            .setName("Python installation")
            .setHeading();

        new Setting(containerEl)
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
        
        this.pythonStatusEl = containerEl.createEl("p", { 
            text: "Checking python...",
            cls: "python-status" 
        });
        this.pythonStatusEl.setCssProps({
            'font-size': '0.8em',
            'margin-top': '-10px',
            'margin-bottom': '20px'
        });
        this.validatePythonPath(this.plugin.settings.pythonPath);

        const pythonSocketPortSetting = new Setting(containerEl)
            .setName("Python socket port")
            .setDesc("Port for communication between python and node")
            .addText(text => text
                .setValue(this.plugin.settings.pythonSocketPort)
                .onChange(async (value) => {
                    this.plugin.settings.pythonSocketPort = value;
                    await this.plugin.saveSettings();
                    void this.updatePortStatus(value, pythonSocketPortSetting, "Port for communication between python and node");
                    if (this.plugin.serverManager) {
                        // Restart monitors if port changed
                        if (this.plugin.settings.mouseMonitorEnabled) void this.plugin.serverManager.restartMouseMonitor();
                        if (this.plugin.settings.keyboardMonitorEnabled) void this.plugin.serverManager.restartKeyboardMonitor();
                    }
                })
            );
        void this.updatePortStatus(this.plugin.settings.pythonSocketPort, pythonSocketPortSetting, "Port for communication between python and node");

        new Setting(containerEl)
            .setName("Mouse monitor")
            .setHeading();

        new Setting(containerEl)
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

        new Setting(containerEl)
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
                })
            );

        new Setting(containerEl)
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

        new Setting(containerEl)
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
        // #endregion

        // #region Keyboard Monitor Settings
        new Setting(containerEl)
            .setName("Keyboard monitor")
            .setHeading();

        new Setting(containerEl)
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

        new Setting(containerEl)
            .setName("Show key combinations")
            .setDesc("Display key combinations (eg ctrl + p) instead of single keys.")
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
        // #endregion

        // #region Uvc-util Settings
        new Setting(containerEl)
            .setName("Uvc-util bridge")
            .setHeading();

        new Setting(containerEl)
            .setName("Enable uvc-util bridge")
            .setDesc("Start the uvc-util bridge to control camera settings.")
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
                        new Notice("Server must be enabled to use uvc-util bridge.");
                    }
                })
            );

        new Setting(containerEl)
            .setName("Uvc library path")
            .setDesc("Path to libuvcutil.dylib (relative to plugin directory or absolute)")
            .addText(text => text
                .setValue(this.plugin.settings.uvcUtilLibPath)
                .onChange(async (value) => {
                    this.plugin.settings.uvcUtilLibPath = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.uvcUtilEnabled && this.plugin.serverManager) {
                        void this.plugin.serverManager.restartUvcUtilBridge();
                    }
                })
            );

        const uvcWsPortSetting = new Setting(containerEl)
            .setName("Uvc websocket port")
            .setDesc("Port for websocket communication with browser clients")
            .addText(text => text
                .setValue(this.plugin.settings.uvcWsPort ? this.plugin.settings.uvcWsPort.toString() : "")
                .onChange(async (value) => {
                    this.plugin.settings.uvcWsPort = parseInt(value) || 0;
                    await this.plugin.saveSettings();
                    void this.updatePortStatus(value, uvcWsPortSetting, "Port for WebSocket communication with browser clients");
                    if (this.plugin.settings.serverEnabled && this.plugin.serverManager) {
                        await this.plugin.serverManager.restart(parseInt(this.plugin.settings.serverPort));
                    }
                })
            );
        if (this.plugin.settings.uvcWsPort) void this.updatePortStatus(this.plugin.settings.uvcWsPort.toString(), uvcWsPortSetting, "Port for WebSocket communication with browser clients");
        // #endregion

        // #region Audio Settings
        if (this.plugin.audioManager) {
            new Setting(containerEl)
                .setName("Audio input devices")
                .setHeading();
            
            containerEl.createEl("p", { text: "Add audio inputs (microphones, etc) and transform via fft." });

            void (async () => {
                const audioInputs = await this.plugin.audioManager.getDevices();
                const inputOptions: Record<string, string> = { "": "Select device" };
                audioInputs.forEach(d => {
                    inputOptions[d.deviceId] = d.label || `Device ${d.deviceId.slice(0, 5)}...`;
                });

                this.plugin.settings.audioDevices.forEach((device, index) => {
                    const deviceDiv = containerEl.createDiv();
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
                        .setName("Device name (sse event name)")
                        .setDesc("Unique name used as the sse event name (eg 'vocals')")
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

                new Setting(containerEl)
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
                                smoothingTimeConstant: 0.8
                            });
                            await this.plugin.saveSettings();
                            this.display();
                        })
                    );
            })();
        }
        // #endregion
    }
}
