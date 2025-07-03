import { Notice, Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { slidesStudioSettingsTab } from 'settings';
import { SLIDES_STUDIO_VIEW_TYPE, slidesStudioView } from 'view';

// import { execSync } from 'node:child_process';
import path from 'node:path'; 
// import util from 'util';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec); 

import { Client, Server, Message } from 'node-osc';
import { OBSWebSocket } from 'obs-websocket-js';


// Remember to rename these classes and interfaces!

interface slidesStudioPluginSettings{
	websocketIP_Text: string;
	websocketPort_Text: string;
	websocketPW_Text: string;
	slidesPort_Text: string;
	slide_tags: string[];
	scene_tags: string[];
	camera_tags: string[];
	camera_overlay_tags: string[];
	newTag: string;
	user_tags: string[];
	obs: OBSWebSocket;
}

const DEFAULT_SETTINGS: Partial<slidesStudioPluginSettings> = {
	websocketIP_Text: "localhost",
	websocketPort_Text: "4455",
	websocketPW_Text: "password",
	slidesPort_Text: "5000",
	slide_tags: ['over-the-shoulder','full-screen', 'side-by-side'],
	scene_tags: [],
	camera_tags: [],
	camera_overlay_tags: [],
	user_tags: [],
	newTag: "",
};

export default class slidesStudioPlugin extends Plugin {
	settings: slidesStudioPluginSettings;
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	async onload() {
		await this.loadSettings();
		let obs = this.settings.obs;
		obs = new OBSWebSocket();
		let slideState = '';
		
		//this.settings.obs = new OBSWebSocket();
		// this.app.plugins.plugins['slides-studio'].settings.scenes = [];
		// this.app.plugins.plugins['slides-studio'].settings.cameras = [];
	
		this.registerView(SLIDES_STUDIO_VIEW_TYPE, (leaf) => new slidesStudioView(leaf))

		this.addRibbonIcon("aperture","open slides studio view", () => {
			this.openView();
		})

		this.addSettingTab(new slidesStudioSettingsTab(this.app, this))

		new Notice("Enabled slides studio plugin")	

		//
		// #region Listen for Slides Extended Messages
		//
		this.addCommand({
			id: 'listen-for-event-messages',
			name: 'Listening for API Messages',
			callback: () => {
				new Notice("Listening for API Messages")
				
				//On message from Slides iframe API, send new Slides state to OBS
				window.addEventListener('message', (event) => {
					//message data
					//   "{\"namespace\":\"reveal\",\"eventName\":\"slidechanged\",\"state\":{\"indexh\":20,\"indexv\":0,\"paused\":false,\"overview\":false}}"
					console.log(event)
					const data = JSON.parse(event.data);
					
					if (data.namespace === 'reveal' && 
						['paused','resumed','fragmentshown','fragmenthidden','slidechanged'].includes(data.eventName)) {
							console.log("Slide Changed", event)
							//data.state.source = "obsidian"
							//if event 'state' doesn't equal settings 'state'
							if(JSON.stringify(data.state) != slideState){
								slideState = JSON.stringify(data.state);
								//send slide change to OBS
								sendToOBS(data.state, "slide-changed");	
							}
						}
						
					if (data.namespace === 'reveal' && 
						['overviewhidden','overviewshown'].includes(data.eventName)) {
							console.log("Overview Changed", event)	
							//if event 'state' doesn't equal settings 'state'
							if(JSON.stringify(data.state) != slideState){
								slideState = JSON.stringify(data.state);
								//send slide change to OBS
								sendToOBS(data.state, "overview-changed");	
							}
						}
					});
			//iframe.contentWindow.postMessage( JSON.stringify({ method: 'getSlide', args: [data.state.indexh , data.state.indexv]}), '*' );
			//Reveal.getSlide(indexh, indexv);
			
			// window.addEventListener(`reveal-slide-changed`, async function (event) {
			// 	//reveal event 
			// 	console.log("message received: ", event)
			// 	if(event.detail.hasOwnProperty('slideChanged')){
			// 		//get slides extended preview iframe	
			// 		const iframe = document.getElementsByTagName("iframe")[0];
			// 		iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.state.indexh, data.state.indexv] }), '*');
			// 	}
			// })
		}
	})

	//run this command on load 
			this.app.commands.executeCommandById('slides-studio:listen-for-event-messages')
	// #endregion
	
	//
	// #region Connect to OBS Websocket connection
	//
    this.addCommand({
		id: 'connect-to-obs-websocket',
		name: 'Connect to OBS Websocket connection',
		callback: () => {
			new Notice("Starting OBS Web Socket Server Connection")
			
			const wssDetails = {
				IP: this.app.plugins.plugins['slides-studio'].settings.websocketIP_Text,
				PORT: this.app.plugins.plugins['slides-studio'].settings.websocketPort_Text,
				PW: this.app.plugins.plugins['slides-studio'].settings.websocketPW_Text
			}
			obsWSSconnect(wssDetails)
		}
	})

	async function obsWSSconnect(wssDetails){
		try {
                //avoid duplicate connections
                await disconnect()
				
				//start new connection
                const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
                    `ws://${wssDetails.IP}:${wssDetails.PORT}`,
                    wssDetails.PW,
                    {
                        rpcVersion: 1,
                    }
                )
                console.log(`Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`);
                new Notice("Connected to OBS WebSocket Server");
                // item.setButtonText('disconnect');
                // item.removeCta
            } catch (error) {
                new Notice("Failed to connect to OBS WebSocket Server")
                console.error("Failed to connect", error.code, error.message);
            }
	}
        
        async function disconnect () {
          try{
            await obs.disconnect()
            console.log("disconnected")
            obs.connected = false
          } catch(error){
            console.error("disconnect catch",error)
          } 
        }
        
        obs.on('ConnectionOpened', () => {
          console.log('Connection to OBS WebSocket successfully opened');
          obs.status = "connected";
        });
        
        obs.on('ConnectionClosed', () => {
          console.log('Connection to OBS WebSocket closed');
          obs.status = "disconnected";
        });
        
        obs.on('ConnectionError', err => {
          console.error('Connection to OBS WebSocket failed', err);
        });
        
        obs.on("Identified", async (data) => {
			obs.connected = true;
			console.log("OBS WebSocket successfully identified", data);

			const wssDetails = {
				IP: this.app.plugins.plugins['slides-studio'].settings.websocketIP_Text,
				PORT: this.app.plugins.plugins['slides-studio'].settings.websocketPort_Text,
				PW: this.app.plugins.plugins['slides-studio'].settings.websocketPW_Text
			}

			//trigger OBS browsers to reconnect to the websocket server
			await obs.call("CallVendorRequest", {
                vendorName: "obs-browser",
                requestType: "emit_event",
                requestData: {
                    event_name: "ws-details",
                    event_data: { wssDetails },
                },
            });
			console.log(`ws://${wssDetails.IP}:${wssDetails.PORT}`);  
			
			//Get Source Names
			this.app.commands.executeCommandById('slides-studio:get-obs-scene-tags')
        });
        
        obs.on("error", (err) => {
          console.error("Socket error:", err);
        });

		obs.on("CustomEvent", function (event) {
			console.log("Message from OBS",event);
			if (event.event_name === `OSC-out`) {
				const message = new Message(event.address);
				if (Object.hasOwn(event, "arg1")) {
					message.append(event.arg1);
					//console.log("arg1", message);
				}
				if (Object.hasOwn(event, "arg2")) {
					message.append(event.arg2);
					//console.log(message);
				}
				if (Object.hasOwn(event, "arg3")) {
					message.append(event.arg3);
					//console.log(message);
				}
				if (Object.hasOwn(event, "arg4")) {
					message.append(event.arg4);
					//console.log(message);
				}
				if (Object.hasOwn(event, "arg5")) {
					message.append(event.arg5);
					//console.log(message);
				}
				if (Object.hasOwn(event, "arg6")) {
					message.append(event.arg6);
					//console.log(message);
				}
				if (Object.hasOwn(event, "arg7")) {
					message.append(event.arg7);
					//console.log(message);
				}
				console.log(`message to OSC device - ${event.osc_name}`, message);
				
				switch(event.osc_name){
					case oscClient1.oscName:
						console.log("1")
						oscClient1.oscClient.send(message, (err) => {
							if (err) {
								console.error(new Error(err));
							}
						});
						break;
					case oscClient2.oscName:
						console.log("2")
						oscClient2.oscClient.send(message, (err) => {
							if (err) {
								console.error(new Error(err));
							}
						});
						break;
					case oscClient3.oscName:
						oscClient3.oscClient.send(message, (err) => {
							if (err) {
								console.error(new Error(err));
							}
						});
						break;
					case oscClient4.oscName:
						oscClient4.oscClient.send(message, (err) => {
							if (err) {
								console.error(new Error(err));
							}
						});
						break;
					case oscClient5.oscName:
						oscClient5.oscClient.send(message, (err) => {
							if (err) {
								console.error(new Error(err));
							}
						});
						break;
				}
			}

			if (['overview-toggled', 'slide-changed'].includes(event.eventName)) {
				console.log("1iframe", event, slideState)
				console.log("eventname type", event.eventData, typeof event.eventData)

				if (event.eventData != slideState) {
					//get Slides Extended Iframe
					let iframeDiv = document.getElementsByClassName("reveal-preview-view")[0]
					console.log("iframe Parent", iframeDiv)
					const iframe = iframeDiv.getElementsByTagName('iframe')[0];
					console.log("2iframe", iframe)
					
					const data = event.eventData
					console.log("Event data", data)
					data.indexf = data.indexf ? data.indexf : 0;
					console.log("fragment number",data.indexf)

					console.log("event Name slide changed", event.eventName === 'slide-changed')
					if (event.eventName === 'overview-toggled') {
						iframe.contentWindow.postMessage(JSON.stringify({ method: 'toggleOverview', args: [data.overview] }), '*');
					} 

					if(event.eventName === 'slide-changed') {
						iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.indexh, data.indexv, data.indexf] }), '*');
						iframe.contentWindow.postMessage( JSON.stringify({ method: 'togglePause', args: [ data.paused ] }), '*' );
        
					}
				}
			}
		});		 

	function sendToOBS(msgParam, eventName) {
		//console.log("sending message:", JSON.stringify(msgParam));
		const webSocketMessage = JSON.stringify(msgParam);
		//send results to OBS Browser Source
		obs.call("CallVendorRequest", {
			vendorName: "obs-browser",
			requestType: "emit_event",
			requestData: {
				event_name: eventName,
				event_data: { 
					webSocketMessage 
				},
			},
		});
	}
	// #endregion

