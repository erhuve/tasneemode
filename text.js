counter = 2;
remaining = 17;

function nextMessage() {
  if (remaining <= 0) {
    return;
  }
  $(`#m${counter++}`).show();
  if (counter >= remaining) {
    $(`#vid`).show();
    $("#toletters").show();
  }
  // $(".snap").text(`Snap a picture! ${--remaining}/20`);
  // if (remaining <= 0) {
  // $(".camera").fadeOut(1000);
  // }
  var elem = document.getElementById("box");
  elem.scrollTop = elem.scrollHeight;
}

function flash(e) {
  $(".flash")
    .show() //show the hidden div
    .animate({ opacity: 0.7 }, 300)
    .fadeOut(300)
    .css({ opacity: 1 });
}

$(document).ready(function () {
  $(".message-orange").hide();
  $(".message-blue").hide();
  $("#vid").hide();
  $("#toletters").hide();
  $(`#m1`).show();
});
