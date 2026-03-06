let slideState = '';

async function broadcastSC(eventName, eventData) {
    if (window.scSocket && window.scSocket.state === 'open') {
        window.scSocket.transmitPublish('custom_slidesCommands', { eventName, msgParam: eventData });
    } else {
        // Fallback to legacy API
        try {
            await fetch('/api/custom/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'slidesCommands',
                    data: { eventName, msgParam: eventData }
                })
            });
        } catch (e) {
            console.error("Failed to broadcast command", e);
        }
    }
}

// Subscribe to remote changes via SocketCluster
(async () => {
    while (!window.scSocket) {
        await new Promise(r => setTimeout(r, 100));
    }

    const channel = window.scSocket.subscribe('custom_slidesCommands');
    for await (let data of channel) {
        const { eventName, msgParam } = data;
        
        if (eventName === 'slide-changed') {
            const revealState = msgParam.slideState || msgParam;
            const newState = JSON.stringify(revealState);
            if (newState === slideState) continue;
            
            console.log("[SlideSync] Received remote slide-changed via SC. Updating local state.");
            slideState = newState;
            
            let slidesState;
            if (msgParam.slideState) {
                slidesState = msgParam.slideState.split(",").map(v => Number(v));
            } else if (typeof msgParam.indexh !== 'undefined') {
                slidesState = [msgParam.indexh, msgParam.indexv, msgParam.indexf || 0];
            }

            if (slidesState) {
                const iframe = document.getElementById("revealIframe");
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: slidesState }), '*');
                }
            }
        } else if (eventName === 'overview-toggled') {
            const newState = JSON.stringify(msgParam);
            if(newState !== slideState){
                console.log("[SlideSync] Received remote overview-toggled via SC.");
                slideState = newState;
                const iframe = document.getElementById("revealIframe")
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(JSON.stringify({ method: 'toggleOverview', args: [ msgParam.overview ] }), '*');
                }
            }
        } else if (eventName === 'set-slides-studio-url') {
             const url = msgParam.url;
             if (url) updateIframeUrl(url);
        }
    }
})();

function updateIframeUrl(url) {
    const oldIframe = document.getElementById("revealIframe");
    if (oldIframe) {
        console.log("[SlideSync] Recreating iframe for clean load:", url);
        const parent = oldIframe.parentNode;
        const newIframe = document.createElement("iframe");
        newIframe.id = "revealIframe";
        const currentClass = oldIframe.className.includes("full-screen") ? "full-screen" : (oldIframe.className.includes("side-by-side") ? "side-by-side" : "over-the-shoulder");
        newIframe.className = "slide-position " + currentClass;
        newIframe.setAttribute("allow", "autoplay; fullscreen");
        newIframe.style.width = "100%";
        newIframe.style.height = "100%";
        newIframe.src = url;
        parent.replaceChild(newIframe, oldIframe);
    }
}

// Message from Reveal Slides iFrame API
window.addEventListener('message', async (event) => {
    try {
        let data = JSON.parse(event.data);
        
        if (data.namespace === 'reveal' && data.state) {
            const newState = JSON.stringify(data.state);
            if (newState !== slideState) {
                console.log(`[SlideSync] Local ${data.eventName} detected. Broadcasting via SocketCluster...`);
                slideState = newState;
                broadcastSC(data.eventName, data.state);
            }
        }
    } catch (e) {
        // Not a JSON message or not from Reveal
    }
});