//		
// #region Open OBS feature
// 
//
//	Execute a command line to Open OBS

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
						  //console.error(`execAsync error: ${error}`);
						  return;
					  }
					  //console.log(`stdout: ${stdout}`);
					  //console.error(`stderr: ${stderr}`);
					});
				  }
				//console.log(commandString)

				}
			}
		)

// #endregion

//	
//	#region Get Scenes from OBS feature
//  1. populate the settings 

		this.addCommand({
			id: 'get-obs-scene-tags',
			name: 'Get OBS tags',
			callback: async() => {
		//this.addRibbonIcon("image-down","get OBS Scene Options", async () =>{
			new Notice("Getting OBS Tags");
			
			//create Scene Template Notes
				const sceneList = await obs.call("GetSceneList");
				const excludeList = ['Set Camera','Slides', '----------SETTINGS----------', '----------SCENES----------', '----------SOURCES----------', '----------OPTIONS----------'];
				sceneList.scenes.forEach(async (scene, index) => {
					console.log("scene ", scene, !excludeList.includes(scene.sceneName));
					if(!excludeList.includes(scene.sceneName)){
						const sceneName = scene.sceneName;
						console.log(sceneName)
						this.settings.scene_tags.push(sceneName);
					}
					// find scenes starting with "scene"
					// if (scene.sceneName.startsWith("scene|||")) {
					// 	const sceneName = scene.sceneName.split("|||");
						
						// let fileName = `Scene - ${sceneName[1]}`;
						// let existing = await this.app.vault.adapter.exists(normalizePath(`_slide_Tags/${fileName}`));
						// if (!existing) {
						// 	await this.app.vault.create(`_slide_Tags/${fileName}.md`, 
						// 		``,
						// 	);		
						// }
					//}	
				});
				
			//create Camera Template Notes
				let cameraSources = await obs.call("GetSceneItemList", { sceneName: "Camera Position" });
				console.log(cameraSources)
				cameraSources.sceneItems.forEach(async(source, index) => {
					console.log(cameraSources)
					this.app.plugins.plugins['slides-studio'].settings.camera_tags.push(source.sourceName)
				});

				cameraSources = await obs.call("GetSceneItemList", { sceneName: "Camera Overlay Position" });
				cameraSources.sceneItems.forEach(async(source, index) => {
					this.app.plugins.plugins['slides-studio'].settings.camera_overlay_tags.push(source.sourceName)
				});
             //End of get scene function
			//  obs.disconnect();
			return
			}})

			// this.addCommand({
			// 	id: 'insert-entrance-tag',
			// 	name: 'Insert slide entrance tag',
			// 	editorCallback: (editor: Editor, view: MarkdownView) => {
			// 		new UUhimsyEntranceSuggest(this.app).open();
			// 	}
			// });

			// this.addCommand({
			// 	id: 'insert-exit-tag',
			// 	name: 'Insert slide exit tag',
			// 	editorCallback: (editor: Editor, view: MarkdownView) => {
			// 		new UUhimsyExitSuggest(this.app).open();
			// 	}
			// });
