var url = 'http://192.168.0.157:3000';
var socket = null;
var username = "User"
var uuid = '';
var desks = [];
var staff = [];
function sortDesks(){
    desks = _.sortBy(desks, [function(o){return parseInt(o.desk_code.substring(5),10);}])
}
function updateList(target){
    console.log(target.value)
    for(var i = 0; i<staff.length;i++){
        if(staff[i].id == target.id){
            if(staff[i].desk_id == target.value){
                //remove if is on list
            } else if(staff[i].desk_id == target.value){
                var data = getValuesToSubmit();
                var changes = []
                for(var i = 0;i<staff.length;i++){
                    if(staff[i].desk_id != data[i].new_desk_id){
                        changes.push({
                            staff: data[i].staff_id,
                            name: staff[i].name,
                            old_desk: staff[i].desk_id,
                            new_desk: data[i].new_desk_id,
                        });
                    }
                }
                if(changes.length > 0){
                    var $li = $("#li-template").clone();
                    for(var i = 0;i<changes.length;i++){
                        var old_desk_code = null;
                        var new_desk_code = null;
                        for(var j = 0; j<desks.length;j++){
                            if(desks[j].id == changes[i].old_desk){
                                old_desk_code = desks[j].desk_code;
                            }
                            if(desks[j].id == changes[i].new_desk){
                                new_desk_code = desks[j].desk_code;
                            }
                        }
                        $li.removeAttr('id')
                        $li.html(changes[i].name + " : "+old_desk_code+" -> "+new_desk_code);
                        $li.appendTo("#list")
                    }
                }
            }
        }
    }
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
                values : valuesToSubmit,
                uuid: uuid,
            },
            success: function(){
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
                            $(".updated").hover(function(){
                                $(".updated").removeClass("updated");
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