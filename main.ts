import { Notice, Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { slidesStudioSettingsTab } from 'settings';
import { SLIDES_STUDIO_VIEW_TYPE, slidesStudioView } from 'tagView';
import { SLIDES_STUDIO_WEBVIEW_TYPE, SlideStudioWebview } from 'slideStudioWebview';
import { ServerManager } from 'serverLogic';

import { OscManager, OscDeviceSetting } from 'oscLogic';
import { MidiManager, MidiDeviceSetting } from 'midiLogic';

import path from 'node:path'; 
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec); 

import { Message } from 'node-osc';
import { OBSWebSocket } from 'obs-websocket-js';

interface wss{
	IP: string;
	PORT: string;
	PW: string;
}

interface slidesStudioPluginSettings{
	websocketIP_Text: string;
	websocketPort_Text: string;
	websocketPW_Text: string;
	slidesPort_Text: string;
	slide_tags: string[];
	scene_tags: string[];
	camera_tags: string[];
	camera_shape_tags: string[];
	newTag: string;
	user_tags: string[];
	obsAppName_Text: string;
	obsCollection_Text: string;
	obsDebugPort_Text: string;
	obsAppPath_Text: string;
    // Server Settings
    serverPort: string;
    serverEnabled: boolean;
	oscDevices: OscDeviceSetting[];
	midiDevices: MidiDeviceSetting[];
}

const DEFAULT_SETTINGS: Partial<slidesStudioPluginSettings> = {
	websocketIP_Text: "localhost",
	websocketPort_Text: "4455",
	websocketPW_Text: "password",
	slidesPort_Text: "5000",
	slide_tags: [],
	scene_tags: [],
	camera_tags: [],
	camera_shape_tags: [],
	user_tags: [],
	newTag: "",
	obsAppName_Text: "OBS",
	obsCollection_Text: "Untitled",
	obsDebugPort_Text: "9222",
	obsAppPath_Text: "",
    serverPort: "57000",
    serverEnabled: false,
	oscDevices: [],
	midiDevices: []
};