// #endregion

//	
//	#region Copy Slides Studio Webpages from plugin folder to vault
//
//  Files to be used with the Slides Extended web server
// 	localhost:5000/slides-studio/speaker-view.html
//
	this.addCommand({
		id: 'add-slide-studio-speaker-view',
		name: 'Add Slide Studio Speaker View to vault',
		callback: async() => {
				new Notice("Adding Slide Studio files to vault");
				
				const srcPath = `${this.app.vault.adapter.basePath}/.obsidian/plugins/slides-studio/slides_studio`
				const destPath = `${this.app.vault.adapter.basePath}/slides_studio`
				//Copy files from plugin folder to vault root
				//recursive option used to copy directory			
				this.app.vault.adapter.fsPromises.cp(srcPath, destPath,{recursive:true})
			}
	})
	// #endregion

//	
//	#region Open Slides in browser
//
//
	this.addCommand({
		id: 'open-slide-studio-speaker-view',
		name: 'Open the Slide Studio Speaker View in an external browser',
		callback: async() => {
			const port = this.app.plugins.plugins['slides-extended'].settings.port
			new Notice(`Opening Speaker View on port ${port}`);
				// window.open(`http://localhost:${port}/slides_studio/speakerView.html`)
				window.open(`http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/speakerView.html`)
			}
		})
		
		this.addCommand({
			id: 'open-slides-in-browser',
			name: 'Open the Slides in an external browser',
			callback: async() => {
				const port = this.app.plugins.plugins['slides-extended'].settings.port
				new Notice(`Opening Slides on port ${port}`);
				//window.open(`http://localhost:${port}/slides_studio/slides.html`)
				window.open(`http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/slides.html`)
			}
		})
		
		this.addCommand({
			id: 'copy-obs-browser-source-link',
			name: 'Copy the Slides Url for OBS to the clipboard ',
			callback: async() => {
				const port = this.app.plugins.plugins['slides-extended'].settings.port
				const obsURL = `http://localhost:${port}/.obsidian/plugins/slides-studio/slides_studio/slides_studio_OBS_browser_source.html`
				try {
					await navigator.clipboard.writeText(obsURL);
					new Notice('URL copied to clipboard successfully!');
				} catch (err) {
					console.error('Failed to copy: ', err);
				}
				//window.open(`http://localhost:${port}/slides_studio/slides.html`)
			}
		})
	// #endregion

