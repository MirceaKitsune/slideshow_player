// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// update rate in miliseconds (1000 = 1 second)
// lower values are smoother but use more browser resources
const RATE = 10;

// amount of time it takes to transition between images
// 0 is instant, 1 makes the transition last throughout the full duration of the image
const TRANSITION = 0.1;

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const IMG_SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const IMG_STYLE = "position: absolute; width: auto; height: 100%; max-width: 100%; max-height: 100%";

// player, global object
var player = {
	preloading: false,
	stopped: false,
	index: 0,
	transition: 0,
	timer_fade: null,
	timer_next: null,
	element_1: null,
	element_2: null
};

// player, functions, fullscreen
function player_fullscreen() {
	var element = document.getElementById("player");

	// remove the tooltip once in fullscreen, as you can't position the cursor elsewhere to avoid it
	element.removeAttribute("title");

	var fullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
	if(fullscreen) {
		var method_cancel = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msCancelFullScreen;
		if(method_cancel)
			method_cancel.call(document);
	}
	else {
		var method_request = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;
		if(method_request)
			method_request.call(element);
	}
}

// player, functions, image transitions
function player_fade() {
	// deactivate the fading function
	if(player.transition >= 1)
		clearInterval(player.timer_fade);

	if(player.preloading === true || player.transition >= 1)
		return;

	player.transition = Math.min(Math.abs(player.transition) + (((1 / settings.images.duration) / (1000 * TRANSITION)) * RATE), 1);
	player.element1.setAttribute("style", IMG_STYLE + "; opacity: " + (1 - player.transition));
	player.element2.setAttribute("style", IMG_STYLE + "; opacity: " + (0 + player.transition));
}

// player, functions, image switching
function player_next() {
	// if an asset is still loading, retry every one second
	// if all assets have loaded, schedule the next image normally
	clearTimeout(player.timer_next);
	if(player.preloading === true) {
		player.timer_next = setTimeout(player_next, 1000);
		return;
	}
	else if(player.stopped !== true) {
		player.timer_next = setTimeout(player_next, settings.images.duration * 1000);
	}

	// stop or restart the slideshow if this is the final image
	if(player.index >= data_images.length) {
		if(settings.images.loop === true) {
			player.index = 0;
			player.element1.setAttribute("src", player.element2.getAttribute("src"));
			player.element1.setAttribute("style", IMG_STYLE + "; opacity: 1");

			// also shuffle the images again
			if(settings.images.shuffle)
				images_shuffle();
		}
		else {
			player_detach();
			return;
		}
	}

	// activate the fading function
	clearInterval(player.timer_fade);
	player.timer_fade = setInterval(player_fade, RATE);

	// bump the index to the next image
	// a negative transition value can be used to disable the transition effect for this turn
	++player.index;
	player.transition = player.transition < 0 ? -1 : 0;
	player.preloading = true;

	// apply the current and next image
	if(player.index > 1) {
		player.element1.setAttribute("src", data_images[player.index - 2].image_url);
		player.element1.setAttribute("style", IMG_STYLE + "; opacity: " + (player.transition < 0 ? 0 : 1));
	}
	if(player.index > 0) {
		player.element2.setAttribute("src", data_images[player.index - 1].image_url);
		player.element2.setAttribute("style", IMG_STYLE + "; opacity: " + (player.transition < 0 ? 1 : 0));
		player.element2.setAttribute("onload", "player.preloading = false");
		player.element2.setAttribute("onerror", "player_detach()");
	}

	// update the images panel of the interface
	interface_update_media_images(true);
}

// player, functions, image switching (on demand)
function player_goto(index) {
	player.index = Math.max(index - 1, 0);
	player.transition = -1;

	clearTimeout(player.timer_next);
	player.timer_next = setTimeout(player_next, 0);
}

// player, functions, image pausing
function player_play() {
	clearTimeout(player.timer_next);
	if(player.stopped === true) {
		player.timer_next = setTimeout(player_next, 0);
		player.stopped = false;
	}
	else {
		player.stopped = true;
	}

	// update the images panel of the interface
	interface_update_media_images(true);
}

// player, check, available
function player_available() {
	return (data_images.length > 0 && player.index == 0 && !plugins_busy());
}

// player, check, active
function player_active() {
	return (player.index > 0);
}

// player, HTML, create
function player_attach() {
	// create the player element
	var element = document.getElementById("player_area");
	var play = document.createElement("div");
	play.setAttribute("id", "player");
	play.setAttribute("title", "Click to toggle fullscreen");
	play.setAttribute("onclick", "player_fullscreen()");
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
	// player.timer_fade = setInterval(player_fade, RATE);
	player.timer_next = setTimeout(player_next, 0);
	player.index = 0;
	player.stopped = false;

	interface_update_media_images(true);
	interface_update_media_controls("stop");

	// shuffle the images each time before playing
	if(settings.images.shuffle)
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
	player.stopped = false;
	player.element_1 = null;
	player.element_2 = null;

	interface_update_media_images(false);
	if(plugins_busy())
		interface_update_media_controls("busy");
	else if(player_available())
		interface_update_media_controls("play");
	else
		interface_update_media_controls("none");
}
