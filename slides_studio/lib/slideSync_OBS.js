let slideState = '';

//Message from Reveal Slides iFrame API
window.addEventListener('message', async (event) => {
    //console.log(event)
    let data = JSON.parse(event.data);
    
    //on reveal slide change or pause
    if (data.namespace === 'reveal' && 
    ['paused','resumed','fragmentshown','fragmenthidden','slidechanged'].includes(data.eventName)) {
        console.log("Slide Changed", event)
        
        //Send CustomEvent to OBS webSocket clients
        slideState = data.state;
        console.log("sending custom message", slideState)
        obs.call("BroadcastCustomEvent", {
            eventData:{
                eventName:"slide-changed",
                eventData: slideState,
            }    
        });
    }
    
    //on overview mode
    if (data.namespace === 'reveal' && 
    ['overviewhidden','overviewshown'].includes(data.eventName)) {
        console.log("overview Changed", event)
        
        //Send CustomEvent to OBS webSocket clients
        slideState = data.state;
        console.log("sending custom message", slideState)
        obs.call("BroadcastCustomEvent", {
            eventData:{
                eventName:"overview-toggled",
                eventData: slideState,
            }    
        });
    }            
});

//Message from OBS WebSocket Client
window.addEventListener('slide-changed', async (event) => {
    console.log("received slide changed: ",event.detail.webSocketMessage);
    let data = JSON.parse(event.detail.webSocketMessage);
    
    //if event 'state' doesn't equal settings 'state'
    if(JSON.stringify(data) != slideState){

        slideState = JSON.stringify(data);
        
        data.indexf = data.indexf ? data.indexf : 0;
        console.log(slideState, JSON.stringify(data))
        
        iframe.contentWindow.postMessage( JSON.stringify({ method: 'slide', args: [ data.indexh, data.indexv, data.indexf ] }), '*' );
        iframe.contentWindow.postMessage( JSON.stringify({ method: 'togglePause', args: [ data.paused ] }), '*' );
        
        //Send CustomEvent to OBS webSocket clients
        obs.call("BroadcastCustomEvent", {
            eventData:{
                eventName:"slide-changed",
                eventData: slideState,
            }    
        });
    }
})

//Message from OBS WebSocket Client
window.addEventListener('overview-changed', async (event) => {
    console.log("received overviews changed: ",JSON.parse(event.detail.webSocketMessage));
    const data = JSON.parse(event.detail.webSocketMessage);

    //if event 'state' doesn't equal settings 'state'
    if(JSON.stringify(data) != slideState){
    
        slideState = JSON.stringify(data);

        iframe.contentWindow.postMessage( JSON.stringify({ method: 'toggleOverview', args: [ data.overview ] }), '*' );

        //Send CustomEvent to OBS webSocket clients
        obs.call("BroadcastCustomEvent", {
            eventData:{
                eventName:"overview-toggled",
                eventData: slideState
            }    
        });
    }
})
