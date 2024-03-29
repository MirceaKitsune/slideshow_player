// Slideshow Viewer, Interface
// Public Domain / CC0, MirceaKitsune 2018

// seconds after which to pull data from websites after settings that require refreshing are changed
// this needs to be big enough to give users enough time to finish typing and to protect sites against spamming
const AUTOREFRESH = 5;

// how many tags to show in the recommended panels
const RECOMMENDATIONS_LIMIT = 100;

// whether to also refresh the content when loading new settings
var interface_refresh = {
	images: true,
	music: true,
	timer: 0,
	interval: null
}

// object containing all of the interface elements
var interface = {};

// properties for the ring indicators
var interface_ring = {
	images: {
		timer: null,
		date: null,
		duration: 0
	},
	music: {
		timer: null,
		element: null
	}
}

// interface, functions, ring, images, timer
function interface_ring_images_timer() {
	const score = images_current() ? images_current().score / score_images_best : 0;
	const duration = interface_ring.images.duration * 1000;
	const current_date = new Date();
	const current_ms = current_date.getTime();
	const target_ms = interface_ring.images.date ? interface_ring.images.date.getTime() + duration : null;

	var progress = 0;
	if(isNaN(current_ms) || isNaN(target_ms) || duration <= 0) {
		progress = 0;
		clearInterval(interface_ring.images.timer);
	} else if(current_ms >= target_ms) {
		progress = 1;
		clearInterval(interface_ring.images.timer);
	} else {
		progress = 1 - ((target_ms - current_ms) / duration);
	}

	interface_style_gradient(interface.media_images_thumb_ring, true, progress, score);
}

// interface, functions, ring, images, set
function interface_ring_images_set(duration) {
	clearInterval(interface_ring.images.timer);

	if(duration === null || duration === undefined) {
		// clear
		interface_ring.images.date = null;
		interface_ring.images.duration = 0;
		interface_ring_images_timer();
	} else {
		// set
		interface_ring.images.date = new Date();
		interface_ring.images.duration = duration;
		interface_ring.images.timer = setInterval(interface_ring_images_timer, RATE);
	}
}

// interface, functions, ring, music, timer
function interface_ring_music_timer() {
	const score = music_current() ? music_current().score / score_images_best : 0;
	const current_s = document.body.contains(interface_ring.music.element) ? interface_ring.music.element.currentTime : 0;
	const target_s = document.body.contains(interface_ring.music.element) ? interface_ring.music.element.duration : 0;

	var progress = 0;
	if(isNaN(current_s) || isNaN(target_s) || target_s <= 0) {
		progress = 0;
		clearInterval(interface_ring.music.timer);
	} else if(current_s >= target_s) {
		progress = 1;
		clearInterval(interface_ring.music.timer);
	} else {
		progress = current_s / target_s;
	}

	interface_style_gradient(interface.media_music_thumb_ring, true, progress, score);
}

// interface, functions, ring, music, set
function interface_ring_music_set(element) {
	clearInterval(interface_ring.music.timer);

	if(element === true) {
		// pause
	} else if(element === false) {
		// resume
		interface_ring.music.timer = setInterval(interface_ring_music_timer, RATE);
	} else if(element !== null && element !== undefined) {
		// set
		interface_ring.music.element = element;
		interface_ring.music.timer = setInterval(interface_ring_music_timer, RATE);
	} else {
		// clear
		interface_ring.music.element = null;
		interface_ring_music_timer();
	}
}

// interface, functions, date
function interface_time(sec) {
	// if time is less than a day, return string in hh:mm:ss format
	var time = "+1 day";
	if(sec <= 86400) {
		var date = new Date(null);
		date.setSeconds(sec);
		time = date.toISOString().substr(11, 8);
	}
	return time;
}

// interface, functions, autorefresh
function interface_autorefresh() {
	// if the timer has reached 0, clear it and pull new data from source websites
	// if not then decrease it by 1 every second
	if(interface_refresh.timer <= 1) {
		clearInterval(interface_refresh.interval);
		interface_refresh.timer = 0;
		interface_load(true);
	} else {
		interface_refresh.timer = Math.floor(interface_refresh.timer - 1);
		interface_update_media(false, false, true, false, false);
	}
}

// interface, functions, preload
function interface_preload(name, type) {
	// if this setting belongs to any plugin, we will want to pull new contents from the server
	// if sites don't need to be refreshed, the new settings will just be loaded without starting the timer
	if((plugins[name] && plugins[name].type === type) || plugins_settings_used(name, type)) {
		if(type === TYPE_IMAGES)
			interface_refresh.images = true;
		if(type === TYPE_MUSIC)
			interface_refresh.music = true;

		clearInterval(interface_refresh.interval);
		interface_refresh.interval = setInterval(interface_autorefresh, 1000);
		interface_refresh.timer = AUTOREFRESH;
	}

	interface_load(false);
}

// interface, functions, plugin loader
function interface_load(pull) {
	const elements_controls_images = document.forms["controls_images"].elements;
	const elements_controls_music = document.forms["controls_music"].elements;
	const elements_list = document.forms["controls_sites"].elements;

	// store some old settings to compare them later below
	const old_images_count = settings.images.count;
	const old_images_duration = settings.images.duration;
	const old_images_shuffle = settings.images.shuffle;
	const old_images_effects = settings.images.effects;
	const old_music_count = settings.music.count;
	const old_music_shuffle = settings.music.shuffle;

	// configure the system settings
	settings.sites = [];
	for(var i = 0; i < elements_list.length; i++) {
		if(elements_list[i].checked)
			settings.sites.push(elements_list[i].name);
	}
	settings.images.keywords = elements_controls_images["controls_images_search_keywords"].value;
	settings.images.nsfw = Boolean(elements_controls_images["controls_images_search_nsfw"].checked);
	settings.images.count = Number(elements_controls_images["controls_images_count"].value);
	settings.images.duration = Number(elements_controls_images["controls_images_duration"].value);
	settings.images.score = Boolean(elements_controls_images["controls_images_duration_score"].checked);
	settings.images.loop = Boolean(elements_controls_images["controls_images_play_loop"].checked);
	settings.images.shuffle = Boolean(elements_controls_images["controls_images_play_shuffle"].checked);
	settings.images.effects = Boolean(elements_controls_images["controls_images_play_effects"].checked);
	settings.music.keywords = elements_controls_music["controls_music_search_keywords"].value;
	settings.music.count = Number(elements_controls_music["controls_music_count"].value);
	settings.music.loop = Boolean(elements_controls_music["controls_music_play_loop"].checked);
	settings.music.shuffle = Boolean(elements_controls_music["controls_music_play_shuffle"].checked);

	// limit the settings to acceptable values
	// should match the limits defined on the corresponding HTML elements
	settings.images.keywords = settings.images.keywords.substring(0, 100);
	settings.images.count = Math.max(Math.min(settings.images.count, 1000000), 0);
	settings.images.duration = Math.max(Math.min(settings.images.duration, 86400), 5);
	settings.music.keywords = settings.music.keywords.substring(0, 100);
	settings.music.count = Math.max(Math.min(settings.music.count, 1000000), 0);

	// update the settings url
	settings_url_set();

	// update the images and songs if a runtime setting has changed
	if(settings.images.effects != old_images_effects || settings.images.duration != old_images_duration)
		player_images_effects();
	if(settings.images.count !== old_images_count || settings.images.shuffle !== old_images_shuffle)
		images_pick();
	if(settings.music.count !== old_music_count || settings.music.shuffle !== old_music_shuffle)
		music_pick();

	// load the plugins if we have any sources enabled
	if(pull) {
		if(interface_refresh.images)
			images_clear();
		if(interface_refresh.music)
			music_clear();

		if(settings.sites.length > 0) {
			var has_images = has_music = false;
			for(var site in settings.sites) {
				const name = settings.sites[site];
				if(interface_refresh.images && plugins[name] && plugins[name].type === TYPE_IMAGES) {
					plugins_load(name);
					has_images = true;
				}
				if(interface_refresh.music && plugins[name] && plugins[name].type === TYPE_MUSIC) {
					plugins_load(name);
					has_music = true;
				}
			}

			// if there are no items of the given type, clear that category
			if(interface_refresh.images && !has_images) {
				images_clear_active();
				interface_update_recommendations_images_clear();
			}
			if(interface_refresh.music && !has_music) {
				music_clear_active();
				interface_update_recommendations_music_clear();
			}
		} else {
			// if there are no items available, clear everything
			plugins_update(null);
			player_detach();
			images_clear_active();
			music_clear_active();
			interface_update_recommendations_images_clear();
			interface_update_recommendations_music_clear();
		}
	}

	interface_update_media(false, true, true, true, false);
}

