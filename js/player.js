// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// update rate in miliseconds (1000 = 1 second)
// lower values are smoother but use more browser resources
const RATE = 10;

// amount of time it takes to transition between images
// 0 is instant, 1 makes the transition last throughout the full duration of the image
const TRANSITION = 0.1;

// default image style
const IMG_STYLE = "position: absolute; width: auto; height: 100%; max-width: 100%; max-height: 100%";

// player, global object
var player = {
	images: {
		preloading: false,
		stopped: false,
		index: 0,
		transition: 0,
		timer_fade: null,
		timer_next: null,
		element_1: null,
		element_2: null
	}
};

// player, images, fullscreen settings
var fullscreen_timer = null;
var fullscreen_mouse_height = 0;
var fullscreen_mouse_active = false;

// player, images, timer function for fullscreen
function player_images_fullscreen_timer() {
	// check whether fullscreen was exited without informing the code and detach if so
	if(!player_images_fullscreen_has())
		player_images_fullscreen_toggle(false);
}

// player, images, has fullscreen
function player_images_fullscreen_has() {
	return (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

// player, images, fullscreen mouse movement
function player_images_fullscreen_mouse(event) {
	if(event.clientY >= fullscreen_mouse_height && fullscreen_mouse_active === false) {
		var media = document.getElementById("media");
		media.setAttribute("style", "position: absolute; overflow: hidden; " + STYLE_POSITION_MEDIA_ATTACHED);
		fullscreen_mouse_active = true;
	}
	else if(event.clientY < fullscreen_mouse_height && fullscreen_mouse_active === true) {
		var media = document.getElementById("media");
		media.setAttribute("style", "position: absolute; overflow: hidden; display: none; " + STYLE_POSITION_MEDIA_ATTACHED);
		fullscreen_mouse_active = false;
	}
}

// player, images, toggle fullscreen
function player_images_fullscreen_toggle(force_to) {
	var body = document.body;
	var player = document.getElementById("player_area");
	var media = document.getElementById("media");

	if(typeof force_to === "boolean" ? !force_to : player_images_fullscreen_has()) {
		// cancel fullscreen mode
		var method_cancel = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msCancelFullScreen;
		if(method_cancel)
			method_cancel.call(document);
		// else
			// return;

		// detach player and media bar
		player.setAttribute("style", "position: absolute; background-color: #000000; " + STYLE_POSITION_PLAYER_DETACHED);
		player.removeAttribute("onmousemove");
		if(body && player && player.contains(media)) {
			media.setAttribute("style", "position: absolute; overflow: hidden; " + STYLE_POSITION_MEDIA_DETACHED);
			player.removeChild(media);
			body.appendChild(media);
		}

		// set mouse properties
		fullscreen_mouse_height = 0;
		fullscreen_mouse_active = false;

		// stop the periodic fullscreen check
		clearInterval(fullscreen_timer);
	}
	else {
		// request fullscreen mode
		var method_request = player.requestFullScreen || player.webkitRequestFullScreen || player.mozRequestFullScreen || player.msRequestFullscreen;
		if(method_request)
			method_request.call(player);
		else
			return;

		// attach player and media bar
		player.setAttribute("style", "position: absolute; background-color: #000000; " + STYLE_POSITION_PLAYER_ATTACHED);
		player.setAttribute("onmousemove", "player_images_fullscreen_mouse(event)");
		if(player && body && body.contains(media)) {
			media.setAttribute("style", "position: absolute; overflow: hidden; " + STYLE_POSITION_MEDIA_ATTACHED);
			body.removeChild(media);
			player.appendChild(media);
		}

		// set mouse properties
		fullscreen_mouse_height = player.offsetHeight - media.offsetHeight;
		fullscreen_mouse_active = false;

		// start the periodic fullscreen check
		fullscreen_timer = setInterval(player_images_fullscreen_timer, 100);
	}
}

// player, images, transition
function player_images_fade() {
	if(player.images.preloading === true)
		return;

	// check if the transition has finished
	if(player.images.transition >= 1) {
		// deactivate the fading function
		clearInterval(player.images.timer_fade);

		// update the image thumbnail and info
		interface_update_media_images(true);

		return;
	}

	player.images.transition = Math.min(Math.abs(player.images.transition) + (((1 / settings.images.duration) / (1000 * TRANSITION)) * RATE), 1);
	player.images.element1.setAttribute("style", IMG_STYLE + "; opacity: " + (1 - player.images.transition));
	player.images.element2.setAttribute("style", IMG_STYLE + "; opacity: " + (0 + player.images.transition));
}

// player, images, switching
function player_images_next() {
	// if an asset is still loading, retry every one second
	// if all assets have loaded, schedule the next image normally
	clearTimeout(player.images.timer_next);
	if(player.images.preloading === true) {
		player.images.timer_next = setTimeout(player_images_next, 1000);
		return;
	}
	else if(player.images.stopped !== true) {
		player.images.timer_next = setTimeout(player_images_next, settings.images.duration * 1000);
	}

	// stop or restart the slideshow if this is the final image
	if(player.images.index >= data_images.length) {
		if(settings.images.loop === true) {
			player.images.index = 0;
			player.images.element1.setAttribute("src", player.images.element2.getAttribute("src"));
			player.images.element1.setAttribute("style", IMG_STYLE + "; opacity: 1");

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
	clearInterval(player.images.timer_fade);
	player.images.timer_fade = setInterval(player_images_fade, RATE);

	// bump the index to the next image
	// a negative transition value can be used to disable the transition effect for this turn
	++player.images.index;
	player.images.transition = player.images.transition < 0 ? -1 : 0;
	player.images.preloading = true;

	// apply the current and next image
	if(player.images.index > 1) {
		player.images.element1.setAttribute("src", data_images[player.images.index - 2].src);
		player.images.element1.setAttribute("style", IMG_STYLE + "; opacity: " + (player.images.transition < 0 ? 0 : 1));
	}
	if(player.images.index > 0) {
		player.images.element2.setAttribute("src", data_images[player.images.index - 1].src);
		player.images.element2.setAttribute("style", IMG_STYLE + "; opacity: " + (player.images.transition < 0 ? 1 : 0));
		player.images.element2.setAttribute("onload", "player.images.preloading = false");
		player.images.element2.setAttribute("onerror", "player_detach()");
	}
}

// player, images, skip
function player_images_skip(index) {
	player.images.index = Math.max(index - 1, 0);
	player.images.transition = -1;

	clearTimeout(player.images.timer_next);
	player.images.timer_next = setTimeout(player_images_next, 0);

	// update the image thumbnail and info
	interface_update_media_images(true);
}

// player, images, play
function player_images_play() {
	clearTimeout(player.images.timer_next);
	if(player.images.stopped === true) {
		player.images.timer_next = setTimeout(player_images_next, 0);
		player.images.stopped = false;
	}
	else {
		player.images.stopped = true;
	}

	// update the pause button
	interface_update_media_images(true);
}

// player, is available
function player_available() {
	return (data_images.length > 0 && player.images.index == 0 && !plugins_busy());
}

// player, is active
function player_active() {
	return (player.images.index > 0);
}

// player, is busy
function player_busy() {
	return (player.images.transition < 1 || player.images.preloading === true);
}

// player, HTML, create
function player_attach() {
	// create the player element
	var element = document.getElementById("player_area");
	var play = document.createElement("div");
	play.setAttribute("id", "player");
	play.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; display: flex; justify-content: center");
	element.appendChild(play);

	// configure the 1st element
	player.images.element1 = document.createElement("img");
	player.images.element1.setAttribute("style", IMG_STYLE + "; opacity: 1");
	player.images.element1.setAttribute("src", BLANK);
	play.appendChild(player.images.element1);

	// configure the 2nd element
	player.images.element2 = document.createElement("img");
	player.images.element2.setAttribute("style", IMG_STYLE + "; opacity: 0");
	player.images.element2.setAttribute("src", BLANK);
	play.appendChild(player.images.element2);

	// set the interval and timeout functions
	// player.images.timer_fade = setInterval(player_images_fade, RATE);
	player.images.timer_next = setTimeout(player_images_next, 0);
	player.images.index = 0;
	player.images.stopped = false;

	// shuffle the images each time before playing
	if(settings.images.shuffle)
		images_shuffle();

	interface_update_media_images(true);
	interface_update_media_controls("stop");
}

// player, HTML, destroy
function player_detach() {
	// destroy the player element
	var element = document.getElementById("player_area");
	var play = document.getElementById("player");
	if(document.body.contains(play)) {
		element.removeChild(play);
		play.innerHTML = "";
	}

	// unset the interval and timeout functions
	clearInterval(player.images.timer_fade);
	clearTimeout(player.images.timer_next);
	player.images.index = 0;
	player.images.stopped = false;
	player.images.element_1 = null;
	player.images.element_2 = null;

	interface_update_media_images(false);
	if(plugins_busy())
		interface_update_media_controls("busy");
	else if(player_available())
		interface_update_media_controls("play");
	else
		interface_update_media_controls("none");
}
