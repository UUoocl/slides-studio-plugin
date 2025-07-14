const dropDownOptions = {
    scenes:[],
    cameraPosition:[],
    cameraFOV:[],
    slidePosition:[]
}

    console.log("calling obs", obs)
    
    obs.on("Identified", async (data) => {
        
        //get Scene options
        const sceneList = await obs.call("GetSceneList");
        const excludeList = ['Set Camera','Slides', '----------SETTINGS----------', '----------SCENES----------', '----------SOURCES----------', '----------OPTIONS----------'];
        sceneList.scenes.forEach(async (scene, index) => {
            //console.log("scene ", scene, !excludeList.includes(scene.sceneName));
            if(!excludeList.includes(scene.sceneName)){
                const sceneName = scene.sceneName;
                //  console.log(sceneName)
                dropDownOptions.scenes.push(sceneName);
            }
        });
        
        //get Camera Position tag options
        let cameraSources = await obs.call("GetSceneItemList", { sceneName: "Camera Position" });
        //console.log(cameraSources)
        cameraSources.sceneItems.forEach(async(source, index) => {
            dropDownOptions.cameraPosition.push(source.sourceName)
        });
        
        cameraSources = await obs.call("GetSceneItemList", { sceneName: "Camera Overlay Position" });
        cameraSources.sceneItems.forEach(async(source, index) => {
            dropDownOptions.cameraPosition.push(source.sourceName)
        });
        //console.log("camera Sources", cameraSources)
        
        //get Camera Field of View options
        
        //get Slide Position tag options
        dropDownOptions.slidePosition = ["over-the-shoulder","full-screen","side-by-side"]
        
        if(slidesArray.length > 0){
            document.getElementById("slidesTable").hidden = false;
        }

        //send OBS data to tabulator iFrame.
        notesIframe.contentWindow.postMessage(JSON.stringify({ obsData: dropDownOptions, namespace: 'speakerview'}), window.location.origin);
        
        //listen for tabulator requests for OBS Data
        window.addEventListener('message', async (event) => {
            //console.log(event)
            //console.log(event.origin, window.location.origin)

            if(event.origin === window.location.origin){  
                let data = JSON.parse(event.data);
                //console.log(data)
                
                //request from tabulator iframe for slide data
                if(data.namespace === "tabulator" && data.message === "slides-data"){
                    console.log("got the obs data request")
                        notesIframe.contentWindow.postMessage(JSON.stringify({ message:'obs-data-response', obsData: dropDownOptions, namespace: 'speakerview'}), window.location.origin);
                }  
            }    
            });
    })