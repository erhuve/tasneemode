counter = 0;
function takePic() {
  $(`#p${counter++}`).show();
}

function flash(e) {
  $(".flash")
    .show() //show the hidden div
    .animate({ opacity: 0.7 }, 300)
    .fadeOut(300)
    .css({ opacity: 1 });
}

$(document).ready(function () {
  $(".flash").hide();
  $(".item").hide();
  $(".flashbutton").mouseup(function (e) {
    flash(e);
  });
});
