/**
 * setupTable.js - Tabulator initialization for Slides Studio
 * Refactored as an ES Module for reliable dependency management.
 */

let tableInstance = null;
let isKeyPressed = false;

// Register keyboard listeners
document.addEventListener('keydown', function(event) {
    if (!window.table) return;
    
    if (event.key === ' ' && !isKeyPressed){ 
        isKeyPressed = true;
        
        event.preventDefault(); // Prevents page scrolling
        
        const selectedRows = window.table.getSelectedRows();
        if (selectedRows.length > 0) {
            const nextRow = selectedRows[0].getNextRow();
            if (nextRow) {
                window.table.deselectRow();
                window.table.selectRow(nextRow);
                nextRow.scrollTo();
                if (typeof window.filterRowData === 'function') {
                    window.filterRowData(nextRow.getData());
                }
            }
        } else {
            // Select first row if none selected
            const firstRow = window.table.getRowFromPosition(1);
            if (firstRow) {
                window.table.selectRow(firstRow);
                if (typeof window.filterRowData === 'function') {
                    window.filterRowData(firstRow.getData());
                }
            }
        }
    }   
});

document.addEventListener('keyup', function(event) {
    if (event.key === ' ') {
        isKeyPressed = false;
    }
});

/**
 * Initializes or refreshes the Tabulator table.
 * @param {Object} options Dropdown options for OBS metadata
 */
export function loadTable(options) {
    try {
        if (typeof Tabulator === 'undefined') {
            throw new Error("Tabulator library not found. Ensure tabulator.min.js is loaded correctly via <script>.");
        }

        options = options || {};
        const dropDowns = {
            scene: options.scene || [],
            slidePosition: options.slidePosition || [],
            cameraPosition: options.cameraPosition || [],
            cameraShape: options.cameraShape || []
        };

        const currentDeckId = window.slideDeckId;

        if (window.table && typeof window.table.destroy === 'function') {
            window.table.destroy();
            window.table = null;
        }

        let tableData = [];
        if (currentDeckId) {
            try {
                const saved = localStorage.getItem(currentDeckId);
                if (saved) {
                    tableData = JSON.parse(saved);
                }
            } catch (e) { }
        }

        if (!tableData || tableData.length === 0) {
            tableData = window.slidesArray || [];
        }

        const container = document.querySelector("#slidesTable");
        if (!container) {
            return;
        }

        window.table = new Tabulator("#slidesTable", {
            layout: "fitData",
            height: "500px",
            data: tableData,
            dataTree: true,
            dataTreeStartExpanded: true,
            dataTreeSort: true,
            selectableRange: 1,
            selectableRangeClearCells: true,
            clipboard: true,
            clipboardCopyRowRange: "range",
            initialSort: [
                { column: "slideState", dir: "asc" }
            ],
            columns: [
                { 
                    title: "Index", 
                    field: "slideState", 
                    sorter: "alphanum",
                    cellClick: (e, cell) => {
                        if (typeof window.filterRowData === 'function') {
                            window.filterRowData(cell.getRow().getData());
                        }
                    }
                }, 
                {
                    title: "Scene", 
                    field: "scene", 
                    editor: "list", 
                    editorParams: { values: dropDowns.scene },
                    cellEdited: (cell) => {
                        matchSlidePositionToSceneName(cell);
                        broadcastChange(cell);
                        saveTableToLocalStorage();
                    }
                },
                {
                    title: "Slide Position", 
                    field: "slidePosition", 
                    editor: "list", 
                    editorParams: { values: dropDowns.slidePosition },
                    cellEdited: (cell) => {
                        broadcastChange(cell);
                        saveTableToLocalStorage();
                    },
                    visible: false
                },
                {
                    title: "Camera Position", 
                    field: "cameraPosition", 
                    editor: "list", 
                    editorParams: { values: dropDowns.cameraPosition },
                    cellEdited: (cell) => {
                        broadcastChange(cell);
                        saveTableToLocalStorage();
                    },
                    visible: false
                },
                {
                    title: "Camera Shape", 
                    field: "cameraShape",  
                    editor: "list", 
                    editorParams: { values: dropDowns.cameraShape },
                    cellEdited: (cell) => {
                        broadcastChange(cell);
                        saveTableToLocalStorage();
                    }
                }
            ],
        });

        function matchSlidePositionToSceneName(cell) {
            const val = cell.getValue() || "";
            if (val.includes("slides ")) {
                const targetPos = val.split("slides ")[1];
                if (dropDowns.slidePosition.includes(targetPos)) {
                    cell.getRow().update({ "slidePosition": targetPos });
                }
            }
        }

        function broadcastChange(cell) {
            if (typeof window.filterRowData === 'function') {
                window.filterRowData(cell.getRow().getData());
            }
        }

        function saveTableToLocalStorage() {
            if (window.slideDeckId && window.table) {
                localStorage.setItem(window.slideDeckId, JSON.stringify(window.table.getData()));
            }
        }

        window.table.on("rowClick", (e, row) => {
            window.table.deselectRow();
            row.select();
            if (typeof window.filterRowData === 'function') {
                window.filterRowData(row.getData());
            }
        });

    } catch (err) {
        console.error("[SetupTable] CRITICAL FAILURE:", err);
    }
}

// Ensure it's available globally for any non-module triggers
window.loadTable = loadTable;
