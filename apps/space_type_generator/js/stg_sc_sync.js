import { create } from '../../lib/socketcluster-client.min.js';

(async () => {
    const isSettingsPage = window.location.pathname.includes('_settings.html');
    const filename = window.location.pathname.split('/').pop();
    const appBaseName = filename.replace('_settings.html', '').replace('.html', '');
    const channelName = `stg_${appBaseName}`;
    const presetChannelName = `stg_apply_preset_${appBaseName}`;

    // Infer folder path relative to vault root
    const pathParts = window.location.pathname.split('/');
    pathParts.pop();
    const RELATIVE_APP_FOLDER = pathParts.slice(1).join('/');

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/',
        authToken: { name: `Stg-Sync: ${appBaseName}${isSettingsPage ? ' (Settings)' : ''}` }
    });

    window.stgSocket = socket;

    // Handle Input Sources
    const urlParams = new URLSearchParams(window.location.search);
    const inputSource = urlParams.get('inputSource') || 'keyboard';

    if (inputSource === 'audio') {
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
        const APP_FOLDER = RELATIVE_APP_FOLDER;
        const PRESET_FILE = `${appBaseName}_presets.json`;
        console.log(`STG: Loading preset: ${presetName} from ${PRESET_FILE} in ${APP_FOLDER}`);

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
                }
            }
        } catch (e) {
            console.error(`STG: Error fetching preset file:`, e);
        }
    };

    if (isSettingsPage) {
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

        const applyPresetChannel = socket.subscribe(presetChannelName);
        (async () => {
            for await (let data of applyPresetChannel) {
                if (data.presetName) {
                    isRealTimeSyncEnabled = false;
                    loadAndApplyPreset(data.presetName);
                }
            }
        })();

        if (urlParams.has('preset')) {
            loadAndApplyPreset(urlParams.get('preset'));
        }
    }
})();