// #region OSC Functions

	//
	// #region Connect to OCS device 1 
	//

	this.addCommand({
		id: 'connect-to-osc-1',
		name: 'Connect to OCS device 1',
		callback: async () => {
			new Notice("Starting OSC Server");
			let oscName = this.app.plugins.plugins['osc-to-websocket'].settings.oscName1_Text; 
			let oscIP = this.app.plugins.plugins['osc-to-websocket'].settings.oscIP1_Text;
			let oscInPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscInPort1_Text;
			let oscOutPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscOutPort1_Text;
			oscClient1.oscClient = new Client(oscIP, oscOutPORT);
			oscClient1.oscName = oscName;

			/*
			*Create an OSC Server connection
			*OSC app -- to--> OBS
			*/
			
			const oscServer1 = new Server(oscInPORT, oscIP);
			
			oscServer1.on("listening", () => {
				//console.log("OSC Server is listening.");
				new Notice(`OSC Server ${oscName} is listening.`);
			});
			
			oscServer1.on("message", (msg) => {
				console.log(`Message 1: ${msg}`);
				sendToOBS(msg, "osc-message");
			});
		}
	})
	
	// #endregion
	
//
// #region Connect to OCS device 2 
//

	this.addCommand({
		id: 'connect-to-osc-2',
		name: 'Connect to OCS device 2',
		callback: async () => {
			new Notice("Starting OSC Server 2");
			let oscName = this.app.plugins.plugins['osc-to-websocket'].settings.oscName2_Text; 
			let oscIP = this.app.plugins.plugins['osc-to-websocket'].settings.oscIP2_Text;
			let oscInPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscInPort2_Text;
			let oscOutPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscOutPort2_Text;
			oscClient2.oscClient = new Client(oscIP, oscOutPORT);
			oscClient2.oscName = oscName;

			/*
			*Create an OSC Server connection
			*OSC app -- to--> OBS
			*/
			
			const oscServer2 = new Server(oscInPORT, oscIP);
			
			oscServer2.on("listening", () => {
				//console.log("OSC Server is listening.");
				new Notice(`OSC Server ${oscName} is listening.`);
			});
			
			oscServer2.on("message", (msg) => {
				console.log(`Message 2: ${msg}`);
				sendToOBS(msg, "osc-message");
			});
		}
	})