// interface, functions, play button
function interface_play() {
	// add or remove the player
	if(!player_active() && player_available())
		player_attach();
	else
		player_detach();
}

// interface, update style, gradient
function interface_style_gradient(element, radial, blend_bar, blend_color) {
	// a color is picked from the array representing the value of the blend color
	const colors = ["#ff4040", "#ff8040", "#e0e040", "#40e040", "#40e0e0", "#4080ff", "#8040ff", "#ff40ff"];
	const colors_index = Math.round((colors.length - 1) * blend_color);
	const color_empty = "#ffffff";
	const color_full = colors[colors_index];

	const pos_start = " " + percent(0);
	const pos_end = " " + percent(1);
	const pos_blend = " " + percent(Math.min(Math.max(blend_bar, 0), 1));

	const gradient_type = radial ? "conic-gradient" : "linear-gradient";
	const gradient_dir = radial ? "from 0deg" : "90deg";
	const gradient_color = color_full + pos_start + pos_blend + ", " + color_empty + pos_start + pos_end;
	const gradient = gradient_type + "(" + gradient_dir + ", " + gradient_color + ")";

	element.style["background-image"] = gradient;
}

// interface, update style, button, color
function interface_style_button_color(element, color) {
	element.classList.remove("button_color_black");
	element.classList.remove("button_color_white");
	element.classList.remove("button_color_red");
	element.classList.remove("button_color_yellow");
	element.classList.remove("button_color_green");
	element.classList.remove("button_color_cyan");
	element.classList.remove("button_color_blue");
	element.classList.remove("button_color_pink");
	element.classList.add("button_color_" + color);
}

// interface, update, attached
function interface_update_attached(attached) {
	if(attached) {
		interface.media.style["opacity"] = 1;
		interface.media.setAttribute("class", "item_media item_media_position_detached item_media_background_detached");
		interface.media_images_info.setAttribute("class", "text_size_small text_color_black");
		interface.media_music_info.setAttribute("class", "text_size_small text_color_black");
		interface.media_controls_label.setAttribute("class", "text_size_medium text_color_black");
		interface.media_images_controls_brightness_label.setAttribute("class", "text_size_medium text_color_black");
		interface.media_images_recommendations_label.setAttribute("class", "text_size_large text_color_black");
		interface.media_images_recommendations_list.setAttribute("class", "text_size_medium text_color_black");
		interface.media_music_controls_volume_label.setAttribute("class", "text_size_medium text_color_black");
		interface.media_music_recommendations_label.setAttribute("class", "text_size_large text_color_black");
		interface.media_music_recommendations_list.setAttribute("class", "text_size_medium text_color_black");
		interface.player.removeChild(interface.media);
		document.body.appendChild(interface.media);
	} else {
		// interface.media.style["opacity"] = 1;
		interface.media.setAttribute("class", "item_media item_media_position_attached item_media_background_attached");
		interface.media_images_info.setAttribute("class", "text_size_small text_color_white");
		interface.media_music_info.setAttribute("class", "text_size_small text_color_white");
		interface.media_controls_label.setAttribute("class", "text_size_medium text_color_white");
		interface.media_images_controls_brightness_label.setAttribute("class", "text_size_medium text_color_white");
		interface.media_images_recommendations_label.setAttribute("class", "text_size_large text_color_white");
		interface.media_images_recommendations_list.setAttribute("class", "text_size_medium text_color_white");
		interface.media_music_controls_volume_label.setAttribute("class", "text_size_medium text_color_white");
		interface.media_music_recommendations_label.setAttribute("class", "text_size_large text_color_white");
		interface.media_music_recommendations_list.setAttribute("class", "text_size_medium text_color_white");
		document.body.removeChild(interface.media);
		interface.player.appendChild(interface.media);
	}
}

// interface, update HTML, controls, images, brightness
function interface_update_controls_images_brightness() {
	const elements_controls_media_images = document.forms["controls_media_images"].elements;
	player.images.brightness = Number(elements_controls_media_images["controls_media_images_brightness"].value);
	player.images.brightness = Math.max(Math.min(player.images.brightness, 1), 0);

	interface.media_images_controls_brightness_label.innerHTML = percent(player.images.brightness);
	if(document.body.contains(player.element))
		player.element.style["opacity"] = player.images.brightness;
}

// interface, update HTML, controls, music, volume
function interface_update_controls_music_volume() {
	const elements_controls_media_music = document.forms["controls_media_music"].elements;
	player.music.volume = Number(elements_controls_media_music["controls_media_music_volume"].value);
	player.music.volume = Math.max(Math.min(player.music.volume, 1), 0);

	interface.media_music_controls_volume_label.innerHTML = percent(player.music.volume);
	if(document.body.contains(player.music.element))
		player.music.element.volume = player.music.volume;
}

// interface, update HTML, controls, sites
function interface_update_controls_sites() {
	interface.controls_sites_list.innerHTML = "";
	for(var item in plugins) {
		// interface HTML: controls, images, sites, list, checkbox
		const id_checkbox = "controls_images_list_sites_" + item + "_checkbox";
		interface[id_checkbox] = document.createElement("input");
		interface[id_checkbox].setAttribute("id", id_checkbox);
		interface[id_checkbox].setAttribute("title", "Whether to fetch content from " + item);
		interface[id_checkbox].setAttribute("type", "checkbox");
		interface[id_checkbox].setAttribute("name", item);
		if(settings.sites.length == 0 || settings.sites.indexOf(item) >= 0)
			interface[id_checkbox].setAttribute("checked", true);
		interface[id_checkbox].setAttribute("onclick", "interface_preload(\"" + item + "\", \"" + plugins[item].type + "\")");
		interface.controls_sites_list.appendChild(interface[id_checkbox]);

		// interface HTML: controls, images, sites, list, label
		const id_label = "controls_images_list_sites_" + item + "_label";
		interface[id_label] = document.createElement("a");
		interface[id_label].setAttribute("style", "text-align: left; text-decoration: none; color: #000000");
		interface[id_label].setAttribute("target", "_blank");
		interface[id_label].setAttribute("href", plugins[item].url);
		interface[id_label].innerHTML = plugins[item].type + " " + item + "<br/>";
		interface.controls_sites_list.appendChild(interface[id_label]);
	}
}

// interface, functions, media
function interface_update_media(update_images_tags, update_images, update_controls, update_music, update_music_tags) {
	if(update_images_tags)
		interface_update_recommendations_images();
	if(update_images)
		interface_update_media_images();
	if(update_controls)
		interface_update_media_controls();
	if(update_music)
		interface_update_media_music();
	if(update_music_tags)
		interface_update_recommendations_music();
}

