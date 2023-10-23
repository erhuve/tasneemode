counter = 0;
remaining = 20;

function takePic() {
  if (remaining <= 0) {
    return;
  }
  $(`#p${counter++}`).show();
  $(".snap").text(`Snap a picture! ${--remaining}/20`);
  if (remaining <= 0) {
    $(".camera").fadeOut(1000);
  }
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
