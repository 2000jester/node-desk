var url = 'http://192.168.0.157:3000'
var socket = io(url);
var uuid = null;
var desks = [];
var staff = [];
var changed = [];
function sortDesks(deskArray){
    return _.sortBy(deskArray, [function(o){return parseInt(o.deskCode.substring(5),10);}]);
}
function addToArray(obj, array){
    array.push(obj);
    return array
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
    for(var i=0;i<staffArray.length;i++){
        if(staffArray[i].id == obj.id){
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
/*function updateList(target, changedArray, staffArray, deskArray){
    var obj = prepareObjForChanged(target, staffArray, deskArray);
    if(changedArray.length < 1 && obj.newDeskId != obj.oldDeskId){
        changedArray = addToArray(obj, changedArray)
        return changedArray
    }
    if(obj.newDeskId == obj.oldDeskId){
        return;
    }
    if(changedArray.length > 0 && changed[_.findIndex(changedArray,{id: $(target).attr("id")})].newDeskId != obj.newDeskId){
        changedArray = addToArray(obj, changedArray)
        return changedArray
    }
    changedArray = removeFromChangedById($(target).attr("id"))
    return changedArray
}*/
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
    return !checkForDupeSelectValues(staffArray)
}
function validateSelectElementsOnChange(target, staffArray){
    tempVals = getValuesToSubmit(staffArray);
    for(var i=0;i<staffArray.length;i++){
        if(staffArray[i].id == $(target).attr("id")){
            if(staffArray[i].deskId != target.value){
                removeDisableFromButton("submit");
                
            }
        }
    }
    $("select").prop("disabled", false);
    $('select').css('background', 'white');
    $('select').css('color', 'black');
    $("td.errors").html("");
    var needsDisable = false;
    var targetId = $(target).attr("id");
    if(checkForDupeSelectValues(staffArray)){
        addDisableToButton("submit");
        canDisable = true;
        for(var i=0;i<tempVals.length;i++){
            for(var j=0;j<tempVals.length;j++){
                if(tempVals[i].newDeskId == tempVals[j].newDeskId && i != j){
                    $("[value="+ tempVals[j].newDeskId +"]:selected").closest('select').css('background', 'red');
                    $("[value="+ tempVals[j].newDeskId +"]:selected").closest('select').css('color', 'white');
                    if(canDisable == true){
                        disableSelects([parseInt(targetId),parseInt(tempVals[j].staffId)]);
                        canDisable = false;
                    }
                    /*if(tempVals[i].staffId == targetId){
                        $("#staff_"+target.id+" td.errors").html("Conflicts with Id: "+tempVals[j].staffId);
                    } else if(tempVals[j].staffId == targetId){
                        $("#staff_"+target.id+" td.errors").html("Conflicts with Id: "+tempVals[i].staffId);
                    }*/
                }
            }
        }
    }
}
function disableSelects(exceptions){
    $("select").prop("disabled",true);
    for(var i=0;i<exceptions.length;i++){
        $("#"+exceptions[i]).prop("disabled", false);
    }
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
                resolve(tempStaffArray);
            }
        });
    }); 
}
function getDesks(){
    return new Promise((resolve, reject)=>{
        $.ajax({
            url: url+"/getDesks",
            method: "GET",
            success: function(res){
                var tempDesksArray = [];
                for(var currentDesk of res){
                    tempDesksArray.push(currentDesk);
                }
                resolve(tempDesksArray);
            }
        })
    });
}
function displayToTable(staffArray, deskArray){
    $("tr[id^=staff_]").remove();
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
function submitToDataBase(){
    addDisableToButton("submit");
    var valuesToSubmit = getValuesToSubmit(staff);
    if(validateSelectElementsOnSubmission(staff)){
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
                    getStaff().then(function(staffResolve){
                        staff = staffResolve;
                        drawChangeList(changed);
                        var first = true;
                        var tempStaff = staff
                        for(var i=0;i<tempStaff.length;i++){
                            if($("#"+tempStaff[i].id).val() != tempStaff[i].deskId){
                                $("#"+tempStaff[i].id).val(tempStaff[i].deskId);
                                $("#staff_"+tempStaff[i].id).addClass("updated")
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
            staff = getStaff().then(function(staffResolve){
                staff = staffResolve;
                desks = getDesks().then(function(deskResolve){
                    desks = deskResolve;
                    desks = sortDesks(desks);
                    displayToTable(staff, desks)
                });
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
        drawChangeList(changed);
        validateSelectElementsOnChange(event.target, staff);
    });
});