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
const STYLE_MEDIA_BACKGROUND_ATTACHED = "background-image: linear-gradient(to bottom, #00000000, #000000c0)";
const STYLE_MEDIA_BACKGROUND_DETACHED = "background-image: linear-gradient(to bottom, #00000005, #00000000)";

// whether to also refresh the content when loading new settings
var interface_refresh_yes = false;
var interface_refresh_sites = false;

// object containing all of the interface elements
var interface = {};

// interface, functions, refresh
function interface_refresh(name) {
	// don't do anything if plugins are still busy
	if(plugins_busy())
		return;

	// refresh the content if this setting affects any plugins
	// if set to true rather than a setting name, force refresh
	if(name === true || plugins_settings.indexOf(name) >= 0)
		interface_refresh_sites = true;

	if(player_active() !== true) {
		interface_update_media_controls("reload");
		interface_update_media_images();
	}

	interface_refresh_yes = true;
}

// interface, functions, plugin loader
function interface_load() {
	// don't do anything if plugins are still busy
	if(plugins_busy())
		return;

	var elements_settings = document.forms["controls_images"].elements;
	var elements_list = document.forms["controls_sites"].elements;

	// configure the system settings
	settings.sites = [];
	for(var i = 0; i < elements_list.length; i++) {
		if(elements_list[i].checked)
			settings.sites.push(elements_list[i].name);
	}
	settings.images.keywords = elements_settings["controls_images_search_keywords"].value;
	settings.images.nsfw = Boolean(elements_settings["controls_images_search_nsfw"].checked);
	settings.images.count = Number(elements_settings["controls_images_count"].value);
	settings.images.duration = Number(elements_settings["controls_images_duration"].value);
	settings.images.loop = Boolean(elements_settings["controls_images_play_loop"].checked);
	settings.images.shuffle = Boolean(elements_settings["controls_images_play_shuffle"].checked);

	// limit the settings to acceptable values
	// should match the limits defined on the corresponding HTML elements
	settings.images.keywords = settings.images.keywords.substring(0, 100);
	settings.images.count = Math.max(Math.min(settings.images.count, 1000), 5);
	settings.images.duration = Math.max(Math.min(settings.images.duration, 100), 5);

	// update the settings cookie
	settings_cookie_set();

	// evenly distribute the total image count to each source
	settings.images.count = Math.floor(settings.images.count / settings.sites.length);

	// load every selected plugin
	player_detach();
	if(interface_refresh_sites === true) {
		images_clear();
		for(var site in settings.sites)
			plugins_load(settings.sites[site]);
		interface_refresh_sites = false;
	}

	interface_refresh_yes = false;
}

// interface, functions, play button
function interface_play() {
	// add or remove the player
	if(player_available() === true)
		player_attach();
	else
		player_detach();
}

// interface, update HTML, sites
function interface_update_controls_sites_list() {
	interface.controls_sites_list.innerHTML = "";
	for(var item in plugins) {
		// interface HTML: controls, images, sites, list, checkbox
		var id_checkbox = "controls_images_list_sites_" + item + "_checkbox";
		interface[id_checkbox] = document.createElement("input");
		interface[id_checkbox].setAttribute("id", id_checkbox);
		interface[id_checkbox].setAttribute("title", "Whether to fetch content from " + item);
		interface[id_checkbox].setAttribute("type", "checkbox");
		interface[id_checkbox].setAttribute("name", item);
		if(settings.sites.length == 0 || settings.sites.indexOf(item) >= 0)
			interface[id_checkbox].setAttribute("checked", true);
		interface[id_checkbox].setAttribute("onclick", "interface_refresh(true)");
		interface.controls_sites_list.appendChild(interface[id_checkbox]);

		// interface HTML: controls, images, sites, list, label
		var id_label = "controls_images_list_sites_" + item + "_label";
		interface[id_label] = document.createElement("label");
		interface[id_label].innerHTML = item + "<br/>";
		interface.controls_sites_list.appendChild(interface[id_label]);
	}
}

