//VARIABLES
var url = 'http://192.168.0.157:3000'
var socket = io(url);
var uuid = null;
var desks = [];
var staff = [];
var changed = [];
//FUNCTIONS
function sortDesks(desksArray){
    return _.sortBy(desksArray, [function(o){return parseInt(o.desk_code.substring(5),10);}]);
}
function addToArray(obj, array){
    return array.push(obj);
}
function removeFromChangedById(id, changedArray){
    for(var i=0;i<changedArray.length;i++){
        if(changedArray[i].id == id){
            changedArray.splice(i,1);
        }
    }
    return changedArray
}
function prepareObjForChanged(target, staffArray, deskArray){
    var selectData = getValuesToSubmit(staffArray);
    var obj = {
        id: $(target).attr("id"),
        name: null,
        oldDeskId: null,
        newDeskId: null,
        oldDeskCode: null,
        newDeskCode: null,
    };
    for(var i=0;i<staffArray;i++){
        if(staffArray[i].id == $(target).attr("id")){
            obj.oldDeskId = staffArray[i].deskId;
            obj.newDeskId = selectData[i].newDeskId;
            obj.name = staffArray[i].name;
        }
    }
    for(var i=0;i<deskArray.length;i++){
        if(deskArray[i].id == obj.oldDeskId){
            obj.oldDeskCode = deskArray[i].deskCode
        } else if(deskArray[i].id == obj.newDeskId){
            obj.newDeskCode = deskArray[i].deskCode
        }
    }
    return obj
}
function drawChangeList(changedArray){
    $("#list").empty();
    for(var i=0;i<changedArray.length;i++){
        var listClone = $("#li-template").clone();
        listClone.removeAttr("id");
        listClone.html(changedArray[i].name+" : "+changedArray[i].oldDeskCode+" -> "+changedArray[i].newDeskCode);
        listClone.appendTo("#list");
    }
}
function updateList(target, changedArray, staffArray, deskArray){
    var obj = prepareObjForChanged(target, staffArray, deskArray);
    if(changedArray.length>0){
        if(_.findIndex(changedArray,{id: $(target).attr("id")})>-1){
            if(obj.newDeskId != obj.oldDeskId){
                changedArray = removeFromChangedById($(target).attr("id"), changedArray);
                changedArray = addToArray(obj, changedArray);
                return changedArray;
            } else if(obj.newDeskId == obj.oldDeskId){
                changedArray = removeFromChangedById($(target).attr("id"), changedArray);
            }
        } else {
            changedArray = addToArray(obj, changedArray);
        }
    } else {
        changedArray = addToArray(obj, changedArray);
    }
    return changedArray;
}
function addDisableToButton(buttonId){
    $("#"+buttonId).prop("disabled", true);
}
function removeDisableFromButton(buttonId){
    $("#"+buttonId).prop("disabled", false);
}
function checkForDupeSelectValues(staffArray){
    var selectData = getValuesToSubmit(staffArray);
    for(var i=0;i<selectData.length;i++){
        var tempStaff = selectData[i]
        for(var j=0;j<selectData.length;j++){
            if((tempStaff.staffId != selectData[j].staffId)&&(tempStaff.newDeskId == selectData[j].newDeskId)){
                return true;
            }
        }
    }
    return false;
}
function validateSelectElementsOnSubmission(staffArray){
    return !checkForDupeSelectValues()
}
function validateSelectElementsOnChange(target, staffArray){
    for(var i=0;i<staffArray.length;i++){
        if(staffArray[i].id == $(target).attr("id")){
            if(staffArray[i].deskId != target.value){
                removeDisableFromButton("submit");
                $('select').css('background', 'white');
                $('select').css('color', 'black');
            } else {
                return false;
            }
        }
    }
    if(checkForDupeSelectValues(staffArray)){
        $("[value="+ selectData[j].newDeskId +"]:selected").closest('select').css('background', 'red');
        $("[value="+ selectData[j].newDeskId +"]:selected").closest('select').css('color', 'white');
        addDisableToButton("submit")
        return false
    }
    return true;
}
function getStaff(){
    return new Promise((resolve, reject)=>{
        $.ajax({
            url: url+"/getStaff",
            method: "GET",
            success: function(res){
                var tempStaffArray = [];
                for(var currentStaff of res){
                    tempStaffArray.push(currentStaff);
                }
                staff = tempStaffArray;
            }
        });
    }); 
}
function getDesks(){
    $.ajax({
        url: url+"/getDesks",
        method: "GET",
        success: function(res){
            var tempDesksArray = [];
            for(var currentDesk of res){
                tempDesksArray.push(currentDesk);
            }
            desks = tempDesksArray;
        }
    })
}
function displayToTable(staffArray, deskArray){
    $("tr[id^=staff_]").remove();
    desks = sortDesks(desks);
    for(var currentStaff of staffArray) {
        var $element = $('#row-template').clone();
        $element.find('.name').html(currentStaff.name);
        $element.find('.id').html(currentStaff.id);
        var $select = $('#desk_code_select').clone();
        $select.attr('id',currentStaff.id);
        for(var currentDesk of deskArray){
            var $option = $('.desk_code_option').clone();
            $option.removeClass('desk_code_option');
            $option.html(currentDesk.deskCode);   
            $option.appendTo($select);
            $option.val(currentDesk.id);
            if(currentDesk.id == currentStaff.deskId){
                $option.attr('selected','selected');
            }
        }
        $select.appendTo($element.find(".for_select"))
        $element.attr('id', "staff_"+currentStaff.id);
        $element.appendTo('#desks');
    }
}
function getValuesToSubmit(staffArray){
    var tempValues = [];
    for(var i=0;i<staffArray.length;i++){
        var select = document.getElementById(i);
        tempValues.push({
            staffId: staff[i].id,
            newDeskId: $("#staff_"+staffArray[i].id+" select").val(),
        });
    }
    return tempValues;
}
function submitToDataBase(staffArray){
    addDisableToButton("submit");
    var valuesToSubmit = getValuesToSubmit(staffArray);
    if(validateSelectElementsOnSubmission(staffArray)){
        $.ajax({
            url: url+"/sendDataToDataBase",
            method: "POST",
            data: {
                values: valuesToSubmit,
                uuid: uuid,
            },
            success: function(){
                changed = [];
                drawChangeList(changed);
                getStaff();
                socket.on("enableSubmit", function(){
                    removeDisableFromButton("submit");
                });
            }
        });
    }
}
function connect(){
    $.ajax({
        url: url+"/connect",
        method: "GET",
        success: function(res){
            addDisableToButton("submit");
            uuid = res;
            socket.on("change", function(res){
                if(res != uuid){
                    getStaff().then(function(){
                        drawChangeList(changed);
                        var first = true;
                        var tempStaff = staff
                        for(var i=0;i<tempStaff.length;i++){
                            if($("#"+tempStaff[i].id).val() != tempStaff[i].deskId){
                                $("#"+tempStaff[i].id).val(tempStaff[i].deskId);
                                $("#staff_"+tempStaff[i].id).addClass("updated")
                                // updateList({id:res[i].id}, false)
                                if(first == true){
                                    $("html, body").animate({
                                        scrollTop: $("#staff_"+tempStaff[i].id).offset().top
                                    }, 300);
                                    first = false;
                                }
                            }
                        }
                        $(".updated").hover(function(event){
                            $("#"+event.currentTarget.id).removeClass("updated");
                        });
                    });
                }
            });
            getStaff().then(function(){
                getDesks();
            });
        }
    });
}
window.onbeforeunload = function(event){
    $.ajax({
        url: url+"/disconnect",
        method: "POST",
        data: {
            uuid: uuid,
        },
    });
}
$(function(){
    $("body").on("change", "select", function(event){
        changed = updateList(event.target, changed, staff, desks);
        validateSelectElementsOnChange(event.target, staff);
    });
});