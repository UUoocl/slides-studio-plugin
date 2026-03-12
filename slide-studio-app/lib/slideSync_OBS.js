let slideState = '';

async function broadcastSC(eventName, eventData) {
    if (window.scSocket && window.scSocket.state === 'open') {
        window.scSocket.transmitPublish('slides/navigation', { eventName, msgParam: eventData });
        // Legacy support during transition
        window.scSocket.transmitPublish('slides_navigation', { eventName, msgParam: eventData });
    }
}

// Subscribe to remote changes via SocketCluster
(async () => {
    while (!window.scSocket) {
        await new Promise(r => setTimeout(r, 100));
    }

    // Subscribe specifically to the broadcast navigation channel (both new and legacy)
    const channels = ['slides/navigation', 'slides_navigation'];
    
    channels.forEach(chanName => {
        (async () => {
            const channel = window.scSocket.subscribe(chanName);
            for await (let data of channel) {
                const { eventName, msgParam } = data;
                
                if (eventName === 'slide-changed' || eventName === 'reveal-event') {
                    const revealState = msgParam.state || msgParam.slideState || msgParam;
                    const newState = JSON.stringify(revealState);
                    if (newState === slideState) continue;
                    
                    slideState = newState;
                    
                    let slidesState;
                    if (msgParam.slideState && typeof msgParam.slideState === 'string') {
                        slidesState = msgParam.slideState.split(",").map(v => Number(v));
                    } else if (revealState && typeof revealState.indexh !== 'undefined') {
                        slidesState = [revealState.indexh, revealState.indexv, revealState.indexf || 0];
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
    });
})();

function updateIframeUrl(url) {
    const oldIframe = document.getElementById("revealIframe");
    if (oldIframe) {
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
                slideState = newState;
                // OBS views report their state back to Studio too
                if (window.scSocket && window.scSocket.state === 'open') {
                    window.scSocket.transmitPublish('slides/current_to_studio', { eventName: 'reveal-event', msgParam: data });
                    // Legacy support
                    window.scSocket.transmitPublish('currentSlide_to_studio', { eventName: 'reveal-event', msgParam: data });
                }
            }
        }
    } catch (e) { }
});
