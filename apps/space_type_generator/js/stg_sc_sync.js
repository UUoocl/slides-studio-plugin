import { create } from '../../lib/socketcluster-client.min.js';

(async () => {
    const isSettingsPage = window.location.pathname.includes('_settings.html');
    const filename = window.location.pathname.split('/').pop().replace('_settings.html', '').replace('.html', '');
    const channelName = `stg_${filename}`;

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/',
        authToken: { name: `Stg-Sync: ${filename}${isSettingsPage ? ' (Settings)' : ''}` }
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
                    // Support payload from master_listener: { type, data: { key, combo } } or direct { key, combo }
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
        
        const syncLoop = () => {
            if (typeof getSketchSettings === 'function') {
                const settings = getSketchSettings(filename);
                const settingsStr = JSON.stringify(settings);
                if (settingsStr !== lastSettings) {
                    socket.transmitPublish(channelName, settings);
                    lastSettings = settingsStr;
                }
            }
            requestAnimationFrame(syncLoop);
        };
        
        // Wait for setup to complete before starting sync
        setTimeout(syncLoop, 2000);
    } else {
        console.log(`STG Display Mode: ${channelName}`);
        
        // Hide UI immediately and periodically to ensure new elements are hidden
        const hideElements = () => {
            if (typeof hideui === 'function') {
                hideui();
            }
            // Also hide p5 created elements which might not be caught by hideui
            const p5Elements = document.querySelectorAll('input, button, select, textarea');
            p5Elements.forEach(el => {
                if (el.id !== 'defaultCanvas0' && el.style.display !== 'none') {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            });
        };

        setInterval(hideElements, 500);

        if (!urlParams.has('preset')) {
            const channel = socket.subscribe(channelName);
            for await (let data of channel) {
                if (typeof setSketchSettings === 'function') {
                    setSketchSettings(data);
                }
            }
        } else {
            const presetName = urlParams.get('preset');
            console.log(`STG: Loading preset: ${presetName}`);
            (async () => {
                try {
                    const APP_FOLDER = "apps/space_type_generator/presets";
                    const presetFilename = presetName.endsWith('.json') ? presetName : `${presetName}.json`;
                    const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${presetFilename}`);
                    if (response.ok) {
                        const json = await response.json();
                        console.log(`STG: Preset loaded successfully:`, json);
                        
                        // Wait for p5 setup to be ready before applying settings
                        const applyWhenReady = (retries = 20) => {
                            // Check if setSketchSettings is available AND if some common p5 slider/picker variables exist
                            // This indicates that p5's setup() has run.
                            const p5Ready = typeof typeXSlider !== 'undefined' || 
                                          typeof innerHSlider !== 'undefined' || 
                                          typeof strokeColorPicker !== 'undefined' ||
                                          typeof typeSlider !== 'undefined' ||
                                          typeof scalarSlider !== 'undefined' ||
                                          typeof document.getElementById("fontChange")?.options?.length > 0;

                            if (typeof setSketchSettings === 'function' && (p5Ready || retries <= 0)) {
                                console.log(`STG: Applying preset settings (p5Ready: ${p5Ready}, retries left: ${retries})`);
                                setSketchSettings(json);
                            } else if (retries > 0) {
                                setTimeout(() => applyWhenReady(retries - 1), 100);
                            } else {
                                console.warn(`STG: Could not confirm p5 was ready after multiple retries, applying anyway.`);
                                setSketchSettings(json);
                            }
                        };
                        
                        applyWhenReady();
                    } else {
                        console.error(`STG: Failed to load preset: ${presetName} (Status: ${response.status})`);
                    }
                } catch (e) {
                    console.error(`STG: Error fetching preset:`, e);
                }
            })();
        }
    }
})();