// #endregion

//
// #region Connect to OCS device 3
//

	this.addCommand({
		id: 'connect-to-osc-3',
		name: 'Connect to OCS device 3',
		callback: async () => {
			new Notice("Starting OSC Server 3");
			let oscName = this.app.plugins.plugins['osc-to-websocket'].settings.oscName3_Text; 
			let oscIP = this.app.plugins.plugins['osc-to-websocket'].settings.oscIP3_Text;
			let oscInPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscInPort3_Text;
			let oscOutPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscOutPort3_Text;
			oscClient3.oscClient = new Client(oscIP, oscOutPORT);
			oscClient3.oscName = oscName;

			/*
			*Create an OSC Server connection
			*OSC app -- to--> OBS
			*/
			
			const oscServer3 = new Server(oscInPORT, oscIP);
			
			oscServer3.on("listening", () => {
				//console.log("OSC Server is listening.");
				new Notice(`OSC Server ${oscName} is listening.`);
			});
			
			oscServer3.on("message", (msg) => {
				console.log(`Message 3: ${msg}`);
				sendToOBS(msg, "osc-message");
			});
		}
	})

// #endregion

//
// #region Connect to OCS device 4
//

	this.addCommand({
		id: 'connect-to-osc-4',
		name: 'Connect to OCS device 4',
		callback: async () => {
			new Notice("Starting OSC Server 4");
			let oscName = this.app.plugins.plugins['osc-to-websocket'].settings.oscName4_Text; 
			let oscIP = this.app.plugins.plugins['osc-to-websocket'].settings.oscIP4_Text;
			let oscInPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscInPort4_Text;
			let oscOutPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscOutPort4_Text;
			oscClient4.oscClient = new Client(oscIP, oscOutPORT);
			oscClient4.oscName = oscName;

			/*
			*Create an OSC Server connection
			*OSC app -- to--> OBS
			*/
			
			const oscServer4 = new Server(oscInPORT, oscIP);
			
			oscServer4.on("listening", () => {
				//console.log("OSC Server is listening.");
				new Notice(`OSC Server ${oscName} is listening.`);
			});
			
			oscServer4.on("message", (msg) => {
				console.log(`Message 4: ${msg}`);
				sendToOBS(msg, "osc-message");
			});
		}
	})

// #endregion

//
// #region Connect to OCS device 5
//

	this.addCommand({
		id: 'connect-to-osc-5',
		name: 'Connect to OCS device 5',
		callback: async () => {
			new Notice("Starting OSC Server 5");
			let oscName = this.app.plugins.plugins['osc-to-websocket'].settings.oscName5_Text; 
			let oscIP = this.app.plugins.plugins['osc-to-websocket'].settings.oscIP5_Text;
			let oscInPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscInPort5_Text;
			let oscOutPORT = this.app.plugins.plugins['osc-to-websocket'].settings.oscOutPort5_Text;
			oscClient5.oscClient = new Client(oscIP, oscOutPORT);
			oscClient5.oscName = oscName;

			/*
			*Create an OSC Server connection
			*OSC app -- to--> OBS
			*/
			
			const oscServer5 = new Server(oscInPORT, oscIP);
			
			oscServer5.on("listening", () => {
				//console.log("OSC Server is listening.");
				new Notice(`OSC Server ${oscName} is listening.`);
			});
			
			oscServer5.on("message", (msg) => {
				console.log(`Message 5: ${msg}`);
				sendToOBS(msg, "osc-message");
			});
		}
	})

// #endregion
// #endregion OSC end
}


async openView(){
	const { workspace } = this.app;
	let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(SLIDES_STUDIO_VIEW_TYPE);
	
    if (leaves.length > 0) {
		// A leaf with our view already exists, use that
		leaf = leaves[0];
		
    } else {
		// Our view could not be found in the workspace, create a new leaf
		// in the right sidebar for it
		leaf = workspace.getRightLeaf(false);
		await leaf.setViewState({ type: SLIDES_STUDIO_VIEW_TYPE, active: true });
    }
	
    // "Reveal" the leaf in case it is in a collapsed sidebar
    workspace.revealLeaf(leaf);
}

	onunload() {
		new Notice("Disabled slides studio plugin")
	}
}