// interface, update HTML, media images
function interface_update_media_images() {
	var active = player_active();
	var ready = !player_busy();

	// configure previous / play / next elements
	if(active === true && ready === true) {
		interface.media_images_previous.setAttribute("class", "button_size_small button_color_blue");
		interface.media_images_previous.setAttribute("onclick", "player_images_skip(player.images.index - 1)");
		interface.media_images_previous.innerHTML = "|◀";

		if(player.images.stopped === true) {
			interface.media_images_play.setAttribute("class", "button_size_medium button_color_yellow");
			interface.media_images_play.setAttribute("onclick", "player_images_play()");
			interface.media_images_play.innerHTML = "▶";
		}
		else {
			interface.media_images_play.setAttribute("class", "button_size_medium button_color_green");
			interface.media_images_play.setAttribute("onclick", "player_images_play()");
			interface.media_images_play.innerHTML = "||";
		}

		interface.media_images_next.setAttribute("class", "button_size_small button_color_blue");
		interface.media_images_next.setAttribute("onclick", "player_images_skip(player.images.index + 1)");
		interface.media_images_next.innerHTML = "▶|";
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
	if(active === true && ready !== true) {
		interface.media_images_label.innerHTML = "<font size=\"2\"><b>? / " + data_images.length + "</b></font>";
		interface.media_images_thumb.removeAttribute("href");
		interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
		interface.media_images_info.innerHTML = "<font size=\"1\"><b>Loading image</b></font>";
		interface.player_icon.innerHTML = "⧗";
	}
	else if(active === true) {
		interface.media_images_label.innerHTML = "<font size=\"2\"><b>" + player.images.index + " / " + data_images.length + "</b></font>";
		interface.media_images_thumb.setAttribute("href", data_images[player.images.index - 1].url);
		interface.media_images_thumb_image.setAttribute("src", data_images[player.images.index - 1].thumb);
		interface.media_images_info.innerHTML = "<font size=\"1\"><b>" + data_images[player.images.index - 1].title + "</b> by <b>" + data_images[player.images.index - 1].author + "</b></font>";
		interface.player_icon.innerHTML = "";
	}
	else {
		interface.media_images_label.innerHTML = "<font size=\"2\"><b>Player stopped</b></font>";
		interface.media_images_thumb.removeAttribute("href");
		interface.media_images_thumb_image.setAttribute("src", SRC_BLANK);
		interface.media_images_info.innerHTML = "";
		interface.player_icon.innerHTML = "";
	}
}

// interface, update HTML, media controls
function interface_update_media_controls(state) {
	var total_images = data_images.length;
	var total_duration = settings.images.duration;
	var total_seconds = total_images * total_duration;
	var total_date = new Date(null);
	total_date.setSeconds(total_seconds);
	var total_time = total_date.toISOString().substr(11, 8);
	var label_status =
		"<b>Images:</b> " + total_images + " <b>↺</b> " + total_duration + " sec<br/>" +
		"<b>Duration:</b> " + total_time;

	// configure play / label elements, as well as the window title
	switch(state) {
		case "busy":
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_blue");
			interface.media_controls_play.setAttribute("onclick", "interface_load()");
			interface.media_controls_play.innerHTML = "⧗";
			interface.media_controls_label.innerHTML = "<b>Loading content</b>";
			document.title = "Slideshow Player (⧗)";
			break;
		case "reload":
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_cyan");
			interface.media_controls_play.setAttribute("onclick", "interface_load()");
			interface.media_controls_play.innerHTML = "⟳";
			interface.media_controls_label.innerHTML = "<b>Click to apply settings</b>";
			document.title = "Slideshow Player (⟳)";
			break;
		case "none":
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_red");
			interface.media_controls_play.removeAttribute("onclick");
			interface.media_controls_play.innerHTML = "∅";
			interface.media_controls_label.innerHTML = "<b>Unable to play</b>";
			document.title = "Slideshow Player (∅)";
			break;
		case "stop":
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_green");
			interface.media_controls_play.setAttribute("onclick", "interface_play()");
			interface.media_controls_play.innerHTML = "■";
			interface.media_controls_label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images at " + total_duration + " seconds (▶)";
			break;
		case "play":
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_yellow");
			interface.media_controls_play.setAttribute("onclick", "interface_play()");
			interface.media_controls_play.innerHTML = "▶";
			interface.media_controls_label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images at " + total_duration + " seconds (■)";
			break;
		default:
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_pink");
			interface.media_controls_play.removeAttribute("onclick");
			interface.media_controls_play.innerHTML = "✖";
			interface.media_controls_label.innerHTML = "<b>Error</b>";
			document.title = "Slideshow Player (✖)";
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
		// interface HTML: player, icon
		interface.player_icon = document.createElement("div");
		interface.player_icon.setAttribute("class", "text_white");
		interface.player_icon.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 48px; height: 48px; z-index: 1; line-height: 32px; font-size: 48px");
		interface.player.appendChild(interface.player_icon);
	}

	// interface HTML: controls
	interface.controls = document.createElement("div");
	interface.controls.setAttribute("style", "position: absolute; overflow: auto; " + STYLE_CONTROLS_POSITION);
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
					"<font size=\"4\"><b>Slideshow Player</b></font><br/>" +
					"<font size=\"1\"><b>by MirceaKitsune</b></font>";
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
			interface.controls_images_title.innerHTML = "<font size=\"4\"><b>Image settings</b></font>";
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
				interface.controls_images_search_keywords_input.setAttribute("onclick", "interface_refresh(\"keywords\")");
				interface.controls_images_search.appendChild(interface.controls_images_search_keywords_input);

				// interface HTML: controls, images, search, br
				interface.controls_images_search_br = document.createElement("br");
				interface.controls_images_search.appendChild(interface.controls_images_search_br);

				// interface HTML: controls, images, search, nsfw, input
				interface.controls_images_search_nsfw_input = document.createElement("input");
				interface.controls_images_search_nsfw_input.setAttribute("id", "controls_images_search_nsfw");
				interface.controls_images_search_nsfw_input.setAttribute("title", "Include content that is not safe for work");
				interface.controls_images_search_nsfw_input.setAttribute("type", "checkbox");
				if(settings.images.nsfw === true)
					interface.controls_images_search_nsfw_input.setAttribute("checked", true);
				interface.controls_images_search_nsfw_input.setAttribute("onclick", "interface_refresh(\"nsfw\")");
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
				interface.controls_images_count_input.setAttribute("step", "5");
				interface.controls_images_count_input.setAttribute("min", "5");
				interface.controls_images_count_input.setAttribute("max", "1000");
				interface.controls_images_count_input.setAttribute("onclick", "interface_refresh(\"count\")");
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
				interface.controls_images_duration_input.setAttribute("max", "100");
				interface.controls_images_duration_input.setAttribute("onclick", "interface_refresh(\"duration\")");
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
				if(settings.images.loop === true)
					interface.controls_images_play_loop_input.setAttribute("checked", true);
				interface.controls_images_play_loop_input.setAttribute("onclick", "interface_refresh(\"loop\")");
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
				if(settings.images.shuffle === true)
					interface.controls_images_play_shuffle_input.setAttribute("checked", true);
				interface.controls_images_play_shuffle_input.setAttribute("onclick", "interface_refresh(\"shuffle\")");
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

		// interface HTML: controls, sites
		interface.controls_sites = document.createElement("form");
		interface.controls_sites.setAttribute("id", "controls_sites");
		interface.controls.appendChild(interface.controls_sites);
		{
			// interface HTML: controls, sites, title
			interface.controls_sites_title = document.createElement("p");
			interface.controls_sites_title.setAttribute("style", "text-align: center");
			interface.controls_sites_title.innerHTML = "<font size=\"4\"><b>Sources</b></font>";
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
		// interface HTML: media, images
		interface.media_images = document.createElement("div");
		interface.media_images.setAttribute("style", "position: absolute; margin: 0 0 0 0%; top: 0%; left: 0%; width: 192px; height: 100%");
		interface.media.appendChild(interface.media_images);
		{
			// interface HTML: media, images, previous
			interface.media_images_previous = document.createElement("div");
			interface.media_images_previous.setAttribute("title", "Previous image (" + KEY_LABEL_IMAGES_PREVIOUS + ")");
			interface.media_images_previous.setAttribute("class", "button_size_small button_color_pink");
			interface.media_images_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			interface.media_images_previous.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_previous);

			// interface HTML: media, images, play
			interface.media_images_play = document.createElement("div");
			interface.media_images_play.setAttribute("title", "Play / Pause image (" + KEY_LABEL_IMAGES_PLAY + ")");
			interface.media_images_play.setAttribute("class", "button_size_medium button_color_pink");
			interface.media_images_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			interface.media_images_play.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_play);

			// interface HTML: media, images, next
			interface.media_images_next = document.createElement("div");
			interface.media_images_next.setAttribute("title", "Next image (" + KEY_LABEL_IMAGES_NEXT + ")");
			interface.media_images_next.setAttribute("class", "button_size_small button_color_pink");
			interface.media_images_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			interface.media_images_next.innerHTML = "✖";
			interface.media_images.appendChild(interface.media_images_next);

			// interface HTML: media, images, label
			interface.media_images_label = document.createElement("p");
			interface.media_images_label.setAttribute("class", "text_black");
			interface.media_images_label.setAttribute("style", "position: absolute; top: 40px; width: 100%");
			interface.media_images.appendChild(interface.media_images_label);

			// interface HTML: media, images, thumb
			interface.media_images_thumb = document.createElement("a");
			interface.media_images_thumb.setAttribute("title", "Open image (" + KEY_LABEL_IMAGES_OPEN + ")");
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
			interface.media_images_info.setAttribute("class", "text_black");
			interface.media_images_info.setAttribute("style", "position: absolute; top: 144px; width: 100%");
			interface.media_images.appendChild(interface.media_images_info);
		}

		// interface HTML: media, controls
		interface.media_controls = document.createElement("div");
		interface.media_controls.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 0%; left: -192px; width: 384px; height: 100%");
		interface.media.appendChild(interface.media_controls);
		{
			// interface HTML: media, controls, play
			interface.media_controls_play = document.createElement("div");
			interface.media_controls_play.setAttribute("title", "Toggle player / Refresh settings (" + KEY_LABEL_PLAY + ")");
			interface.media_controls_play.setAttribute("class", "button_size_large button_color_pink");
			interface.media_controls_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 8px");
			interface.media_controls_play.innerHTML = "✖";
			interface.media_controls.appendChild(interface.media_controls_play);

			// interface HTML: media, controls, label
			interface.media_controls_label = document.createElement("p");
			interface.media_controls_label.setAttribute("class", "text_black");
			interface.media_controls_label.setAttribute("style", "position: absolute; top: 64px; left: 0%; width: 100%");
			interface.media_controls.appendChild(interface.media_controls_label);

			// interface HTML: media, controls, fullscreen
			interface.media_controls_fullscreen = document.createElement("div");
			interface.media_controls_fullscreen.setAttribute("title", "Fullscreen");
			interface.media_controls_fullscreen.setAttribute("class", "button_size_small button_color_black");
			interface.media_controls_fullscreen.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 128px");
			interface.media_controls_fullscreen.setAttribute("onclick", "player_images_fullscreen_toggle()");
			interface.media_controls_fullscreen.innerHTML = "▭";
			interface.media_controls.appendChild(interface.media_controls_fullscreen);
		}

		// interface HTML: media, music
		interface.media_music = document.createElement("div");
		interface.media_music.setAttribute("style", "position: absolute; margin: 0 0 0 100%; top: 0%; left: -192px; width: 192px; height: 100%");
		interface.media.appendChild(interface.media_music);
	}

	interface_refresh(true);
}
