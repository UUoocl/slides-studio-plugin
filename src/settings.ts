import { App, Platform, PluginSettingTab, Setting, Notice, FileSystemAdapter, TFolder, TFile } from "obsidian";
import type slidesStudioPlugin from "./main";
import { ServerManager } from "./utils/serverLogic";

export class slidesStudioSettingsTab extends PluginSettingTab {
    plugin: slidesStudioPlugin;

    constructor(app: App, plugin: slidesStudioPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        // #region Settings Manager
        new Setting(containerEl)
            .setName("Settings manager")
            .setHeading();

        const allFolders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder) as TFolder[];
        
        const settingsFolderOptions: Record<string, string> = { "": "Select a folder" };
        allFolders.forEach(f => settingsFolderOptions[f.path] = f.path);

        new Setting(containerEl)
            .setName("Settings folder")
            .setDesc("Select folder to save/load settings")
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
                .setName("Settings file")
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
                    .setButtonText("Save settings")
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
                                    new Notice(`Settings saved to ${filePath}`);
                                } else {
                                    await this.app.vault.create(filePath, content);
                                    new Notice(`Settings saved to new file ${filePath}`);
                                }
                            } catch (error) {
                                new Notice("Error saving settings: " + error);
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
                                    const loadedSettings = JSON.parse(content);
                                    
                                    // Merge loaded settings but preserve current settingsFolder/File to avoid confusion? 
                                    // User probably wants to load EVERYTHING including device setups.
                                    // Let's just load everything.
                                    Object.assign(this.plugin.settings, loadedSettings);
                                    
                                    // Ensure these are kept consistent with what was just used to load, 
                                    // unless we explicitly want the loaded file to override where we save next.
                                    // Usually "Load" implies "State Restore", so we take what's in the file.
                                    
                                    await this.plugin.saveSettings();
                                    this.plugin.onunload(); // Restart services
                                    this.plugin.onload();   // Restart services
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
            .setName("Web Server")
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
            new Setting(containerEl)
                .setName("Server port")
                .setDesc("Port for the plugin server")
                .addText((text) => {
                    text.setValue(this.plugin.settings.serverPort)
                        .onChange(async (value) => {
                            this.plugin.settings.serverPort = value;
                            await this.plugin.saveSettings();
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
        }
        // #endregion

        // #region Obs WSS Settings
        new Setting(containerEl)
            .setName("Obs websocket server")
            .setHeading();
        
        new Setting(containerEl)
            .setName("Obs websocket server IP")
            .setDesc("Enter 'localhost'")
            .addText((item) => {
                item.setValue(this.plugin.settings.websocketIP_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketIP_Text = value;
                        void this.plugin.saveSettings();
                    });
            });
            
        new Setting(containerEl)
            .setName("Obs websocket server port")
            .addText((item) => {
                item.setValue(this.plugin.settings.websocketPort_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketPort_Text = value;
                        void this.plugin.saveSettings();
                    });
            });
            
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
        
        new Setting(containerEl)
            .setName("Obs browser source debug port")
            .setDesc("Enter a port for the remote debugger or leave blank to skip")
            .addText((item) => {
                item.setValue(this.plugin.settings.obsDebugPort_Text).onChange(
                    (value) => {
                        this.plugin.settings.obsDebugPort_Text = value;
                        void this.plugin.saveSettings();
                    });
            });
                    
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

        // #region Cables.gl Settings
        new Setting(containerEl)
            .setName("Cables.gl Standalone")
            .setHeading();

        const folders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder) as TFolder[];
        
        const folderOptions: Record<string, string> = { "": "Select a folder" };
        folders.forEach(f => folderOptions[f.path] = f.path);

        new Setting(containerEl)
            .setName("Cables folder")
            .setDesc("Select the folder containing cables files")
            .addDropdown(dropdown => dropdown
                .addOptions(folderOptions)
                .setValue(this.plugin.settings.cablesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.cablesFolder = value;
                    await this.plugin.saveSettings();
                    this.display(); 
                })
            );

        if (this.plugin.settings.cablesFolder) {
            containerEl.createEl("h4", { text: "Manage cables files" });
            
            const allFiles = this.app.vault.getFiles()
                .filter(f => f.path.startsWith(this.plugin.settings.cablesFolder));
            
            const fileOptions: Record<string, string> = { "": "Select a file to add" };
            allFiles.forEach(f => fileOptions[f.path] = f.name);

            let selectedFileToAdd = "";

            new Setting(containerEl)
                .setName("Add file")
                .setDesc("Select a file and click add")
                .addDropdown(dropdown => dropdown
                    .addOptions(fileOptions)
                    .onChange((value) => {
                        selectedFileToAdd = value;
                    })
                )
                .addButton(btn => btn
                    .setButtonText("Add")
                    .setCta()
                    .onClick(async () => {
                        if (selectedFileToAdd && !this.plugin.settings.cablesFiles.includes(selectedFileToAdd)) {
                            this.plugin.settings.cablesFiles.push(selectedFileToAdd);
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    })
                );

            if (this.plugin.settings.cablesFiles.length > 0) {
                 containerEl.createEl("h5", { text: "Selected files:" });
                 
                 this.plugin.settings.cablesFiles.forEach((filePath, index) => {
                     const file = this.app.vault.getAbstractFileByPath(filePath);
                     const fileName = file ? file.name : filePath;

                     new Setting(containerEl)
                        .setName(fileName)
                        .setDesc(filePath)
                        .addButton(btn => btn
                            .setButtonText("Remove")
                            .setWarning()
                            .onClick(async () => {
                                this.plugin.settings.cablesFiles.splice(index, 1);
                                await this.plugin.saveSettings();
                                this.display();
                            })
                        );
                 });
            }

            new Setting(containerEl)
                .setName("Open cables")
                .setDesc("Open all selected cables files")
                .addButton(btn => btn
                    .setButtonText("Open")
                    .setCta()
                    .onClick(() => {
                        const vaultName = this.app.vault.getName();
                        if (this.plugin.settings.cablesFiles && this.plugin.settings.cablesFiles.length > 0) {
                             this.plugin.settings.cablesFiles.forEach(file => {
                                const encodedVault = encodeURIComponent(vaultName);
                                const encodedFile = encodeURIComponent(file);
                                const uri = `obsidian://open?vault=${encodedVault}&file=${encodedFile}`;
                                window.open(uri);
                            });
                        } else {
                            new Notice("No cables files selected.");
                        }
                    })
                );
        }
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
                .setDesc("Enter the IP address or 'localhost'")
                .addText(text => text
                    .setValue(device.ip)
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].ip = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(deviceDiv)
                .setName("Osc incoming port")
                .addText(text => text
                    .setValue(device.inPort.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].inPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(deviceDiv)
                .setName("Osc outgoing port")
                .addText(text => text
                    .setValue(device.outPort.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.oscDevices[index].outPort = parseInt(value) || 0;
                        await this.plugin.saveSettings();
                    })
                );

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
                        outPort: 9000
                    });
                    await this.plugin.saveSettings();
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

            new Setting(containerEl)
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
        // #endregion
    }
}