import { create } from '../../lib/socketcluster-client.min.js';

(async () => {
    const isSettingsPage = window.location.pathname.includes('_settings.html');
    const filename = window.location.pathname.split('/').pop();
    const appBaseName = filename.replace('_settings.html', '').replace('.html', '');
    const channelName = `stg_${appBaseName}`;

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/',
        authToken: { name: `Stg-Sync: ${appBaseName}${isSettingsPage ? ' (Settings)' : ''}` }
    });

    // Handle Input Sources (Audio STT and Keyboard Press)
    const urlParams = new URLSearchParams(window.location.search);
    const inputSource = urlParams.get('inputSource') || 'keyboard';

    if (inputSource === 'audio') {
        console.log(`STG: Subscribing to SocketCluster channel: audio_stt`);
        (async () => {
            const audioChannel = socket.subscribe('audio_stt');
            for await (let data of audioChannel) {
                if (typeof window.setHotkeyText === 'function') {
                    console.log('Audio STT received via SC:', data);
                    const text = data.stt || data.text || (typeof data === 'string' ? data : "");
                    if (text) {
                        window.setHotkeyText(text);
                        window.hotKeyTimer = 5;
                    }
                }
            }
        })();
    } else {
        console.log(`STG: Subscribing to SocketCluster channel: keyboardPress`);
        (async () => {
            const kbChannel = socket.subscribe('keyboardPress');
            for await (let data of kbChannel) {
                if (typeof window.setHotkeyText === 'function') {
                    const keyData = data.data || data;
                    const displayKey = keyData.combo || keyData.key;
                    if (displayKey && displayKey.includes("+")) {
                        console.log('Hotkey received via SC:', displayKey);
                        window.setHotkeyText(displayKey);
                        window.hotKeyTimer = 3;
                    }
                }
            }
        })();
    }

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

        // Attach listeners to all p5-created inputs for real-time updates
        const attachEventListeners = (retries = 20) => {
            const p5Inputs = document.querySelectorAll('input, select, textarea');
            if (p5Inputs.length > 5 || retries <= 0) {
                console.log(`STG: Attaching listeners to ${p5Inputs.length} inputs`);
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
            if (typeof hideui === 'function') {
                hideui();
            }
            const p5Elements = document.querySelectorAll('input, button, select, textarea');
            p5Elements.forEach(el => {
                if (el.id !== 'defaultCanvas0' && el.style.display !== 'none') {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            });
        };

        setInterval(hideElements, 500);

        // Subscribe to real-time updates ONLY if no preset is provided
        if (!urlParams.has('preset')) {
            const channel = socket.subscribe(channelName);
            (async () => {
                for await (let data of channel) {
                    if (typeof setSketchSettings === 'function') {
                        setSketchSettings(data);
                    }
                }
            })();
        } else {
            console.log(`STG: Preset active, real-time sync on ${channelName} disabled.`);
        }

        // Load preset from dictionary JSON file if provided in query param
        if (urlParams.has('preset')) {
            const presetName = urlParams.get('preset');
            const APP_FOLDER = "apps/space_type_generator";
            const PRESET_FILE = `${appBaseName}_presets.json`;

            console.log(`STG: Loading initial preset: ${presetName} from ${PRESET_FILE}`);
            
            (async () => {
                try {
                    const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${PRESET_FILE}`);
                    if (response.ok) {
                        const presets = await response.json();
                        const settings = presets[presetName];
                        
                        if (settings) {
                            console.log(`STG: Preset found, applying settings:`, settings);
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
            })();
        }
    }
})();
