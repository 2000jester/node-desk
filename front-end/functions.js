var url = 'http://192.168.0.157:3000';
var socket = null;
var username = "User"
var uuid = '';
var desks = [];
var staff = [];
var changed = [];
function sortDesks(){
    desks = _.sortBy(desks, [function(o){return parseInt(o.desk_code.substring(5),10);}])
}
function addToList(obj){
    changed.push(obj);
}
function removeFromList(id){
    for(var i = 0; i<changed.length; i++){
        if(changed[i].id == id){
            changed.splice(i,1);
        }
    }
}
function prepareOBJ(target){
    var data = getValuesToSubmit();
    var currentChange = {
        id: target.id,
        name: null,
        old_desk_id: null,
        new_desk_id: null,
        old_desk_code: null,
        new_desk_code: null,
    }
    for(var i = 0; i<staff.length;i++){
        if(staff[i].id == target.id){
            currentChange.old_desk_id = staff[i].desk_id
            currentChange.new_desk_id = data[i].new_desk_id
            currentChange.name = staff[i].name
        }
    }
    for(var i = 0;i<desks.length;i++){
        if(desks[i].id == currentChange.old_desk_id){
            currentChange.old_desk_code = desks[i].desk_code 
        } else if(desks[i].id == currentChange.new_desk_id){
            currentChange.new_desk_code = desks[i].desk_code 
        }
    }
    return currentChange
}
function drawList(){
    $("#list").empty();
    for(var i = 0;i<changed.length;i++){
        var $li = $("#li-template").clone();
        $li.removeAttr('id')
        $li.html(changed[i].name + " : "+changed[i].old_desk_code+" -> "+changed[i].new_desk_code);
        $li.appendTo("#list")
    }
}
function updateList(target){
    var obj = prepareOBJ(target);
    if(changed.length > 0){
        if(_.findIndex(changed, {id: target.id}) > -1){
            if(obj.new_desk_id != obj.old_desk_id){
                return
            } else if(obj.new_desk_id == obj.old_desk_id){
                removeFromList(target.id)
            }
        } else {
            addToList(obj)
        }
    } else {
        addToList(obj)
    }
    drawList();
}
function validate(){
    $("#submit").removeAttr("disabled");
    $('select').css('background', 'white');
    $('select').css('color', 'black');
    var data = getValuesToSubmit();
    var errorCaught = false;
    for(var i=0; i<data.length; i++){
        var tempStaff = data[i]
        for(var j=0; j<data.length; j++){
            if((tempStaff.staff_id != data[j].staff_id)&&(tempStaff.new_desk_id == data[j].new_desk_id)){
                errorCaught = true;
                $("[value="+ data[j].new_desk_id +"]:selected").closest('select').css('background', 'red');
                $("[value="+ data[j].new_desk_id +"]:selected").closest('select').css('color', 'white');
            }
        }
    }
    if(errorCaught == true){
        $("#submit").attr("disabled", "disabled");
        return false;
    }
    return true;
}
function display(){
    $("tr[id^=staff_]").remove();
    sortDesks();
    for(var currentStaff of staff) {
        var $element = $('#row-template').clone();
        $element.find('.name').html(currentStaff.name);
        $element.find('.id').html(currentStaff.id);
        var $select = $('#desk_code_select').clone();
        $select.attr('id',currentStaff.id);
        for(var currentDesk of desks){
            var $option = $('.desk_code_option').clone();
            $option.removeClass('desk_code_option');
            $option.html(currentDesk.desk_code);   
            $option.appendTo($select);
            $option.val(currentDesk.id);
            if(currentDesk.id == currentStaff.desk_id){
                $option.attr('selected','selected');
            }
        }
        $select.appendTo($element.find(".for_select"))
        $element.attr('id', "staff_"+currentStaff.id);
        $element.appendTo('#desks');
    }
}
function getValuesToSubmit(){
    var valuesToSubmit = []
    for(var i = 0; i<staff.length; i++){
        var select = document.getElementById(i)
        valuesToSubmit.push({
            staff_id: staff[i].id,
            new_desk_id: $("#staff_"+staff[i].id+" select").val(),
        });
    }
    return valuesToSubmit;
}
function submitToDataBase(){
    var valuesToSubmit = getValuesToSubmit();
    if(validate()){
        $.ajax({
            url: url+"/sendDataToDataBase",
            method: "POST",
            data: {
                values: valuesToSubmit,
                uuid: uuid,
            },
            success: function(){
                changed = []
                drawList()
                /*$("html, body").animate({
                    scrollTop: $("#staff_"+49).offset().top
                }, 300);*/
            }
        });
    }
}
function getDesks(){
    $.ajax({
        url: url+"/getDesks",
        method: "GET",
        success: function(res){
            for(var currentDesk of res){
                desks.push(currentDesk);
            }
            display();
        }
    });
}
function getStaff(){
    $.ajax({
        url: url+"/getStaff",
        method: "GET",
        success: function(res){
            for(var currentStaff of res){
                staff.push(currentStaff);
            }
            getDesks();
        }
    });
}
function connect(){
    $.ajax({
        url: url+"/connect",
        method: "POST",
        data: {
            username: username,
        },
        success: function(res){
            uuid = res;
            console.log("Connected : "+username);
            console.log("UUID : "+uuid);
            socket = io(url);
            socket.on('change', function(data){
                if(data != uuid){
                    alert("A change has been made by another user");
                    $.ajax({
                        url: url+"/getStaff",
                        method: "GET",
                        success: function(res){
                            var first = true;
                            for(var i = 0;i<res.length;i++){
                                if($("#"+res[i].id).val() != res[i].desk_id){
                                    $("#"+res[i].id).val(res[i].desk_id);
                                    $("#staff_"+res[i].id).addClass("updated")
                                    if(first == true){
                                        $("html, body").animate({
                                            scrollTop: $("#staff_"+res[i].id).offset().top
                                        }, 300);
                                        first = false;
                                    }
                                }
                            }
                            $(".updated").hover(function(event){
                                console.log(event.currentTarget.id)
                                $("#"+event.currentTarget.id).removeClass("updated");
                            })
                        }
                    });
                }
            });
            getStaff();
        },
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
    $('body').on('change', 'select', function(event){
        updateList(event.target);
        validate();
    });
});