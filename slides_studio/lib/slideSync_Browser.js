let slideState = '';
const iframe = document.getElementById("revealIframe");

//Message from Reveal Slides iFrame API
window.addEventListener('message', async (event) => {
    //console.log(event)
    let data = JSON.parse(event.data);
    
    //on reveal slide change or pause
    if (data.namespace === 'reveal' && 
    ['paused','resumed','fragmentshown','fragmenthidden','slidechanged'].includes(data.eventName)) {
        console.log("Slide Changed", event)
        
        //if event 'state' doesn't equal settings 'state'
        if(JSON.stringify(data.state) != slideState){
            slideState = JSON.stringify(data.state);
            //send slide change to OBS
            sendToOBS(data.state, "slide-changed");	
        }
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

//Custom Event message from OBS
obs.on("CustomEvent", async function (event) {
    console.log("CUSTOMEVENT ",event.eventData, "var",slideState);
    console.log("CUSTOMEVENT =?", event.eventData === slideState);
    if(['overview-toggled','slide-changed'].includes(event.eventName)){
        if(event.eventData != slideState){
            console.log("update slide state");
            const data =JSON.parse(event.eventData)
            data.indexf = data.indexf ? data.indexf : 0;
            if(event.eventName === 'overview-toggled'){
                iframe.contentWindow.postMessage( JSON.stringify({ method: 'toggleOverview', args: [ data.overview ] }), '*' );
            }else{
                iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.indexh, data.indexv, data.indexf] }), '*');
                iframe.contentWindow.postMessage( JSON.stringify({ method: 'togglePause', args: [ data.paused ] }), '*' );
            }
        }
    } 
});

function sendToOBS(msgParam, eventName) {
    //console.log("sending message:", JSON.stringify(msgParam));
    const webSocketMessage = JSON.stringify(msgParam);
    //send results to OBS Browser Source
    obs.call("CallVendorRequest", {
        vendorName: "obs-browser",
        requestType: "emit_event",
        requestData: {
            event_name: eventName,
            event_data: { 
                webSocketMessage 
            },
        },
    });
}