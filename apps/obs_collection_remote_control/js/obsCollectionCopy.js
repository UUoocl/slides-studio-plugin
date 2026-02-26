//after connecting to OBS get the Scenes and Sources
let collectionTabulator = [];
let collectionSheets = [];
async function makeTabulatorData() {
  collectionTabulator = [];
  collectionSheets = [];
  //create collection object

  //get scenes from OBS
  let sceneList = await obs.call("GetSceneList");
  sceneList.scenes = sceneList.scenes.toReversed();
  console.log("scene list", typeof sceneList.scenes, sceneList.scenes);

  let tableRow = 0;

  //for each scene in this collection
  for (let scene = 0; scene < sceneList.scenes.length; scene++) {
    //add scene to collection array
    collectionTabulator.push({
      id: tableRow,
      name: `${sceneList.scenes[scene].sceneName}`,
      uuid: sceneList.scenes[scene].sceneUuid,
      visibility: "false",
      type: "Scene",
    });

    collectionSheets.push([
      tableRow,
      `${sceneList.scenes[scene].sceneName}`,
      `${sceneList.scenes[scene].sceneUuid}`,
      "false",
      "Scene"
    ]);
    tableRow++;

    //get the sources in this scene
    let sources = await obs.call("GetSceneItemList", {
      sceneName: sceneList.scenes[scene].sceneName,
    });

    //test if sources exist
    if (sources.sceneItems.length > 0) {
      //add array of sources to this scene
      collectionTabulator[scene]._children = [];
      const sceneChild = collectionTabulator[scene]._children;
      
      //reverse source item order in array
      sources.sceneItems = sources.sceneItems.toReversed();

      //for each source in this scene
      for (let source = 0; source < sources.sceneItems.length; source++) {
        //if source is group, get group items
        if (sources.sceneItems[source].isGroup === true) {
          //add group to source array
          sceneChild.push({
            id: tableRow,
            name: `${sources.sceneItems[source].sourceName}`,
            uuid: sources.sceneItems[source].sourceUuid,
            itemID: sources.sceneItems[source].sceneItemId,
            visibility: sources.sceneItems[source].sceneItemEnabled,
            type: "Group",
            sceneName: `${sceneList.scenes[scene].sceneName}`,
          });
          
          collectionSheets.push([
            tableRow,
            `${sources.sceneItems[source].sourceName}`,
            sources.sceneItems[source].sourceUuid,
            sources.sceneItems[source].sceneItemId,
            sources.sceneItems[source].sceneItemEnabled,
            "Group"
          ]);
          tableRow++;

          //get the sources in this group
          const groupSources = await obs.call("GetGroupSceneItemList", {
            sceneName: sources.sceneItems[source].sourceName,
          });

          //test if group sources exist
          if (groupSources.sceneItems.length > 0) {
            // add array of sources to this group
            sceneChild[source]._children = [];
            const groupChild = sceneChild[source]._children;

            //reverse group items order in array
            groupSources.sceneItems = groupSources.sceneItems.toReversed();

            //for each source in this group
            for (let groupSource = 0; groupSource < groupSources.sceneItems.length; groupSource++) {
              //add child source to group array
              groupChild.push({
                id: tableRow,
                name: `${groupSources.sceneItems[groupSource].sourceName}`,
                uuid: groupSources.sceneItems[source].sourceUuid,
                itemID: groupSources.sceneItems[source].sceneItemId,
                visibility: groupSources.sceneItems[source].sceneItemEnabled,
                type: "Source",
                sceneName: `${sceneList.scenes[scene].sceneName}`,
              });
              collectionSheets.push([
                tableRow,
                `${groupSources.sceneItems[groupSource].sourceName}`,
                groupSources.sceneItems[source].sourceUuid,
                groupSources.sceneItems[source].sceneItemId,
                groupSources.sceneItems[source].sceneItemEnabled,
                "Source"
              ]);
              tableRow++;

              //get source filter items
              const sourceFilters = await obs.call("GetSourceFilterList", {
                sourceName: groupSources.sceneItems[groupSource].sourceName,
              });
              console.log(sourceFilters);
              console.log(sourceFilters.filters.length);

              //test if source filters exist
              if (sourceFilters.filters.length > 0) {
                // add array of filters to this source
                groupChild[groupSource]._children = [];
                const filterChild = groupChild[groupSource]._children;

                //for each filter in this source
                for (
                  let sourceFilter = 0;
                  sourceFilter < sourceFilters.filters.length;
                  sourceFilter++
                ) {
                  filterChild.push({
                    id: tableRow,
                    name: `${sourceFilters.filters[sourceFilter].filterName}`,
                    uuid: sourceFilters.filters[sourceFilter].filterIndex,
                    itemID: "",
                    visibility:
                      sourceFilters.filters[sourceFilter].filterEnabled,
                    type: "Filter",
                    sourceName:`${sources.sceneItems[source].sourceName}`,
                  });
                  collectionSheets.push([
                    tableRow,
                    `${sourceFilters.filters[sourceFilter].filterName}`,
                    sourceFilters.filters[sourceFilter].filterIndex,
                    `${sources.sceneItems[source].sourceName}`,
                    sourceFilters.filters[sourceFilter].filterEnabled,
                    "Filter"
                  ]);
                  tableRow++;
                }
              }
            }
          }else{
            tableRow++
          }
        } else {
          //add child source to scene array
          sceneChild.push({
            id: tableRow,
            name: `${sources.sceneItems[source].sourceName}`,
            uuid: `${sources.sceneItems[source].sourceUuid}`,
            itemID: `${sources.sceneItems[source].sceneItemId}`,
            visibility: sources.sceneItems[source].sceneItemEnabled,
            type: "Source",
            sceneName: `${sceneList.scenes[scene].sceneName}`,
        });

          collectionSheets.push([
            tableRow,
            `${sources.sceneItems[source].sourceName}`,
            `${sources.sceneItems[source].sourceUuid}`,
            sources.sceneItems[source].sceneItemId,
            sources.sceneItems[source].sceneItemEnabled,
            "Source",
        ]);
        tableRow++;
        
        //get source filter items
        const sourceFilters = await obs.call("GetSourceFilterList", {
            sourceName: sources.sceneItems[source].sourceName,
        });
        console.log(sourceFilters);
        console.log(sourceFilters.filters.length);
        
        //test if source filters exist
        if (sourceFilters.filters.length > 0) {
            // add array of filters to this source
            sceneChild[source]._children = [];
            const filterChild = sceneChild[source]._children;
            
            //for each filter in this source
            for (
                let sourceFilter = 0;
                sourceFilter < sourceFilters.filters.length;
                sourceFilter++
            ) {
                filterChild.push({
                    id: tableRow,
                    name: `${sourceFilters.filters[sourceFilter].filterName}`,
                    uuid: sourceFilters.filters[sourceFilter].filterIndex,
                    itemID: "",
                    visibility: sourceFilters.filters[sourceFilter].filterEnabled,
                    type: "Filter",
                    sourceName:`${sources.sceneItems[source].sourceName}`,
                });
                collectionSheets.push([
                    tableRow,
                    `${sourceFilters.filters[sourceFilter].filterName}`,
                    sourceFilters.filters[sourceFilter].filterIndex,
                    `${sources.sceneItems[source].sourceName}`,
                    sourceFilters.filters[sourceFilter].filterEnabled,
                    "Filter",
                ]);
                tableRow++;
            }
        }
    }
}
} else {
    tableRow++;
}
}
  
return collectionTabulator;
}