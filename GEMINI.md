# Slides-Studio plugin

## Description 
Slides-Studio is a plugin for the electron app obsidian notes. Slides-Studio integrates obsidian and open broadcast studio(OBS). By connecting to the OBS websocket server Slides-Studio manages the state of OBS and Slides-Studio apps.

## Features
Slides-Studio has 2 features.  
 1. **Input bridge**   
Slides-Studio has a socketcluster server that handles input and output from OSC devices, MIDI devices, UVC Devices, Mouse, Keyboard, HTML apps, and OBS websocket server messages .  
 2. **Slide Tags View**   
Slides-Studio features an Obsidian view that allows the User to add tags to notes.  

## Architecture 
Obsidian has an API. 
Through the obsidian API Slides-Studio runs a npm packages.
* fastify server
* socketcluster-server
* socketcluster-client
* node-osc server 
* webMIDI
* obs-websocket-js
* @mediapipe/tasks-vision

Python Scripts are used to retrieve device data not available through Node js.  Slides-Studio uses sockets to communicate between python scripts and node js.  

## Bridge 
Slides-Studio bridges devices by creating input and output channels for each device. Input channels are from the device into Slides-plugin (device -> Slides-Studio). Output channels are from the client (either Slides-Studio or an HTML app) to a device (Slides-Studio -> device)
Slides-Studio plugin converts OBS websocket requests and events into socketcluster channels.

## Settings
* **Fastify** : the user can set the fastify server port. The port number can be set to 8080 to 65535. After setting a port, a check is performed to determine if the port is available. The server will listen on the localhost on the selected port.

* **OBS websocket server** - Users can set the IP, port and password of the OBS websocket server.  After setting the port a check is performed to notify the user if the port is available.

* **OBS** : Slide Studio uses system commands to open OBS. The User enters the executable name of OBS. "OBS" is the default OBS app name on macOS. Windows Users are prompted to enter the path to the OBS executable.  
The User can set the OBS Collection name.  
The User can set the OBS debug port and optionally check a box to launch OBS in debug mode. After setting the debug port a check is performed to notify the user if the port is available.  
Pressing an "Launch" button runs the command to open OBS.  
Below the "Launch" button is a "Connect" button.
Pressing the "Connect" button will start an OBS websocket connection in obsidian.  
After the obs web socket conneciton is successful, a check is performed for all OBS browser sources that contain the string “--slides-studio-refresh: 1;” in the css settings.  These sources should have their localhost URL updated to the fastify server port. 

* **Open sound control (OSC) devices** : the user can configure as many OSC devices as needed. An OSC server is created for each device the User adds.   
For each device the User sets a Name, OSC IP (localhost), Incoming Port to receive osc message and an outgoing port to send messages to the device.   After setting a osc receiving port a check is performed to ensure the port is available.  
The user can add osc device by clicking an "Add Device" button.  
The user set OSC device name is used as sse topics. Each device becomes an sse route in fastify. 
After configuring an OSC device settings the User can click "Connect device" to start the OSC Server for the device.  

* **Midi device** : the user can configure as many MIDI devices as needed.  
For each MIDI device the User sets a Name, Input Device, and an output device.  The User chooses input and Output devices from a drop list of available MIDI devices. 
The user can add a MIDI device by clicking an "Add Device" button.  
The user set MIDI device name is used as sse topics. Each device becomes an sse route in fastify. 
After configuring a MIDI device's settings the User can click "Connect device" to start listening for the device messages.  

* **Python Scripts** : Python scripts are used to monitor mouse, keyboard and uvc devices.  Socketcluster channels are used to communicate between the python scripts and Slides-Studio. 
* 
* **Python Installation** : The User sets the path and executable in a text field. If python is not found the setting description indicates "Python not found or invalid path.". If python is found the setting description includes "Python loaded: ${version}".  
The User sets a socket port to communicate between python and node. After setting a port a check is perfrmed to ensure the port is available. 

* **Python Mouse Monitor**: The User can toggle a switch to start and stop monitoring mouse inputs.  When Mouse Monitoring is enabled the User can choose which mouse inputs to monitor. 
    * Position
    * Click
    * Scroll

* **Python Keyboard Monitor** : The User can toggle a switch to start and stop monitoring keyboard inputs.  When Keyboard Monitoring is enabled the User can choose to show key combinations or only show single keys. A toggle switch is used to choose to show key combinations.

* **Python UVC-util bridge** : macOS Users can toggle a switch to start and stop uvc-util bridge to control camera settings.  The uvc-util bridge relies on a library.  The User sets the path to the dylib file. uvc-util is a macOS only feature.  

* **Save settings** : 
Settings are saves to an obsidian folder. the User can choose from a list of Obsidian Folders to save the settings to. The User can choose an existing file in the selected folder to overwite or type in a new file name. 

## Port availabity check
the Node net is used to check for port availablity.  The setting requesting a port check will update it's description to indicate if the port is available or in use. 

## Slides-Studio Tag View
The Slides-Studio includes an Obsidian View to allow the User to add tags to the open and in focus note.  The OBS websocket connection to get the OBS data to include in the tags.  OBS Scenes that start with "Scene" are made available.  The User can create key:value pairs to use as custom tags. 

## ESLint 
apply ESlint rules to @src/ files only. 

## Build
The Slides-Studio Build destination is an Obsidian vault 
Build the 
* src/

and copy these folders to the build destination
* pythonScripts/
* slide-studio-app/
* apps/

## This project's location relative to build destination
/parentFolder
    /Slides-studio-plugin SSE routes
    /slidesStudio-vault
    
## Obsidian Vault structure
/slidesStudio-vault
    /.obsidian
        /plugins
            /slides-studio
                manifest.json
                main.js
                styles.css
                /slide-studio-app
                /pythonScripts
    /apps
    /otherStuff