export default class slidesStudioPlugin extends Plugin {
	settings: slidesStudioPluginSettings;
	public oscManager: OscManager;
	public midiManager: MidiManager; 
    public serverManager: ServerManager | null = null; 
	public obs: OBSWebSocket;
	public isObsConnected = false;
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
        await this.saveWebsocketDetailsToFile();
	}

   async saveWebsocketDetailsToFile() {
        // Get the directory of the current plugin (e.g., .obsidian/plugins/slides-studio) 
        const pluginDir = this.manifest.dir;
		console.log(pluginDir)
        const folderName = "obs_webSocket_details";
        const fileName = "websocketDetails.js";
        
        // Construct the full path relative to the vault root
        const targetFolder = `${pluginDir}/${folderName}`;
        let filePath = `${targetFolder}/${fileName}`;

		//if Windows, change / to \\
		filePath = Platform.isWin ? filePath.replace(/\//g, '\\') : filePath;

        try {
            const adapter = this.app.vault.adapter;
            
            // Check if the specific subfolder exists inside the plugin directory
            if (!(await adapter.exists(targetFolder))) {
                await this.app.vault.createFolder(targetFolder);
            }
            
            const port = parseInt(this.settings.websocketPort_Text) || 4455;
            const content = `let websocketDetails = {"IP": "${this.settings.websocketIP_Text}", "PW": "${this.settings.websocketPW_Text}", "PORT": ${port}}`;
            
            await adapter.write(filePath, content);
        } catch (error) {
            console.error("Error writing websocket details file:", error);
        }
    }
	
	async onload() {
		await this.loadSettings();
		
		this.obs = new OBSWebSocket();

		if(this.app.plugins.plugins['slides-studio']) {
			this.app.plugins.plugins['slides-studio'].settings.scenes = [];
			this.app.plugins.plugins['slides-studio'].settings.cameras = [];
		}
	
		this.registerView(SLIDES_STUDIO_VIEW_TYPE, (leaf) => new slidesStudioView(leaf))
        this.registerView(SLIDES_STUDIO_WEBVIEW_TYPE, (leaf) => new SlideStudioWebview(leaf, this));

		this.addRibbonIcon("aperture","open slides studio view", () => {
			this.openView();
		})

		this.addSettingTab(new slidesStudioSettingsTab(this.app, this))

		new Notice("Enabled slides studio plugin")	

        // #region Server Initialization Logic
        // ✅ Use Internal Server if enabled
        if (this.settings.serverEnabled) {
            const port = parseInt(this.settings.serverPort) || 57000;
            this.serverManager = new ServerManager(this.app, port);
            this.app.workspace.onLayoutReady(() => {
                this.serverManager?.start();
            });
        }
        // #endregion

		// #region OSC Manager Initialization
		this.oscManager = new OscManager((name, msg) => {
			const payload = {
				deviceName: name,
				message: msg
			};
			this.sendToOBS(payload, "osc-message");
		});
		// #endregion

		// #region MIDI Manager Initialization
		this.midiManager = new MidiManager((name, msg) => {
			const payload = {
				deviceName: name,
				message: msg
			};
			this.sendToOBS(payload, "midi-message");
		});
		await this.midiManager.enable();
		// #endregion

	//
	// #region ✅Connect to OBS Websocket connection
	//
    this.addCommand({
		id: 'connect-to-obs-websocket',
		name: 'Connect to OBS Websocket connection',
		callback: () => {
			new Notice("Starting OBS Web Socket Server Connection")
			
			const wssDetails = {
				IP: this.settings.websocketIP_Text,
				PORT: this.settings.websocketPort_Text,
				PW: this.settings.websocketPW_Text
			}
			this.obsWSSconnect(wssDetails)
		}
	})
        
	this.obs.on('ConnectionOpened', () => {
		console.log('Connection to OBS WebSocket successfully opened');
	});
	
	this.obs.on('ConnectionClosed', () => {
		console.log('Connection to OBS WebSocket closed');
		this.isObsConnected = false;
	});
	
	this.obs.on('ConnectionError', err => {
		console.error('Connection to OBS WebSocket failed', err);
		this.isObsConnected = false;
	});
	
	this.obs.on("Identified", async (data) => {
		this.isObsConnected = true;
		console.log("OBS WebSocket successfully identified", data);
		
		//share connection details with obs browser sources
		const wssDetails = {
			IP: this.settings.websocketIP_Text,
			PORT: this.settings.websocketPort_Text,
			PW: this.settings.websocketPW_Text
		}

		await this.obs.call("CallVendorRequest", {
			vendorName: "obs-browser",
			requestType: "emit_event",
			requestData: {
				event_name: "ws-details",
				event_data: { wssDetails },
			},
		});
		
		this.app.commands.executeCommandById('slides-studio:get-obs-scene-tags')
		this.app.commands.executeCommandById('slides-studio:update-browsers-url')
		this.app.commands.executeCommandById('slides-studio:set-slides-studio-obs-receiver')

	})
	
	this.obs.on("ConnectionError", (err) => {
		console.error("Socket error:", err);
	});
	// #endregion Connect to OBS Websocket connection

	// #region ✅ Handle websocket custom events from OBS
	this.obs.on("CustomEvent", (event: any) => {
			console.log("Message from OBS",event);
			
			if (event.event_name === `OSC-out`) {
				const message = new Message(event.address);
				if (Object.hasOwn(event, "arg1")) message.append(event.arg1);
				if (Object.hasOwn(event, "arg2")) message.append(event.arg2);
				if (Object.hasOwn(event, "arg3")) message.append(event.arg3);
				if (Object.hasOwn(event, "arg4")) message.append(event.arg4);
				if (Object.hasOwn(event, "arg5")) message.append(event.arg5);
				if (Object.hasOwn(event, "arg6")) message.append(event.arg6);
				if (Object.hasOwn(event, "arg7")) message.append(event.arg7);
				
				console.log(`message to OSC device - ${event.osc_name}`, message);
				this.oscManager.sendMessage(event.osc_name, message);
			}

			if (event.event_name === `MIDI-out`) {
				const midiData = {
					type: event.arg1, 
					channel: event.arg2,
					note: event.arg3,    
					velocity: event.arg4, 
					value: event.arg4,
					controller: event.arg3
				};
				console.log(`message to MIDI device - ${event.midi_name}`, midiData);
				this.midiManager.sendMidiMessage(event.midi_name, this.settings.midiDevices, midiData);
			}
		});		 
		// #endregion Handle websocket custom event message from OBS

//		
// #region ✅ Open OBS feature

		this.addCommand({
			id: 'open-obs',
			name: 'Open OBS',
			callback: async () => {
				new Notice("Trying to launch OBS")
				//build command string
				let commandString ="hello"
				if (Platform.isMacOS) {
					commandString = `open -n -a "${this.settings.obsAppName_Text}"`;
					commandString += ` --args --collection "${this.settings.obsCollection_Text}"`;
					commandString += ` --remote-debugging-port=${this.settings.obsDebugPort_Text}`;
					commandString += ` --remote-allow-origins=http://localhost:${this.settings.obsDebugPort_Text}`;
					commandString += ` --websocket_port "${this.settings.websocketPort_Text}"`;
					commandString += ` --websocket_password "${this.settings.websocketPW_Text}"`;
					commandString += ` --multi`;
					execAsync(commandString);
				}
				if (Platform.isWin) {
					const obsPath = `${this.settings.obsAppPath_Text}${this.settings.obsAppName_Text}`
					const obsDir = path.dirname(obsPath);
					process.chdir(obsDir)
		
					commandString = `${this.settings.obsAppName_Text}`;
					commandString += ` --args --collection "${this.settings.obsCollection_Text}"`;
					commandString += ` --remote-debugging-port=${this.settings.obsDebugPort_Text}`;
					commandString += ` --remote-allow-origins=http://localhost:${this.settings.obsDebugPort_Text}`;
					commandString += ` --websocket_port "${this.settings.websocketPort_Text}"`;
					commandString += ` --websocket_password "${this.settings.websocketPW_Text}"`;
					commandString += ` --multi`;
		
					execAsync(commandString);
				}
	
				}
			}
		)

// #endregion

//	
//	#region ✅ Get Scenes from OBS feature

        // ✅ Extracted logic to public method so View can await it
		this.addCommand({
			id: 'get-obs-scene-tags',
			name: 'Get OBS tags',
			callback: async() => {
				await this.getObsTags();
			}
        })
// #endregion

//	
//	#region ✅Open Slides Studio in browser
//
    this.addCommand({
        id: 'open-slide-studio-webview',
        name: 'Open Slides Studio Webview',
        callback: async () => {
            await this.openWebView();
        }
    });
	
	this.addCommand({
		id: 'copy-obs-browser-source-link',
		name: 'Copy the Slides Url for OBS to the clipboard ',
		callback: async() => {
            const port = this.settings.serverPort;
            const obsURL = `http://localhost:${port}/${this.manifest.dir}/slides_studio/slides_studio_OBS_browser_source.html`
            try {
                await navigator.clipboard.writeText(obsURL);
                new Notice('URL copied to clipboard successfully!');
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
		}
	})

	this.addCommand({
		id: 'set-slides-studio-obs-receiver',
		name: 'Set the Url for Slides Studio Receiver OBS Browser Sourceto the clipboard ',
		callback: async() => {
            const port = this.settings.serverPort;
            const obsURL = `http://localhost:${port}/${this.manifest.dir}/slides_studio/slides_studio_OBS_browser_source.html`
            try {
                //set the browser settings
                this.obs.call("SetInputSettings", {
                    inputName: 'slides',
                    inputSettings: {
                        url: obsURL,
                    },
                });
            } catch (err) {
                console.error('Failed set slides studio receiver: ', err);
            }
		}
	})
// #endregion

// #region Refresh Slides Studio OBS Browser sources
this.addCommand({
	id: 'update-browsers-url',
	name: 'Update Slides Studio OBS browsers URL',
	callback: async() =>{
		//for each of the slides studio OBS  browser sources,  update the url origin in case the port changed. 
		const port = this.settings.serverPort;
		
		//get all the OBS browser sources
		const browserSources: any = await this.obs.call("GetInputList",{inputKind: "browser_source"})

		//check if the source contains the slide studio custom css --slides-studio-refresh
		for(let i=0; i<browserSources.inputs.length; i++){
			//get browser settings
			const settings: any = await this.obs.call("GetInputSettings", {
				inputUuid: browserSources.inputs[i].inputUuid,
			});	
			console.log("settings",settings)
			//check for the slides studio css value
			try{
			if(settings.inputSettings.css.contains("--slides-studio-refresh")){
				//create url object
				const browserURL: any = new URL(settings.inputSettings.url)
				
				//change origin to localhost:${port}
				const newURL = `http://localhost:${port}${browserURL.pathname}`

				//set the browser settings
				this.obs.call("SetInputSettings", {
					inputUuid: browserSources.inputs[i].inputUuid,
					inputSettings: {
						url: newURL,
					},
				});
			}}catch(err){
				//common error of browser missing the css property.  
				console.log(err) 
			}
		}
	}
})

// #endregion

// #region Refresh all OBS browsers
this.addCommand({
	id: 'refresh-obs-browsers',
	name: 'Refresh ALL OBS browser sources',
	callback: async() =>{
		//get all the OBS browser sources
		const browserSources: any = await this.obs.call("GetInputList",{inputKind: "browser_source"})

		browserSources.forEach( async(browser: any) => {
		//refresh the browser
			await this.obs.call("PressInputPropertiesButton", {
				inputUuid: browser.inputUuid,
				propertyName: "refreshnocache",
			});
		})
	}
})
// #endregion

// #region ✅OSC Functions

	this.addCommand({
		id: 'connect-all-osc-devices',
		name: 'Connect to ALL OSC devices',
		callback: async () => {
			this.settings.oscDevices.forEach(device => {
				if (device.name && device.ip && device.inPort && device.outPort) {
					this.oscManager.connectDevice(device);
				}
			});
		}
	})

// #endregion OSC end

// #region MIDI Functions
    this.addCommand({
        id: 'connect-all-midi-devices',
        name: 'Connect to ALL MIDI devices',
        callback: async () => {
            this.settings.midiDevices.forEach(device => {
                this.midiManager.connectDevice(device);
            });
        }
    })
// #endregion

	// #region open slides studio visual editor in webview tab
	this.addCommand({
		id: 'open-visual-editor',
		name: 'Open Visual Flow Editor',
		callback: async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeaf('tab');
			const port = this.settings.serverPort;
			// Point to the new visual_editor.html
			const url = `http://localhost:${port}/${this.manifest.dir}/slides_studio/visual_editor.html`;
			
			await leaf.setViewState({
				type: 'webviewer', // Assuming you have a generic webviewer type or reuse SlideStudioWebview
				state: {
					url: url,
					navigate: true,
				},
				active: true,
			});
		}
	});
	// #endregion
}

// ✅ New Public Method for getting tags
async getObsTags() {
	new Notice("Getting OBS Tags");

	// Clear existing arrays
	this.settings.scene_tags = [];
	this.settings.camera_tags = [];
	this.settings.camera_shape_tags = [];
	this.settings.slide_tags = [];

	await this.saveData(this.settings);
	
	try {
		//get Scene tag options
		const sceneList = await this.obs.call("GetSceneList");
		sceneList.scenes.forEach((scene: any) => {
			if(scene.sceneName.startsWith("Scene")){
				const sceneName = scene.sceneName;
				if (!this.settings.scene_tags.includes(sceneName)) {
					this.settings.scene_tags.push(sceneName);
				}
			}
		});
		await this.saveData(this.settings);

		//get Camera Position tag options
		if(sceneList.scenes.find(scene => scene.sceneName === 'Camera Position')){
			const cameraSources = await this.obs.call("GetSceneItemList", { sceneName: "Camera Position" });
			cameraSources.sceneItems.forEach((source: any) => {
				if (!this.settings.camera_tags.includes(source.sourceName)) {
					this.settings.camera_tags.push(source.sourceName)
				}
			});
		}
		
		//get Slide Position tag options
		if(sceneList.scenes.find(scene => scene.sceneName === 'Slide Position')){
			const slideSources = await this.obs.call("GetSceneItemList", { sceneName: "Slide Position" });
			slideSources.sceneItems.forEach((source: any) => {
				if (!this.settings.slide_tags.includes(source.sourceName)) {
					this.settings.slide_tags.push(source.sourceName)
				}
			});
		}

		//get Camera Shape tag options
		if(sceneList.scenes.find(scene => scene.sceneName === 'Camera Shape')){
			const shapeSources = await this.obs.call("GetSceneItemList", { sceneName: "Camera Shape" });
			shapeSources.sceneItems.forEach((source: any) => {
				if (!this.settings.camera_shape_tags.includes(source.sourceName)) {
					this.settings.camera_shape_tags.push(source.sourceName)
				}
			});
		}
		// Save final state
		await this.saveData(this.settings);
	} catch (error) {
		console.error("Error fetching OBS tags", error);
		new Notice("Failed to fetch OBS Tags. Is OBS connected?");
	}
}

// Helper Methods
async obsWSSconnect(wssDetails: wss) {
	try {
		await this.disconnect()
		const { obsWebSocketVersion, negotiatedRpcVersion } = await this.obs.connect(
			`ws://${wssDetails.IP}:${wssDetails.PORT}`,
			wssDetails.PW,
			{
				rpcVersion: 1,
			}
		)
		console.log(`Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`);
		new Notice("Connected to OBS WebSocket Server");
	} catch (error) {
		new Notice("Failed to connect to OBS WebSocket Server")
		console.error("Failed to connect", error.code, error.message);
	}
}
	
async disconnect () {
	try{
	await this.obs.disconnect()
	this.isObsConnected = false; 
	console.log("disconnected")
	} catch(error){
	console.error("disconnect catch",error)
	} 
}

sendToOBS(msgParam: any, eventName: string) {
	const webSocketMessage = JSON.stringify(msgParam.message);
	console.log("sending to OBS", msgParam)
	this.obs.call("CallVendorRequest", {
		vendorName: "obs-browser",
		requestType: "emit_event",
		requestData: {
			event_name: eventName,
			event_data: { 
				"deviceName": msgParam.deviceName,
				webSocketMessage,
			},
		},
	});
}

async openView(){
	const { workspace } = this.app;
	let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(SLIDES_STUDIO_VIEW_TYPE);
	
    if (leaves.length > 0) {
		leaf = leaves[0];
    } else {
		leaf = workspace.getRightLeaf(false);
		await leaf.setViewState({ type: SLIDES_STUDIO_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
}

//open slides studio webpage in webview tab
async openWebView(){
	const { workspace } = this.app;
	let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(SLIDES_STUDIO_WEBVIEW_TYPE);
	
    if (leaves.length > 0) {
		leaf = leaves[0];
    } else {
		leaf = workspace.getLeaf('tab');
		const port = this.settings.serverPort;
		console.log(port)
		const url = `http://localhost:${port}/${this.manifest.dir}/slides_studio/`
		console.log(url)
		await leaf.setViewState({
			type: 'webviewer',
			state: {
				url: url,
				navigate: true,
			},
			active: true, // Make the new leaf active
		});

    }
    workspace.revealLeaf(leaf);
}

// ✅ New helper method to get the correct URL for the webview
public getServerUrl(): string | null {
    // If internal server is running, use it
    if (this.serverManager) {
        return this.serverManager.getUrl();
    }
    return null;
}

	onunload() {
		new Notice("Disabled slides studio plugin");
        if (this.serverManager) {
            this.serverManager.stop();
        }
		if (this.oscManager) {
			this.oscManager.disconnectAll();
		}
		if (this.midiManager) {
            this.midiManager.disconnectAll(this.settings.midiDevices);
        }
		if (this.obs) {
			this.obs.disconnect();
		}
	}
}