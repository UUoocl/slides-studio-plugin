let table;
let isKeyPressed = false;

function loadTable(options) {
    //get local storage slide deck attributes first
    const tableData = JSON.parse(localStorage.getItem(slideDeckId)) ?? slidesArray;
    // console.log("load table data",tableData)
    table = undefined;
    table = new Tabulator("#slidesTable", {
        layout:"fitData",
        height: "500px",
        data: tableData,
        dataTree: true,
        dataTreeStartExpanded: true,
        dataTreeSort:true,
        //enable range selection        
        selectableRange:1,
        selectableRangeClearCells:true,
        //configure clipboard to allow copy and paste of range format data
        clipboard:true,
        clipboardCopyStyled:false,
        clipboardCopyConfig:{
            rowHeaders:false,
            columnHeaders:false,
        },
        clipboardCopyRowRange:"range",
        clipboardPasteParser:"range",
        clipboardPasteAction:"range",
        initialSort:[
            {column:"slideState", dir:"asc"}, //sort by this first
        ],
        columns: [
            { title: "Index", field: "slideState",  responsive: 0,
                cellClick: function gotoSlide(e,cell){
                    let rowValues = cell.getRow().getData();
                    filterRowData(rowValues);
                },
                sorter:"alphanum",
            }, 
            {title:"Scene", field:"scene", editor:"list", editorParams:{
                values: options.scene},
                cellEdited: matchSlidePositionToSceneName
            },
            // { title: "Name", field: "slideName", width: 70, responsive: 2 }, 
            {title:"Slide Position", field:"slidePosition", editor:"list", editorParams:{
                values: options.slidePosition},
                cellEdited: saveTableToLocalStorage, 
                visible:false
            },
            {title:"camera Position", field:"cameraPosition", editor:"list", editorParams:{
                values: options.cameraPosition},
                cellEdited: saveTableToLocalStorage, 
                visible:false
            },
            {
                title:"Camera Shape", field:"cameraShape",  editor:"list", editorParams:{
                values: options.cameraShape},
                cellEdited: saveTableToLocalStorage
            }
        ],
    });
    
    //match slide position to selected scene name.
    function matchSlidePositionToSceneName(event, cell){
        const selectedScene = event._cell.value
            .split("slides ")[1]
        if(options.slidePosition.includes(selectedScene)){
            table.updateRow(table.getRowFromPosition(event._cell.row.position),{"slidePosition": selectedScene});
        }
        saveTableToLocalStorage(event,cell);
    } 

    //slide attribute changed
    function saveTableToLocalStorage(event,cell){
        //save table data
        if(slideDeckId.length > 0){
            localStorage.setItem(slideDeckId, JSON.stringify(table.getData()));
        }
    }
    
    //Table row Clicked
    table.on("rowClick", function (e, row) {
        table.deselectRow();
        const rowComponent = table.getRowFromPosition(row.getPosition());
        table.selectRow(rowComponent);
        selectedRowNumber = row.getPosition();
        filterRowData(row.getData());
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === ' ' && !isKeyPressed){ 
            isKeyPressed = true;
            
            event.preventDefault(); // Prevents page scrolling
            //console.debug('Spacebar pressed, default scroll prevented', selectedRowNumber);
            table.deselectRow();
            selectedRowNumber += 1;                        
            table.selectRow(table.getRowFromPosition( selectedRowNumber ));
            filterRowData(table.getRowFromPosition(selectedRowNumber).getData())
        }   
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.key === ' ') {
            isKeyPressed = false;
        }
    });
}