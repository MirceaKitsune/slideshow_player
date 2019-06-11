// Slideshow Viewer, Player
// Public Domain / CC0, MirceaKitsune 2018

// distance (in pixels) under which to fade in the media bar as the mouse nears it (fullscreen)
const FULLSCREEN_MOUSE_FADE = 64;

// amount of time it takes to transition between images
// 0 is instant, 1 makes the transition last throughout the full duration of the image
const TRANSITION = 0.1;

// the zoom strength and size of the magnifier
const ZOOM_FACTOR = 2;
const ZOOM_SIZE = 0.5;

// the recommendation algorithm preforms scans this many seconds
// smaller values offer more accuracy but use more processing power
const RECOMMENDATIONS_RATE = 1;

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
		index: 0,
		preloading_previous: false,
		preloading_next: false,
		preloading_current: false,
		stopped: false,
		reverse: false,
		transition: 0,
		timer_fade: null,
		timer_next: null,
		element_previous: null,
		element_next: null,
		element_current: null,
		element_zoom: null
	},
	music: {
		index: 0,
		preloading: false,
		stopped: false,
		timer_next: null,
		element: null
	}
};

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

	interface_update_media(true, false, false, false, true);
}

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
	return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

// player, images, fullscreen mouse movement
function player_images_fullscreen_mouse(event) {
	const opacity = Math.min(Math.max((event.clientY / fullscreen_mouse_start - 1) / (fullscreen_mouse_end / fullscreen_mouse_start - 1), 0), 1);
	interface.media.style["opacity"] = opacity;
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
	} else {
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

	// as the image elements are resized and repositioned when toggling fullscreen, detach the zoom element
	player_images_zoom_detach();
}

// player, images, zoom, attach
function player_images_zoom_attach() {
	// configure the zoom element
	if(player_active_images() && !player.element.contains(player.images.element_zoom)) {
		player.images.element_zoom = document.createElement("div");
		player.images.element_zoom.setAttribute("class", "player_zoom");
		player.element.appendChild(player.images.element_zoom);
	}
}

// player, images, zoom, detach
function player_images_zoom_detach() {
	// destroy the zoom element
	if(player_active_images() && player.element.contains(player.images.element_zoom)) {
		player.element.removeChild(player.images.element_zoom);
		player.images.element_zoom = null;
	}
}

// player, images, zoom, update
function player_images_zoom_update(event) {
	if(!player_active_images())
		return;
	if(!player.element.contains(player.images.element_zoom))
		player_images_zoom_attach();

	const size = Math.min(player.images.element_current.width, player.images.element_current.height) * ZOOM_SIZE;
	const rect = player.images.element_current.getBoundingClientRect();
	var pos_x = event.clientX - rect.left;
	var pos_y = event.clientY - rect.top;

	// bound the magnifier to the limits of the image
	const border = size / (ZOOM_FACTOR * 2);
	if(pos_x < border)
		pos_x = border;
	if(pos_x > player.images.element_current.width - border)
		pos_x = player.images.element_current.width - border;
	if(pos_y < border)
		pos_y = border;
	if(pos_y > player.images.element_current.height - border)
		pos_y = player.images.element_current.height - border;

	// update the zoom element
	player.images.element_zoom.style["width"] = size + "px";
	player.images.element_zoom.style["height"] = size + "px";
	player.images.element_zoom.style["left"] = (rect.left + pos_x - (size / 2)) + "px";
	player.images.element_zoom.style["top"] = (rect.top + pos_y - (size / 2)) + "px";
	player.images.element_zoom.style["background-image"] = "url(" + player.images.element_current.src + ")";
	player.images.element_zoom.style["background-size"] = (player.images.element_current.width * ZOOM_FACTOR) + "px " + (player.images.element_current.height * ZOOM_FACTOR) + "px";
	player.images.element_zoom.style["background-position"] = "-" + ((pos_x * ZOOM_FACTOR) - (size / 2)) + "px -" + ((pos_y * ZOOM_FACTOR) - (size / 2)) + "px";
}

// player, images, get indexes
function player_images_indexes() {
	var index_previous = player.images.index - 2;
	var index_current = player.images.index - 1;
	var index_next = player.images.index - 0;
	if(index_previous < 0)
		index_previous = data_images.length - 1;
	if(index_next > data_images.length - 1)
		index_next = 0;

	return { previous: index_previous, current: index_current, next: index_next };
}

