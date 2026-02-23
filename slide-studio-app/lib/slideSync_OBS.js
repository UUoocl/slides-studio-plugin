let slideState = '';

async function broadcastSSE(eventName, eventData) {
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
        console.error("Failed to broadcast SSE", e);
    }
}

//Message from Reveal Slides iFrame API
window.addEventListener('message', async (event) => {
    try {
        let data = JSON.parse(event.data);
        
        if (data.namespace === 'reveal' && data.state) {
            const newState = JSON.stringify(data.state);
            if (newState !== slideState) {
                console.log(`[SlideSync] Local ${data.eventName} detected. Broadcasting via SSE...`);
                slideState = newState;
                broadcastSSE(data.eventName, data.state);
            }
        }
    } catch (e) {
        // Not a JSON message or not from Reveal
    }
});

//Message from OBS WebSocket Client (SSE Proxy)
window.addEventListener('slide-changed', async (event) => {
    try {
        const data = JSON.parse(event.detail.webSocketMessage);
        
        const revealState = data.state || data;
        const newState = JSON.stringify(revealState);
        if (newState === slideState) return;
        
        console.log("[SlideSync] Received remote slide-changed. Updating local state.");
        slideState = newState;
        
        if (typeof revealState.indexh !== 'undefined') {
            const slidesState = [revealState.indexh, revealState.indexv, revealState.indexf || 0];
            const iframe = document.getElementById("revealIframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage( JSON.stringify({ method: 'slide', args: slidesState }), '*' );
            }
        }
    } catch (e) {
        console.error("Error handling slide-changed event", e);
    }
})

//Message from OBS WebSocket Client (SSE Proxy)
window.addEventListener('overview-toggled', async (event) => {
    try {
        const data = JSON.parse(event.detail.webSocketMessage);
        const newState = JSON.stringify(data);

        if(newState !== slideState){
            console.log("[SlideSync] Received remote overview-toggled. Updating local state.");
            slideState = newState;
            const iframe = document.getElementById("revealIframe")
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage( JSON.stringify({ method: 'toggleOverview', args: [ data.overview ] }), '*' );
            }
        }
    } catch (e) {
        console.error("Error handling overview-toggled event", e);
    }
})

//update slide deck URL
window.addEventListener('set-slides-studio-url', async (event) => {
    try {
        const data = JSON.parse(event.detail.webSocketMessage);
        const url = data.url;

        if (!url || typeof url !== 'string') {
            console.error('[SlideSync] Invalid URL received for set-slides-studio-url:', url);
            return;
        }

        console.log(`[SlideSync] Received set-slides-studio-url. Target URL: ${url}`);
        
        const oldIframe = document.getElementById("revealIframe");
        if (oldIframe) {
            console.log("[SlideSync] Recreating iframe to force clean load in OBS...");
            const parent = oldIframe.parentNode;
            const newIframe = document.createElement("iframe");
            
            // Copy attributes
            newIframe.id = "revealIframe";
            const currentClass = oldIframe.className.includes("full-screen") ? "full-screen" : (oldIframe.className.includes("side-by-side") ? "side-by-side" : "over-the-shoulder");
            newIframe.className = "slide-position " + currentClass;
            console.log(`[SlideSync] Applying class to new iframe: ${newIframe.className}`);
            newIframe.setAttribute("allow", "autoplay; fullscreen");
            newIframe.style.width = "100%";
            newIframe.style.height = "100%";
            newIframe.style.visibility = "visible";
            
            // Set listeners
            newIframe.onload = () => onIframeLoad();
            newIframe.onerror = () => onIframeError();
            
            // Swap
            parent.replaceChild(newIframe, oldIframe);
            
            // Set source with a slightly longer delay for OBS stability
            setTimeout(() => {
                console.log(`[SlideSync] Applying URL to new iframe: ${url}`);
                newIframe.src = url;
            }, 250);
        } else {
            console.error("[SlideSync] Cannot update URL: revealIframe element not found!");
        }
    } catch (e) {
        console.error("[SlideSync] Error handling set-slides-studio-url event", e);
    }
})
