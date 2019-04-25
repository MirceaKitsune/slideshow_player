// Slideshow Viewer, Interface
// Public Domain / CC0, MirceaKitsune 2018

// attached and detached element positions and styles
// player: always relative to the document body
// media: relative to the document body when detached, relative to the player window when attached
const STYLE_CONTROLS_POSITION = "top: 0%; left: 85%; width: 15%; height: 100%";
const STYLE_PLAYER_POSITION_ATTACHED = "top: 0%; left: 0%; width: 100%; height: 100%";
const STYLE_PLAYER_POSITION_DETACHED = "top: 0%; left: 0%; width: 85%; height: 80%";
const STYLE_MEDIA_POSITION_ATTACHED = "top: 80%; left: 0%; width: 100%; height: 20%";
const STYLE_MEDIA_POSITION_DETACHED = "top: 80%; left: 0%; width: 85%; height: 20%";
const STYLE_MEDIA_BACKGROUND_ATTACHED = "background-image: linear-gradient(to bottom, #00000000, #000000aa)";
const STYLE_MEDIA_BACKGROUND_DETACHED = "background-image: linear-gradient(to bottom, #00000011, #00000000)";

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
		interface_update_media(true, false, false);
	}
}

// interface, functions, preload
function interface_preload(name, type) {
	// if this setting was used by any plugins, we will want to pull new contents from the server
	// when the name or type variables are set to true rather than a setting name, force a refresh regardless
	// if sites don't need to be refreshed, automatically load the new settings instead of starting the timer
	const force = (name === true || type === true);
	if(force || plugins_settings_used(name, type)) {
		if(force || type === TYPE_IMAGES)
			interface_refresh.images = true;
		if(force || type === TYPE_MUSIC)
			interface_refresh.music = true;
		clearInterval(interface_refresh.interval);
		interface_refresh.interval = setInterval(interface_autorefresh, 1000);
		interface_refresh.timer = AUTOREFRESH;
	}

	interface_load(false);
}

// interface, functions, plugin loader
function interface_load(pull) {
	const elements_settings_images = document.forms["controls_images"].elements;
	const elements_settings_music = document.forms["controls_music"].elements;
	const elements_list = document.forms["controls_sites"].elements;

	// store some old settings to compare them later below
	const old_images_count = settings.images.count;
	const old_images_shuffle = settings.images.shuffle;
	const old_music_count = settings.music.count;
	const old_music_shuffle = settings.music.shuffle;

	// configure the system settings
	settings.sites = [];
	for(var i = 0; i < elements_list.length; i++) {
		if(elements_list[i].checked)
			settings.sites.push(elements_list[i].name);
	}
	settings.images.keywords = elements_settings_images["controls_images_search_keywords"].value;
	settings.images.nsfw = Boolean(elements_settings_images["controls_images_search_nsfw"].checked);
	settings.images.count = Number(elements_settings_images["controls_images_count"].value);
	settings.images.duration = Number(elements_settings_images["controls_images_duration"].value);
	settings.images.loop = Boolean(elements_settings_images["controls_images_play_loop"].checked);
	settings.images.shuffle = Boolean(elements_settings_images["controls_images_play_shuffle"].checked);
	settings.music.keywords = elements_settings_music["controls_music_search_keywords"].value;
	settings.music.count = Number(elements_settings_music["controls_music_count"].value);
	settings.music.loop = Boolean(elements_settings_music["controls_music_play_loop"].checked);
	settings.music.shuffle = Boolean(elements_settings_music["controls_music_play_shuffle"].checked);
	settings.music.volume = Number(elements_settings_music["controls_music_volume"].value);

	// limit the settings to acceptable values
	// should match the limits defined on the corresponding HTML elements
	settings.images.keywords = settings.images.keywords.substring(0, 100);
	settings.images.count = Math.max(Math.min(settings.images.count, 1000000), 0);
	settings.images.duration = Math.max(Math.min(settings.images.duration, 1000), 5);
	settings.music.keywords = settings.music.keywords.substring(0, 100);
	settings.music.count = Math.max(Math.min(settings.music.count, 1000000), 0);
	settings.music.volume = Math.max(Math.min(settings.music.volume, 1), 0);

	// update the settings url
	settings_url_set();

	// update the images and songs if a setting affecting the list changed
	if(settings.images.count !== old_images_count || settings.images.shuffle !== old_images_shuffle)
		images_pick();
	if(settings.music.count !== old_music_count || settings.music.shuffle !== old_music_shuffle)
		music_pick();

	// update the image and music controls
	interface_update_controls_images();
	interface_update_controls_music();

	// if sites need to be refreshed, load every selected plugin
	if(pull) {
		if(interface_refresh.images)
			images_clear();
		if(interface_refresh.music)
			music_clear();

		// load the plugins if we have any sources enabled, clear everything if not
		if(settings.sites.length > 0) {
			for(var site in settings.sites) {
				const name_site = settings.sites[site];
				plugins_load(name_site);
			}
		} else {
			player_detach();
			data_images = [];
			data_music = [];
		}
	}

	interface_update_media(true, true, true);
}