// interface, update HTML, media images
function interface_update_media_images() {
	const active = player_available_images() && player_active_images();
	const ready = !player_busy_images() && player.images.index > 0;

	// configure previous / play / next elements (onclick)
	if(active) {
		interface.media_images_previous.setAttribute("onclick", "player_images_skip(player.images.index - 1)");
		interface.media_images_play.setAttribute("onclick", "player_images_play()");
		interface.media_images_next.setAttribute("onclick", "player_images_skip(player.images.index + 1)");
	} else {
		interface.media_images_previous.removeAttribute("onclick");
		interface.media_images_play.removeAttribute("onclick");
		interface.media_images_next.removeAttribute("onclick");
	}
	// configure previous / play / next elements (innerHTML)
	if(active && !player.images.stopped) {
		interface.media_images_previous.innerHTML = "|◀";
		interface.media_images_play.innerHTML = "||" + (active && !ready ? "⧗" : "");
		interface.media_images_next.innerHTML = "▶|";
	} else if(active) {
		interface.media_images_previous.innerHTML = "|◀";
		interface.media_images_play.innerHTML = "▶" + (active && !ready ? "⧗" : "");
		interface.media_images_next.innerHTML = "▶|";
	} else {
		interface.media_images_previous.innerHTML = "|◀";
		interface.media_images_play.innerHTML = "∅" + (active && !ready ? "⧗" : "");
		interface.media_images_next.innerHTML = "▶|";
	}
	// configure previous / play / next elements (color)
	if(active && ready && !player.images.stopped) {
		interface_style_button_color(interface.media_images_previous, "green");
		interface_style_button_color(interface.media_images_play, "green");
		interface_style_button_color(interface.media_images_next, "green");
	} else if(active && ready) {
		interface_style_button_color(interface.media_images_previous, "yellow");
		interface_style_button_color(interface.media_images_play, "yellow");
		interface_style_button_color(interface.media_images_next, "yellow");
	} else {
		interface_style_button_color(interface.media_images_previous, "red");
		interface_style_button_color(interface.media_images_play, "red");
		interface_style_button_color(interface.media_images_next, "red");
	}

	// configure label / thumb / info elements
	if(active && player.images.index > 0) {
		var label_title = images_current().title;
		if(label_title.length > 32)
			label_title = label_title.substring(0, 32) + "...";

		var label_author = images_current().author;
		if(label_author.length > 16)
			label_author = label_author.substring(0, 16) + "...";

		const time = interface_time(interface_ring.images.duration);
		const score_current = images_current().score / score_images_best;
		const score_average = score_images_average / score_images_best;
		interface_style_gradient(interface.media_images_bar, false, player.images.index / data_images.length, score_average);
		interface.media_images_bar.setAttribute("title", player.images.index + " / " + data_images.length);
		interface.media_images_thumb.setAttribute("href", images_current().url);
		interface.media_images_thumb_image.setAttribute("src", images_current().thumb);
		interface.media_images_thumb_info.innerHTML = time + "<br/>" + percent(score_current) + " / " + percent(score_average);
		interface.media_images_info.innerHTML = "<b>" + label_title + "</b> by <b>" + label_author + "</b>";
	} else {
		interface_style_gradient(interface.media_images_bar, false, 0, 0);
		interface.media_images_bar.removeAttribute("title");
		interface.media_images_thumb.removeAttribute("href");
		interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
		interface.media_images_thumb_info.innerHTML = "";
		interface.media_images_info.innerHTML = "";
	}

	// update the ring element
	if(!active || player.images.stopped)
		interface_ring_images_set(null);
}

// interface, update HTML, media music
function interface_update_media_music() {
	const active = player_available_music() && player_active_music();
	const ready = !player_busy_music() && player.music.index > 0;

	// configure previous / play / next elements (onclick)
	if(active) {
		interface.media_music_previous.setAttribute("onclick", "player_music_skip(player.music.index - 1)");
		interface.media_music_play.setAttribute("onclick", "player_music_play()");
		interface.media_music_next.setAttribute("onclick", "player_music_skip(player.music.index + 1)");
	} else {
		interface.media_music_previous.removeAttribute("onclick");
		interface.media_music_play.removeAttribute("onclick");
		interface.media_music_next.removeAttribute("onclick");
	}
	// configure previous / play / next elements (innerHTML)
	if(active && !player.music.stopped) {
		interface.media_music_previous.innerHTML = "|◀";
		interface.media_music_play.innerHTML = "||" + (active && !ready ? "⧗" : "");
		interface.media_music_next.innerHTML = "▶|";
	} else if(active) {
		interface.media_music_previous.innerHTML = "|◀";
		interface.media_music_play.innerHTML = "▶" + (active && !ready ? "⧗" : "");
		interface.media_music_next.innerHTML = "▶|";
	} else {
		interface.media_music_previous.innerHTML = "|◀";
		interface.media_music_play.innerHTML = "∅" + (active && !ready ? "⧗" : "");
		interface.media_music_next.innerHTML = "▶|";
	}
	// configure previous / play / next elements (color)
	if(active && ready && !player.music.stopped) {
		interface_style_button_color(interface.media_music_previous, "green");
		interface_style_button_color(interface.media_music_play, "green");
		interface_style_button_color(interface.media_music_next, "green");
	} else if(active && ready) {
		interface_style_button_color(interface.media_music_previous, "yellow");
		interface_style_button_color(interface.media_music_play, "yellow");
		interface_style_button_color(interface.media_music_next, "yellow");
	} else {
		interface_style_button_color(interface.media_music_previous, "red");
		interface_style_button_color(interface.media_music_play, "red");
		interface_style_button_color(interface.media_music_next, "red");
	}

	// configure label / thumb / info elements
	if(active && player.music.index > 0) {
		var label_title = music_current().title;
		if(label_title.length > 32)
			label_title = label_title.substring(0, 32) + "...";

		var label_author = music_current().author;
		if(label_author.length > 16)
			label_author = label_author.substring(0, 16) + "...";

		const time = interface_time(player.music.element.duration);
		const score_current = music_current().score / score_music_best;
		const score_average = score_music_average / score_music_best;
		interface_style_gradient(interface.media_music_bar, false, player.music.index / data_music.length, score_average);
		interface.media_music_bar.setAttribute("title", player.music.index + " / " + data_music.length);
		interface.media_music_thumb.setAttribute("href", music_current().url);
		interface.media_music_thumb_song.setAttribute("src", music_current().thumb);
		interface.media_music_thumb_info.innerHTML = time + "<br/>" + percent(score_current) + " / " + percent(score_average);
		interface.media_music_info.innerHTML = "<b>" + label_title + "</b> by <b>" + label_author + "</b>";
	} else {
		interface_style_gradient(interface.media_music_bar, false, 0, 0);
		interface.media_music_bar.removeAttribute("title");
		interface.media_music_thumb.removeAttribute("href");
		interface.media_music_thumb_song.setAttribute("src", SRC_BLANK);
		interface.media_music_thumb_info.innerHTML = "";
		interface.media_music_info.innerHTML = "";
	}

	// update the ring element
	if(!active)
		interface_ring_music_set(null);
	else
		interface_ring_music_set(player.music.stopped);
}

// interface, update HTML, recommendation images, clear
function interface_update_recommendations_images_clear() {
	recommendations.images = {};
	recommendations_timer();
	interface_update_media(true, false, false, false, false);
}

// interface, update HTML, recommendation images, set
function interface_update_recommendations_images_set(tag) {
	interface.controls_images_search_keywords_input.setAttribute("value", tag);
	interface.controls_images_search_keywords_input.value = tag;
	interface_preload("keywords", TYPE_IMAGES);
	interface_update_media(true, false, false, false, false);
}

