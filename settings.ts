import slidesStudioPlugin from "main";
import { OscDeviceSetting } from "oscLogic"; 
import { App, Platform, PluginSettingTab, Setting, Notice } from "obsidian";
import { ServerManager } from 'serverLogic';

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
            .setName("Slides Studio Server")
            .setHeading();

        // ✅ Display Controls always
        new Setting(containerEl)
            .setName("Enable Internal Server")
            .setDesc("Start a local Fastify server to host the studio view.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.serverEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.serverEnabled = value;
                    await this.plugin.saveSettings();
                    
                    if(value) {
                            const port = parseInt(this.plugin.settings.serverPort) || 7000;
                            if(!this.plugin.serverManager) {
                                this.plugin.serverManager = new ServerManager(this.plugin.app, port);
                            }
                            this.plugin.serverManager.start();
                    } else {
                        if(this.plugin.serverManager) {
                            this.plugin.serverManager.stop();
                            this.plugin.serverManager = null;
                        }
                    }
                    // Refresh to show/hide port option
                    this.display();
                })
            );

        if (this.plugin.settings.serverEnabled) {
            new Setting(containerEl)
                .setName("Server Port")
                .setDesc("Port for the local Fastify server serving 'slideStudioView.html'")
                .addText((text) => {
                    text.setValue(this.plugin.settings.serverPort)
                    .onChange(async (value) => {
                        this.plugin.settings.serverPort = value;
                        await this.plugin.saveSettings();
                    });
                })
                .addButton(btn => btn
                    .setButtonText("Restart Server")
                    .onClick(() => {
                        const port = parseInt(this.plugin.settings.serverPort);
                        if (this.plugin.serverManager) {
                            this.plugin.serverManager.restart(port);
                        }
                    })
                );
        }
        // #endregion

        // #region OBS WSS Settings
        new Setting(containerEl)
        .setName("OBS WebSocket Server")
        .setHeading()
        
        new Setting(containerEl)
        .setName("OBS WebSocket Server IP")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.websocketIP_Text).onChange(
                (value) => {
                    this.plugin.settings.websocketIP_Text = value;
                    this.plugin.saveSettings()
                })
            });
            
        new Setting(containerEl)
        .setName("OBS WebSocket Server Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.websocketPort_Text).onChange(
                (value) => {
                    this.plugin.settings.websocketPort_Text = value;
                    this.plugin.saveSettings()
                })
            });
            
            new Setting(containerEl)
            .setName("OBS WebSocket Server Password")
            .addText((item) => {
                item.inputEl.type = 'password';
                item.setValue(this.plugin.settings.websocketPW_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketPW_Text = value;
                        this.plugin.saveSettings()
                    })
                }); 
        // #endregion
                    
        // #region OBS Launch Parameters
        
        new Setting(containerEl)
                .setName("OBS Launch Parameters")
                .setHeading()
                .setDesc("Open OBS with these options.")
                
                if(Platform.isMacOS){
                    new Setting(containerEl)
                    .setName("Name")
                    .setDesc("Enter 'OBS' or a custom name")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppName_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppName_Text = value;
                                this.plugin.saveSettings()
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
                                this.plugin.saveSettings()
                            })
                        });
        
                    new Setting(containerEl)
                    .setName("Path to OBS app")
                    .addText((item) => {
                        item.setValue(this.plugin.settings.obsAppPath_Text).onChange(
                            (value) => {
                                this.plugin.settings.obsAppPath_Text = value;
                                this.plugin.saveSettings()
                            })
                        });
                    }
        
                new Setting(containerEl)
                .setName("Collection")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsCollection_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsCollection_Text = value;
                            this.plugin.saveSettings()
                    })
                });

                //path to obs collection json file
                let collectionPath = this.app.vault.adapter.basePath;
                collectionPath += `/${this.app.plugins.plugins['slides-studio'].manifest.dir}/obs_collections/SlidesStudio.json`;
                collectionPath = Platform.isWin ? collectionPath.replace(/\//g, '\\') : collectionPath;

                new Setting(containerEl)
                .setName("Slide Studio Collection")
                .setDesc("Copy the path to the Slide Studio Collection, and Import the collection in OBS")
                .addText((item) => {
                    item.setValue(collectionPath)
                    .setDisabled(true)
                });
        
                new Setting(containerEl)
                .setName("OBS Browser Source Debug Port")
                .setDesc("Enter a Port for the Remote Debugger, or leave blank to skip this option")
                .addText((item) => {
                    item.setValue(this.plugin.settings.obsDebugPort_Text).onChange(
                        (value) => {
                            this.plugin.settings.obsDebugPort_Text = value;
                            this.plugin.saveSettings()
                        })
                    });
                    
                new Setting(containerEl)
                .setName("Open OBS")
                .addButton((button) => {
                    button.setButtonText("Launch")
                    .onClick(() => { 
                        this.app.commands.executeCommandById('slides-studio:open-obs')
                    })
                })

                new Setting(containerEl)
                .setName("Connect to OBS WebSocket Server")
                .addButton((button) => {
                    const isConnected = this.plugin.isObsConnected;
                    
                    button.setButtonText(isConnected ? "Connected" : "Connect")
                    .onClick(() => {
                        this.app.commands.executeCommandById('slides-studio:connect-to-obs-websocket');
                        setTimeout(() => this.display(), 1000);
                    });

                    if(isConnected) {
                        button.setCta();
                        button.buttonEl.style.backgroundColor = "green";
                        button.buttonEl.style.borderColor = "green";
                        button.buttonEl.style.color = "white";
                    }
                })
        // #endregion    

        // #region OSC Settings
        
        
        if (this.plugin.isObsConnected) {
            
            containerEl.createEl("h2", { text: "OSC Devices" });
            containerEl.createEl("p", { text: "Add as many OSC devices as needed." });

            this.plugin.settings.oscDevices.forEach((device, index) => {
                const deviceDiv = containerEl.createDiv();
                deviceDiv.style.border = "1px solid var(--background-modifier-border)";
                deviceDiv.style.padding = "10px";
                deviceDiv.style.marginBottom = "10px";
                deviceDiv.style.borderRadius = "5px";

                new Setting(deviceDiv)
                    .setName(`Device ${index + 1}`)
                    .setHeading();

                new Setting(deviceDiv)
                    .setName("OSC Device Name")
                    .setDesc("Unique device name (used in OBS tags)")
                    .addText(text => text
                        .setValue(device.name)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].name = value;
                            await this.plugin.saveSettings();
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText("Connect This Device")
                        .onClick(() => {
                            if(this.plugin.oscManager){
                                this.plugin.oscManager.connectDevice(this.plugin.settings.oscDevices[index]);
                            } else {
                                new Notice("Plugin not fully loaded");
                            }
                        })
                    );

                new Setting(deviceDiv)
                    .setName("OSC IP address")
                    .setDesc("Enter the IP address or 'localhost'")
                    .addText(text => text
                        .setValue(device.ip)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].ip = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("OSC Incoming Message Port")
                    .addText(text => text
                        .setValue(device.inPort)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].inPort = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .setName("OSC Outgoing Message Port")
                    .addText(text => text
                        .setValue(device.outPort)
                        .onChange(async (value) => {
                            this.plugin.settings.oscDevices[index].outPort = value;
                            await this.plugin.saveSettings();
                        })
                    );

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Remove Device")
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
                .setName("Add New OSC Device")
                .addButton(btn => btn
                    .setButtonText("Add Device")
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
            msgDiv.style.padding = "20px";
            msgDiv.style.border = "1px dashed var(--text-muted)";
            msgDiv.style.textAlign = "center";
            msgDiv.style.color = "var(--text-muted)";
            msgDiv.createSpan({ text: "Please connect to the OBS WebSocket Server (above) to configure OSC/MIDI devices." });
        }
        // #endregion end OSC Settings

        // #region MIDI Settings
        
        if (this.plugin.isObsConnected) {
            containerEl.createEl("h2", { text: "MIDI Devices" });
            containerEl.createEl("p", { text: "Add MIDI inputs and outputs." });

            if (this.plugin.midiManager) {
                const availableInputs = this.plugin.midiManager.getInputs();
                const availableOutputs = this.plugin.midiManager.getOutputs();

                this.plugin.settings.midiDevices.forEach((device, index) => {
                    const deviceDiv = containerEl.createDiv();
                    deviceDiv.style.border = "1px solid var(--background-modifier-border)";
                    deviceDiv.style.padding = "10px";
                    deviceDiv.style.marginBottom = "10px";
                    deviceDiv.style.borderRadius = "5px";

                new Setting(deviceDiv)
                    .setName(`MIDI Device ${index + 1}`)
                    .setHeading();

                new Setting(deviceDiv)
                    .setName("Virtual Name")
                    .setDesc("Alias used for OBS tags")
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
                    .setName("Input Device")
                    .setDesc("Select the hardware source")
                    .addDropdown(dropdown => {
                        dropdown.addOption("", "Select Input");
                        availableInputs.forEach(input => dropdown.addOption(input, input));
                        dropdown.setValue(device.inputName);
                        dropdown.onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].inputName = value;
                            await this.plugin.saveSettings();
                        });
                    });

                new Setting(deviceDiv)
                    .setName("Output Device")
                    .setDesc("Select the hardware destination (for sending from OBS)")
                    .addDropdown(dropdown => {
                        dropdown.addOption("", "Select Output");
                        availableOutputs.forEach(output => dropdown.addOption(output, output));
                        dropdown.setValue(device.outputName);
                        dropdown.onChange(async (value) => {
                            this.plugin.settings.midiDevices[index].outputName = value;
                            await this.plugin.saveSettings();
                        });
                    });

                new Setting(deviceDiv)
                    .addButton(btn => btn
                        .setButtonText("Remove MIDI Device")
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
                    .setName("Add New MIDI Device")
                    .addButton(btn => btn
                        .setButtonText("Add Device")
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