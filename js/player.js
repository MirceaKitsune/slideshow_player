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

// the recommendation algorithm preforms scans this many seconds
// smaller values offer more accuracy but use more processing power
const RECOMMENDATIONS_RATE = 1;

// latency strength: 0.5 = half, 1.0 = full, 2.0 = double
// latency step: resolution of the latency check in seconds, lower is more accurate but also more expensive
const IMAGES_LATENCY_STRENGTH = 1;
const IMAGES_LATENCY_STEP = 0.1;

// default image style
const STYLE_IMG = "position: absolute; width: auto; height: 100%; max-width: 100%; max-height: 100%";

// recommendations, global object
var recommendations = {
	timer: null,
	images: {},
	music: {}
}

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
	},
	music: {
		preloading: false,
		stopped: false,
		index: 0,
		timer_next: null,
		element: null
	}
};

// player, images, fullscreen settings
var fullscreen_timer = null;
var fullscreen_mouse_start = 0;
var fullscreen_mouse_end = 0;

// recommendations, timer
function recommendations_timer() {
	if(!player_active())
		return;

	// each time an image or song is active, we increase the rating of all its tags in the global tag table
	// this operates on the assumption that the more you like something, the more you keep looking at or listening to it
	// oppositely, the less you like an item, the faster it's assumed you're going to switch away from it
	// if the player is busy, don't increment the rating of a tag, since that doesn't count as deliberately selecting an item
	if(player_available_images() && player_active_images() && player.images.index > 0) {
		for(var tag in data_images[player.images.index - 1].tags) {
			const tag_name = data_images[player.images.index - 1].tags[tag].toLowerCase();
			if(tag_name == null || tag_name == undefined || tag_name == "" || tag_name == " ")
				continue;

			if(recommendations.images[tag_name] === null || recommendations.images[tag_name] === undefined)
				recommendations.images[tag_name] = 0;
			else if(!player_busy_images() && recommendations.images[tag_name] < 1000000)
				recommendations.images[tag_name] += 1;
		}
	}
	if(player_available_music() && player_active_music() && player.music.index > 0) {
		for(var tag in data_music[player.music.index - 1].tags) {
			const tag_name = data_music[player.music.index - 1].tags[tag].toLowerCase();
			if(tag_name == null || tag_name == undefined || tag_name == "" || tag_name == " ")
				continue;

			if(recommendations.music[tag_name] === null || recommendations.music[tag_name] === undefined)
				recommendations.music[tag_name] = 0;
			else if(!player_busy_music() && recommendations.music[tag_name] < 1000000)
				recommendations.music[tag_name] += 1;
		}
	}

	if(!player_busy_images())
		interface_update_media(false, true, false);
	if(!player_busy_music())
		interface_update_media(false, false, true);
}

// player, images, timer function for fullscreen
function player_images_fullscreen_timer() {
	// check whether fullscreen was exited without informing the code and detach if so
	if(!player_images_fullscreen_has())
		player_images_fullscreen_toggle(false);
}