// interface, update HTML, recommendation images
function interface_update_recommendations_images() {
	// sort the recommended tags into an array
	const recommendations_sorted = Object.keys(recommendations.images).sort(function(a, b) { return recommendations.images[b] - recommendations.images[a] });
	const current_tag = interface.controls_images_search_keywords_input.value || interface.controls_images_search_keywords_input.getAttribute("value");

	interface.media_images_recommendations_list.innerHTML = "No recommended tags available";
	if(recommendations_sorted.length > 0) {
		var tags = 0;
		for(var tag in recommendations_sorted) {
			var tag_name = recommendations_sorted[tag];
			if(tag_name.length > 32)
				tag_name = tag_name.substring(0, 32) + "...";
	
			if(tags == 0)
				interface.media_images_recommendations_list.innerHTML = "";

			// interface HTML: media, images, recommendations, tag
			var tag_element = document.createElement("label");
			tag_element.setAttribute("title", "Click to apply this tag");
			tag_element.setAttribute("style", "pointer-events: all; cursor: pointer");
			tag_element.setAttribute("onclick", "interface_update_recommendations_images_set(\"" + tag_name + "\")");
			interface.media_images_recommendations_list.appendChild(tag_element);

			// tags that are present on this item will be underlined
			// tags that match the keyword in use will be bold
			tag_element.innerHTML = tag_name;
			if(player_available_images() && player_active_images() && player.images.index > 0 && images_current().tags.indexOf(tag_name) >= 0)
				tag_element.innerHTML = "<u>" + tag_element.innerHTML + "</u>";
			if(current_tag.toLowerCase().includes(tag_name))
				tag_element.innerHTML = "<b>" + tag_element.innerHTML + "</b>";
			tag_element.innerHTML = tag_element.innerHTML + "<br/>";

			// stop here if we've reached the display limit
			++tags;
			if(tags >= RECOMMENDATIONS_LIMIT)
				break;
		}
	}
}

// interface, update HTML, recommendation music, clear
function interface_update_recommendations_music_clear() {
	recommendations.music = {};
	recommendations_timer();
	interface_update_media(false, false, false, false, true);
}

// interface, update HTML, recommendation music, set
function interface_update_recommendations_music_set(tag) {
	interface.controls_music_search_keywords_input.setAttribute("value", tag);
	interface.controls_music_search_keywords_input.value = tag;
	interface_preload("keywords", TYPE_MUSIC);
	interface_update_media(false, false, false, false, true);
}

// interface, update HTML, recommendation music
function interface_update_recommendations_music() {
	// sort the recommended tags into an array
	const recommendations_sorted = Object.keys(recommendations.music).sort(function(a, b) { return recommendations.music[b] - recommendations.music[a] });
	const current_tag = interface.controls_music_search_keywords_input.value || interface.controls_music_search_keywords_input.getAttribute("value");

	interface.media_music_recommendations_list.innerHTML = "No recommended tags available";
	if(recommendations_sorted.length > 0) {
		var tags = 0;
		for(var tag in recommendations_sorted) {
			var tag_name = recommendations_sorted[tag];
			if(tag_name.length > 32)
				tag_name = tag_name.substring(0, 32) + "...";

			if(tags == 0)
				interface.media_music_recommendations_list.innerHTML = "";

			// interface HTML: media, music, recommendations, tag
			var tag_element = document.createElement("label");
			tag_element.setAttribute("title", "Click to apply this tag");
			tag_element.setAttribute("style", "pointer-events: all; cursor: pointer");
			tag_element.setAttribute("onclick", "interface_update_recommendations_music_set(\"" + tag_name + "\")");
			interface.media_music_recommendations_list.appendChild(tag_element);

			// tags that are present on this item will be underlined
			// tags that match the keyword in use will be bold
			tag_element.innerHTML = tag_name;
			if(player_available_music() && player_active_music() && player.music.index > 0 && music_current().tags.indexOf(tag_name) >= 0)
				tag_element.innerHTML = "<u>" + tag_element.innerHTML + "</u>";
			if(current_tag.toLowerCase().includes(tag_name))
				tag_element.innerHTML = "<b>" + tag_element.innerHTML + "</b>";
			tag_element.innerHTML = tag_element.innerHTML + "<br/>";

			// stop here if we've reached the display limit
			++tags;
			if(tags >= RECOMMENDATIONS_LIMIT)
				break;
		}
	}
}

// interface, update HTML, media controls
function interface_update_media_controls() {
	// configure the label element
	const time = interface_time(data_images.length * settings.images.duration);
	interface.media_controls_label.innerHTML =
		TYPE_IMAGES + " " + data_images.length + " <b>/</b> " + data_images_all.length + " <b>↺</b> " + settings.images.duration + " sec <b>(</b>" + time + "<b>)</b> " +
		TYPE_MUSIC + " " + data_music.length + " <b>/</b> " + data_music_all.length;

	// first configuration, based on player status
	// configure play element, window title
	if(player_active()) {
		interface.media_controls_play.setAttribute("onclick", "interface_play()");
		interface.media_controls_play.innerHTML = "■";
		interface_style_button_color(interface.media_controls_play, "green");
		document.title = "Slideshow Player - " + TYPE_IMAGES + " " + data_images.length + " ↺ " + settings.images.duration + " sec ▶";
	} else if(player_available()) {
		interface.media_controls_play.setAttribute("onclick", "interface_play()");
		interface.media_controls_play.innerHTML = "▶";
		interface_style_button_color(interface.media_controls_play, "yellow");
		document.title = "Slideshow Player - " + TYPE_IMAGES + " " + data_images.length + " ↺ " + settings.images.duration + " sec ■";
	} else {
		interface.media_controls_play.removeAttribute("onclick");
		interface.media_controls_play.innerHTML = "∅";
		interface_style_button_color(interface.media_controls_play, "red");
		document.title = "Slideshow Player ∅";
	}

	// second configuration, based on plugin status
	// configure play / label elements, window title
	const busy = plugins_busy();
	if(interface_refresh.timer > 0) {
		{
			interface.media_controls_label.innerHTML += "<br/>⟳ for ";
			if(interface_refresh.images)
				interface.media_controls_label.innerHTML += TYPE_IMAGES;
			if(interface_refresh.images && interface_refresh.music)
				interface.media_controls_label.innerHTML += " and ";
			if(interface_refresh.music)
				interface.media_controls_label.innerHTML += TYPE_MUSIC;
			interface.media_controls_label.innerHTML += " in " + interface_refresh.timer + " sec";
		}
		interface.media_controls_play.innerHTML += " ⟳";
		document.title += " ⟳";
	}
	if(busy[TYPE_IMAGES] > 0 || busy[TYPE_MUSIC] > 0) {
		{
			interface.media_controls_label.innerHTML += "<br/>⧗ with ";
			if(busy[TYPE_IMAGES] > 0)
				interface.media_controls_label.innerHTML += TYPE_IMAGES + " " + busy[TYPE_IMAGES];
			if(busy[TYPE_IMAGES] > 0 && busy[TYPE_MUSIC] > 0)
				interface.media_controls_label.innerHTML += " and ";
			if(busy[TYPE_MUSIC] > 0)
				interface.media_controls_label.innerHTML += TYPE_MUSIC + " " + busy[TYPE_MUSIC];
			interface.media_controls_label.innerHTML += " sources";
			if(player_active() && (busy[TYPE_IMAGES] > 0 || busy[TYPE_MUSIC] > 0))
				interface.media_controls_label.innerHTML += "<br/>Items may refresh when ready";
		}
		interface.media_controls_play.innerHTML += " ⧗";
		document.title += " ⧗";
	}
}

