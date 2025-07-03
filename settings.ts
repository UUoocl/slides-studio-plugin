import slidesStudioPlugin from "main";
import {App, Platform, PluginSettingTab, Setting} from "obsidian";

export class slidesStudioSettingsTab extends PluginSettingTab {
    plugin: slidesStudioPlugin;

    constructor(app: App, plugin: slidesStudioPlugin){
        super(app,plugin);
        this.plugin = plugin;
    }

    display(){
        let { containerEl } = this;
        containerEl.empty();

        // #region OBS WSS Settings
        //
        new Setting(containerEl)
        .setName("OBS WebSocket Server")
        .setHeading()
        //.setDesc("Websocket Server Settings from OBS")
        
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
                item.setValue(this.plugin.settings.websocketPW_Text).onChange(
                    (value) => {
                        this.plugin.settings.websocketPW_Text = value;
                        this.plugin.saveSettings()
                    })
                }); 
        // #endregion
                    
        ///
        // #region OBS Launch Parameters
        ///
        
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
                    button.setButtonText("Connect")
                    .onClick(() => {
                        this.app.commands.executeCommandById('slides-studio:connect-to-obs-websocket')
                    })
                })

                new Setting(containerEl)
                .setName('Open in Browser')
                .setHeading()
                .setDesc('Open the Slides in a browser window')
                .addButton((button) => {
                    button.setButtonText("Slides")
                        .onClick(() => { this.app.commands.executeCommandById('slides-studio:open-slides-in-browser') })
                        .setCta()
                })
                .addButton((button) => {
                    button.setButtonText("Speaker View")
                        .onClick(() => { this.app.commands.executeCommandById('slides-studio:open-slide-studio-speaker-view') })
                })


                new Setting(containerEl)
                .setName('URL for OBS')
                .setHeading()
                .setDesc('Copy the Slides URL, then Create a Browser Source in OBS')
                .addButton((button) => {
                    button.setButtonText("Copy URL for OBS Browser")
                        .onClick(() => { this.app.commands.executeCommandById('slides-studio:copy-obs-browser-source-link') })
                })
        // #endregion    

    // #region OSC Settings
        
        //		 
        //	#region OSC Device 1
        //
        new Setting(containerEl)
        .setName("OSC Device 1")
        .setHeading()

        new Setting(containerEl)
        .setName("OSC Device Name")
        .setDesc("Unique device name")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscName1_Text).onChange(
                (value) => {
                    this.plugin.settings.oscName1_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC IP address")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscIP1_Text).onChange(
                (value) => {
                    this.plugin.settings.oscIP1_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Incoming Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscInPort1_Text).onChange(
                (value) => {
                    this.plugin.settings.oscInPort1_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Out going Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscOutPort1_Text).onChange(
                (value) => {
                    this.plugin.settings.oscOutPort1_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
            .setName("Start OSC 1")
            .addButton((button) => {
                button.setButtonText("OSC 1")
                    .onClick(() => {
                        this.app.commands.executeCommandById('osc-to-websocket:connect-to-osc-1')
                    })
            })

// #endregion

//		 
//	#region OSC Device 2
//
        new Setting(containerEl)
        .setName("OSC Device 2")
        .setHeading()

        new Setting(containerEl)
        .setName("OSC Device Name")
        .setDesc("Unique device name")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscName2_Text).onChange(
                (value) => {
                    this.plugin.settings.oscName2_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC IP address")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscIP2_Text).onChange(
                (value) => {
                    this.plugin.settings.oscIP2_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Incoming Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscInPort2_Text).onChange(
                (value) => {
                    this.plugin.settings.oscInPort2_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Out going Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscOutPort2_Text).onChange(
                (value) => {
                    this.plugin.settings.oscOutPort2_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
            .setName("Start OSC 2")
            .addButton((button) => {
                button.setButtonText("OSC 2")
                    .onClick(() => {
                        this.app.commands.executeCommandById('osc-to-websocket:connect-to-osc-2')
                    })
            })

// #endregion
    
//		 
//	#region OSC Device 3
//
        new Setting(containerEl)
        .setName("OSC Device 3")
        .setHeading()

        new Setting(containerEl)
        .setName("OSC Device Name")
        .setDesc("Unique device name")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscName3_Text).onChange(
                (value) => {
                    this.plugin.settings.oscName3_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC IP address")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscIP3_Text).onChange(
                (value) => {
                    this.plugin.settings.oscIP3_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Incoming Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscInPort3_Text).onChange(
                (value) => {
                    this.plugin.settings.oscInPort3_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Out going Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscOutPort3_Text).onChange(
                (value) => {
                    this.plugin.settings.oscOutPort3_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
            .setName("Start OSC 3")
            .addButton((button) => {
                button.setButtonText("OSC 3")
                    .onClick(() => {
                        this.app.commands.executeCommandById('osc-to-websocket:connect-to-osc-3')
                    })
            })

// #endregion

//		 
//	#region OSC Device 4
//
        new Setting(containerEl)
        .setName("OSC Device 4")
        .setHeading()

        new Setting(containerEl)
        .setName("OSC Device Name")
        .setDesc("Unique device name")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscName4_Text).onChange(
                (value) => {
                    this.plugin.settings.oscName4_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC IP address")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscIP4_Text).onChange(
                (value) => {
                    this.plugin.settings.oscIP4_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Incoming Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscInPort4_Text).onChange(
                (value) => {
                    this.plugin.settings.oscInPort4_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Out going Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscOutPort4_Text).onChange(
                (value) => {
                    this.plugin.settings.oscOutPort4_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
            .setName("Start OSC 4")
            .addButton((button) => {
                button.setButtonText("OSC 4")
                    .onClick(() => {
                        this.app.commands.executeCommandById('osc-to-websocket:connect-to-osc-4')
                    })
            })

// #endregion

//		 
//	#region OSC Device 5
//
        new Setting(containerEl)
        .setName("OSC Device 5")
        .setHeading()

        new Setting(containerEl)
        .setName("OSC Device Name")
        .setDesc("Unique device name")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscName5_Text).onChange(
                (value) => {
                    this.plugin.settings.oscName5_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC IP address")
        .setDesc("Enter the IP address or 'localhost'")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscIP5_Text).onChange(
                (value) => {
                    this.plugin.settings.oscIP5_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Incoming Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscInPort5_Text).onChange(
                (value) => {
                    this.plugin.settings.oscInPort5_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
        .setName("OSC Out going Message Port")
        .addText((item) => {
            item.setValue(this.plugin.settings.oscOutPort5_Text).onChange(
                (value) => {
                    this.plugin.settings.oscOutPort5_Text = value;
                    this.plugin.saveSettings()
             })
        });

        new Setting(containerEl)
            .setName("Start OSC 5")
            .addButton((button) => {
                button.setButtonText("OSC 5")
                    .onClick(() => {
                        this.app.commands.executeCommandById('osc-to-websocket:connect-to-osc-5')
                    })
            })

// #endregion

// #endregion end OSC Settings
    }


}
