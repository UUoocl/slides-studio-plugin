let slideState = '';

//handle slide change message
//send slide change from slides iframe to table iframe
//send slide change from table iframe to slides iframe
//
//send changes to OBS browser source
//send table data to OBS browser source

//Message from page iFrames
window.addEventListener('message', async (event) => {

    //Run these functions after the iframe in this page has loaded
    if(event.origin !== window.location.origin || slidesLoaded == false){ 
        return;
    }

    // console.log(event)
    //read the message data
    let data = JSON.parse(event.data);

//#region messages from tabulator Iframe
    //when a row in the tabulator is selected, send the row data to the current slide iframe
    if (data.namespace === 'tabulator' && data.eventName === "rowSelected"){
        console.log("row selected message received.", JSON.stringify(data))
        console.log("var slide state", data.row.slideState.split(','))
        //post slide change to current Iframe
        currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: data.row.slideState.split(',')}), window.location.origin);
        //send row data to OBS
        sendToOBS(data.row, "slide-changed")
    }

//#endregion

    //
    //#region Notes message

    //when slides are ready get notes from the first slide
    if (data.namespace === 'reveal' && 
        ['ready'].includes(data.eventName)) {
        const currentSlide_iframe = document.getElementById("current-iframe");
        currentSlide_iframe.contentWindow.postMessage(JSON.stringify({ method: 'getSlideNotes'}), '*');
        
        //the slide iframe shouldn't open the speakerview pop up window
        currentSlide_iframe.contentWindow.postMessage(JSON.stringify({ method: 'removeKeyBinding', args: [83] }), '*');
    }
    
    //on current slide iframe  change or pause
    if (data.namespace === 'reveal' &&
        ['paused','resumed','fragmentshown','fragmenthidden','slidechanged'].includes(data.eventName)) {
            console.log("Slide Changed", event)
            
            //if event 'state' doesn't equal settings 'state'
            if(JSON.stringify(data.state) != slideState){
                slideState = JSON.stringify(data.state);
                // data.state.indexf = data.state.indexf ?? 0;
                
                //send slide change to OBS
                //sendToOBS(data.state, "slide-changed");	
                
                //Get slide notes
                const currentSlide_iframe = document.getElementById("current-iframe");
                
                if('slidechanged' === data.eventName){
                    currentSlide_iframe.contentWindow.postMessage(JSON.stringify({ method: 'getSlideNotes'}), '*');
                }

                //send slide state to upcoming iFrame
                const upcoming_iframe = document.getElementById("upcoming-iframe");
                upcoming_iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.state.indexh, data.state.indexv, data.state.indexf] }), '*');
                upcoming_iframe.contentWindow.postMessage(JSON.stringify({ method: 'next'}), '*');
                
                //send slide state to studio table iFrame
                const state = JSON.parse(slideState);
                studioIframe.contentWindow.postMessage(JSON.stringify({ namespace: 'speakerview', message: 'change-row', state: state }), window.location.origin);
            }
        }

        //callback from get notes request
        if( data.namespace === 'reveal' && data.eventName === 'callback' && data.method === "getSlideNotes" ){
            //send slide notes to notes iFrame
            const notes_iframe = document.getElementById("notes-iframe");
            notes_iframe.contentWindow.postMessage(JSON.stringify({ namespace:"teleprompter", method: 'updateNotes', data: `${JSON.stringify(data.result)}` }), '*');
        }
        
        //on overview mode
        if (data.namespace === 'reveal' && 
            ['overviewhidden','overviewshown'].includes(data.eventName)) {
                
                //Send CustomEvent to OBS webSocket clients
                slideState = data.state;
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
            console.log(event)
            console.log(typeof event.eventData)
            // const currentSlide_iframe = document.getElementById("current-iframe");
            // const upcoming_iframe = document.getElementById("upcoming-iframe");
            // if(['overview-toggled','slide-changed'].includes(event.eventName)){
            //     if(event.eventData != slideState){
            //         const data =JSON.parse(event.eventData)
            //         data.indexf = data.indexf ? data.indexf : 0;
            //         if(event.eventName === 'overview-toggled'){
            //             currentSlide_iframe.contentWindow.postMessage( JSON.stringify({ method: 'toggleOverview', args: [ data.overview ] }), '*' );
            //         }else{
            //             currentSlide_iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.indexh, data.indexv, data.indexf] }), '*');
            //             // currentSlide_iframe.contentWindow.postMessage( JSON.stringify({ method: 'togglePause', args: [ data.paused ] }), '*' );
            //             upcoming_iframe.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [data.indexh, data.indexv, data.indexf] }), '*');
            //             upcoming_iframe.contentWindow.postMessage(JSON.stringify({ method: 'next'}), '*');
            //         }
            //     }
            // } 
});

function sendToOBS(msgParam, eventName) {
    console.log("sending message:", JSON.stringify(msgParam));
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