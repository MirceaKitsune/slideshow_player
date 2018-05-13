// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// update rate in miliseconds (1000 = 1 second)
// lower values are smoother but use more browser resources
const RATE = 10;

// fake 1x1 transparent gif, used for initializing img elements
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// player variables
var play = {
	playing: false,
	preloading: false,
	index: 0,
	transition: 0,
	timer_fade: null,
	timer_next: null,
	element_1: null,
	element_2: null,
};

function player_interval_fade() {
	if(play.index == 0 || play.transition >= 1)
		return;

	play.transition = Math.min(play.transition + (0.1 / RATE), 1);
	play.element1.setAttribute("style", "position: absolute; width: auto; height: auto; max-width: 100%; max-height: 100%; opacity: " + (1 - play.transition));
	play.element2.setAttribute("style", "position: absolute; width: auto; height: auto; max-width: 100%; max-height: 100%; opacity: " + (0 + play.transition));
}

function player_interval_next() {
	if(play.preloading == true)
		return;

	if(play.index >= data_images.length) {
		player_detach();
		interface_update_media_controls_play(2);
		return;
	}

	++play.index;
	play.transition = 0;
	play.preloading = true;

	if(play.index > 1) {
		play.element1.setAttribute("src", data_images[play.index - 2].image_url);
	}
	if(play.index > 0) {
		play.element2.setAttribute("src", data_images[play.index - 1].image_url);
		play.element2.setAttribute("onload", "play.preloading = false");
	}

	// don't wait for the timer to update the fading, otherwise shuttering will occur
	player_interval_fade();
}

function player_available() {
	if(data_images.length > 0)
		return true;
	return false;
}

function player_playing() {
	return play.playing;
}

function player_attach() {
	// create the player element
	var element = document.getElementById("player");
	var player = document.createElement("div");
	player.setAttribute("id", "play");
	player.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; display: flex; justify-content: center; background-color: #000000");
	element.appendChild(player);

	// configure the 1st element
	play.element1 = document.createElement("img");
	play.element1.setAttribute("style", "position: absolute; width: auto; height: auto; max-width: 100%; max-height: 100%; opacity: 0");
	play.element1.setAttribute("src", BLANK);
	player.appendChild(play.element1);

	// configure the 2nd element
	play.element2 = document.createElement("img");
	play.element2.setAttribute("style", "position: absolute; width: auto; height: auto; max-width: 100%; max-height: 100%; opacity: 0");
	play.element2.setAttribute("src", BLANK);
	player.appendChild(play.element2);

	// set the interval functions
	play.timer_fade = setInterval(player_interval_fade, RATE);
	play.timer_next = setInterval(player_interval_next, settings.speed * 1000);
	play.playing = true;
	play.index = 0;
}

function player_detach() {
	// destroy the player element
	var element = document.getElementById("player");
	var player = document.getElementById("play");
	if(document.body.contains(player)) {
		element.removeChild(player);
		element.innerHTML = "";
	}

	// unset the interval functions
	clearInterval(play.timer_fade);
	clearInterval(play.timer_next);
	play.playing = false;
	play.index = 0;
	play.element_1 = null;
	play.element_2 = null;
}