// interface, functions, play button
function interface_play() {
	// add or remove the player
	if(!player_active() && player_available())
		player_attach();
	else
		player_detach();
}

// interface, update, attached
function interface_update_attached(attached) {
	if(attached) {
		interface.media.setAttribute("style", STYLE_MEDIA_POSITION_DETACHED + "; " + STYLE_MEDIA_BACKGROUND_DETACHED);
		interface.media_images_label.setAttribute("class", "text_color_black");
		interface.media_images_info.setAttribute("class", "text_color_black");
		interface.media_controls_label.setAttribute("class", "text_color_black");
		interface.media_images_recommendations_label.setAttribute("class", "text_color_black");
		interface.media_images_recommendations_list.setAttribute("class", "text_color_black");
		interface.media_music_recommendations_label.setAttribute("class", "text_color_black");
		interface.media_music_recommendations_list.setAttribute("class", "text_color_black");
		interface.player.removeChild(interface.media);
		document.body.appendChild(interface.media);
	} else {
		interface.media.setAttribute("style", STYLE_MEDIA_POSITION_ATTACHED + "; " + STYLE_MEDIA_BACKGROUND_ATTACHED);
		interface.media_images_label.setAttribute("class", "text_color_white");
		interface.media_images_info.setAttribute("class", "text_color_white");
		interface.media_controls_label.setAttribute("class", "text_color_white");
		interface.media_images_recommendations_label.setAttribute("class", "text_color_white");
		interface.media_images_recommendations_list.setAttribute("class", "text_color_white");
		interface.media_music_recommendations_label.setAttribute("class", "text_color_white");
		interface.media_music_recommendations_list.setAttribute("class", "text_color_white");
		document.body.removeChild(interface.media);
		interface.player.appendChild(interface.media);
	}
}

// interface, update HTML, controls, images
function interface_update_controls_images() {

}

// interface, update HTML, controls, music
function interface_update_controls_music() {
	// refresh the volume of the audio element
	interface.controls_music_volume_label.innerHTML = settings.music.volume.toFixed(2);
	if(document.body.contains(player.music.element))
		player.music.element.volume = settings.music.volume;
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
		interface[id_checkbox].setAttribute("onclick", "interface_preload(true, true)");
		interface.controls_sites_list.appendChild(interface[id_checkbox]);

		// interface HTML: controls, images, sites, list, label
		const id_label = "controls_images_list_sites_" + item + "_label";
		interface[id_label] = document.createElement("label");
		interface[id_label].innerHTML = plugins[item].type + " " + item + "<br/>";
		interface.controls_sites_list.appendChild(interface[id_label]);
	}
}

// interface, functions, media
function interface_update_media(update_controls, update_images, update_music) {
	if(update_controls) {
		interface_update_media_controls();
	}
	if(update_images) {
		interface_update_media_images();
		interface_update_recommendations_images();
	}
	if(update_music) {
		interface_update_media_music();
		interface_update_recommendations_music();
	}
}

