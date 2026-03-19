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
                const settings = getSketchSettings(filename);
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
                    // Use 'input' event for real-time slider/picker updates
                    el.addEventListener('input', publishSettings);
                    // Use 'change' for checkboxes/selects
                    el.addEventListener('change', publishSettings);
                });
            } else {
                setTimeout(() => attachEventListeners(retries - 1), 200);
            }
        };

        // Start attaching listeners after a delay to allow p5 setup to run
        setTimeout(attachEventListeners, 1000);

        // Fallback sync loop for things that don't trigger events (if any)
        const syncLoop = () => {
            publishSettings();
            requestAnimationFrame(syncLoop);
        };
        
        // Wait for setup to complete before starting fallback sync
        setTimeout(syncLoop, 2000);

        // Expose publishSettings globally for manual triggers from other scripts
        window.publishStgSettings = publishSettings;

    } else {
        console.log(`STG Display Mode: ${channelName}`);
        
        // Hide UI immediately and periodically to ensure new elements are hidden
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
        // This avoids conflicts between initial preset load and real-time updates
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

        // Load preset if provided in query param
        if (urlParams.has('preset')) {
            const presetName = urlParams.get('preset');
            console.log(`STG: Loading initial preset: ${presetName}`);
            (async () => {
                try {
                    const APP_FOLDER = "apps/space_type_generator/presets";
                    const presetFilename = presetName.endsWith('.json') ? presetName : `${presetName}.json`;
                    const response = await fetch(`/api/file/get?folder=${APP_FOLDER}&filename=${presetFilename}`);
                    if (response.ok) {
                        const json = await response.json();
                        console.log(`STG: Preset loaded successfully:`, json);
                        
                        const applyWhenReady = (retries = 20) => {
                            const p5Ready = typeof typeXSlider !== 'undefined' || 
                                          typeof innerHSlider !== 'undefined' || 
                                          typeof strokeColorPicker !== 'undefined' ||
                                          typeof typeSlider !== 'undefined' ||
                                          typeof scalarSlider !== 'undefined' ||
                                          (document.getElementById("fontChange") && document.getElementById("fontChange").options.length > 0);

                            if (typeof setSketchSettings === 'function' && (p5Ready || retries <= 0)) {
                                console.log(`STG: Applying initial preset settings (p5Ready: ${p5Ready})`);
                                setSketchSettings(json);
                            } else if (retries > 0) {
                                setTimeout(() => applyWhenReady(retries - 1), 100);
                            }
                        };
                        
                        applyWhenReady();
                    }
                } catch (e) {
                    console.error(`STG: Error fetching preset:`, e);
                }
            })();
        }
    }
})();
