import { Notice, Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { slidesStudioSettingsTab } from 'src/settings';
import { SLIDES_STUDIO_VIEW_TYPE, slidesStudioView } from 'src/ui/tagView';
import { ServerManager } from 'src/utils/serverLogic';

import { OscManager} from 'src/utils/oscLogic';
import { MidiManager} from 'src/utils/midiLogic';

import { Message } from 'node-osc';
import { OBSWebSocket } from 'obs-websocket-js';

import { 
    SlidesStudioPluginSettings, 
    WssDetails, 
    OBSSceneList, 
    OBSSceneItemList, 
    OBSCustomEvent 
} from './types';

import { ConnectObsCommand } from './commands/connectObs';
import { OpenObsCommand } from './commands/openObs';
import { GetObsTagsCommand } from './commands/getObsTags';
import { OpenWebviewCommand } from './commands/webviewCommands';
import { SetObsReceiverCommand, UpdateBrowsersUrlCommand, RefreshObsBrowsersCommand } from './commands/obsBrowserCommands';
import { ConnectOscCommand, ConnectMidiCommand } from './commands/deviceCommands';

const DEFAULT_SETTINGS: Partial<SlidesStudioPluginSettings> = {
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
	settings: SlidesStudioPluginSettings;
	public oscManager: OscManager;
	public midiManager: MidiManager; 
	public serverManager: ServerManager | null = null; 
	public obs: OBSWebSocket;
	public isObsConnected = false;
	
	async loadSettings(): Promise<void> {
		// Use casting to avoid unsafe assignment from loadData()
		const loadedData = await this.loadData() as SlidesStudioPluginSettings | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
	}
	
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		await this.saveWebsocketDetailsToFile();
	}

	async saveWebsocketDetailsToFile(): Promise<void> {
		const pluginDir = this.manifest.dir;
		const folderName = "obs_webSocket_details";
		const fileName = "websocketDetails.js";
		
		const targetFolder = `${pluginDir}/${folderName}`;
		let filePath = `${targetFolder}/${fileName}`;
		filePath = Platform.isWin ? filePath.replace(/\//g, '\\') : filePath;

		try {
			const adapter = this.app.vault.adapter;
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
	
	async onload(): Promise<void> {
		await this.loadSettings();
		this.obs = new OBSWebSocket();

		this.registerView(
    		SLIDES_STUDIO_VIEW_TYPE, 
    		(leaf) => new slidesStudioView(leaf, this) // Pass 'this' (the plugin) as second argument
		);
		this.addRibbonIcon("aperture","Open slides studio view", () => {
			void this.openView();
		});

		this.addSettingTab(new slidesStudioSettingsTab(this.app, this));

		// Register External Commands
		this.addCommand(ConnectObsCommand(this));
		this.addCommand(OpenObsCommand(this));
		this.addCommand(GetObsTagsCommand(this));
		this.addCommand(OpenWebviewCommand(this));
		this.addCommand(SetObsReceiverCommand(this));
		this.addCommand(UpdateBrowsersUrlCommand(this));
		this.addCommand(RefreshObsBrowsersCommand(this));
		this.addCommand(ConnectOscCommand(this));
		this.addCommand(ConnectMidiCommand(this));

		new Notice("Enabled slides studio plugin");

		if (this.settings.serverEnabled) {
			const port = parseInt(this.settings.serverPort) || 57000;
			// Pass 'this' as the second argument
			this.serverManager = new ServerManager(this.app, this, port); 
			this.app.workspace.onLayoutReady(() => {
				void this.serverManager?.start();
			});
		}

		this.oscManager = new OscManager((name, msg: unknown[]) => {
			const payload = {
				deviceName: name,
				message: msg // msg is now the [address, ...args] array
			};
			this.sendToOBS(payload, "osc-message");
		});

		this.midiManager = new MidiManager((name, msg) => {
			this.sendToOBS({ deviceName: name, message: msg }, "midi-message");
		});
		await this.midiManager.enable();

		this.setupObsEventListeners();
	}

	private setupObsEventListeners(): void {
		this.obs.on('ConnectionOpened', () => {
			console.debug('Connection to OBS WebSocket successfully opened');
		});
		
		this.obs.on('ConnectionClosed', () => {
			this.isObsConnected = false;
		});
		
		this.obs.on("Identified", () => {
			this.isObsConnected = true;
			
			const wssDetails = {
				IP: this.settings.websocketIP_Text,
				PORT: this.settings.websocketPort_Text,
				PW: this.settings.websocketPW_Text
			};

			void this.obs.call("CallVendorRequest", {
				vendorName: "obs-browser",
				requestType: "emit_event",
				requestData: {
					event_name: "ws-details",
					event_data: { wssDetails },
				},
			});
			
			// Use command IDs to trigger logic
			const commands = [
				'slides-studio:get-obs-scene-tags',
				'slides-studio:update-browsers-url',
				'slides-studio:set-slides-studio-obs-receiver'
			];
			commands.forEach(id => this.app.commands.executeCommandById(id));
		});

		this.obs.on("CustomEvent", (eventData) => {
			const event = eventData as unknown as OBSCustomEvent;
			
			if (event.event_name === `OSC-out` && event.address && event.osc_name) {
				const message = new Message(event.address);
				[event.arg1, event.arg2, event.arg3, event.arg4, event.arg5, event.arg6, event.arg7].forEach(arg => {
					if (arg !== undefined) message.append(arg);
				});
				this.oscManager.sendMessage(event.osc_name, message);
			}

			if (event.event_name === `MIDI-out` && event.midi_name) {
				const midiData = {
					type: event.arg1 as string, 
					channel: event.arg2 as number,
					note: event.arg3 as number,    
					velocity: event.arg4 as number, 
					value: event.arg4 as number,
					controller: event.arg3 as number
				};
				this.midiManager.sendMidiMessage(event.midi_name, this.settings.midiDevices, midiData);
			}
		});
	}

	async getObsTags(): Promise<void> {
		new Notice("Getting obs tags");

		this.settings.scene_tags = [];
		this.settings.camera_tags = [];
		this.settings.camera_shape_tags = [];
		this.settings.slide_tags = [];

		try {
			const sceneList = await this.obs.call("GetSceneList") as unknown as OBSSceneList;
			sceneList.scenes.forEach((scene) => {
				if(scene.sceneName.startsWith("Scene")){
					if (!this.settings.scene_tags.includes(scene.sceneName)) {
						this.settings.scene_tags.push(scene.sceneName);
					}
				}
			});

			const tagMapping = [
				{ scene: 'Camera Position', target: this.settings.camera_tags },
				{ scene: 'Slide Position', target: this.settings.slide_tags },
				{ scene: 'Camera Shape', target: this.settings.camera_shape_tags }
			];

			for (const map of tagMapping) {
				if (sceneList.scenes.find(s => s.sceneName === map.scene)) {
					const items = await this.obs.call("GetSceneItemList", { sceneName: map.scene }) as unknown as OBSSceneItemList;
					items.sceneItems.forEach(item => {
						if (!map.target.includes(item.sourceName)) {
							map.target.push(item.sourceName);
						}
					});
				}
			}

			await this.saveData(this.settings);
		} catch (error) {
			console.error("Error fetching OBS tags", error);
			new Notice("Failed to fetch obs tags. Is obs connected?");
		}
	}

	async obsWSSconnect(wssDetails: WssDetails): Promise<void> {
		try {
			await this.disconnect();
			await this.obs.connect(`ws://${wssDetails.IP}:${wssDetails.PORT}`, wssDetails.PW, { rpcVersion: 1 });
			new Notice("Connected to obs websocket server");
		} catch (error) {
			new Notice("Failed to connect to obs websocket server");
			console.error(error)
		}
	}
	
	async disconnect(): Promise<void> {
		try {
			if (this.isObsConnected) {
				await this.obs.disconnect();
				this.isObsConnected = false; 
			}
		} catch(error) {
			console.error("Disconnect error", error);
		} 
	}

	sendToOBS(msgParam: { deviceName: string, message: unknown }, eventName: string): void {
		const webSocketMessage = JSON.stringify(msgParam.message);
		void this.obs.call("CallVendorRequest", {
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

	async openView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SLIDES_STUDIO_VIEW_TYPE);
		
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) await leaf.setViewState({ type: SLIDES_STUDIO_VIEW_TYPE, active: true });
		}
		if (leaf) void workspace.revealLeaf(leaf);
	}

	async openWebView(): Promise<void> {
		const { workspace } = this.app;
	
		const leaf = workspace.getLeaf('tab');
		const port = this.settings.serverPort;
		const url = `http://localhost:${port}/${this.manifest.dir}/slides_studio/`;
		await leaf.setViewState({
			type: 'webviewer',
			state: { url, navigate: true },
			active: true,
		});
		void workspace.revealLeaf(leaf);
		
	}

	onunload(): void {
		new Notice("Disabled slides studio plugin");
		if (this.serverManager) void this.serverManager.stop();
		if (this.oscManager) this.oscManager.disconnectAll();
		if (this.midiManager) this.midiManager.disconnectAll(this.settings.midiDevices);
		if (this.obs) void this.obs.disconnect();
	}
}