// interface, update HTML, media images
function interface_update_media_images() {
	const active = player_available_images() && player_active_images();
	const ready = !player_busy_images();

	// configure previous / play / next elements
	if(active && ready) {
		if(player.images.stopped) {
			interface.media_images_previous.setAttribute("class", "button_size_small button_color_yellow");
			interface.media_images_previous.setAttribute("onclick", "player_images_skip(player.images.index - 1)");
			interface.media_images_previous.innerHTML = "|◀";

			interface.media_images_play.setAttribute("class", "button_size_medium button_color_yellow");
			interface.media_images_play.setAttribute("onclick", "player_images_play()");
			interface.media_images_play.innerHTML = "▶";

			interface.media_images_next.setAttribute("class", "button_size_small button_color_yellow");
			interface.media_images_next.setAttribute("onclick", "player_images_skip(player.images.index + 1)");
			interface.media_images_next.innerHTML = "▶|";
		}
		else {
			interface.media_images_previous.setAttribute("class", "button_size_small button_color_green");
			interface.media_images_previous.setAttribute("onclick", "player_images_skip(player.images.index - 1)");
			interface.media_images_previous.innerHTML = "|◀";

			interface.media_images_play.setAttribute("class", "button_size_medium button_color_green");
			interface.media_images_play.setAttribute("onclick", "player_images_play()");
			interface.media_images_play.innerHTML = "||";

			interface.media_images_next.setAttribute("class", "button_size_small button_color_green");
			interface.media_images_next.setAttribute("onclick", "player_images_skip(player.images.index + 1)");
			interface.media_images_next.innerHTML = "▶|";
		}
	}
	else {
		interface.media_images_previous.setAttribute("class", "button_size_small button_color_red");
		interface.media_images_previous.removeAttribute("onclick");
		interface.media_images_previous.innerHTML = "∅";

		interface.media_images_play.setAttribute("class", "button_size_medium button_color_red");
		interface.media_images_play.removeAttribute("onclick");
		interface.media_images_play.innerHTML = "∅";

		interface.media_images_next.setAttribute("class", "button_size_small button_color_red");
		interface.media_images_next.removeAttribute("onclick");
		interface.media_images_next.innerHTML = "∅";
	}

	// configure label / thumb / info / player_icon elements
	if(active && !ready) {
		interface.media_images_label.innerHTML = "<font class=text_size_medium><b>? / " + data_images.length + "</b></font>";
		interface.media_images_thumb.removeAttribute("href");
		interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
		interface.media_images_info.innerHTML = "<font class=text_size_small><b>Loading image</b></font>";
		interface.player_icon_images.innerHTML = "⧗<br/><font class=text_size_medium><b>Latency:</b> " + player_images_latency.time_average.toFixed(2) + " sec</font>";
	}
	else if(active) {
		interface.media_images_label.innerHTML = "<font class=text_size_medium><b>" + player.images.index + " / " + data_images.length + "</b></font>";
		interface.media_images_thumb.setAttribute("href", data_images[player.images.index - 1].url);
		interface.media_images_thumb_image.setAttribute("src", data_images[player.images.index - 1].thumb);
		interface.media_images_info.innerHTML = "<font class=text_size_small><b>" + data_images[player.images.index - 1].title + "</b> by <b>" + data_images[player.images.index - 1].author + "</b></font>";
		interface.player_icon_images.innerHTML = "";
	}
	else {
		interface.media_images_label.innerHTML = "<font class=text_size_medium><b>No images loaded</b></font>";
		interface.media_images_thumb.removeAttribute("href");
		interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
		interface.media_images_info.innerHTML = "";
		interface.player_icon_images.innerHTML = "";
	}
}