// player, images, switching, onerror, previous
function player_images_next_onerror_previous() {
	if(!player_available_images() || !player_active_images())
		return;

	const indexes = player_images_indexes();

	player.images.preloading_previous = false;
	player.images.element_previous.setAttribute("src", SRC_BLANK);
	data_images[indexes.previous].src = SRC_BLANK;
}

// player, images, switching, onerror, next
function player_images_next_onerror_next() {
	if(!player_available_images() || !player_active_images())
		return;

	const indexes = player_images_indexes();

	player.images.preloading_next = false;
	player.images.element_next.setAttribute("src", SRC_BLANK);
	data_images[indexes.next].src = SRC_BLANK;
}

// player, images, switching, onerror, current
function player_images_next_onerror_current() {
	if(!player_available_images() || !player_active_images())
		return;

	const indexes = player_images_indexes();

	player.images.preloading_current = false;
	player.images.element_current.setAttribute("src", SRC_BLANK);
	data_images[indexes.current].src = SRC_BLANK;
}

// player, images, switching, onload, previous
function player_images_next_onload_previous() {
	if(!player_available_images() || !player_active_images())
		return;

	player.images.preloading_previous = false;

	if(!player_busy_images())
		interface_update_media(false, true, false, false, false);
}

// player, images, switching, onload, next
function player_images_next_onload_next() {
	if(!player_available_images() || !player_active_images())
		return;

	player.images.preloading_next = false;

	if(!player_busy_images())
		interface_update_media(false, true, false, false, false);
}

// player, images, switching, onload, current
function player_images_next_onload_current() {
	if(!player_available_images() || !player_active_images())
		return;

	player.images.preloading_current = false;

	if(!player_busy_images())
		interface_update_media(false, true, false, false, false);
}

// player, images, switching, fade
function player_images_next_fade() {
	if(!player_available_images() || !player_active_images())
		return;

	// set the image element opacities
	if(player.images.reverse) {
		player.images.element_previous.style["opacity"] = 0;
		player.images.element_next.style["opacity"] = Math.max(1 - player.images.transition, 0);
	} else {
		player.images.element_previous.style["opacity"] = Math.max(1 - player.images.transition, 0);
		player.images.element_next.style["opacity"] = 0;
	}
	player.images.element_current.style["opacity"] = Math.min(0 + player.images.transition, 1);

	// advance or stop the transition
	if(player.images.transition < 1) {
		player.images.transition = Math.min(player.images.transition + (((1 / settings.images.duration) / (1000 * TRANSITION)) * RATE), 1);
	} else {
		clearInterval(player.images.timer_fade);
		player.images.transition = 0;
		player.images.reverse = false; // only used once
	}
}

// player, images, switching
function player_images_next() {
	if(!player_available_images() || !player_active_images())
		return;

	// schedule the next image
	clearTimeout(player.images.timer_next);
	if(!player.images.stopped)
		player.images.timer_next = setTimeout(player_images_next, settings.images.duration * 1000);

	// stop or restart the slideshow if this is the final image
	if(player.images.index >= data_images.length) {
		if(settings.images.loop) {
			player.images.index = 0;
			// images_shuffle(); // for images, shuffling is handled by the switch function to support transitions
		} else {
			player_detach();
			return;
		}
	}

	// bump the index to the next image
	++player.images.index;

	// apply the current image
	// since the indexes of images change when shuffling, shuffle after storing the previous and next elements
	if(player.images.index > 0) {
		const indexes = player_images_indexes();
		const wrap_backward = player.images.reverse && indexes.current >= data_images.length - 1;
		const wrap_forward = !player.images.reverse && indexes.current <= 0;

		player.images.element_previous.setAttribute("src", data_images[indexes.previous].src);
		player.images.element_next.setAttribute("src", data_images[indexes.next].src);
		if(wrap_backward || wrap_forward)
			images_shuffle();
		player.images.element_current.setAttribute("src", data_images[indexes.current].src);

		interface_ring_images_set(player.images.stopped ? null : settings.images.duration);
		interface_update_media(false, true, false, false, false);

		// mark the elements as preloading after updating the interface, so we only see the busy icon if we make another call after this
		player.images.preloading_previous = true;
		player.images.preloading_next = true;
		player.images.preloading_current = true;

		// if we're interrupting an existing transition, reset the effect
		if(player.images.transition > 0 && player.images.transition < 1)
			player.images.transition = 0;

		// activate the fading function, also run it to instantly apply initial opacities
		clearInterval(player.images.timer_fade);
		player.images.timer_fade = setInterval(player_images_next_fade, RATE);
		player_images_next_fade();

		// since the image elements changed, the zoom element would no longer show the correct image
		// detach it until the mouse is moved again over the new image
		player_images_zoom_detach();
	}

	// refresh recommended tags
	recommendations_timer();
}

