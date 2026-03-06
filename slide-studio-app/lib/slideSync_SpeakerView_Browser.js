// This script runs in index.html (the viewer host)
// It handles synchronization of the local viewer iframes (current, upcoming, teleprompter)
// based on messages from the Studio "brain" and SocketCluster events.

(async () => {
    // Wait for scSocket to be available
    while (!window.scSocket) {
        await new Promise(r => setTimeout(r, 100));
    }

    console.log("[SpeakerViewerSync] Subscribing to custom_slidesCommands via SocketCluster...");
    const channel = window.scSocket.subscribe('custom_slidesCommands');
    
    for await (let data of channel) {
        // data is { eventName, msgParam }
        try {
            console.log("[SpeakerViewerSync] Received slidesCommand via SocketCluster:", data);

            if (data.eventName === "slide-changed") {
                const msgParam = data.msgParam;
                let slidesState;
                
                if (msgParam.slideState) {
                    slidesState = msgParam.slideState.split(",").map(value => Number(value));
                } else if (typeof msgParam.indexh !== 'undefined') {
                    slidesState = [msgParam.indexh, msgParam.indexv, msgParam.indexf || 0];
                }

                if (slidesState && typeof currentSlide !== 'undefined' && currentSlide.contentWindow) {
                    console.log("[SpeakerViewerSync] Navigating currentSlide to:", slidesState);
                    currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: slidesState }), "*");
                    currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'getSlideNotes' }), "*");
                }
            } else if (data.eventName === "overview-toggled") {
                const msgParam = data.msgParam;
                if (typeof currentSlide !== 'undefined' && currentSlide.contentWindow) {
                    currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'toggleOverview', args: [msgParam.overview] }), "*");
                }
            } else if (data.eventName === "navigate") {
                const msgParam = data.msgParam;
                if (typeof currentSlide !== 'undefined' && currentSlide.contentWindow) {
                    console.log("[SpeakerViewerSync] Executing remote navigation:", msgParam.method, msgParam.args);
                    currentSlide.contentWindow.postMessage(JSON.stringify({ method: msgParam.method, args: msgParam.args }), "*");
                }
            } else if (data.eventName === "indexing-complete") {
                console.log("[SpeakerViewerSync] Studio reported indexing complete.");
            } else if (data.eventName === "reveal-event") {
                const payload = data.msgParam;
                if (payload.state && typeof upcomingSlide !== 'undefined' && upcomingSlide.contentWindow) {
                    upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [payload.state.indexh, payload.state.indexv, payload.state.indexf] }), '*');
                    upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'next' }), '*');
                }
            }
        } catch (err) {
            console.error("[SpeakerViewerSync] Error processing SocketCluster message:", err);
        }
    }
})();
