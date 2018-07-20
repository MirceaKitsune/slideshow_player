// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// distance (in pixels) under which to fade in the media bar as the mouse nears it (fullscreen)
const FULLSCREEN_MOUSE_FADE = 64;

// update rate in miliseconds (1000 = 1 second)
// lower values are smoother but use more browser resources
const RATE = 10;

// amount of time it takes to transition between images
// 0 is instant, 1 makes the transition last throughout the full duration of the image
const TRANSITION = 0.1;

// default image style
const STYLE_IMG = "position: absolute; width: auto; height: 100%; max-width: 100%; max-height: 100%";

// player, global object
var player = {
	element: null,
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
var fullscreen_mouse_start = 0;
var fullscreen_mouse_end = 0;

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
	var opacity = Math.min(Math.max((event.clientY / fullscreen_mouse_start - 1) / (fullscreen_mouse_end / fullscreen_mouse_start - 1), 0), 1);
	interface.media.setAttribute("style", "z-index: 1; opacity: " + opacity + "; " + STYLE_MEDIA_POSITION_ATTACHED + "; " + STYLE_MEDIA_BACKGROUND_ATTACHED);
}

// player, images, toggle fullscreen
function player_images_fullscreen_toggle(force_to) {
	if(typeof force_to === "boolean" ? !force_to : player_images_fullscreen_has()) {
		// cancel fullscreen mode
		var method_cancel = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msCancelFullScreen;
		if(method_cancel)
			method_cancel.call(document);
		// else
			// return;

		// configure player / media / media_images_label / media_images_info / media_controls_label elements
		interface.player.setAttribute("style", STYLE_PLAYER_POSITION_DETACHED);
		interface.player.removeAttribute("onmousemove");
		if(document.body && interface.player && interface.player.contains(interface.media)) {
			interface.media.setAttribute("style", STYLE_MEDIA_POSITION_DETACHED + "; " + STYLE_MEDIA_BACKGROUND_DETACHED);
			interface.media_images_label.setAttribute("class", "text_black");
			interface.media_images_info.setAttribute("class", "text_black");
			interface.media_controls_label.setAttribute("class", "text_black");
			interface.player.removeChild(interface.media);
			document.body.appendChild(interface.media);
		}

		// set mouse properties
		fullscreen_mouse_start = 0;
		fullscreen_mouse_end = 0;

		// stop the periodic fullscreen check
		clearInterval(fullscreen_timer);
	}
	else {
		// request fullscreen mode
		var method_request = interface.player.requestFullScreen || interface.player.webkitRequestFullScreen || interface.player.mozRequestFullScreen || interface.player.msRequestFullscreen;
		if(method_request)
			method_request.call(interface.player);
		else
			return;

		// configure player / media / media_images_label / media_images_info / media_controls_label elements
		interface.player.setAttribute("style", STYLE_PLAYER_POSITION_ATTACHED);
		interface.player.setAttribute("onmousemove", "player_images_fullscreen_mouse(event)");
		if(interface.player && document.body && document.body.contains(interface.media)) {
			interface.media.setAttribute("style", STYLE_MEDIA_POSITION_ATTACHED + "; " + STYLE_MEDIA_BACKGROUND_ATTACHED);
			interface.media_images_label.setAttribute("class", "text_white");
			interface.media_images_info.setAttribute("class", "text_white");
			interface.media_controls_label.setAttribute("class", "text_white");
			document.body.removeChild(interface.media);
			interface.player.appendChild(interface.media);
		}

		// set mouse properties
		fullscreen_mouse_start = interface.player.offsetHeight - interface.media.offsetHeight - FULLSCREEN_MOUSE_FADE;
		fullscreen_mouse_end = interface.player.offsetHeight - interface.media.offsetHeight;

		// start the periodic fullscreen check
		fullscreen_timer = setInterval(player_images_fullscreen_timer, 100);
	}
}

// player, images, transition
function player_images_fade() {
	if(player.images.preloading === true)
		return;

	// deactivate the fading function and stop if the transition has finished
	if(player.images.transition >= 1) {
		clearInterval(player.images.timer_fade);
		interface_update_media();
		return;
	}

	player.images.transition = Math.min(Math.abs(player.images.transition) + (((1 / settings.images.duration) / (1000 * TRANSITION)) * RATE), 1);
	player.images.element1.setAttribute("style", STYLE_IMG + "; opacity: " + (1 - player.images.transition));
	player.images.element2.setAttribute("style", STYLE_IMG + "; opacity: " + (0 + player.images.transition));
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
			player.images.element1.setAttribute("style", STYLE_IMG + "; opacity: 1");

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
		player.images.element1.setAttribute("style", STYLE_IMG + "; opacity: " + (player.images.transition < 0 ? 0 : 1));
	}
	if(player.images.index > 0) {
		player.images.element2.setAttribute("src", data_images[player.images.index - 1].src);
		player.images.element2.setAttribute("style", STYLE_IMG + "; opacity: " + (player.images.transition < 0 ? 1 : 0));
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

	interface_update_media();
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

	interface_update_media();
}

// player, is available
function player_available() {
	return (data_images.length > 0 && !plugins_busy());
}

// player, is active
function player_active() {
	return (document.body.contains(player.element));
}

// player, is busy
function player_busy() {
	return (player.images.index == 0 || player.images.transition < 1 || player.images.preloading === true);
}

// player, HTML, create
function player_attach() {
	if(player_active() === true)
		return;

	// create the player element
	player.element = document.createElement("div");
	player.element.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; display: flex; justify-content: center");
	interface.player.appendChild(player.element);

	// configure the 1st element
	player.images.element1 = document.createElement("img");
	player.images.element1.setAttribute("style", STYLE_IMG + "; opacity: 1");
	player.images.element1.setAttribute("src", SRC_BLANK);
	player.element.appendChild(player.images.element1);

	// configure the 2nd element
	player.images.element2 = document.createElement("img");
	player.images.element2.setAttribute("style", STYLE_IMG + "; opacity: 0");
	player.images.element2.setAttribute("src", SRC_BLANK);
	player.element.appendChild(player.images.element2);

	// set the interval and timeout functions
	// player.images.timer_fade = setInterval(player_images_fade, RATE);
	player.images.timer_next = setTimeout(player_images_next, 0);
	player.images.index = 0;
	player.images.stopped = false;

	// shuffle the images each time before playing
	if(settings.images.shuffle)
		images_shuffle();

	interface_update_media();
}

// player, HTML, destroy
function player_detach() {
	if(player_active() !== true)
		return;

	// destroy the player element
	interface.player.removeChild(player.element);
	player.element.innerHTML = "";

	// unset the interval and timeout functions
	clearInterval(player.images.timer_fade);
	clearTimeout(player.images.timer_next);
	player.element = null;
	player.images.index = 0;
	player.images.stopped = false;
	player.images.element_1 = null;
	player.images.element_2 = null;

	interface_update_media();
}