// player, images, skip
function player_images_skip(index) {
	if(!player_available_images() || !player_active_images())
		return;

	player.images.reverse = index < player.images.index;

	const overflow_start = index <= 0;
	const overflow_end = index > data_images.length;
	if((overflow_start || overflow_end) && !settings.images.loop)
		return;

	if(overflow_start) {
		player.images.index = data_images.length - 1;
		// images_shuffle(); // for images, shuffling is handled by the switch function to support transitions
	} else if(overflow_end) {
		player.images.index = 0;
		// images_shuffle(); // for images, shuffling is handled by the switch function to support transitions
	} else {
		player.images.index = index - 1;
	}

	clearTimeout(player.images.timer_next);
	player_images_next();
}

// player, images, play
function player_images_play() {
	if(!player_available_images() || !player_active_images())
		return;

	clearTimeout(player.images.timer_next);
	if(player.images.stopped) {
		player.images.stopped = false;
		player_images_next();
	} else {
		player.images.stopped = true;
		interface_update_media(false, true, false, false, false);
	}
}

// player, images, clear
function player_images_clear() {
	if(!player_active())
		return;

	player.images.index = 0;
	player.images.stopped = false;
	player.images.element_previous.style["opacity"] = 0;
	player.images.element_previous.setAttribute("src", SRC_BLANK);
	player.images.element_next.style["opacity"] = 0;
	player.images.element_next.setAttribute("src", SRC_BLANK);
	player.images.element_current.style["opacity"] = 0;
	player.images.element_current.setAttribute("src", SRC_BLANK);

	interface_update_media(false, true, false, false, false);
}

// player, music, switching, onerror
function player_music_next_onerror() {
	if(!player_available_music() || !player_active_music())
		return;

	const index = player.music.index - 1;

	player.music.preloading = false;
	player.music.element.setAttribute("src", "");
	data_music[index].src = "";
}

// player, music, switching, canplay
function player_music_next_canplay() {
	if(!player_available_music() || !player_active_music())
		return;

	if(!player.music.preloading)
		return;
	player.music.preloading = false;

	const duration = player.music.element.duration;
	if(duration === NaN || duration <= 0) {
		player_detach();
		return;
	}

	// schedule the next song
	clearTimeout(player.music.timer_next);
	player.music.timer_next = setTimeout(player_music_next, duration * 1000);

	// start playing the song
	if(!player.music.stopped)
		player.music.element.play();

	interface_update_media(false, false, false, true, false);
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
		} else {
			player_detach();
			return;
		}
	}

	// bump the index to the next song
	++player.music.index;

	// apply the current song
	if(player.music.index > 0) {
		player.music.element.setAttribute("src", data_music[player.music.index - 1].src);
		player.music.element.volume = settings.music.volume;

		interface_ring_music_set(player.music.element);
		interface_update_media(false, false, false, true, false);

		// mark the elements as preloading after updating the interface, so we only see the busy icon if we make another call after this
		player.music.preloading = true;
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

	clearTimeout(player.music.timer_next);
	player_music_next();
}

// player, music, play
function player_music_play() {
	if(!player_available_music() || !player_active_music())
		return;

	clearTimeout(player.music.timer_next);
	if(player.music.stopped) {
		// we need to know the duration of the current song in order to reschedule, don't unpause if preloading
		if(player_busy_music())
			return;

		// reschedule switching to the next song
		const duration = Math.max(player.music.element.duration - player.music.element.currentTime, 0);
		player.music.timer_next = setTimeout(player_music_next, duration * 1000);

		player.music.element.play();
		player.music.stopped = false;
	} else {
		player.music.element.pause();
		player.music.stopped = true;
	}

	interface_update_media(false, false, false, true, false);
}

