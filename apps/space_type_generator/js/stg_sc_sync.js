import { create } from '../../lib/socketcluster-client.min.js';

(async () => {
    const isSettingsPage = window.location.pathname.includes('_settings.html');
    const filename = window.location.pathname.split('/').pop();
    const appBaseName = filename.replace('_settings.html', '').replace('.html', '');
    const channelName = `stg_${appBaseName}`;
    const presetChannelName = `stg_apply_preset_${appBaseName}`;

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/',
        authToken: { name: `Stg-Sync: ${appBaseName}${isSettingsPage ? ' (Settings)' : ''}` }
    });

    // Expose socket for other scripts (e.g., obsidian_save_load.js)
    window.stgSocket = socket;

    // Handle Input Sources (Audio STT and Keyboard Press)
    const urlParams = new URLSearchParams(window.location.search);
    const inputSource = urlParams.get('inputSource') || 'keyboard';

    if (inputSource === 'audio') {
        console.log(`STG: Subscribing to SocketCluster channel: audio_stt`);
        (async () => {
            const audioChannel = socket.subscribe('audio_stt');
            for await (let data of audioChannel) {
                if (typeof window.setHotkeyText === 'function') {
                    const text = data.stt || data.text || (typeof data === 'string' ? data : "");
                    if (text) {
                        window.setHotkeyText(text);
                        window.hotKeyTimer = 5;
                    }
                }
            }
        })();
    } else {
        (async () => {
            const kbChannel = socket.subscribe('keyboardPress');
            for await (let data of kbChannel) {
                if (typeof window.setHotkeyText === 'function') {
                    const keyData = data.data || data;
                    const displayKey = keyData.combo || keyData.key;
                    if (displayKey && displayKey.includes("+")) {
                        window.setHotkeyText(displayKey);
                        window.hotKeyTimer = 3;
                    }
                }
            }
        })();
    }

    // Helper to load and apply preset from dictionary file
    const loadAndApplyPreset = async (presetName) => {
        const APP_FOLDER = "apps/space_type_generator";
        const PRESET_FILE = `${appBaseName}_presets.json`;
        console.log(`STG: Loading preset: ${presetName} from ${PRESET_FILE}`);

        try {
            const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${PRESET_FILE}`);
            if (response.ok) {
                const presets = await response.json();
                const settings = presets[presetName];
                
                if (settings) {
                    const applyWhenReady = (retries = 20) => {
                        const p5Ready = typeof typeXSlider !== 'undefined' || 
                                      typeof ribbonCountSlider !== 'undefined' || 
                                      typeof bkgdColorPicker !== 'undefined';

                        if (typeof setSketchSettings === 'function' && (p5Ready || retries <= 0)) {
                            setSketchSettings(settings);
                        } else if (retries > 0) {
                            setTimeout(() => applyWhenReady(retries - 1), 100);
                        }
                    };
                    applyWhenReady();
                } else {
                    console.warn(`STG: Preset '${presetName}' not found in ${PRESET_FILE}`);
                }
            }
        } catch (e) {
            console.error(`STG: Error fetching preset file:`, e);
        }
    };

    if (isSettingsPage) {
        console.log(`STG Settings Mode: ${channelName}`);
        let lastSettings = "";
        
        const publishSettings = () => {
            if (typeof getSketchSettings === 'function') {
                const settings = getSketchSettings(appBaseName);
                const settingsStr = JSON.stringify(settings);
                if (settingsStr !== lastSettings) {
                    socket.transmitPublish(channelName, settings);
                    lastSettings = settingsStr;
                }
            }
        };

        const attachEventListeners = (retries = 20) => {
            const p5Inputs = document.querySelectorAll('input, select, textarea');
            if (p5Inputs.length > 5 || retries <= 0) {
                p5Inputs.forEach(el => {
                    el.addEventListener('input', publishSettings);
                    el.addEventListener('change', publishSettings);
                });
            } else {
                setTimeout(() => attachEventListeners(retries - 1), 200);
            }
        };
        setTimeout(attachEventListeners, 1000);

        const syncLoop = () => {
            publishSettings();
            requestAnimationFrame(syncLoop);
        };
        setTimeout(syncLoop, 2000);

        window.publishStgSettings = publishSettings;

    } else {
        console.log(`STG Display Mode: ${channelName}`);
        
        const hideElements = () => {
            if (typeof hideui === 'function') { hideui(); }
            const p5Elements = document.querySelectorAll('input, button, select, textarea');
            p5Elements.forEach(el => {
                if (el.id !== 'defaultCanvas0' && el.style.display !== 'none') {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            });
        };
        setInterval(hideElements, 500);

        // Subscribe to real-time updates ONLY if no preset is provided at startup
        let isRealTimeSyncEnabled = !urlParams.has('preset');

        if (isRealTimeSyncEnabled) {
            const channel = socket.subscribe(channelName);
            (async () => {
                for await (let data of channel) {
                    if (isRealTimeSyncEnabled && typeof setSketchSettings === 'function') {
                        setSketchSettings(data);
                    }
                }
            })();
        }

        // Listen for "apply preset" events from settings page
        const applyPresetChannel = socket.subscribe(presetChannelName);
        (async () => {
            for await (let data of applyPresetChannel) {
                if (data.presetName) {
                    console.log(`STG: Received applyPreset event: ${data.presetName}`);
                    isRealTimeSyncEnabled = false; // Disable real-time sync when a preset is applied
                    loadAndApplyPreset(data.presetName);
                }
            }
        })();

        // Load initial preset if provided in query param
        if (urlParams.has('preset')) {
            loadAndApplyPreset(urlParams.get('preset'));
        }
    }
})();
