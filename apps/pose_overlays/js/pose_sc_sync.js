import { create } from '../../lib/socketcluster-client.min.js';

(async () => {
    const isSettingsPage = window.location.pathname.includes('_settings.html');
    const filename = window.location.pathname.split('/').pop().replace('_settings.html', '').replace('.html', '');
    const settingsChannelName = `pose_${filename}_setting`;

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/',
        authToken: { name: `Pose-Sync: ${filename}${isSettingsPage ? ' (Settings)' : ''}` }
    });

    // Handle Landmark Data
    const urlParams = new URLSearchParams(window.location.search);
    let landmarkChannelName = urlParams.get('channel') || 'default_pose_channel';
    
    // If the channel name doesn't have a prefix, assume it's a MediaPipe vision task name
    if (!landmarkChannelName.includes('mediapipe_in_')) {
        landmarkChannelName = `mediapipe_in_${landmarkChannelName}`;
    }

    const landmarkChannel = socket.subscribe(landmarkChannelName);
    (async () => {
        for await (let data of landmarkChannel) {
            // Support new MediaPipeManager format (data.result) and legacy formats
            if (data.result) {
                const res = data.result;
                if (data.type === 'pose' && res.landmarks) {
                    window.cur_data = res.landmarks[0];
                } else if (data.type === 'face' && res.faceLandmarks) {
                    window.cur_data = res.faceLandmarks[0];
                } else if (data.type === 'hand' && res.landmarks) {
                    window.cur_data = res.landmarks[0];
                }
            } else if (data.type === 'pose' && data.payload?.landmarks) {
                window.cur_data = data.payload.landmarks[0];
            } else if (data.type === 'face' && data.payload?.faceLandmarks) {
                window.cur_data = data.payload.faceLandmarks[0];
            } else if (data.type === 'hands' && data.payload?.landmarks) {
                window.cur_data = data.payload.landmarks[0];
            } else if (data.poseLandmarkerResult) {
                window.cur_data = Array.isArray(data.poseLandmarkerResult[0]) ? data.poseLandmarkerResult[0] : data.poseLandmarkerResult;
            } else if (Array.isArray(data)) {
                window.cur_data = Array.isArray(data[0]) ? data[0] : data;
            }
        }
    })();

    if (isSettingsPage) {
        console.log(`Pose Settings Mode: ${settingsChannelName}`);
        
        let lastSettings = "";
        
        const syncLoop = () => {
            if (typeof getSketchSettings === 'function') {
                const settings = getSketchSettings(filename);
                const settingsStr = JSON.stringify(settings);
                if (settingsStr !== lastSettings) {
                    socket.transmitPublish(settingsChannelName, settings);
                    lastSettings = settingsStr;
                }
            }
            requestAnimationFrame(syncLoop);
        };
        
        // Wait for setup to complete before starting sync
        setTimeout(syncLoop, 2000);
    } else {
        console.log(`Pose Display Mode: ${settingsChannelName}`);
        
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
            const settingsChannel = socket.subscribe(settingsChannelName);
            (async () => {
                for await (let data of settingsChannel) {
                    if (typeof setSketchSettings === 'function') {
                        setSketchSettings(data);
                    }
                }
            })();
        } else {
            console.log(`Pose: Skipping settings sync to ${settingsChannelName} because preset is present.`);
        }
    }
})();
