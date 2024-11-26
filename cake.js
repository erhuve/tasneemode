// JavaScript functionality for interaction

function lightCandle(candleNumber) {
  let candle = document.querySelectorAll(".candle")[candleNumber - 1];
  if (!candle.classList.contains("lit")) {
    candle.classList.add("lit");
    candle.style.backgroundColor = "#edaef3"; // lit candle color
    candle.querySelector("::before").style.backgroundColor = "#ff9900"; // flame color
    candle.classList.add("flame-lit");
  } else {
    candle.classList.remove("lit");
    candle.style.backgroundColor = "#ee8df7"; // unlit candle color
    candle.querySelector("::before").style.backgroundColor = "#ffcc00"; // flame color when unlit
    candle.classList.remove("flame-lit");
  }
}

// Define an array of 8 different sprinkle colors
const sprinkleColors = [
  "#ff504c", // Red
  "#ff8c42", // Orange
  "#ffed69", // Yellow
  "#8dd9a1", // Green
  "#7bbfff", // Blue
  "#f3a8ff", // Purple
  "#ffffff", // White
];

// Function to randomly place and decorate the cake with sprinkles
function decorateCake() {
  // Find the cake bottom container
  const cakeBottom = document.querySelector(".cake-bottom");

  // Create a random number of sprinkles (10-20 sprinkles per click)
  const sprinkleCount = Math.floor(Math.random() * 10) + 10; // Random between 10-20 sprinkles

  for (let i = 0; i < sprinkleCount; i++) {
    // Create a new sprinkle element
    const sprinkle = document.createElement("div");
    sprinkle.classList.add("sprinkle");

    // Randomize the size (small or large)
    if (Math.random() > 0.5) {
      sprinkle.classList.add("small");
    } else {
      sprinkle.classList.add("large");
    }

    // Randomize the position of the sprinkle within the cake container
    const randomLeft = Math.random() * (cakeBottom.offsetWidth - 12); // Cake width minus sprinkle size
    const randomTop = Math.random() * (cakeBottom.offsetHeight - 12); // Cake height minus sprinkle size

    sprinkle.style.left = `${randomLeft}px`;
    sprinkle.style.top = `${randomTop}px`;

    // Randomize rotation for more natural placement
    sprinkle.style.transform = `rotate(${Math.random() * 360}deg)`;

    // Randomly select a color from the sprinkleColors array
    const randomColor =
      sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
    sprinkle.style.backgroundColor = randomColor;

    // Add the sprinkle to the cake container
    cakeBottom.appendChild(sprinkle);
  }
}

function cutCake() {
  // Find the cake, cake top, cake bottom, and the button
  // let cake = document.querySelector(".cake");
  // let cakeTop = cake.querySelector(".cake-top");
  // let cakeBottom = cake.querySelector(".cake-bottom");
  // let cutButton = document.getElementById("cutCakeBtn");

  // // Add the cake-slice effect to simulate a slice being removed
  // let slice = document.createElement("div");
  // slice.classList.add("cake-slice");
  // cakeBottom.appendChild(slice); // Add slice to the cake bottom

  // // Apply the cake-cut class to trigger the transition (slice widening)
  // cake.classList.add("cake-cut");

  // // Optionally, change cake color to simulate it being cut
  // cake.style.background = "#fff"; // Change to white for cut appearance
  // cakeTop.style.opacity = "0.5"; // Fade the cake top to simulate a cut

  // // Hide the "Cut the Cake" button after cutting
  // cutButton.style.display = "none";

  // Show birthday message after cutting the cake
  let candles = document.querySelectorAll(".candle");
  candles.forEach((candle) => {
    // Remove "lit" class to unlit the candle
    candle.classList.remove("lit");
    candle.style.backgroundColor = "#ee8df7"; // Reset to unlit color
    // candle.querySelector("::before").style.backgroundColor = "#ffcc00"; // Reset flame color
    candle.classList.remove("flame-lit");
  });
  document.getElementById("birthdayMessage").classList.remove("hidden");
}
