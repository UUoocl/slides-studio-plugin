// This script runs in index.html (the viewer host)
// It handles synchronization of the local viewer iframes (current, upcoming, teleprompter)
// based on messages from the Studio "brain" and SSE events.

// SSE listener for slide commands (Broadcasted by the Studio brain or other views)
const customSse = new EventSource('/api/events');
customSse.addEventListener('slidesCommands', (e) => {
    try {
        const data = JSON.parse(e.data);
        console.log("[SpeakerViewerSync] Received slidesCommand via SSE:", data);

        if (data.eventName === "slide-changed") {
            const msgParam = data.msgParam;
            let slidesState;
            
            if (msgParam.slideState) {
                // Format from Tabulator
                slidesState = msgParam.slideState.split(",").map(value => Number(value));
            } else if (typeof msgParam.indexh !== 'undefined') {
                // Format from Reveal.js
                slidesState = [msgParam.indexh, msgParam.indexv, msgParam.indexf || 0];
            }

            if (slidesState && typeof currentSlide !== 'undefined' && currentSlide.contentWindow) {
                console.log("[SpeakerViewerSync] Navigating currentSlide to:", slidesState);
                currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: slidesState }), "*");
                // Request updated notes for the teleprompter
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
            console.log("[SpeakerViewerSync] Studio reported indexing complete via SSE.");
        } else if (data.eventName === "reveal-event") {
            // Handle sync from other views if they broadcast reveal events
            const payload = data.msgParam;
            if (payload.state && typeof upcomingSlide !== 'undefined' && upcomingSlide.contentWindow) {
                // Update Upcoming iframe (still local to index.html shell)
                upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [payload.state.indexh, payload.state.indexv, payload.state.indexf] }), '*');
                upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'next' }), '*');
            }
        }
    } catch (err) {
        console.error("[SpeakerViewerSync] Error processing SSE message:", err);
    }
});

customSse.onerror = (e) => {
    console.error("[SpeakerViewerSync] Custom SSE connection error", e);
};

// Legacy window message listener removed. All internal coordination now uses SSE.