
const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");


// NO BUTTON RUNS AWAY

function moveButton() {

    const btnWidth = noBtn.offsetWidth;
    const btnHeight = noBtn.offsetHeight;

    const maxX = window.innerWidth - btnWidth - 20;
    const maxY = window.innerHeight - btnHeight - 20;

    const randomX = Math.random() * Math.max(0, maxX);
    const randomY = Math.random() * Math.max(0, maxY);

    noBtn.style.position = "fixed";
    noBtn.style.left = randomX + "px";
    noBtn.style.top = randomY + "px";
}


// DESKTOP HOVER

noBtn.addEventListener("mouseover", moveButton);


// MOBILE TOUCH

noBtn.addEventListener("touchstart", function(e) {

    e.preventDefault();

    moveButton();

}, { passive: false });


// IF SOMEHOW CLICKED

noBtn.addEventListener("click", moveButton);


// YES BUTTON

yesBtn.addEventListener("click", function() {

    // Hide question
    document.getElementById("question").style.display = "none";

    // Show success screen
    const success = document.getElementById("success");

    success.style.display = "block";

    // Change card background
    document.getElementById("main").style.background = "#fff0f5";

});


// FLOATING HEARTS GENERATOR

function createHeart() {

    const heart = document.createElement("div");

    heart.classList.add("heart");

    const heartEmojis = [
        "💗",
        "💕",
        "💖",
        "❤️",
        "🌸",
        "💘"
    ];

    heart.innerHTML = heartEmojis[
        Math.floor(Math.random() * heartEmojis.length)
    ];

    heart.style.left = Math.random() * 100 + "vw";

    heart.style.animationDuration =
        (Math.random() * 3 + 4) + "s";

    document.body.appendChild(heart);

    setTimeout(function() {

        heart.remove();

    }, 7000);

}


// CREATE HEART EVERY 300MS

setInterval(createHeart, 300);
