let table;
let isKeyPressed = false;

// Register keyboard listeners only once
document.addEventListener('keydown', function(event) {
    if (!window.table) return;
    
    if (event.key === ' ' && !isKeyPressed){ 
        isKeyPressed = true;
        
        event.preventDefault(); // Prevents page scrolling
        //console.debug('Spacebar pressed, default scroll prevented', selectedRowNumber);
        window.table.deselectRow();
        selectedRowNumber += 1;                        
        window.table.selectRow(window.table.getRowFromPosition( selectedRowNumber ));
        if (typeof filterRowData === 'function') {
            filterRowData(window.table.getRowFromPosition(selectedRowNumber).getData());
        }
    }   
});

document.addEventListener('keyup', function(event) {
    if (event.key === ' ') {
        isKeyPressed = false;
    }
});

function loadTable(options) {
    // Ensure options and its properties exist
    options = options || {};
    options.scene = options.scene || [];
    options.slidePosition = options.slidePosition || [];
    options.cameraPosition = options.cameraPosition || [];
    options.cameraShape = options.cameraShape || [];

    // Get slideDeckId from global scope if not provided or to ensure sync
    const currentDeckId = window.slideDeckId;

    // Destroy existing table if it exists before re-initializing
    if (window.table && typeof window.table.destroy === 'function') {
        console.log("[SetupTable] Destroying existing table instance for re-initialization...");
        window.table.destroy();
    }

    //get local storage slide deck attributes first
    const tableData = JSON.parse(localStorage.getItem(currentDeckId)) ?? window.slidesArray;
    
    console.log("[SetupTable] Initializing Tabulator with options:", options);
    window.table = new Tabulator("#slidesTable", {
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
                    if (typeof filterRowData === 'function') {
                        filterRowData(rowValues);
                    }
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
            window.table.updateRow(window.table.getRowFromPosition(event._cell.row.position),{"slidePosition": selectedScene});
        }
        saveTableToLocalStorage(event,cell);
    } 

    //slide attribute changed
    function saveTableToLocalStorage(event,cell){
        //save table data
        if(currentDeckId && currentDeckId.length > 0){
            localStorage.setItem(currentDeckId, JSON.stringify(window.table.getData()));
        }
    }
    
    //Table row Clicked
    window.table.on("rowClick", function (e, row) {
        window.table.deselectRow();
        const rowComponent = window.table.getRowFromPosition(row.getPosition());
        window.table.selectRow(rowComponent);
        selectedRowNumber = row.getPosition();
        if (typeof filterRowData === 'function') {
            filterRowData(row.getData());
        }
    });
}

// Make globally accessible
window.loadTable = loadTable;
window.table = table;