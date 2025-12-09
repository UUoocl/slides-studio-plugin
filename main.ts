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
    serverPort: "3000",
	oscDevices: [],
	midiDevices: []
};

export default class slidesStudioPlugin extends Plugin {
	settings: slidesStudioPluginSettings;
	public oscManager: OscManager;
	public midiManager: MidiManager; 
    public serverManager: ServerManager; 
	public obs: OBSWebSocket;
	public isObsConnected: boolean = false;
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
        // Save the details to the specific JS file for external usage
        await this.saveWebsocketDetailsToFile();
	}

    // New helper to write the JS file
    async saveWebsocketDetailsToFile() {
        const folderName = ".obsidian/plugins/slides-studio/slides_studio/obs_webSocket_details";
        const fileName = "websocketDetails.js";
        const filePath = `${folderName}/${fileName}`;

        try {
            const adapter = this.app.vault.adapter;
            
            // Check if folder exists, create if not
            if (!(await adapter.exists(folderName))) {
                await this.app.vault.createFolder(folderName);
            }

            // Ensure port is a number for the JSON structure
            const port = parseInt(this.settings.websocketPort_Text) || 4455;
            
            // Format content as requested
            const content = `let websocketDetails = {"IP": "${this.settings.websocketIP_Text}", "PW": "${this.settings.websocketPW_Text}", "PORT": ${port}}`;

            await adapter.write(filePath, content);
        } catch (error) {
            console.error("Error writing websocket details file:", error);
            // Optionally notify user only on failure
            // new Notice("Failed to save websocketDetails.js");
        }
    }
	
	async onload() {
		await this.loadSettings();
		
		this.obs = new OBSWebSocket();

		if(this.app.plugins.plugins['slides-studio']) {
			this.app.plugins.plugins['slides-studio'].settings.scenes = [];
			this.app.plugins.plugins['slides-studio'].settings.cameras = [];
		}
	
        // Register Tag View
		this.registerView(SLIDES_STUDIO_VIEW_TYPE, (leaf) => new slidesStudioView(leaf))
        // Register New Webview
        this.registerView(SLIDES_STUDIO_WEBVIEW_TYPE, (leaf) => new SlideStudioWebview(leaf, this));

		this.addRibbonIcon("aperture","open slides studio view", () => {
			this.openView();
		})

		this.addSettingTab(new slidesStudioSettingsTab(this.app, this))

		new Notice("Enabled slides studio plugin")	

        // #region Server Initialization
        const port = parseInt(this.settings.serverPort) || 3000;
        this.serverManager = new ServerManager(this.app, port);
        this.app.workspace.onLayoutReady(() => {
            this.serverManager.start();
        });
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

		if (this.app.plugins.plugins['slides-studio']) {
			const port = this.app.plugins.plugins['slides-studio'].settings.serverPort
			const speakerViewURL = `http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/slides_studio_OBS_browser_source.html`
			
			this.obs.call("SetInputSettings", {
					inputName: "slides",
					inputSettings: {
						url: speakerViewURL,
				},
			});

			const cameraShapeURL = `http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/cameraShapes/cameraShape_`;
			let cameraShapes = await this.obs.call("GetSceneItemList", {
				sceneName: "Camera Shape",
			})
			
			cameraShapes.sceneItems.forEach(async (source, index) => {
				if(source.inputKind === "browser_source"){
					await this.obs.call("SetInputSettings", {
						inputName: source.sourceName,
						inputSettings: {
							url: cameraShapeURL + source.sourceName + ".html",
						},
					});
				}
			});
		}
	});
	
	this.obs.on("error", (err) => {
		console.error("Socket error:", err);
	});
	// #endregion Connect to OBS Websocket connection

	// #region ✅ Handle websocket custom events from OBS
	this.obs.on("CustomEvent", (event) => {
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
		
					execAsync(commandString, (error, stdout, stderr) => {
					  if (error) {
						  return;
					  }
					});
				  }
	
				}
			}
		)

// #endregion

//	
//	#region ✅ Get Scenes from OBS feature

		this.addCommand({
			id: 'get-obs-scene-tags',
			name: 'Get OBS tags',
			callback: async() => {
			new Notice("Getting OBS Tags");
			
		//get Scene tag options
			const sceneList = await this.obs.call("GetSceneList");
			sceneList.scenes.forEach(async (scene, index) => {
				if(scene.sceneName.startsWith("Scene")){
					const sceneName = scene.sceneName;
					this.settings.scene_tags.push(sceneName);
            	}
			});
				
		//get Camera Position tag options
			let cameraSources = await this.obs.call("GetSceneItemList", { sceneName: "Camera Position" });
			cameraSources.sceneItems.forEach(async(source, index) => {
				this.settings.camera_tags.push(source.sourceName)
			});
			
		//get Slide Position tag options
	        const slideSources = await this.obs.call("GetSceneItemList", { sceneName: "Slide Position" });
        	slideSources.sceneItems.forEach(async(source, index) => {
				this.settings.slide_tags.push(source.sourceName)
			});
			
			//get Camera Shape tag options
        	const shapeSources = await this.obs.call("GetSceneItemList", { sceneName: "Camera Shape" });
        	console.log("shapreSources", shapeSources)
        	shapeSources.sceneItems.forEach(async(source, index) => {
				this.settings.camera_shape_tags.push(source.sourceName)
        	});
		return
		}})
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
		id: 'open-slide-studio-speaker-view',
		name: 'Open the Slide Studio Speaker View in an external browser',
		callback: async() => {
			if (this.app.plugins.plugins['slides-studio']) {
				const port = this.app.plugins.plugins['slides-studio'].settings.serverPort
				new Notice(`Opening Speaker View on port ${port}`);
				window.open(`http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/speakerView.html`)
			} else {
				new Notice('Slides Extended plugin not found.');
			}
		}
	})
		
		this.addCommand({
			id: 'copy-obs-browser-source-link',
			name: 'Copy the Slides Url for OBS to the clipboard ',
			callback: async() => {
				if (this.app.plugins.plugins['slides-studio']) {
					const port = this.app.plugins.plugins['slides-studio'].settings.serverPort
					const obsURL = `http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/slides_studio_OBS_browser_source.html`
					try {
						await navigator.clipboard.writeText(obsURL);
						new Notice('URL copied to clipboard successfully!');
					} catch (err) {
						console.error('Failed to copy: ', err);
					}
				} else {
					new Notice('Slides Extended plugin not found.');
				}
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
}

	// Helper Methods
	async obsWSSconnect(wssDetails) {
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

	sendToOBS(msgParam, eventName) {
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

async openWebView(){
	const { workspace } = this.app;
	let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(SLIDES_STUDIO_WEBVIEW_TYPE);
	
    if (leaves.length > 0) {
		leaf = leaves[0];
    } else {
		const port = this.app.plugins.plugins['slides-studio'].settings.serverPort
		leaf = workspace.getLeaf('tab');
		await leaf.setViewState({ type: 'webviewer', active: true, state:{ url:`http://localhost:${port}`} });
    }
    workspace.revealLeaf(leaf);
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