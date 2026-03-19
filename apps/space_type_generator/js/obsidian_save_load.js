
const fullPath = window.location.pathname;
//get filename
let filename = fullPath.substring(fullPath.lastIndexOf("/") + 1);
// Remove the file extension and potential suffix
const appBaseName = filename.replace('_settings.html', '').replace('.html', '');
filename = filename.substring(0, filename.lastIndexOf(".")) || filename;

// In Slides Studio, apps are usually in /apps/ or /slide-studio-app/
// The URL is usually http://localhost:PORT/PARENT_DIR/apps/space_type_generator/stripes_settings.html
const pathParts = window.location.pathname.split('/');
pathParts.pop(); // Remove the filename
const RELATIVE_APP_FOLDER = pathParts.slice(1).join('/'); // e.g. "slides-studio-plugin/apps/space_type_generator"

// Get OBS Source Name from URL if available (passed from manage_source_settings.html)
const urlParams = new URLSearchParams(window.location.search);
const obsSourceName = urlParams.get('obsSourceName');

const saveStyle = document.createElement('style');

// Define your CSS rules as a string
const cssSave = `
  #obsidian-save-ui-layer {
    position: absolute;
    top: 0;
    left: 200px;
    right: 0;
    height: 40px;
    background: #33333301;
    border-bottom: 1px solid #444;
    display: flex;
    align-items: center;
    padding: 0 10px;
    gap: 10px;
    z-index: 0;
  }
`;

// Add the CSS string to the style element
saveStyle.appendChild(document.createTextNode(cssSave));


// Append the style element to the head
document.head.appendChild(saveStyle);

const newDiv = document.createElement('div');
newDiv.id = 'obsidian-save-ui-layer';
newDiv.innerHTML = `<span>Preset Name</span>
    <input type="text" id="settingsName" placeholder="My Preset" value="default">
    <button onclick="saveSettings()">Save</button>
    <select id="loadSelect"><option>Loading...</option></select>
    <button onclick="loadSettings()">Apply</button>
    ${obsSourceName ? `<span style="font-size: 10px; color: #888; margin-left: 10px;">Source: ${obsSourceName}</span>` : ''}`;

// 2. Prepend the new element to the body
document.body.prepend(newDiv);


// --- Save / Load Logic (Dictionary based) ---
const APP_FOLDER = RELATIVE_APP_FOLDER;
const PRESET_FILE = `${appBaseName}_presets.json`;

window.saveSettings = async () => {
  const presetName = document.getElementById("settingsName").value || "default";
  const currentSettings = getSketchSettings(appBaseName);

  try {
    // 1. Fetch current presets dictionary
    let presets = {};
    const getResponse = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${PRESET_FILE}`);
    if (getResponse.ok) {
        presets = await getResponse.json();
    }

    // 2. Update/Add new preset
    presets[presetName] = currentSettings;

    // 3. Save the whole dictionary back
    const response = await fetch("/api/file/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder: APP_FOLDER,
        filename: PRESET_FILE,
        data: presets,
      }),
    });
    const res = await response.json();
    if (res.success) {
      refreshLoadList();
    } else {
      alert("Error: " + res.error);
    }
  } catch (e) {
    console.error("Save Error:", e);
    alert("Server Error during Save");
  }
};

window.loadSettings = async () => {
  const select = document.getElementById("loadSelect");
  const presetName = select.value;
  if (!presetName || presetName === "select") return;

  try {
    const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${PRESET_FILE}`);
    if (!response.ok) throw new Error("Preset file not found");

    const presets = await response.json();
    const settings = presets[presetName];

    if (settings) {
        // 1. Apply to the current settings page UI
        setSketchSettings(settings);
        document.getElementById("settingsName").value = presetName;
        
        // 2. Broadcast the PRESET NAME via SocketCluster for the render page
        if (window.stgSocket) {
            console.log(`STG: Broadcasting applyPreset: ${presetName}`);
            window.stgSocket.transmitPublish(`stg_apply_preset_${appBaseName}`, { presetName });
            
            // 3. Update OBS Browser Source URL if we have the source name
            if (obsSourceName) {
                try {
                    // Fetch current settings to get the base URL
                    const obsResponse = await window.stgSocket.invoke('obsRequest', {
                        requestType: 'GetInputSettings',
                        requestData: { inputName: obsSourceName }
                    });
                    
                    const currentUrl = obsResponse.inputSettings.url;
                    if (currentUrl) {
                        const url = new URL(currentUrl);
                        if (url.searchParams.get('preset') !== presetName) {
                            url.searchParams.set('preset', presetName);
                            console.log(`STG: Updating OBS source '${obsSourceName}' URL to: ${url.toString()}`);
                            
                            await window.stgSocket.invoke('obsRequest', {
                                requestType: 'SetInputSettings',
                                requestData: {
                                    inputName: obsSourceName,
                                    inputSettings: { url: url.toString() },
                                    overlay: true
                                }
                            });
                        }
                    }
                } catch (obsErr) {
                    console.error('STG: Failed to update OBS source URL:', obsErr);
                }
            }
        }
        
        // 4. Also broadcast real-time settings update
        if (typeof window.publishStgSettings === 'function') {
            window.publishStgSettings();
        }
    } else {
        alert("Preset not found in file");
    }
  } catch (e) {
    console.error(e);
    alert("Error loading settings");
  }
};

async function refreshLoadList() {
  try {
    const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${PRESET_FILE}`);
    const select = document.getElementById("loadSelect");
    if (select) {
        select.innerHTML = "";
        const opt1 = document.createElement("option");
        opt1.value = "select";
        opt1.innerText = "select preset";
        opt1.disabled = true;
        select.appendChild(opt1);
        select.value = "select";

        if (response.ok) {
            const presets = await response.json();
            Object.keys(presets).sort().forEach((name) => {
                const opt = document.createElement("option");
                opt.value = name;
                opt.innerText = name;
                select.appendChild(opt);
            });
        }
    }
  } catch (e) {
    console.error("Could not fetch preset list", e);
  }
}

refreshLoadList();
