let table;
function loadTable() {
            //get local storage slide deck attributes first
            const tableData = JSON.parse(localStorage.getItem(slideDeckId)) ?? slidesArray;
            console.log(tableData)
            console.log(typeof table)
           table = undefined;
           console.log(typeof table)
            table = new Tabulator("#slidesTable", {
                layout:"fitDataStretch",
                height: "500px",
                data: tableData,
                dataTree: true,
                dataTreeStartExpanded: true,
                dataTreeSort:true,
                initialSort:[
                    {column:"slideState", dir:"asc"}, //sort by this first
                ],
                columns: [
                    { title: "Index", field: "slideState",  responsive: 0,
                        cellClick: function gotoSlide(e,cell){
                            let rowValues = cell.getRow().getData();
                            console.log(rowValues)
                            filterRowData(rowValues);
                        },
                        sorter:"alphanum",
                    }, 
                    { title: "Name", field: "slideName", width: 70, responsive: 2 }, 
                    {title:"Slide Position", field:"slidePosition", editor:"list", editorParams:{
                        //Value Options (You should use ONE of these per editor)
                        values: dropDownOptions.slidePosition},
                        cellEdited: saveTableToLocalStorage
                    },
                    {title:"camera Position", field:"cameraPosition", editor:"list", editorParams:{
                        //Value Options (You should use ONE of these per editor)
                        values: dropDownOptions.cameraPosition},
                        cellEdited: saveTableToLocalStorage
                    },
                    {title:"Scenes", field:"scenes", editor:"list", editorParams:{
                        //Value Options (You should use ONE of these per editor)
                        values: dropDownOptions.scenes},
                        cellEdited: saveTableToLocalStorage
                    }
                ],
            });
            
            
            //slide attribute changed
            function saveTableToLocalStorage(event,cell){
                //save table data
                if(slideDeckId.length > 0){
                    localStorage.setItem(slideDeckId, JSON.stringify(table.getData()));
                }
            }

            //Table row Clicked
            table.on("rowClick", function (e, row) {
                console.log("e=index", row.getPosition())
                console.log("e", e)
                console.log("row", row)
                console.log("table", table)
                table.deselectRow();
                table.selectRow(table.getRowFromPosition(row.getPosition()));
            });
        }
        