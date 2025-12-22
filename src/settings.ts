import slidesStudioPlugin from "src/main";
import { App, Platform, PluginSettingTab, Setting, Notice } from "obsidian";
import { ServerManager } from 'src/utils/serverLogic';

export class slidesStudioSettingsTab extends PluginSettingTab {
    plugin: slidesStudioPlugin;

    constructor(app: App, plugin: slidesStudioPlugin){
        super(app,plugin);
        this.plugin = plugin;
    } 

    display(){
        const { containerEl } = this;
        containerEl.empty();

        // #region Server Settings
        new Setting(containerEl)
            .setName("Plugin server")
            .setHeading();

        // ✅ Display Controls always
        new Setting(containerEl)
            .setName("Enable plugin server")
            .setDesc("Start the plugin server to host the studio view.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.serverEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.serverEnabled = value;
                    await this.plugin.saveSettings();
                    
                    if(value) {
                            const port = parseInt(this.plugin.settings.serverPort) || 57000;
                            if(!this.plugin.serverManager) {
                                this.plugin.serverManager = new ServerManager(this.plugin.app, port);
                            }
                            void this.plugin.serverManager.start();
                    } else {
                        if(this.plugin.serverManager) {
                            void this.plugin.serverManager.stop();
                            this.plugin.serverManager = null;
                        }
                    }
                    // Refresh to show/hide port option
                    this.display();
                })
            );

        if (this.plugin.settings.serverEnabled) {
            new Setting(containerEl)
                .setName("Server port")
                .setDesc("Port for the plugin server ")
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

        // #region OBS WSS Settings
        new Setting(containerEl)
        .setName("Obs websocket server")
        .setHeading()
        
        new Setting(containerEl)
        .setName("Obs websocket server IP")
        .setDesc("Enter 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.websocketIP_Text).onChange(
                (value) => {
                    this.plugin.settings.websocketIP_Text = value;
                    void this.plugin.saveSettings()
                })
            });
            
        new Setting(containerEl)
        .setName("Obs websocket server port")
        .addText((item) => {
            item.setValue(this.plugin.settings.websocketPort_Text).onChange(
                (value) => {
                    this.plugin.settings.websocketPort_Text = value;
                    void this.plugin.saveSettings()
                })
            });
            
            new Setting(containerEl)
            .setName("Obs websocket server password")
            .addText((item) => {
                item.inputEl.type = 'password';
                item.setValue(this.plugin.settings.websocketPW_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketPW_Text = value;
                        void this.plugin.saveSettings()
                    })
                }); 
        // #endregion
                    
        // #region OBS Launch Parameters
        
        new Setting(containerEl)
                .setName("Obs launch parameters")
                .setHeading()
                .setDesc("Open obs with these options.")
                
                if(Platform.isMacOS){
                    new Setting(containerEl)
                    .setName("Name")
                    .setDesc("Enter 'obs' or a custom name")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppName_Text = value;
                                void this.plugin.saveSettings()
                            })
                        });
                    }
                
                if(Platform.isWin){
                    new Setting(containerEl)
                    .setName("Name")
                    .setDesc("Enter 'obs64.exe' or a custom name")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppName_Text = value;
                                void this.plugin.saveSettings()
                            })
                        });
        
                    new Setting(containerEl)
                    .setName("Path to obs app")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppPath_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppPath_Text = value;
                                void this.plugin.saveSettings()
                            })
                        });
                    }
        
                new Setting(containerEl)
                .setName("Collection")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsCollection_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsCollection_Text = value;
                            void this.plugin.saveSettings()
                    })
                });

                //path to obs collection json file
                let collectionPath = this.app.vault.adapter.basePath;
                collectionPath += `/${this.plugin.manifest.dir}/obs_collections/SlidesStudio.json`;
                collectionPath = Platform.isWin ? collectionPath.replace(/\//g, '\\') : collectionPath;

                new Setting(containerEl)
                .setName("Obs collection")
                .setDesc("Copy the path to the slide studio collection, and import the collection in obs")
                .addText((item) => {
                    item.setValue(collectionPath)
                    .setDisabled(true)
                });
        
                new Setting(containerEl)
                .setName("Obs browser source debug port")
                .setDesc("Enter a port for the remote debugger, or leave blank to skip this option")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsDebugPort_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsDebugPort_Text = value;
                            void this.plugin.saveSettings()
                        })
                    });
                    
                new Setting(containerEl)
                .setName("Open obs")
                .addButton((button) => {
                    button.setButtonText("Launch")
                    .onClick(() => { 
                        this.app.commands.executeCommandById('slides-studio:open-obs')
                    })
                })

                new Setting(containerEl)
                .setName("Connect to obs websocket server")
                .addButton((button) => {
                    const isConnected = this.plugin.isObsConnected;
                    
                    button.setButtonText(isConnected ? "Connected" : "Connect")
                    .onClick(() => {
                        this.app.commands.executeCommandById('slides-studio:connect-to-obs-websocket');
                        setTimeout(() => this.display(), 1000);
                    });

                    if(isConnected) {
                        button.setCta();
                        button.buttonEl.setCssProps({'background-color': 'green'})
                        button.buttonEl.setCssProps({'border-color': 'green'})
                        button.buttonEl.setCssProps({'color': 'white'})
                    }
                })
        // #endregion    

        // #region OSC Settings
        
        
        if (this.plugin.isObsConnected) {
            new Setting(containerEl)
                .setName("Osc devices")
                .setHeading()

            containerEl.createEl("p", { text: "Add as many osc devices as needed." });


            this.plugin.settings.oscDevices.forEach((device, index) => {
                const deviceDiv = containerEl.createDiv();
                deviceDiv.setCssProps({'border' : '1px solid var(--background-modifier-border)'});
                deviceDiv.setCssProps({'padding' : '10px'});
                deviceDiv.setCssProps({'marginBottom' : '10px'});
                deviceDiv.setCssProps({'border-radius' : '5px'});

                new Setting(deviceDiv)
                    .setName(`Device ${index + 1}`)
                    .setHeading();

                new Setting(deviceDiv)
                    .setName("Osc device name")
                    .setDesc("Unique device name (used in obs tags)")
                    .addText(text => text
                        .setValue(device.name)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].name = value;
                            await this.plugin.saveSettings();
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText("Connect this device")
                        .onClick(() => {
                            if(this.plugin.oscManager){
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
                    .setName("Osc incoming message port")
                    .addText(text => text
                        .setValue(device.inPort)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].inPort = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("Osc outgoing message port")
                    .addText(text => text
                        .setValue(device.outPort)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].outPort = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Remove device")
                        .setWarning()
                        .onClick(async () => {
                            if(this.plugin.oscManager){
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
                            inPort: "8000",
                            outPort: "9000"
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

        } else {
            const msgDiv = containerEl.createDiv();
            msgDiv.setCssProps({'padding': '20px'});
            msgDiv.setCssProps({'border': '1px dashed var(--text-muted)'});
            msgDiv.setCssProps({'text-Align': 'center'});
            msgDiv.setCssProps({'color': 'var(--text-muted)'});
            msgDiv.createSpan({ text: "Please connect to the OBS WebSocket Server (above) to configure OSC/MIDI devices." });
        }
        // #endregion end OSC Settings

        // #region MIDI Settings
        
        if (this.plugin.isObsConnected) {
            new Setting(containerEl)
                .setName("Midi devices")
                .setHeading();
            
            containerEl.createEl("p", { text: "Add midi inputs and outputs." });

            if (this.plugin.midiManager) {
                const availableInputs = this.plugin.midiManager.getInputs();
                const availableOutputs = this.plugin.midiManager.getOutputs();

                this.plugin.settings.midiDevices.forEach((device, index) => {
                    const deviceDiv = containerEl.createDiv();
                    deviceDiv.setCssProps({'border': '1px solid var(--background-modifier-border)'})
                    deviceDiv.setCssProps({'padding': '10px'})
                    deviceDiv.setCssProps({'margin-button': '10px'})
                    deviceDiv.setCssProps({'border-radius': '5px'})

                new Setting(deviceDiv)
                    .setName(`MIDI Device ${index + 1}`)
                    .setHeading();

                new Setting(deviceDiv)
                    .setName("Device name")
                    .setDesc("Alias used for obs tags")
                    .addText(text => text
                        .setValue(device.name)
                        .onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].name = value;
                            await this.plugin.saveSettings();
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
                    .setDesc("Device -> plugin")
                    .addDropdown(dropdown => {
                        dropdown.addOption("", "Select input");
                        availableInputs.forEach(input => void dropdown.addOption(input, input));
                        dropdown.setValue(device.inputName);
                        dropdown.onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].inputName = value;
                            await this.plugin.saveSettings();
                        });
                    });

                new Setting(deviceDiv)
                    .setName("Output device")
                    .setDesc("Plugin -> device ")
                    .addDropdown(dropdown => {
                        dropdown.addOption("", "Select output");
                        availableOutputs.forEach(output => void dropdown.addOption(output, output));
                        dropdown.setValue(device.outputName);
                        dropdown.onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].outputName = value;
                            await this.plugin.saveSettings();
                        });
                    });

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Remove midi device")
                        .setWarning()
                        .onClick(async () => {
                            if(this.plugin.midiManager){
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
            }
            // #endregion
        }
    }