// interface, update HTML, media music
function interface_update_media_music() {
	const active = player_available_music() && player_active_music();
	const ready = !player_busy_music();

	// configure previous / play / next elements
	if(active && ready) {
		if(player.music.stopped) {
			interface.media_music_previous.setAttribute("class", "button_size_small button_color_yellow");
			interface.media_music_previous.setAttribute("onclick", "player_music_skip(player.music.index - 1)");
			interface.media_music_previous.innerHTML = "|◀";

			interface.media_music_play.setAttribute("class", "button_size_medium button_color_yellow");
			interface.media_music_play.setAttribute("onclick", "player_music_play()");
			interface.media_music_play.innerHTML = "▶";

			interface.media_music_next.setAttribute("class", "button_size_small button_color_yellow");
			interface.media_music_next.setAttribute("onclick", "player_music_skip(player.music.index + 1)");
			interface.media_music_next.innerHTML = "▶|";
		}
		else {
			interface.media_music_previous.setAttribute("class", "button_size_small button_color_green");
			interface.media_music_previous.setAttribute("onclick", "player_music_skip(player.music.index - 1)");
			interface.media_music_previous.innerHTML = "|◀";

			interface.media_music_play.setAttribute("class", "button_size_medium button_color_green");
			interface.media_music_play.setAttribute("onclick", "player_music_play()");
			interface.media_music_play.innerHTML = "||";

			interface.media_music_next.setAttribute("class", "button_size_small button_color_green");
			interface.media_music_next.setAttribute("onclick", "player_music_skip(player.music.index + 1)");
			interface.media_music_next.innerHTML = "▶|";
		}
	}
	else {
		interface.media_music_previous.setAttribute("class", "button_size_small button_color_red");
		interface.media_music_previous.removeAttribute("onclick");
		interface.media_music_previous.innerHTML = "∅";

		interface.media_music_play.setAttribute("class", "button_size_medium button_color_red");
		interface.media_music_play.removeAttribute("onclick");
		interface.media_music_play.innerHTML = "∅";

		interface.media_music_next.setAttribute("class", "button_size_small button_color_red");
		interface.media_music_next.removeAttribute("onclick");
		interface.media_music_next.innerHTML = "∅";
	}

	// configure label / thumb / info / player_icon elements
	if(active && !ready) {
		interface.media_music_label.innerHTML = "<font class=text_size_medium><b>? / " + data_music.length + "</b></font>";
		interface.media_music_thumb.removeAttribute("href");
		interface.media_music_thumb_song.setAttribute("src", SRC_BLANK);
		interface.media_music_info.innerHTML = "<font class=text_size_small><b>Loading song</b></font>";
		interface.player_icon_music.innerHTML = "⧖";
	}
	else if(active) {
		interface.media_music_label.innerHTML = "<font class=text_size_medium><b>" + player.music.index + " / " + data_music.length + "</b></font>";
		interface.media_music_thumb.setAttribute("href", data_music[player.music.index - 1].url);
		interface.media_music_thumb_song.setAttribute("src", data_music[player.music.index - 1].thumb);
		interface.media_music_info.innerHTML = "<font class=text_size_small><b>" + data_music[player.music.index - 1].title + "</b> by <b>" + data_music[player.music.index - 1].author + "</b></font>";
		interface.player_icon_music.innerHTML = "";
	}
	else {
		interface.media_music_label.innerHTML = "<font class=text_size_medium><b>No music loaded</b></font>";
		interface.media_music_thumb.removeAttribute("href");
		interface.media_music_thumb_song.setAttribute("src", SRC_BLANK);
		interface.media_music_info.innerHTML = "";
		interface.player_icon_music.innerHTML = "";
	}
}

// interface, update HTML, recommendation images, clear
function interface_update_recommendations_images_clear() {
	recommendations.images = {};
	recommendations_timer();
	interface_update_media(false, true, false);
}

// interface, update HTML, recommendation images, set
function interface_update_recommendations_images_set(tag) {
	interface.controls_images_search_keywords_input.setAttribute("value", tag);
	interface.controls_images_search_keywords_input.value = tag;
	interface_preload("keywords", TYPE_IMAGES);
	interface_update_media(false, true, false);
}