// player, images, has fullscreen
function player_images_fullscreen_has() {
	return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

// player, images, fullscreen mouse movement
function player_images_fullscreen_mouse(event) {
	const opacity = Math.min(Math.max((event.clientY / fullscreen_mouse_start - 1) / (fullscreen_mouse_end / fullscreen_mouse_start - 1), 0), 1);
	interface.media.setAttribute("style", "z-index: 1; opacity: " + opacity);
}

// player, images, toggle fullscreen
function player_images_fullscreen_toggle(force_to) {
	if(typeof force_to === "boolean" ? !force_to : player_images_fullscreen_has()) {
		// cancel fullscreen mode
		const method_cancel = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msCancelFullScreen;
		if(method_cancel && player_images_fullscreen_has())
			method_cancel.call(document);
		// else
			// return;

		// configure player / media / media_images_label / media_images_info / media_controls_label elements
		interface.player.setAttribute("class", "item_player item_player_position_detached");
		interface.player.removeAttribute("onmousemove");
		if(document.body && interface.player && interface.player.contains(interface.media))
			interface_update_attached(true);

		// set mouse properties
		fullscreen_mouse_start = 0;
		fullscreen_mouse_end = 0;

		// stop the periodic fullscreen check
		clearInterval(fullscreen_timer);
	}
	else {
		// request fullscreen mode
		const method_request = interface.player.requestFullScreen || interface.player.webkitRequestFullScreen || interface.player.mozRequestFullScreen || interface.player.msRequestFullscreen;
		if(method_request)
			method_request.call(interface.player);
		else
			return;

		// configure player / media / media_images_label / media_images_info / media_controls_label elements
		interface.player.setAttribute("class", "item_player item_player_position_attached");
		interface.player.setAttribute("onmousemove", "player_images_fullscreen_mouse(event)");
		if(interface.player && document.body && document.body.contains(interface.media))
			interface_update_attached(false);

		// set mouse properties
		fullscreen_mouse_start = interface.player.offsetHeight - interface.media.offsetHeight - FULLSCREEN_MOUSE_FADE;
		fullscreen_mouse_end = interface.player.offsetHeight - interface.media.offsetHeight;

		// start the periodic fullscreen check
		fullscreen_timer = setInterval(player_images_fullscreen_timer, 100);
	}

	// as the fullscreen button moves outside of the mouse cursor when toggling fullscreen, reset its hover effects
	interface_style_effect_shape(interface.media_controls_fullscreen, false);
	interface_style_button_color(interface.media_controls_fullscreen, "white");
}

// player, images, latency, settings
var player_images_latency = {
	time_average: 0,
	time_this: 0,
	recording: false,
	timer: null
};

// player, images, latency, start recording
function player_images_latency_start() {
	if(player_images_latency.recording)
		return;

	player_images_latency.recording = true;
	player_images_latency.time_this = 0;
	player_images_latency.timer = setInterval(function() {
		player_images_latency.time_this += IMAGES_LATENCY_STEP;
	}, IMAGES_LATENCY_STEP * 1000);
}

// player, images, latency, stop recording
function player_images_latency_stop() {
	if(player_images_latency.recording === false)
		return;

	// update the average latency based on the current latency
	player_images_latency.time_average = (player_images_latency.time_average + (player_images_latency.time_this * IMAGES_LATENCY_STRENGTH)) / 2;

	player_images_latency.recording = false;
	player_images_latency.time_this = 0;
	clearInterval(player_images_latency.timer);
}

// player, images, transition
function player_images_fade() {
	if(!player_available_images() || !player_active_images())
		return;
	if(player.images.preloading)
		return;

	// stop recording the latency
	player_images_latency_stop();

	// check if the transition has finished
	if(player.images.transition >= 1) {
		// schedule the next image
		// the latency calculated based on the loading time of previous images is deducted from the duration of this image
		if(!player.images.stopped) {
			const duration = Math.max(settings.images.duration - (settings.images.duration * TRANSITION) - player_images_latency.time_average, 5);
			player.images.timer_next = setTimeout(player_images_next, duration * 1000);
			interface_ring_images_set(duration);
		}

		// deactivate the fading function
		clearInterval(player.images.timer_fade);
		interface_update_media(false, true, false);
	}
	else {
		// advance the transition and apply the new transparency to the image elements
		player.images.transition = Math.min(Math.abs(player.images.transition) + (((1 / settings.images.duration) / (1000 * TRANSITION)) * RATE), 1);
		player.images.element_1.setAttribute("style", STYLE_IMG + "; opacity: " + (1 - player.images.transition));
		player.images.element_2.setAttribute("style", STYLE_IMG + "; opacity: " + (0 + player.images.transition));
	}
}

// player, images, switching
function player_images_next() {
	if(!player_available_images() || !player_active_images())
		return;

	// start recording the latency
	player_images_latency_start();

	// stop or restart the slideshow if this is the final image
	if(player.images.index >= data_images.length) {
		if(settings.images.loop) {
			player.images.index = 0;
			player.images.element_1.setAttribute("src", player.images.element_2.getAttribute("src"));
			player.images.element_1.setAttribute("style", STYLE_IMG + "; opacity: 1");
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
		player.images.element_1.setAttribute("src", data_images[player.images.index - 2].src);
		player.images.element_1.setAttribute("style", STYLE_IMG + "; opacity: " + (player.images.transition < 0 ? 0 : 1));
	}
	if(player.images.index > 0) {
		player.images.element_2.setAttribute("src", data_images[player.images.index - 1].src);
		player.images.element_2.setAttribute("style", STYLE_IMG + "; opacity: " + (player.images.transition < 0 ? 1 : 0));
		player.images.element_2.setAttribute("onload", "player.images.preloading = false");
		player.images.element_2.setAttribute("onerror", "player_detach()");
	}

	// refresh recommended tags
	recommendations_timer();
}

// player, images, skip
function player_images_skip(index) {
	if(!player_available_images() || !player_active_images())
		return;

	const overflow_start = index <= 0;
	const overflow_end = index > data_images.length;
	if((overflow_start || overflow_end) && !settings.images.loop)
		return;

	if(overflow_start) {
		player.images.index = data_images.length - 1;
		images_shuffle();
	} else if(overflow_end) {
		player.images.index = 0;
		images_shuffle();
	} else {
		player.images.index = index - 1;
	}
	player.images.transition = -1;

	clearTimeout(player.images.timer_next);
	player.images.timer_next = setTimeout(player_images_next, 0);

	interface_update_media(false, true, false);
}

// player, images, play
function player_images_play() {
	if(!player_available_images() || !player_active_images())
		return;

	clearTimeout(player.images.timer_next);
	if(player.images.stopped) {
		player.images.timer_next = setTimeout(player_images_next, 0);
		player.images.stopped = false;
	}
	else {
		player.images.stopped = true;
	}

	interface_update_media(false, true, false);
}

// player, images, clear
function player_images_clear() {
	if(!player_active_images())
		return;

	player.images.index = 1;
	player.images.stopped = false;
	player.images.element_1.setAttribute("style", STYLE_IMG + "; opacity: 1");
	player.images.element_1.setAttribute("src", SRC_BLANK);
	player.images.element_2.setAttribute("style", STYLE_IMG + "; opacity: 0");
	player.images.element_2.setAttribute("src", SRC_BLANK);

	interface_update_media(false, true, false);
}

// player, music, switching, canplay
function player_music_next_canplay() {
	if(!player_available_music() || !player_active_music())
		return;

	if(!player.music.preloading)
		return;
	player.music.preloading = false;

	// schedule the next song
	const duration = player.music.element.duration;
	if(duration === NaN || duration <= 0) {
		player_detach();
		return;
	}
	clearTimeout(player.music.timer_next);
	player.music.timer_next = setTimeout(player_music_next, duration * 1000);

	// start playing the song
	if(!player.music.stopped)
		player.music.element.play();

	interface_ring_music_set(player.music.element);
	interface_update_media(false, false, true);
}

// player, music, switching
function player_music_next() {
	if(!player_available_music() || !player_active_music())
		return;

	// stop or restart the slideshow if this is the final song
	if(player.music.index >= data_music.length) {
		if(settings.music.loop) {
			player.music.index = 0;
			music_shuffle();
		}
		else {
			player_detach();
			return;
		}
	}

	// bump the index to the next song
	++player.music.index;
	player.music.preloading = true;

	// apply the current song
	if(player.music.index > 0) {
		player.music.element.setAttribute("src", data_music[player.music.index - 1].src);
		player.music.element.setAttribute("oncanplay", "player_music_next_canplay()");
		player.music.element.volume = settings.music.volume;
	}

	// refresh recommended tags
	recommendations_timer();
}

// player, music, skip
function player_music_skip(index) {
	if(!player_available_music() || !player_active_music())
		return;

	const overflow_start = index <= 0;
	const overflow_end = index > data_music.length;
	if((overflow_start || overflow_end) && !settings.music.loop)
		return;

	if(overflow_start) {
		player.music.index = data_music.length - 1;
		music_shuffle();
	} else if(overflow_end) {
		player.music.index = 0;
		music_shuffle();
	} else {
		player.music.index = index - 1;
	}
	player.music.preloading = true;

	clearTimeout(player.music.timer_next);
	player.music.timer_next = setTimeout(player_music_next, 0);

	interface_update_media(false, false, true);
}

// player, music, play
function player_music_play() {
	if(!player_available_music() || !player_active_music())
		return;

	clearTimeout(player.music.timer_next);
	if(player.music.stopped) {
		// we need to know the duration of the current song in order to reschedule, don't unpause if preloading
		if(player.music.preloading)
			return;

		// reschedule switching to the next song
		const duration = Math.max(player.music.element.duration - player.music.element.currentTime, 0);
		player.music.timer_next = setTimeout(player_music_next, duration * 1000);

		player.music.element.play();
		player.music.stopped = false;
	}
	else {
		player.music.element.pause();
		player.music.stopped = true;
	}

	interface_update_media(false, false, true);
}

// player, music, clear
function player_music_clear() {
	if(!player_active_music())
		return;

	player.music.index = 1;
	player.music.stopped = false;
	player.music.element.pause();
	player.music.element.currentTime = 0;
	player.music.element.removeAttribute("src");

	interface_update_media(false, false, true);
}

// player, is available
function player_available() {
	return data_images.length > 0 || data_music.length > 0;
}

// player, is available, images
function player_available_images() {
	return data_images.length > 0;
}

// player, is available, music
function player_available_music() {
	return data_music.length > 0;
}

// player, is active
function player_active() {
	return document.body.contains(player.element);
}

// player, is active, images
function player_active_images() {
	return document.body.contains(player.images.element_1) && document.body.contains(player.images.element_2);
}

// player, is active, music
function player_active_music() {
	return document.body.contains(player.music.element);
}

// player, is busy, images
function player_busy_images() {
	return player.images.index <= 0 || player.images.transition < 1 || player.images.preloading;
}

// player, is busy, music
function player_busy_music() {
	return player.music.index <= 0 || player.music.preloading;
}

// player, HTML, create
function player_attach() {
	if(player_active())
		return;

	// don't spawn the player if there is no content to play
	if(!player_available_images() && !player_available_music())
		return;

	// create the player element
	player.element = document.createElement("div");
	player.element.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; display: flex; justify-content: center");
	interface.player.appendChild(player.element);

	// configure the 1st image element
	player.images.element_1 = document.createElement("img");
	player.images.element_1.setAttribute("style", STYLE_IMG + "; opacity: 1");
	player.images.element_1.setAttribute("src", SRC_BLANK);
	player.element.appendChild(player.images.element_1);

	// configure the 2nd image element
	player.images.element_2 = document.createElement("img");
	player.images.element_2.setAttribute("style", STYLE_IMG + "; opacity: 0");
	player.images.element_2.setAttribute("src", SRC_BLANK);
	player.element.appendChild(player.images.element_2);

	// configure the music element
	player.music.element = document.createElement("audio");
	player.element.appendChild(player.music.element);

	// set the image interval and timeout functions
	// player.images.timer_fade = setInterval(player_images_fade, RATE);
	player.images.timer_next = setTimeout(player_images_next, 0);
	player.images.index = 0;
	player.images.stopped = false;

	// set the music interval and timeout functions
	player.music.timer_next = setTimeout(player_music_next, 0);
	player.music.index = 0;
	player.music.stopped = false;

	// set the recommendations interval
	recommendations.timer = setInterval(recommendations_timer, RECOMMENDATIONS_RATE * 1000);

	// refresh the images and songs in use
	images_pick();
	music_pick();

	interface_update_media(true, true, true);
}

// player, HTML, destroy
function player_detach() {
	if(!player_active())
		return;

	// destroy the player element
	interface.player.removeChild(player.element);
	player.element.innerHTML = "";

	// unset the interval and timeout functions
	player_images_latency_stop();
	clearInterval(player.images.timer_fade);
	clearTimeout(player.images.timer_next);
	clearTimeout(player.music.timer_next);
	clearInterval(recommendations.timer);
	player.element = null;
	player.images.index = 0;
	player.images.stopped = false;
	player.images.element_1 = null;
	player.images.element_2 = null;
	player.music.index = 0;
	player.music.stopped = false;
	player.music.element = null;

	interface_update_media(true, true, true);
}
