//Messages from iframes in this page 
window.addEventListener('message', async (event) => {
    //console.log(event)
    //console.log(event.origin, window.location.origin)

    //Run these functions while the slides iframe is loading
    //stop if the message is not from this site or the slides iframe has loaded
    if(event.origin !== window.location.origin || slidesLoaded == true){
        return;
    }  

    let data = JSON.parse(event.data);
    //console.log(data)
    
    //request from tabulator iframe for slide data
    if(data.namespace === "tabulator" && data.message === "slides-data"){
        console.log("got the slide data request")
        studioIframe.contentWindow.postMessage(JSON.stringify({ message:'slides-data-response', slidesData: slidesArray, namespace: 'speakerview'}), window.location.origin);
    }
    
    //get Slides and Fragments
    if (data.namespace === 'reveal' && data.eventName === 'ready') {
        console.log("Slides ready")
        slidesArray = [];

        currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [0,0]}), window.location.origin);
        
        //Get slide 1 attributes when deck is ready
        const iframe = document.getElementById('current-iframe'); 
        const iframeDocument = iframe.contentDocument;
        // Get the innerHTML of the iframe's body
        const iframeBodyContent = iframeDocument.body.innerHTML;
        
        // Access a specific element by ID within the iframe
        const slidesEl = iframeDocument.querySelector('.slides');
        const currentEl = slidesEl.querySelector('.drop.present')
        addElementToSlideArray(currentEl, data);
    }

    if( data.namespace === 'reveal' && data.eventName === 'callback' && 
        data.method === "getProgress" && tableLoaded == false && slidesLoaded === false){
        
        // find current slide attributes
        slidesProgress = data.result

        if(slidesProgress === 1 ){
            tableLoaded = true;
            slidesLoaded = true;
            currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'slide', args: [0,0]}), window.location.origin);
            //send to data table iframe
            studioIframe.contentWindow.postMessage(JSON.stringify({ message:'slides-data-response', slidesData: slidesArray, namespace: 'speakerview'}), window.location.origin);
        }
        else{
            //get next slide
            currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'next'}), window.location.origin);
        }          
    }

    if (data.namespace === 'reveal' && slidesLoaded === false && tableLoaded === false &&
        ['fragmentshown','fragmenthidden','slidechanged'].includes(data.eventName)) {

        //Get slides attributes
        const iframe = document.getElementById('current-iframe'); 
        const iframeDocument = iframe.contentDocument;
        // Get the innerHTML of the iframe's body
        const iframeBodyContent = iframeDocument.body.innerHTML;

        // Access a specific element by ID within the iframe
        const slidesEl = iframeDocument.querySelector('.slides');
        const slideEl = slidesEl.querySelector('.drop.present')
        addElementToSlideArray(slideEl, data);
        // console.log("currentEl", slideEl)
        // console.log("currentEl HTML", slideEl.outerHTML)
    }      
})

async function addElementToSlideArray(slideEl, data){
    //Get slide id        
    const slideId = await getSlideDataAttributeValue(slideEl.outerHTML, 'data-id');
    
    const slideName = await getSlideDataAttributeValue(slideEl.outerHTML, 'data-slide-name');
    
    const slidePosition = await getSlideDataAttributeValue(slideEl.outerHTML, 'data-slide-position');
    
    const cameraPosition = await getSlideDataAttributeValue(slideEl.outerHTML, 'data-camera-position');
    
    const cameraFOV = await getSlideDataAttributeValue(slideEl.outerHTML, 'data-camera-fov');

    const isFragment = data.state.indexf !== undefined ? data.state.indexf : false;
    
    let state = `${data.state.indexh},${data.state.indexv}`;
    //get all the fragments
    if(isFragment === -1){
        const children = [];
        const fragments = slideEl.querySelectorAll(".fragment")
        for(let f_index = 0; f_index < fragments.length; f_index++ ){
            const fragment = fragments[f_index];
            
            const fragmentId = await getFragmentDataAttributeValue(fragment, 'data-fragment-index');
            
            const fragmentState = `${data.state.indexh},${data.state.indexv},${fragmentId}`;

            const slideName = await getFragmentDataAttributeValue(fragment, 'data-fragment-name');
            
            const slidePosition = await getFragmentDataAttributeValue(fragment, 'data-fragment-position');
            
            const cameraPosition = await getFragmentDataAttributeValue(fragment, 'data-fragment-camera-position');
            
            const cameraFOV = await getFragmentDataAttributeValue(fragment, 'data-fragment-camera-fov');
            
            const fragmentDetails = {
                slideId: `${fragmentId}`,
                slideState: fragmentState,
                slideName: slideName,
                slidePosition: slidePosition,
                cameraPosition: cameraPosition,
                cameraFOV: cameraFOV
            }
            const result = children.find(({ slideId }) => slideId === `${fragmentId}`)
            if(typeof result != 'object'){
                children.push(fragmentDetails);
            }
        }
        const slideDetails = {
            slideId: slideId,
            slideState: state,
            slideName: slideName,
            slidePosition: slidePosition,
            cameraPosition: cameraPosition,
            cameraFOV: cameraFOV,
            _children: children
        }
        slidesArray.push(slideDetails)
    }
    
    if(isFragment === false){
        const slideDetails = {
            slideId: slideId,
            slideState: state,
            slideName: slideName,
            slidePosition: slidePosition,
            cameraPosition: cameraPosition,
            cameraFOV: cameraFOV,
            // _children: children
        }
        slidesArray.push(slideDetails)
    }
    // console.log("slides array",slidesArray)
    currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'getProgress'}), window.location.origin);
    // currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'getSlidesAttributes' }), '*');
}

async function getSlideDataAttributeValue(element, dataAttribute){
    //parser to convert String to HTML Element object  
    const parser = new DOMParser();
    const slideElement = parser.parseFromString(element,  "text/html")
    //if querySelector is nullish, then set the value to an empty string
    const getEl = slideElement.querySelector(`[${dataAttribute}]`) ?? "";
    return getEl ? getEl.getAttribute(dataAttribute): "";
}

async function getFragmentDataAttributeValue(element, dataAttribute){
   return element ? element.getAttribute(dataAttribute): "";
}