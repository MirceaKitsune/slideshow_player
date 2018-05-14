// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// update rate in miliseconds (1000 = 1 second)
// lower values are smoother but use more browser resources
const RATE = 10;

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const IMG_SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const IMG_STYLE = "position: absolute; width: auto; height: auto; max-width: 100%; max-height: 100%";

// player, global object
var player = {
	preloading: false,
	index: 0,
	transition: 0,
	timer_fade: null,
	timer_next: null,
	element_1: null,
	element_2: null
};

// player, functions, image transitions
function player_fade() {
	if(player.preloading === true || player.transition >= 1)
		return;

	player.transition = Math.min(player.transition + ((1 / 1000) * RATE), 1);
	player.element1.setAttribute("style", IMG_STYLE + "; opacity: " + (1 - player.transition));
	player.element2.setAttribute("style", IMG_STYLE + "; opacity: " + (0 + player.transition));
}

// player, functions, image switching
function player_next() {
	// if an asset is still loading, retry every one second
	// if all assets have loaded, schedule the next image normally
	if(player.preloading === true) {
		player.timer_next = setTimeout(player_next, 1000);
		return;
	}
	else {
		player.timer_next = setTimeout(player_next, settings.duration * 1000);
	}

	// stop the slideshow here if this is the final image
	if(player.index >= data_images.length) {
		player_detach();
		return;
	}

	// bump the index to the next image
	++player.index;
	player.transition = 0;
	player.preloading = true;

	// apply the current and next image
	if(player.index > 1) {
		player.element1.setAttribute("src", data_images[player.index - 2].image_url);
		player.element1.setAttribute("style", IMG_STYLE + "; opacity: 1");
	}
	if(player.index > 0) {
		player.element2.setAttribute("src", data_images[player.index - 1].image_url);
		player.element2.setAttribute("style", IMG_STYLE + "; opacity: 0");
		player.element2.setAttribute("onload", "player.preloading = false");
		player.element2.setAttribute("onerror", "player_detach()");
	}
}

// player, check, available
function player_available() {
	return (data_images.length > 0 && player.index == 0);
}

// player, HTML, create
function player_attach() {
	// create the player element
	var element = document.getElementById("player_area");
	var play = document.createElement("div");
	play.setAttribute("id", "player");
	play.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; display: flex; justify-content: center; background-color: #000000");
	element.appendChild(play);

	// configure the 1st element
	player.element1 = document.createElement("img");
	player.element1.setAttribute("style", IMG_STYLE + "; opacity: 1");
	player.element1.setAttribute("src", IMG_SRC);
	play.appendChild(player.element1);

	// configure the 2nd element
	player.element2 = document.createElement("img");
	player.element2.setAttribute("style", IMG_STYLE + "; opacity: 0");
	player.element2.setAttribute("src", IMG_SRC);
	play.appendChild(player.element2);

	// set the interval and timeout functions
	player.timer_fade = setInterval(player_fade, RATE);
	player.timer_next = setTimeout(player_next, 0);
	player.index = 0;

	interface_update_media_controls(2);

	// shuffle the images each time before playing
	if(settings.shuffle)
		images_shuffle();
}

// player, HTML, destroy
function player_detach() {
	// destroy the player element
	var element = document.getElementById("player_area");
	var play = document.getElementById("player");
	if(document.body.contains(play)) {
		element.removeChild(play);
		element.innerHTML = "";
	}

	// unset the interval and timeout functions
	clearInterval(player.timer_fade);
	clearTimeout(player.timer_next);
	player.index = 0;
	player.element_1 = null;
	player.element_2 = null;

	interface_update_media_controls(player_available() ? 3 : 0);
}