// interface, update HTML, recommendation images
function interface_update_recommendations_images() {
	// sort the recommended tags into an array
	const recommendations_sorted = Object.keys(recommendations.images).sort(function(a, b) { return recommendations.images[b] - recommendations.images[a] });
	const current_tag = interface.controls_images_search_keywords_input.getAttribute("value") || interface.controls_images_search_keywords_input.value;

	interface.media_images_recommendations_list.innerHTML = "<font class=text_size_medium>No recommended tags available</font>";
	if(recommendations_sorted.length > 0) {
		var tags = 0;
		for(var tag in recommendations_sorted) {
			const tag_name = recommendations_sorted[tag];
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
			if(player_available_images() && player_active_images() && player.images.index > 0 && data_images[player.images.index - 1].tags.indexOf(tag_name) >= 0)
				tag_element.innerHTML = "<u>" + tag_element.innerHTML + "</u>";
			if(current_tag.toLowerCase().includes(tag_name))
				tag_element.innerHTML = "<b>" + tag_element.innerHTML + "</b>";
			tag_element.innerHTML = "<font class=text_size_medium>" + tag_element.innerHTML + "</font><br/>";

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
	interface_update_media(false, false, true);
}

// interface, update HTML, recommendation music, set
function interface_update_recommendations_music_set(tag) {
	interface.controls_music_search_keywords_input.setAttribute("value", tag);
	interface.controls_music_search_keywords_input.value = tag;
	interface_preload("keywords", TYPE_MUSIC);
	interface_update_media(false, false, true);
}

// interface, update HTML, recommendation music
function interface_update_recommendations_music() {
	// sort the recommended tags into an array
	const recommendations_sorted = Object.keys(recommendations.music).sort(function(a, b) { return recommendations.music[b] - recommendations.music[a] });
	const current_tag = interface.controls_music_search_keywords_input.getAttribute("value") || interface.controls_music_search_keywords_input.value;

	interface.media_music_recommendations_list.innerHTML = "<font class=text_size_medium>No recommended tags available</font>";
	if(recommendations_sorted.length > 0) {
		var tags = 0;
		for(var tag in recommendations_sorted) {
			const tag_name = recommendations_sorted[tag];
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
			if(player_available_music() && player_active_music() && player.music.index > 0 && data_music[player.music.index - 1].tags.indexOf(tag_name) >= 0)
				tag_element.innerHTML = "<u>" + tag_element.innerHTML + "</u>";
			if(current_tag.toLowerCase().includes(tag_name))
				tag_element.innerHTML = "<b>" + tag_element.innerHTML + "</b>";
			tag_element.innerHTML = "<font class=text_size_medium>" + tag_element.innerHTML + "</font><br/>";

			// stop here if we've reached the display limit
			++tags;
			if(tags >= RECOMMENDATIONS_LIMIT)
				break;
		}
	}
}

// interface, update HTML, media controls
function interface_update_media_controls() {
	const busy = plugins_busy();
	const total_seconds = data_images.length * settings.images.duration;
	var total_time = "+1 day";
	if(total_seconds <= 86400) {
		var total_date = new Date(null);
		total_date.setSeconds(total_seconds);
		total_time = total_date.toISOString().substr(11, 8);
	}

	// label text for player status
	var label_player =
		"<b>Images:</b> " + data_images.length + " <b>/</b> " + data_images_all.length + " <b>↺</b> " + settings.images.duration + " sec <b>(</b>" + total_time + "<b>)</b><br/>" +
		"<b>Music:</b> " + data_music.length + " <b>/</b> " + data_music_all.length;

	// label text for plugin status
	var label_plugin = "<b>Update needed:</b> ";
	if(interface_refresh.images)
		label_plugin += TYPE_IMAGES + " ";
	if(interface_refresh.music)
		label_plugin += TYPE_MUSIC + " ";
	label_plugin += "<br/>Refreshing in " + interface_refresh.timer + " sec";

	// first configuration, based on player status
	// configure play / label elements, window title
	if(player_active()) {
		interface.media_controls_play.setAttribute("class", "button_size_large button_color_green");
		interface.media_controls_play.setAttribute("onclick", "interface_play()");
		interface.media_controls_play.innerHTML = "■";
		interface.media_controls_label.innerHTML = "<font class=text_size_large>" + label_player + "</font>";
		document.title = "Slideshow Player - " + TYPE_IMAGES + " " + data_images.length + " ↺ " + settings.images.duration + " sec ▶";
	}
	else if(player_available()) {
		interface.media_controls_play.setAttribute("class", "button_size_large button_color_yellow");
		interface.media_controls_play.setAttribute("onclick", "interface_play()");
		interface.media_controls_play.innerHTML = "▶";
		interface.media_controls_label.innerHTML = "<font class=text_size_large>" + label_player + "</font>";
		document.title = "Slideshow Player - " + TYPE_IMAGES + " " + data_images.length + " ↺ " + settings.images.duration + " sec ■";
	}
	else {
		interface.media_controls_play.setAttribute("class", "button_size_large button_color_red");
		interface.media_controls_play.removeAttribute("onclick");
		interface.media_controls_play.innerHTML = "∅";
		interface.media_controls_label.innerHTML = "<font class=text_size_large><b>No content to play</b></font>";
		document.title = "Slideshow Player ∅";
	}

	// second configuration, based on plugin status
	// configure play / label elements, window title
	if(busy > 0) {
		interface.media_controls_label.innerHTML = "<font class=text_size_large><b>Fetching content:</b> " + busy + " left</font>";
		interface.media_controls_play.innerHTML += " ⧗";
		document.title += " ⧗";
	}
	else if(interface_refresh.timer > 0) {
		interface.media_controls_label.innerHTML = "<font class=text_size_large>" + label_plugin + "</font>";
		interface.media_controls_play.innerHTML += " ⟳";
		document.title += " ⟳";
	}
}

// interface, HTML, create
function interface_init() {
	interface = {};

	// interface HTML: player
	interface.player = document.createElement("div");
	interface.player.setAttribute("class", "player");
	interface.player.setAttribute("style", STYLE_PLAYER_POSITION_DETACHED);
	document.body.appendChild(interface.player);
	{
		// interface HTML: player, icon, images
		interface.player_icon_images = document.createElement("div");
		interface.player_icon_images.setAttribute("class", "text_color_white");
		interface.player_icon_images.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 128px; height: 64px; z-index: 1; line-height: 32px; font-size: 48px");
		interface.player.appendChild(interface.player_icon_images);

		// interface HTML: player, icon, music
		interface.player_icon_music = document.createElement("div");
		interface.player_icon_music.setAttribute("class", "text_color_white");
		interface.player_icon_music.setAttribute("style", "position: absolute; top: 64px; left: 0%; width: 128px; height: 64px; z-index: 1; line-height: 32px; font-size: 48px");
		interface.player.appendChild(interface.player_icon_music);
	}

	// interface HTML: controls
	interface.controls = document.createElement("div");
	interface.controls.setAttribute("class", "controls");
	interface.controls.setAttribute("style", STYLE_CONTROLS_POSITION);
	document.body.appendChild(interface.controls);
	{
		// interface HTML: controls, banner
		interface.controls_banner = document.createElement("div");
		interface.controls_banner.setAttribute("style", "top: 0%; left: 0%; width: 100%; height: 5%; overflow: hidden");
		interface.controls.appendChild(interface.controls_banner);
		{
			// interface HTML: controls, banner, url
			interface.controls_banner_url = document.createElement("a");
			interface.controls_banner_url.setAttribute("target", "_blank");
			interface.controls_banner_url.setAttribute("href", "https://github.com/MirceaKitsune/slideshow_player");
			interface.controls_banner_url.setAttribute("style", "text-align: center; text-decoration: none; color: #000000");
			interface.controls_banner.appendChild(interface.controls_banner_url);
			{
				// interface HTML: controls, banner, url, image
				interface.controls_banner_url_image = document.createElement("img");
				interface.controls_banner_url_image.setAttribute("src", "svg/icon_eye.svg");
				interface.controls_banner_url_image.setAttribute("style", "position: absolute; top: 0%; left: 0%; height: 5%");
				interface.controls_banner_url.appendChild(interface.controls_banner_url_image);

				// interface HTML: controls, banner, url, text
				interface.controls_banner_url_text = document.createElement("div");
				interface.controls_banner_url_text.setAttribute("style", "top: 0%; left: 0%; width: 100%; height: 100%");
				interface.controls_banner_url_text.innerHTML =
					"<font size=4><b>Slideshow Player</b></font><br/>" +
					"<font size=2><b>by MirceaKitsune</b></font>";
				interface.controls_banner_url.appendChild(interface.controls_banner_url_text);
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

			// interface HTML: controls, music, volume
			interface.controls_music_volume = document.createElement("p");
			interface.controls_music_volume.innerHTML = "<b>Volume:<b/><br/>";
			interface.controls_music.appendChild(interface.controls_music_volume);
			{
				// interface HTML: controls, music, volume, input
				interface.controls_music_volume_input = document.createElement("input");
				interface.controls_music_volume_input.setAttribute("id", "controls_music_volume");
				interface.controls_music_volume_input.setAttribute("title", "Audio volume of the music");
				interface.controls_music_volume_input.setAttribute("type", "range");
				interface.controls_music_volume_input.setAttribute("value", settings.music.volume);
				interface.controls_music_volume_input.setAttribute("step", "0.05");
				interface.controls_music_volume_input.setAttribute("min", "0");
				interface.controls_music_volume_input.setAttribute("max", "1");
				interface.controls_music_volume_input.setAttribute("onclick", "interface_preload(\"volume\", TYPE_MUSIC)");
				interface.controls_music_volume_input.setAttribute("oninput", "interface_preload(\"volume\", TYPE_MUSIC)");
				interface.controls_music_volume.appendChild(interface.controls_music_volume_input);

				// interface HTML: controls, music, volume, label
				interface.controls_music_volume_label = document.createElement("label");
				interface.controls_music_volume_label.innerHTML = settings.music.volume.toFixed(2);
				interface.controls_music_volume.appendChild(interface.controls_music_volume_label);
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
	interface.media.setAttribute("class", "media");
	interface.media.setAttribute("style", STYLE_MEDIA_POSITION_DETACHED + "; " + STYLE_MEDIA_BACKGROUND_DETACHED);
	document.body.appendChild(interface.media);
	{
		// interface HTML: media, images, recommendations
		interface.media_images_recommendations = document.createElement("div");
		interface.media_images_recommendations.setAttribute("style", "position: absolute; direction: rtl; overflow: auto; top: 0%; left: 0%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_images_recommendations);
		{
			// interface HTML: controls, images, recommendations, label
			interface.media_images_recommendations_label = document.createElement("p");
			interface.media_images_recommendations_label.setAttribute("class", "text_color_black");
			interface.media_images_recommendations_label.setAttribute("style", "text-align: center");
			interface.media_images_recommendations_label.innerHTML = "<font class=text_size_large><b>" + TYPE_IMAGES + " Recommendations<b/></font>";
			interface.media_images_recommendations.appendChild(interface.media_images_recommendations_label);

			// interface HTML: controls, images, recommendations, list
			interface.media_images_recommendations_list = document.createElement("div");
			interface.media_images_recommendations_list.setAttribute("class", "text_color_black");
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
			interface.media_images_previous.setAttribute("class", "button_size_small button_color_black");
			interface.media_images_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			interface.media_images_previous.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_previous);

			// interface HTML: media, images, play
			interface.media_images_play = document.createElement("div");
			interface.media_images_play.setAttribute("title", "Play / Pause image (" + KEY_IMAGES_PLAY + ")");
			interface.media_images_play.setAttribute("class", "button_size_medium button_color_black");
			interface.media_images_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			interface.media_images_play.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_play);

			// interface HTML: media, images, next
			interface.media_images_next = document.createElement("div");
			interface.media_images_next.setAttribute("title", "Next image (" + KEY_IMAGES_NEXT + ")");
			interface.media_images_next.setAttribute("class", "button_size_small button_color_black");
			interface.media_images_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			interface.media_images_next.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_next);

			// interface HTML: media, images, label
			interface.media_images_label = document.createElement("p");
			interface.media_images_label.setAttribute("class", "text_color_black");
			interface.media_images_label.setAttribute("style", "position: absolute; top: 40px; width: 100%");
			interface.media_images.appendChild(interface.media_images_label);

			// interface HTML: media, images, thumb
			interface.media_images_thumb = document.createElement("a");
			interface.media_images_thumb.setAttribute("title", "Open image (" + KEY_IMAGES_OPEN + ")");
			interface.media_images_thumb.setAttribute("target", "_blank");
			interface.media_images.appendChild(interface.media_images_thumb);
			{
				// interface HTML: media, images, thumb, image
				interface.media_images_thumb_image = document.createElement("img");
				interface.media_images_thumb_image.setAttribute("class", "thumbnail");
				interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
				interface.media_images_thumb_image.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 76px");
				interface.media_images_thumb.appendChild(interface.media_images_thumb_image);
			}

			// interface HTML: media, images, info
			interface.media_images_info = document.createElement("p");
			interface.media_images_info.setAttribute("class", "text_color_black");
			interface.media_images_info.setAttribute("style", "position: absolute; top: 144px; width: 100%");
			interface.media_images.appendChild(interface.media_images_info);
		}

		// interface HTML: media, controls
		interface.media_controls = document.createElement("div");
		interface.media_controls.setAttribute("style", "position: absolute; overflow: hidden; top: 0%; left: 40%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_controls);
		{
			// interface HTML: media, controls, play
			interface.media_controls_play = document.createElement("div");
			interface.media_controls_play.setAttribute("title", "Toggle player / Refresh settings (" + KEY_PLAY + ")");
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_black");
			interface.media_controls_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 8px");
			interface.media_controls_play.innerHTML = "✖";
			interface.media_controls.appendChild(interface.media_controls_play);

			// interface HTML: media, controls, label
			interface.media_controls_label = document.createElement("p");
			interface.media_controls_label.setAttribute("class", "text_color_black");
			interface.media_controls_label.setAttribute("style", "position: absolute; top: 64px; left: 0%; width: 100%");
			interface.media_controls.appendChild(interface.media_controls_label);

			// interface HTML: media, controls, fullscreen
			interface.media_controls_fullscreen = document.createElement("div");
			interface.media_controls_fullscreen.setAttribute("title", "Fullscreen");
			interface.media_controls_fullscreen.setAttribute("class", "button_size_small button_color_white");
			interface.media_controls_fullscreen.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 128px");
			interface.media_controls_fullscreen.setAttribute("onclick", "player_images_fullscreen_toggle()");
			interface.media_controls_fullscreen.innerHTML = "▭";
			interface.media_controls.appendChild(interface.media_controls_fullscreen);
		}

		// interface HTML: media, music
		interface.media_music = document.createElement("div");
		interface.media_music.setAttribute("style", "position: absolute; overflow: hidden; top: 0%; left: 60%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_music);
		{
			// interface HTML: media, music, previous
			interface.media_music_previous = document.createElement("div");
			interface.media_music_previous.setAttribute("title", "Previous song (" + KEY_MUSIC_PREVIOUS + ")");
			interface.media_music_previous.setAttribute("class", "button_size_small button_color_black");
			interface.media_music_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			interface.media_music_previous.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_previous);

			// interface HTML: media, music, play
			interface.media_music_play = document.createElement("div");
			interface.media_music_play.setAttribute("title", "Play / Pause song (" + KEY_MUSIC_PLAY + ")");
			interface.media_music_play.setAttribute("class", "button_size_medium button_color_black");
			interface.media_music_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			interface.media_music_play.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_play);

			// interface HTML: media, music, next
			interface.media_music_next = document.createElement("div");
			interface.media_music_next.setAttribute("title", "Next song (" + KEY_MUSIC_NEXT + ")");
			interface.media_music_next.setAttribute("class", "button_size_small button_color_black");
			interface.media_music_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			interface.media_music_next.innerHTML = "✖";
			interface.media_music.appendChild(interface.media_music_next);

			// interface HTML: media, music, label
			interface.media_music_label = document.createElement("p");
			interface.media_music_label.setAttribute("class", "text_color_black");
			interface.media_music_label.setAttribute("style", "position: absolute; top: 40px; width: 100%");
			interface.media_music.appendChild(interface.media_music_label);

			// interface HTML: media, music, thumb
			interface.media_music_thumb = document.createElement("a");
			interface.media_music_thumb.setAttribute("title", "Open song (" + KEY_MUSIC_OPEN + ")");
			interface.media_music_thumb.setAttribute("target", "_blank");
			interface.media_music.appendChild(interface.media_music_thumb);
			{
				// interface HTML: media, music, thumb, song
				interface.media_music_thumb_song = document.createElement("img");
				interface.media_music_thumb_song.setAttribute("class", "thumbnail");
				interface.media_music_thumb_song.setAttribute("src", SRC_BLANK);
				interface.media_music_thumb_song.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 76px");
				interface.media_music_thumb.appendChild(interface.media_music_thumb_song);
			}

			// interface HTML: media, music, info
			interface.media_music_info = document.createElement("p");
			interface.media_music_info.setAttribute("class", "text_color_black");
			interface.media_music_info.setAttribute("style", "position: absolute; top: 144px; width: 100%");
			interface.media_music.appendChild(interface.media_music_info);
		}

		// interface HTML: media, music, recommendations
		interface.media_music_recommendations = document.createElement("div");
		interface.media_music_recommendations.setAttribute("style", "position: absolute; direction: ltr; overflow: auto; top: 0%; left: 80%; width: 20%; height: 100%");
		interface.media.appendChild(interface.media_music_recommendations);
		{
			// interface HTML: controls, music, recommendations, label
			interface.media_music_recommendations_label = document.createElement("p");
			interface.media_music_recommendations_label.setAttribute("class", "text_color_black");
			interface.media_music_recommendations_label.setAttribute("style", "text-align: center");
			interface.media_music_recommendations_label.innerHTML = "<font class=text_size_large><b>" + TYPE_MUSIC + " Recommendations<b/></font>";
			interface.media_music_recommendations.appendChild(interface.media_music_recommendations_label);

			// interface HTML: controls, music, recommendations, list
			interface.media_music_recommendations_list = document.createElement("div");
			interface.media_music_recommendations_list.setAttribute("class", "text_color_black");
			interface.media_music_recommendations.appendChild(interface.media_music_recommendations_list);
		}
	}

	// pull the initial data from available sources
	// use a short delay as plugins must first have time to register
	clearInterval(interface_refresh.interval);
	interface_refresh.interval = setInterval(interface_autorefresh, 1000);
	interface_refresh.timer = 1;
	interface_update_media(true, true, true);
	settings_url_set();
}