// interface, HTML, create
function interface_init() {
	interface = {};

	// interface HTML: player
	interface.player = document.createElement("div");
	interface.player.setAttribute("class", "item_player item_player_position_detached");
	document.body.appendChild(interface.player);

	// interface HTML: controls
	interface.controls = document.createElement("div");
	interface.controls.setAttribute("class", "item_controls item_controls_position");
	document.body.appendChild(interface.controls);
	{
		// interface HTML: controls, banner
		interface.controls_banner = document.createElement("div");
		interface.controls_banner.setAttribute("style", "top: 0%; left: 0%; width: 100%; height: 5%; overflow: hidden");
		interface.controls.appendChild(interface.controls_banner);
		{
			// interface HTML: controls, banner, link
			interface.controls_banner_link = document.createElement("a");
			interface.controls_banner_link.setAttribute("target", "_blank");
			interface.controls_banner_link.setAttribute("href", "https://github.com/MirceaKitsune/slideshow_player");
			interface.controls_banner_link.setAttribute("style", "text-align: center; text-decoration: none; color: #000000");
			interface.controls_banner.appendChild(interface.controls_banner_link);
			{
				// interface HTML: controls, banner, link, image
				interface.controls_banner_link_image = document.createElement("img");
				interface.controls_banner_link_image.setAttribute("src", "svg/icon_eye.svg");
				interface.controls_banner_link_image.setAttribute("style", "position: absolute; top: 0%; left: 0%; height: 5%");
				interface.controls_banner_link.appendChild(interface.controls_banner_link_image);

				// interface HTML: controls, banner, link, text
				interface.controls_banner_link_text = document.createElement("div");
				interface.controls_banner_link_text.setAttribute("style", "top: 0%; left: 0%; width: 100%; height: 100%");
				interface.controls_banner_link_text.innerHTML =
					"<font size=4><b>Slideshow Player</b></font><br/>" +
					"<font size=2><b>by MirceaKitsune</b></font>";
				interface.controls_banner_link.appendChild(interface.controls_banner_link_text);
			}
		}

		// interface HTML: controls, images
		interface.controls_images = document.createElement("form");
		interface.controls_images.setAttribute("id", "controls_images");
		interface.controls.appendChild(interface.controls_images);
		{
			// interface HTML: media, images, title
			interface.controls_images_title = document.createElement("p");
			interface.controls_images_title.setAttribute("style", "text-align: center");
			interface.controls_images_title.innerHTML = "<font size=4><b>" + TYPE_IMAGES + " Image settings</b></font>";
			interface.controls_images.appendChild(interface.controls_images_title);

			// interface HTML: controls, images, search
			interface.controls_images_search = document.createElement("p");
			interface.controls_images_search.innerHTML = "<b>Search:<b/><br/>";
			interface.controls_images.appendChild(interface.controls_images_search);
			{
				// interface HTML: controls, images, search, keywords, input
				interface.controls_images_search_keywords_input = document.createElement("input");
				interface.controls_images_search_keywords_input.setAttribute("id", "controls_images_search_keywords");
				interface.controls_images_search_keywords_input.setAttribute("title", "Images matching those keywords will be used in the slideshow");
				interface.controls_images_search_keywords_input.setAttribute("type", "text");
				interface.controls_images_search_keywords_input.setAttribute("value", settings.images.keywords);
				interface.controls_images_search_keywords_input.setAttribute("maxlength", "100");
				interface.controls_images_search_keywords_input.setAttribute("onclick", "interface_preload(\"keywords\", TYPE_IMAGES)");
				interface.controls_images_search_keywords_input.setAttribute("onkeyup", "interface_preload(\"keywords\", TYPE_IMAGES)");
				interface.controls_images_search.appendChild(interface.controls_images_search_keywords_input);

				// interface HTML: controls, images, search, br
				interface.controls_images_search_br = document.createElement("br");
				interface.controls_images_search.appendChild(interface.controls_images_search_br);

				// interface HTML: controls, images, search, nsfw, input
				interface.controls_images_search_nsfw_input = document.createElement("input");
				interface.controls_images_search_nsfw_input.setAttribute("id", "controls_images_search_nsfw");
				interface.controls_images_search_nsfw_input.setAttribute("title", "Include content that is not safe for work");
				interface.controls_images_search_nsfw_input.setAttribute("type", "checkbox");
				if(settings.images.nsfw)
					interface.controls_images_search_nsfw_input.setAttribute("checked", true);
				interface.controls_images_search_nsfw_input.setAttribute("onclick", "interface_preload(\"nsfw\", TYPE_IMAGES)");
				interface.controls_images_search.appendChild(interface.controls_images_search_nsfw_input);

				// interface HTML: controls, images, search, nsfw, label
				interface.controls_images_search_nsfw_label = document.createElement("label");
				interface.controls_images_search_nsfw_label.innerHTML = "NSFW<br/>";
				interface.controls_images_search.appendChild(interface.controls_images_search_nsfw_label);
			}

			// interface HTML: controls, images, count
			interface.controls_images_count = document.createElement("p");
			interface.controls_images_count.innerHTML = "<b>Count:<b/><br/>";
			interface.controls_images.appendChild(interface.controls_images_count);
			{
				// interface HTML: controls, images, count, input
				interface.controls_images_count_input = document.createElement("input");
				interface.controls_images_count_input.setAttribute("id", "controls_images_count");
				interface.controls_images_count_input.setAttribute("title", "The total number of images to be used in the slideshow");
				interface.controls_images_count_input.setAttribute("type", "number");
				interface.controls_images_count_input.setAttribute("value", settings.images.count);
				interface.controls_images_count_input.setAttribute("step", "10");
				interface.controls_images_count_input.setAttribute("min", "0");
				interface.controls_images_count_input.setAttribute("max", "1000000");
				interface.controls_images_count_input.setAttribute("onclick", "interface_preload(\"count\", TYPE_IMAGES)");
				interface.controls_images_count_input.setAttribute("onkeyup", "interface_preload(\"count\", TYPE_IMAGES)");
				interface.controls_images_count.appendChild(interface.controls_images_count_input);
			}

			// interface HTML: controls, images, duration
			interface.controls_images_duration = document.createElement("p");
			interface.controls_images_duration.innerHTML = "<b>Duration:<b/><br/>";
			interface.controls_images.appendChild(interface.controls_images_duration);
			{
				// interface HTML: controls, images, duration, input
				interface.controls_images_duration_input = document.createElement("input");
				interface.controls_images_duration_input.setAttribute("id", "controls_images_duration");
				interface.controls_images_duration_input.setAttribute("title", "Number of seconds for which to display each image");
				interface.controls_images_duration_input.setAttribute("type", "number");
				interface.controls_images_duration_input.setAttribute("value", settings.images.duration);
				interface.controls_images_duration_input.setAttribute("step", "1");
				interface.controls_images_duration_input.setAttribute("min", "5");
				interface.controls_images_duration_input.setAttribute("max", "1000");
				interface.controls_images_duration_input.setAttribute("onclick", "interface_preload(\"duration\", TYPE_IMAGES)");
				interface.controls_images_duration_input.setAttribute("onkeyup", "interface_preload(\"duration\", TYPE_IMAGES)");
				interface.controls_images_duration.appendChild(interface.controls_images_duration_input);

				// interface HTML: controls, images, duration, br
				interface.controls_images_duration_br = document.createElement("br");
				interface.controls_images_duration.appendChild(interface.controls_images_duration_br);

				// interface HTML: controls, images, duration, score, input
				interface.controls_images_duration_score_input = document.createElement("input");
				interface.controls_images_duration_score_input.setAttribute("id", "controls_images_duration_score");
				interface.controls_images_duration_score_input.setAttribute("title", "Duration is reduced or doubled based on image score");
				interface.controls_images_duration_score_input.setAttribute("type", "checkbox");
				if(settings.images.score)
					interface.controls_images_duration_score_input.setAttribute("checked", true);
				interface.controls_images_duration_score_input.setAttribute("onclick", "interface_preload(\"score\", TYPE_IMAGES)");
				interface.controls_images_duration.appendChild(interface.controls_images_duration_score_input);

				// interface HTML: controls, images, duration, score, label
				interface.controls_images_duration_score_label = document.createElement("label");
				interface.controls_images_duration_score_label.innerHTML = "Score<br/>";
				interface.controls_images_duration.appendChild(interface.controls_images_duration_score_label);
			}

			// interface HTML: controls, images, play
			interface.controls_images_play = document.createElement("p");
			interface.controls_images_play.innerHTML = "<b>Options:<b/><br/>";
			interface.controls_images.appendChild(interface.controls_images_play);
			{
				// interface HTML: controls, images, play, loop, input
				interface.controls_images_play_loop_input = document.createElement("input");
				interface.controls_images_play_loop_input.setAttribute("id", "controls_images_play_loop");
				interface.controls_images_play_loop_input.setAttribute("title", "Whether to loop through the images indefinitely");
				interface.controls_images_play_loop_input.setAttribute("type", "checkbox");
				if(settings.images.loop)
					interface.controls_images_play_loop_input.setAttribute("checked", true);
				interface.controls_images_play_loop_input.setAttribute("onclick", "interface_preload(\"loop\", TYPE_IMAGES)");
				interface.controls_images_play.appendChild(interface.controls_images_play_loop_input);

				// interface HTML: controls, images, play, loop, label
				interface.controls_images_play_loop_label = document.createElement("label");
				interface.controls_images_play_loop_label.innerHTML = "Loop<br/>";
				interface.controls_images_play.appendChild(interface.controls_images_play_loop_label);

				// interface HTML: controls, images, play, shuffle, input
				interface.controls_images_play_shuffle_input = document.createElement("input");
				interface.controls_images_play_shuffle_input.setAttribute("id", "controls_images_play_shuffle");
				interface.controls_images_play_shuffle_input.setAttribute("title", "Whether to shuffle the images before playing");
				interface.controls_images_play_shuffle_input.setAttribute("type", "checkbox");
				if(settings.images.shuffle)
					interface.controls_images_play_shuffle_input.setAttribute("checked", true);
				interface.controls_images_play_shuffle_input.setAttribute("onclick", "interface_preload(\"shuffle\", TYPE_IMAGES)");
				interface.controls_images_play.appendChild(interface.controls_images_play_shuffle_input);

				// interface HTML: controls, images, play, shuffle, label
				interface.controls_images_play_shuffle_label = document.createElement("label");
				interface.controls_images_play_shuffle_label.innerHTML = "Shuffle<br/>";
				interface.controls_images_play.appendChild(interface.controls_images_play_shuffle_label);

				// interface HTML: controls, images, play, effects, input
				interface.controls_images_play_effects_input = document.createElement("input");
				interface.controls_images_play_effects_input.setAttribute("id", "controls_images_play_effects");
				interface.controls_images_play_effects_input.setAttribute("title", "Whether to enable image effects");
				interface.controls_images_play_effects_input.setAttribute("type", "checkbox");
				if(settings.images.effects)
					interface.controls_images_play_effects_input.setAttribute("checked", true);
				interface.controls_images_play_effects_input.setAttribute("onclick", "interface_preload(\"effects\", TYPE_IMAGES)");
				interface.controls_images_play.appendChild(interface.controls_images_play_effects_input);

				// interface HTML: controls, images, play, effects, label
				interface.controls_images_play_effects_label = document.createElement("label");
				interface.controls_images_play_effects_label.innerHTML = "Effects<br/>";
				interface.controls_images_play.appendChild(interface.controls_images_play_effects_label);
			}
		}

		// interface HTML: controls, hr
		interface.controls_hr_1 = document.createElement("hr");
		interface.controls.appendChild(interface.controls_hr_1);

		// interface HTML: controls, music
		interface.controls_music = document.createElement("form");
		interface.controls_music.setAttribute("id", "controls_music");
		interface.controls.appendChild(interface.controls_music);
		{
			// interface HTML: media, music, title
			interface.controls_music_title = document.createElement("p");
			interface.controls_music_title.setAttribute("style", "text-align: center");
			interface.controls_music_title.innerHTML = "<font size=4><b>" + TYPE_MUSIC + " Music settings</b></font>";
			interface.controls_music.appendChild(interface.controls_music_title);

			// interface HTML: controls, music, search
			interface.controls_music_search = document.createElement("p");
			interface.controls_music_search.innerHTML = "<b>Search:<b/><br/>";
			interface.controls_music.appendChild(interface.controls_music_search);
			{
				// interface HTML: controls, music, search, keywords, input
				interface.controls_music_search_keywords_input = document.createElement("input");
				interface.controls_music_search_keywords_input.setAttribute("id", "controls_music_search_keywords");
				interface.controls_music_search_keywords_input.setAttribute("title", "Songs matching those keywords will be used in the slideshow");
				interface.controls_music_search_keywords_input.setAttribute("type", "text");
				interface.controls_music_search_keywords_input.setAttribute("value", settings.music.keywords);
				interface.controls_music_search_keywords_input.setAttribute("maxlength", "100");
				interface.controls_music_search_keywords_input.setAttribute("onclick", "interface_preload(\"keywords\", TYPE_MUSIC)");
				interface.controls_music_search_keywords_input.setAttribute("onkeyup", "interface_preload(\"keywords\", TYPE_MUSIC)");
				interface.controls_music_search.appendChild(interface.controls_music_search_keywords_input);
			}

			// interface HTML: controls, music, count
			interface.controls_music_count = document.createElement("p");
			interface.controls_music_count.innerHTML = "<b>Count:<b/><br/>";
			interface.controls_music.appendChild(interface.controls_music_count);
			{
				// interface HTML: controls, music, count, input
				interface.controls_music_count_input = document.createElement("input");
				interface.controls_music_count_input.setAttribute("id", "controls_music_count");
				interface.controls_music_count_input.setAttribute("title", "The total number of songs to be used in the slideshow");
				interface.controls_music_count_input.setAttribute("type", "number");
				interface.controls_music_count_input.setAttribute("value", settings.music.count);
				interface.controls_music_count_input.setAttribute("step", "10");
				interface.controls_music_count_input.setAttribute("min", "0");
				interface.controls_music_count_input.setAttribute("max", "1000000");
				interface.controls_music_count_input.setAttribute("onclick", "interface_preload(\"count\", TYPE_MUSIC)");
				interface.controls_music_count_input.setAttribute("onkeyup", "interface_preload(\"count\", TYPE_MUSIC)");
				interface.controls_music_count.appendChild(interface.controls_music_count_input);
			}

			// interface HTML: controls, music, play
			interface.controls_music_play = document.createElement("p");
			interface.controls_music_play.innerHTML = "<b>Options:<b/><br/>";
			interface.controls_music.appendChild(interface.controls_music_play);
			{
				// interface HTML: controls, music, play, loop, input
				interface.controls_music_play_loop_input = document.createElement("input");
				interface.controls_music_play_loop_input.setAttribute("id", "controls_music_play_loop");
				interface.controls_music_play_loop_input.setAttribute("title", "Whether to loop through songs indefinitely");
				interface.controls_music_play_loop_input.setAttribute("type", "checkbox");
				if(settings.music.loop)
					interface.controls_music_play_loop_input.setAttribute("checked", true);
				interface.controls_music_play_loop_input.setAttribute("onclick", "interface_preload(\"loop\", TYPE_MUSIC)");
				interface.controls_music_play.appendChild(interface.controls_music_play_loop_input);

				// interface HTML: controls, music, play, loop, label
				interface.controls_music_play_loop_label = document.createElement("label");
				interface.controls_music_play_loop_label.innerHTML = "Loop<br/>";
				interface.controls_music_play.appendChild(interface.controls_music_play_loop_label);

				// interface HTML: controls, music, play, shuffle, input
				interface.controls_music_play_shuffle_input = document.createElement("input");
				interface.controls_music_play_shuffle_input.setAttribute("id", "controls_music_play_shuffle");
				interface.controls_music_play_shuffle_input.setAttribute("title", "Whether to shuffle songs before playing");
				interface.controls_music_play_shuffle_input.setAttribute("type", "checkbox");
				if(settings.music.shuffle)
					interface.controls_music_play_shuffle_input.setAttribute("checked", true);
				interface.controls_music_play_shuffle_input.setAttribute("onclick", "interface_preload(\"shuffle\", TYPE_MUSIC)");
				interface.controls_music_play.appendChild(interface.controls_music_play_shuffle_input);

				// interface HTML: controls, music, play, shuffle, label
				interface.controls_music_play_shuffle_label = document.createElement("label");
				interface.controls_music_play_shuffle_label.innerHTML = "Shuffle<br/>";
				interface.controls_music_play.appendChild(interface.controls_music_play_shuffle_label);
			}
		}

		// interface HTML: controls, hr
		interface.controls_hr_2 = document.createElement("hr");
		interface.controls.appendChild(interface.controls_hr_2);

		// interface HTML: controls, sites
		interface.controls_sites = document.createElement("form");
		interface.controls_sites.setAttribute("id", "controls_sites");
		interface.controls.appendChild(interface.controls_sites);
		{
			// interface HTML: controls, sites, title
			interface.controls_sites_title = document.createElement("p");
			interface.controls_sites_title.setAttribute("style", "text-align: center");
			interface.controls_sites_title.innerHTML = "<font size=4><b>" + TYPE_SOURCES + " Sources</b></font>";
			interface.controls_sites.appendChild(interface.controls_sites_title);

			// interface HTML: controls, sites, list
			interface.controls_sites_list = document.createElement("p");
			interface.controls_sites.appendChild(interface.controls_sites_list);
		}
	}

	// interface HTML: media
	interface.media = document.createElement("div");
	interface.media.setAttribute("class", "item_media item_media_position_detached item_media_background_detached");
	document.body.appendChild(interface.media);
	{
		// interface HTML: media, images, recommendations
		interface.media_images_recommendations = document.createElement("div");
		interface.media_images_recommendations.setAttribute("style", "position: absolute; direction: rtl; overflow: auto; top: 0%; left: 0%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_images_recommendations);
		{
			// interface HTML: controls, images, recommendations, label
			interface.media_images_recommendations_label = document.createElement("p");
			interface.media_images_recommendations_label.setAttribute("class", "text_size_large text_color_black");
			interface.media_images_recommendations_label.setAttribute("style", "text-align: center");
			interface.media_images_recommendations_label.innerHTML = "<b>" + TYPE_IMAGES + " Recommendations<b/>";
			interface.media_images_recommendations.appendChild(interface.media_images_recommendations_label);

			// interface HTML: controls, images, recommendations, list
			interface.media_images_recommendations_list = document.createElement("div");
			interface.media_images_recommendations_list.setAttribute("class", "text_size_medium text_color_black");
			interface.media_images_recommendations.appendChild(interface.media_images_recommendations_list);
		}

		// interface HTML: media, images
		interface.media_images = document.createElement("div");
		interface.media_images.setAttribute("style", "position: absolute; overflow: hidden; top: 0%; left: 20%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_images);
		{
			// interface HTML: media, images, previous
			interface.media_images_previous = document.createElement("div");
			interface.media_images_previous.setAttribute("title", "Previous image (" + KEY_IMAGES_PREVIOUS + ")");
			interface.media_images_previous.setAttribute("class", "button button_size_small button_color_black");
			interface.media_images_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			interface.media_images_previous.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_previous);

			// interface HTML: media, images, play
			interface.media_images_play = document.createElement("div");
			interface.media_images_play.setAttribute("title", "Play / Pause image (" + KEY_IMAGES_PLAY + ")");
			interface.media_images_play.setAttribute("class", "button button_size_medium button_color_black");
			interface.media_images_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			interface.media_images_play.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_play);

			// interface HTML: media, images, next
			interface.media_images_next = document.createElement("div");
			interface.media_images_next.setAttribute("title", "Next image (" + KEY_IMAGES_NEXT + ")");
			interface.media_images_next.setAttribute("class", "button button_size_small button_color_black");
			interface.media_images_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			interface.media_images_next.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_next);

			// interface HTML: media, images, bar
			interface.media_images_bar = document.createElement("div");
			interface.media_images_bar.setAttribute("class", "item_bar");
			interface.media_images_bar.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 58px");
			interface.media_images.appendChild(interface.media_images_bar);

			// interface HTML: media, images, thumb
			interface.media_images_thumb = document.createElement("a");
			interface.media_images_thumb.setAttribute("title", "Open image (" + KEY_IMAGES_OPEN + ")");
			interface.media_images_thumb.setAttribute("style", "pointer-events: all");
			interface.media_images_thumb.setAttribute("target", "_blank");
			interface.media_images.appendChild(interface.media_images_thumb);
			{
				// interface HTML: media, images, thumb, ring
				interface.media_images_thumb_ring = document.createElement("div");
				interface.media_images_thumb_ring.setAttribute("class", "item_thumbnail_ring");
				interface.media_images_thumb_ring.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 68px");
				interface.media_images_thumb.appendChild(interface.media_images_thumb_ring);

				// interface HTML: media, images, thumb, image
				interface.media_images_thumb_image = document.createElement("img");
				interface.media_images_thumb_image.setAttribute("class", "item_thumbnail_image");
				interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
				interface.media_images_thumb_image.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 72px");
				interface.media_images_thumb.appendChild(interface.media_images_thumb_image);

				// interface HTML: media, images, thumb, info
				interface.media_images_thumb_info = document.createElement("p");
				interface.media_images_thumb_info.setAttribute("class", "text_size_small text_color_white");
				interface.media_images_thumb_info.setAttribute("style", "position: absolute; top: 104px; width: 100%");
				interface.media_images_thumb.appendChild(interface.media_images_thumb_info);
			}

			// interface HTML: media, images, info
			interface.media_images_info = document.createElement("p");
			interface.media_images_info.setAttribute("class", "text_size_small text_color_black");
			interface.media_images_info.setAttribute("style", "position: absolute; top: 164px; width: 100%");
			interface.media_images.appendChild(interface.media_images_info);

			// interface HTML: media, images, controls
			interface.media_images_controls = document.createElement("form");
			interface.media_images_controls.setAttribute("id", "controls_media_images");
			interface.media_images.appendChild(interface.media_images_controls);
			{
				// interface HTML: media, images, controls, brightness
				interface.media_images_controls_brightness = document.createElement("p");
				interface.media_images_controls_brightness.setAttribute("style", "position: absolute; top: 180px; width: 100%");
				interface.media_images_controls.appendChild(interface.media_images_controls_brightness);
				{
					// interface HTML: media, images, controls, brightness, slider
					interface.media_images_controls_brightness_input = document.createElement("input");
					interface.media_images_controls_brightness_input.setAttribute("id", "controls_media_images_brightness");
					interface.media_images_controls_brightness_input.setAttribute("title", "Image brightness");
					interface.media_images_controls_brightness_input.setAttribute("type", "range");
					interface.media_images_controls_brightness_input.setAttribute("value", player.images.brightness);
					interface.media_images_controls_brightness_input.setAttribute("step", "0.01");
					interface.media_images_controls_brightness_input.setAttribute("min", "0");
					interface.media_images_controls_brightness_input.setAttribute("max", "1");
					interface.media_images_controls_brightness_input.setAttribute("onclick", "interface_update_controls_images_brightness()");
					interface.media_images_controls_brightness_input.setAttribute("oninput", "interface_update_controls_images_brightness()");
					interface.media_images_controls_brightness.appendChild(interface.media_images_controls_brightness_input);

					// interface HTML: media, images, controls, brightness, br
					interface.media_images_controls_br = document.createElement("br");
					interface.media_images_controls_brightness.appendChild(interface.media_images_controls_br);

					// interface HTML: media, images, controls, brightness, label
					interface.media_images_controls_brightness_label = document.createElement("label");
					interface.media_images_controls_brightness_label.setAttribute("class", "text_size_medium text_color_black");
					interface.media_images_controls_brightness_label.innerHTML = percent(player.images.brightness);
					interface.media_images_controls_brightness.appendChild(interface.media_images_controls_brightness_label);
				}
			}
		}

		// interface HTML: media, controls
		interface.media_controls = document.createElement("div");
		interface.media_controls.setAttribute("style", "position: absolute; overflow: hidden; top: 0%; left: 40%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_controls);
		{
			// interface HTML: media, controls, play
			interface.media_controls_play = document.createElement("div");
			interface.media_controls_play.setAttribute("title", "Toggle player / Refresh settings (" + KEY_PLAY + ")");
			interface.media_controls_play.setAttribute("class", "button button_size_large button_color_black");
			interface.media_controls_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 8px");
			interface.media_controls_play.innerHTML = "✖";
			interface.media_controls.appendChild(interface.media_controls_play);

			// interface HTML: media, controls, fullscreen
			interface.media_controls_fullscreen = document.createElement("div");
			interface.media_controls_fullscreen.setAttribute("title", "Fullscreen");
			interface.media_controls_fullscreen.setAttribute("class", "button button_size_small button_color_white");
			interface.media_controls_fullscreen.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 80px");
			interface.media_controls_fullscreen.setAttribute("onclick", "player_fullscreen_toggle()");
			interface.media_controls_fullscreen.innerHTML = "▭";
			interface.media_controls.appendChild(interface.media_controls_fullscreen);

			// interface HTML: media, controls, label
			interface.media_controls_label = document.createElement("p");
			interface.media_controls_label.setAttribute("class", "text_size_medium text_color_black");
			interface.media_controls_label.setAttribute("style", "position: absolute; top: 104px; left: 0%; width: 100%");
			interface.media_controls.appendChild(interface.media_controls_label);
		}

		// interface HTML: media, music
		interface.media_music = document.createElement("div");
		interface.media_music.setAttribute("style", "position: absolute; overflow: hidden; top: 0%; left: 60%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_music);
		{
			// interface HTML: media, music, previous
			interface.media_music_previous = document.createElement("div");
			interface.media_music_previous.setAttribute("title", "Previous song (" + KEY_MUSIC_PREVIOUS + ")");
			interface.media_music_previous.setAttribute("class", "button button_size_small button_color_black");
			interface.media_music_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			interface.media_music_previous.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_previous);

			// interface HTML: media, music, play
			interface.media_music_play = document.createElement("div");
			interface.media_music_play.setAttribute("title", "Play / Pause song (" + KEY_MUSIC_PLAY + ")");
			interface.media_music_play.setAttribute("class", "button button_size_medium button_color_black");
			interface.media_music_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			interface.media_music_play.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_play);

			// interface HTML: media, music, next
			interface.media_music_next = document.createElement("div");
			interface.media_music_next.setAttribute("title", "Next song (" + KEY_MUSIC_NEXT + ")");
			interface.media_music_next.setAttribute("class", "button button_size_small button_color_black");
			interface.media_music_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			interface.media_music_next.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_next);

			// interface HTML: media, music, bar
			interface.media_music_bar = document.createElement("div");
			interface.media_music_bar.setAttribute("class", "item_bar");
			interface.media_music_bar.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 58px");
			interface.media_music.appendChild(interface.media_music_bar);

			// interface HTML: media, music, thumb
			interface.media_music_thumb = document.createElement("a");
			interface.media_music_thumb.setAttribute("title", "Open song (" + KEY_MUSIC_OPEN + ")");
			interface.media_music_thumb.setAttribute("style", "pointer-events: all");
			interface.media_music_thumb.setAttribute("target", "_blank");
			interface.media_music.appendChild(interface.media_music_thumb);
			{
				// interface HTML: media, music, thumb, ring
				interface.media_music_thumb_ring = document.createElement("div");
				interface.media_music_thumb_ring.setAttribute("class", "item_thumbnail_ring");
				interface.media_music_thumb_ring.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 68px");
				interface.media_music_thumb.appendChild(interface.media_music_thumb_ring);

				// interface HTML: media, music, thumb, song
				interface.media_music_thumb_song = document.createElement("img");
				interface.media_music_thumb_song.setAttribute("class", "item_thumbnail_image");
				interface.media_music_thumb_song.setAttribute("src", SRC_BLANK);
				interface.media_music_thumb_song.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 72px");
				interface.media_music_thumb.appendChild(interface.media_music_thumb_song);

				// interface HTML: media, music, thumb, info
				interface.media_music_thumb_info = document.createElement("p");
				interface.media_music_thumb_info.setAttribute("class", "text_size_small text_color_white");
				interface.media_music_thumb_info.setAttribute("style", "position: absolute; top: 104px; width: 100%");
				interface.media_music_thumb.appendChild(interface.media_music_thumb_info);
			}

			// interface HTML: media, music, info
			interface.media_music_info = document.createElement("p");
			interface.media_music_info.setAttribute("class", "text_size_small text_color_black");
			interface.media_music_info.setAttribute("style", "position: absolute; top: 164px; width: 100%");
			interface.media_music.appendChild(interface.media_music_info);

			// interface HTML: media, music, controls
			interface.media_music_controls = document.createElement("form");
			interface.media_music_controls.setAttribute("id", "controls_media_music");
			interface.media_music.appendChild(interface.media_music_controls);
			{
				// interface HTML: media, music, controls, volume
				interface.media_music_controls_volume = document.createElement("p");
				interface.media_music_controls_volume.setAttribute("style", "position: absolute; top: 180px; width: 100%");
				interface.media_music_controls.appendChild(interface.media_music_controls_volume);
				{
					// interface HTML: media, music, controls, volume, slider
					interface.media_music_controls_volume_input = document.createElement("input");
					interface.media_music_controls_volume_input.setAttribute("id", "controls_media_music_volume");
					interface.media_music_controls_volume_input.setAttribute("title", "Music volume");
					interface.media_music_controls_volume_input.setAttribute("type", "range");
					interface.media_music_controls_volume_input.setAttribute("value", player.music.volume);
					interface.media_music_controls_volume_input.setAttribute("step", "0.01");
					interface.media_music_controls_volume_input.setAttribute("min", "0");
					interface.media_music_controls_volume_input.setAttribute("max", "1");
					interface.media_music_controls_volume_input.setAttribute("onclick", "interface_update_controls_music_volume()");
					interface.media_music_controls_volume_input.setAttribute("oninput", "interface_update_controls_music_volume()");
					interface.media_music_controls_volume.appendChild(interface.media_music_controls_volume_input);

					// interface HTML: media, music, controls, volume, br
					interface.media_music_controls_br = document.createElement("br");
					interface.media_music_controls_volume.appendChild(interface.media_music_controls_br);

					// interface HTML: media, music, controls, volume, label
					interface.media_music_controls_volume_label = document.createElement("label");
					interface.media_music_controls_volume_label.setAttribute("class", "text_size_medium text_color_black");
					interface.media_music_controls_volume_label.innerHTML = percent(player.music.volume);
					interface.media_music_controls_volume.appendChild(interface.media_music_controls_volume_label);
				}
			}
		}

		// interface HTML: media, music, recommendations
		interface.media_music_recommendations = document.createElement("div");
		interface.media_music_recommendations.setAttribute("style", "position: absolute; direction: ltr; overflow: auto; top: 0%; left: 80%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_music_recommendations);
		{
			// interface HTML: controls, music, recommendations, label
			interface.media_music_recommendations_label = document.createElement("p");
			interface.media_music_recommendations_label.setAttribute("class", "text_size_large text_color_black");
			interface.media_music_recommendations_label.setAttribute("style", "text-align: center");
			interface.media_music_recommendations_label.innerHTML = "<b>" + TYPE_MUSIC + " Recommendations<b/>";
			interface.media_music_recommendations.appendChild(interface.media_music_recommendations_label);

			// interface HTML: controls, music, recommendations, list
			interface.media_music_recommendations_list = document.createElement("div");
			interface.media_music_recommendations_list.setAttribute("class", "text_size_medium text_color_black");
			interface.media_music_recommendations.appendChild(interface.media_music_recommendations_list);
		}
	}

	// pull the initial data from available sources
	// use a short delay as plugins must first have time to register
	clearInterval(interface_refresh.interval);
	interface_refresh.interval = setInterval(interface_autorefresh, 1000);
	interface_refresh.timer = 1;
	interface_update_media(false, true, true, true, false);
	settings_url_set();
}