// player, music, clear
function player_music_clear() {
	if(!player_active())
		return;

	player.music.index = 0;
	player.music.stopped = false;
	player.music.element.pause();
	player.music.element.currentTime = 0;
	player.music.element.removeAttribute("src");

	interface_update_media(false, false, false, true, false);
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
	return document.body.contains(player.images.element_previous) && document.body.contains(player.images.element_next) && document.body.contains(player.images.element_current);
}

// player, is active, music
function player_active_music() {
	return document.body.contains(player.music.element);
}

// player, is busy, images
function player_busy_images() {
	return player.images.preloading_previous || player.images.preloading_next || player.images.preloading_current;
}

// player, is busy, music
function player_busy_music() {
	return player.music.preloading;
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

	// configure the previous image element
	player.images.element_previous = document.createElement("img");
	player.images.element_previous.setAttribute("class", "player_image");
	player.images.element_previous.setAttribute("style", "opacity: 0; pointer-events: none");
	player.images.element_previous.setAttribute("src", SRC_BLANK);
	player.images.element_previous.setAttribute("onload", "player_images_next_onload_previous()");
	player.images.element_previous.setAttribute("onerror", "player_images_next_onerror_previous()");
	player.element.appendChild(player.images.element_previous);

	// configure the next image element
	player.images.element_next = document.createElement("img");
	player.images.element_next.setAttribute("class", "player_image");
	player.images.element_next.setAttribute("style", "opacity: 0; pointer-events: none");
	player.images.element_next.setAttribute("src", SRC_BLANK);
	player.images.element_next.setAttribute("onload", "player_images_next_onload_next()");	
	player.images.element_next.setAttribute("onerror", "player_images_next_onerror_next()");
	player.element.appendChild(player.images.element_next);

	// configure the current image element
	player.images.element_current = document.createElement("img");
	player.images.element_current.setAttribute("class", "player_image");
	player.images.element_current.setAttribute("style", "opacity: 0; pointer-events: all; cursor: none");
	player.images.element_current.setAttribute("src", SRC_BLANK);
	player.images.element_current.setAttribute("onload", "player_images_next_onload_current()");
	player.images.element_current.setAttribute("onerror", "player_images_next_onerror_current()");
	player.images.element_current.setAttribute("onmouseover", "player_images_zoom_attach()");
	player.images.element_current.setAttribute("onmouseout", "player_images_zoom_detach()");
	player.images.element_current.setAttribute("onmousemove", "player_images_zoom_update(event)");
	player.element.appendChild(player.images.element_current);

	// configure the music element
	player.music.element = document.createElement("audio");
	player.music.element.setAttribute("oncanplay", "player_music_next_canplay()");
	player.music.element.setAttribute("onerror", "player_music_next_onerror()");
	player.element.appendChild(player.music.element);

	// start the image player, images_pick will take care executing player_images_next
	player.images.index = 0;
	images_pick();

	// start the music player, music_pick will take care executing player_music_next
	player.music.index = 0;
	music_pick();

	// set the recommendations interval
	recommendations.timer = setInterval(recommendations_timer, RECOMMENDATIONS_RATE * 1000);

	interface_update_media(false, true, true, true, false);
}

// player, HTML, destroy
function player_detach() {
	if(!player_active())
		return;

	// destroy the player element
	interface.player.removeChild(player.element);
	player.element.innerHTML = "";

	// unset the interval and timeout functions
	clearInterval(player.images.timer_fade);
	clearTimeout(player.images.timer_next);
	clearTimeout(player.music.timer_next);
	clearInterval(recommendations.timer);
	player.element = null;
	player.images.index = 0;
	player.images.preloading_previous = false;
	player.images.preloading_next = false;
	player.images.preloading_current = false;
	player.images.stopped = false;
	player.images.reverse = false;
	player.images.transition = 0;
	player.images.element_previous = null;
	player.images.element_next = null;
	player.images.element_current = null;
	player.music.index = 0;
	player.music.preloading = false;
	player.music.stopped = false;
	player.music.element = null;

	interface_update_media(false, true, true, true, false);
}
