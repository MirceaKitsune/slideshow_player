// Slideshow Viewer, Interface
// Public Domain / CC0, MirceaKitsune 2018

// whether to also refresh the content when loading new settings
var interface_refresh_sites = false;

// interface, functions, refresh
function interface_refresh(name) {
	// don't do anything if plugins are still busy
	if(plugins_busy())
		return;

	// refresh the content if this setting affects any plugins
	if(name === true || plugins_settings.indexOf(name) >= 0)
		interface_refresh_sites = true;

	player_detach();
	interface_update_media_controls("reload");
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
	settings_cookie_set();

	// limit the settings to acceptable values
	// should match the limits defined on the corresponding HTML elements
	settings.images.keywords = settings.images.keywords.substring(0, 100);
	settings.images.count = Math.max(Math.min(settings.images.count, 1000), 5);
	settings.images.duration = Math.max(Math.min(settings.images.duration, 100), 5);

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
	var sites_list = document.getElementById("controls_sites_list");
	sites_list.innerHTML = "<b>Sites:<b/><br/>";
	for(var item in plugins) {
		// interface HTML: controls, images, sites, list, checkbox
		var sites_list_checkbox = document.createElement("input");
		sites_list_checkbox.setAttribute("id", "controls_images_list_sites_checkbox_" + item);
		sites_list_checkbox.setAttribute("title", "Whether to fetch images from " + item);
		sites_list_checkbox.setAttribute("type", "checkbox");
		sites_list_checkbox.setAttribute("name", item);
		if(settings.sites.indexOf(item) >= 0)
			sites_list_checkbox.setAttribute("checked", true);
		sites_list_checkbox.setAttribute("onclick", "interface_refresh(true)");
		sites_list.appendChild(sites_list_checkbox);

		// interface HTML: controls, images, sites, list, label
		var sites_list_label = document.createElement("label");
		sites_list_label.innerHTML = item + "<br/>";
		sites_list.appendChild(sites_list_label);
	}
}

// interface, update HTML, media images
function interface_update_media_images(active) {
	var ready = (player.images.index > 0 && player.images.transition >= 1 && player.images.preloading !== true);

	var prev = document.getElementById("media_images_previous");
	var play = document.getElementById("media_images_play");
	var next = document.getElementById("media_images_next");
	var label = document.getElementById("media_images_label");
	var thumb = document.getElementById("media_images_thumb");
	var thumb_image = document.getElementById("media_images_thumb_image");
	var info = document.getElementById("media_images_info");

	if(active === true && ready === true) {
		prev.setAttribute("class", "button_size_small button_color_blue");
		prev.setAttribute("onclick", "player_images_skip(player.images.index - 1)");
		prev.innerHTML = "|◀";

		if(player.images.stopped === true) {
			play.setAttribute("class", "button_size_medium button_color_yellow");
			play.setAttribute("onclick", "player_images_play()");
			play.innerHTML = "▶";
		}
		else {
			play.setAttribute("class", "button_size_medium button_color_green");
			play.setAttribute("onclick", "player_images_play()");
			play.innerHTML = "||";
		}

		next.setAttribute("class", "button_size_small button_color_blue");
		next.setAttribute("onclick", "player_images_skip(player.images.index + 1)");
		next.innerHTML = "▶|";
	}
	else {
		prev.setAttribute("class", "button_size_small button_color_red");
		prev.removeAttribute("onclick");
		prev.innerHTML = "✖";

		play.setAttribute("class", "button_size_medium button_color_red");
		play.removeAttribute("onclick");
		play.innerHTML = "✖";

		next.setAttribute("class", "button_size_small button_color_red");
		next.removeAttribute("onclick");
		next.innerHTML = "✖";
	}

	if(active === true && ready !== true) {
		label.innerHTML = "<font size=\"2\"><b>? / " + data_images.length + "</b></font>";
		thumb.removeAttribute("href");
		thumb_image.setAttribute("src", BLANK);
		info.innerHTML = "<font size=\"1\"><b>Loading image</b></font>";
	}
	else if(active === true) {
		label.innerHTML = "<font size=\"2\"><b>" + player.images.index + " / " + data_images.length + "</b></font>";
		thumb.setAttribute("href", data_images[player.images.index - 1].url);
		thumb_image.setAttribute("src", data_images[player.images.index - 1].thumb);
		info.innerHTML = "<font size=\"1\"><b>" + data_images[player.images.index - 1].title + "</b> by <b>" + data_images[player.images.index - 1].author + "</b></font>";
	}
	else {
		label.innerHTML = "<font size=\"2\"><b>Player stopped</b></font>";
		thumb.removeAttribute("href");
		thumb_image.setAttribute("src", BLANK);
		info.innerHTML = "";
	}
}

// interface, update HTML, media controls
function interface_update_media_controls(state) {
	var play = document.getElementById("media_controls_play");
	var label = document.getElementById("media_controls_label");

	var total_images = data_images.length;
	var total_seconds = total_images * settings.images.duration;
	var total_date = new Date(null);
	total_date.setSeconds(total_seconds);
	var total_time = total_date.toISOString().substr(11, 8);
	var label_status =
		"<b>Total images:</b> " + total_images + "<br/>" +
		"<b>Estimated time:</b> " + total_time;

	switch(state) {
		case "busy":
			play.setAttribute("class", "button_size_large button_color_blue");
			play.setAttribute("onclick", "interface_load()");
			play.innerHTML = "⧗";
			label.innerHTML = "<b>Loading content</b>";
			document.title = "Slideshow Player";
			break;
		case "reload":
			play.setAttribute("class", "button_size_large button_color_cyan");
			play.setAttribute("onclick", "interface_load()");
			play.innerHTML = "⟳";
			label.innerHTML = "<b>Click to apply settings</b>";
			document.title = "Slideshow Player";
			break;
		case "none":
			play.setAttribute("class", "button_size_large button_color_red");
			play.removeAttribute("onclick");
			play.innerHTML = "✖";
			label.innerHTML = "<b>Unable to play</b>";
			document.title = "Slideshow Player";
			break;
		case "stop":
			play.setAttribute("class", "button_size_large button_color_green");
			play.setAttribute("onclick", "interface_play()");
			play.innerHTML = "■";
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (▶)";
			break;
		case "play":
			play.setAttribute("class", "button_size_large button_color_yellow");
			play.setAttribute("onclick", "interface_play()");
			play.innerHTML = "▶";
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (■)";
			break;
		default:
			play.setAttribute("class", "button_size_large button_color_pink");
			play.removeAttribute("onclick");
			play.innerHTML = "?";
			label.innerHTML = "<b>Error</b>";
			document.title = "Slideshow Player";
	}
}

// interface, HTML, create
function interface_init() {
	// interface HTML: player
	var play = document.createElement("div");
	play.setAttribute("id", "player_area");
	play.setAttribute("style", "position: absolute; top: 10%; left: 5%; width: 70%; height: 70%; background-color: #000000");
	document.body.appendChild(play);

	// interface HTML: controls
	var controls = document.createElement("div");
	controls.setAttribute("style", "position: absolute; top: 0%; left: 80%; width: 20%; height: 100%; background-color: #dfdfdf; overflow: auto");
	document.body.appendChild(controls);
	{
		// interface HTML: controls, images
		var controls_images = document.createElement("form");
		controls_images.setAttribute("id", "controls_images");
		controls.appendChild(controls_images);
		{
			// interface HTML: media, images, title
			var controls_images_title = document.createElement("p");
			controls_images_title.setAttribute("style", "text-align: center");
			controls_images_title.innerHTML = "<font size=\"4\"><b>Image settings</b></font>";
			controls_images.appendChild(controls_images_title);

			// interface HTML: controls, images, search
			var controls_images_search = document.createElement("p");
			controls_images_search.innerHTML = "<b>Search:<b/><br/>";
			controls_images.appendChild(controls_images_search);
			{
				// interface HTML: controls, images, search, keywords, input
				var controls_images_search_keywords_input = document.createElement("input");
				controls_images_search_keywords_input.setAttribute("id", "controls_images_search_keywords");
				controls_images_search_keywords_input.setAttribute("title", "Images matching those keywords will be used in the slideshow");
				controls_images_search_keywords_input.setAttribute("type", "text");
				controls_images_search_keywords_input.setAttribute("value", settings.images.keywords);
				controls_images_search_keywords_input.setAttribute("maxlength", "100");
				controls_images_search_keywords_input.setAttribute("onclick", "interface_refresh(\"keywords\")");
				controls_images_search.appendChild(controls_images_search_keywords_input);

				// interface HTML: controls, images, search, br
				var controls_images_search_br = document.createElement("br");
				controls_images_search.appendChild(controls_images_search_br);

				// interface HTML: controls, images, search, nsfw, input
				var controls_images_search_nsfw_input = document.createElement("input");
				controls_images_search_nsfw_input.setAttribute("id", "controls_images_search_nsfw");
				controls_images_search_nsfw_input.setAttribute("title", "Include content that is not safe for work");
				controls_images_search_nsfw_input.setAttribute("type", "checkbox");
				if(settings.images.nsfw === true)
					controls_images_search_nsfw_input.setAttribute("checked", true);
				controls_images_search_nsfw_input.setAttribute("onclick", "interface_refresh(\"nsfw\")");
				controls_images_search.appendChild(controls_images_search_nsfw_input);

				// interface HTML: controls, images, search, nsfw, label
				var controls_images_search_nsfw_label = document.createElement("label");
				controls_images_search_nsfw_label.innerHTML = "NSFW<br/>";
				controls_images_search.appendChild(controls_images_search_nsfw_label);
			}

			// interface HTML: controls, images, count
			var controls_images_count = document.createElement("p");
			controls_images_count.innerHTML = "<b>Count:<b/><br/>";
			controls_images.appendChild(controls_images_count);
			{
				// interface HTML: controls, images, count, input
				var controls_images_count_input = document.createElement("input");
				controls_images_count_input.setAttribute("id", "controls_images_count");
				controls_images_count_input.setAttribute("title", "The total number of images to be used in the slideshow");
				controls_images_count_input.setAttribute("type", "number");
				controls_images_count_input.setAttribute("value", settings.images.count);
				controls_images_count_input.setAttribute("step", "5");
				controls_images_count_input.setAttribute("min", "5");
				controls_images_count_input.setAttribute("max", "1000");
				controls_images_count_input.setAttribute("onclick", "interface_refresh(\"count\")");
				controls_images_count.appendChild(controls_images_count_input);
			}

			// interface HTML: controls, images, duration
			var controls_images_duration = document.createElement("p");
			controls_images_duration.innerHTML = "<b>Duration:<b/><br/>";
			controls_images.appendChild(controls_images_duration);
			{
				// interface HTML: controls, images, duration, input
				var controls_images_duration_input = document.createElement("input");
				controls_images_duration_input.setAttribute("id", "controls_images_duration");
				controls_images_duration_input.setAttribute("title", "Number of seconds for which to display each image");
				controls_images_duration_input.setAttribute("type", "number");
				controls_images_duration_input.setAttribute("value", settings.images.duration);
				controls_images_duration_input.setAttribute("step", "1");
				controls_images_duration_input.setAttribute("min", "5");
				controls_images_duration_input.setAttribute("max", "100");
				controls_images_duration_input.setAttribute("onclick", "interface_refresh(\"duration\")");
				controls_images_duration.appendChild(controls_images_duration_input);
			}

			// interface HTML: controls, images, play
			var controls_images_play = document.createElement("p");
			controls_images_play.innerHTML = "<b>Options:<b/><br/>";
			controls_images.appendChild(controls_images_play);
			{
				// interface HTML: controls, images, play, loop, input
				var controls_images_play_loop_input = document.createElement("input");
				controls_images_play_loop_input.setAttribute("id", "controls_images_play_loop");
				controls_images_play_loop_input.setAttribute("title", "Whether to loop through the images indefinitely");
				controls_images_play_loop_input.setAttribute("type", "checkbox");
				if(settings.images.loop === true)
					controls_images_play_loop_input.setAttribute("checked", true);
				controls_images_play_loop_input.setAttribute("onclick", "interface_refresh(\"loop\")");
				controls_images_play.appendChild(controls_images_play_loop_input);

				// interface HTML: controls, images, play, loop, label
				var controls_images_play_loop_label = document.createElement("label");
				controls_images_play_loop_label.innerHTML = "Loop<br/>";
				controls_images_play.appendChild(controls_images_play_loop_label);

				// interface HTML: controls, images, play, shuffle, input
				var controls_images_play_shuffle_input = document.createElement("input");
				controls_images_play_shuffle_input.setAttribute("id", "controls_images_play_shuffle");
				controls_images_play_shuffle_input.setAttribute("title", "Whether to shuffle the images before playing");
				controls_images_play_shuffle_input.setAttribute("type", "checkbox");
				if(settings.images.shuffle === true)
					controls_images_play_shuffle_input.setAttribute("checked", true);
				controls_images_play_shuffle_input.setAttribute("onclick", "interface_refresh(\"shuffle\")");
				controls_images_play.appendChild(controls_images_play_shuffle_input);

				// interface HTML: controls, images, play, shuffle, label
				var controls_images_play_shuffle_label = document.createElement("label");
				controls_images_play_shuffle_label.innerHTML = "Shuffle<br/>";
				controls_images_play.appendChild(controls_images_play_shuffle_label);
			}
		}

		// interface HTML: controls, hr
		var controls_hr = document.createElement("hr");
		controls.appendChild(controls_hr);

		// interface HTML: controls, sites
		var controls_sites = document.createElement("form");
		controls_sites.setAttribute("id", "controls_sites");
		controls.appendChild(controls_sites);
		{
			// interface HTML: controls, sites, title
			var controls_sites_title = document.createElement("p");
			controls_sites_title.setAttribute("style", "text-align: center");
			controls_sites_title.innerHTML = "<font size=\"4\"><b>Sources</b></font>";
			controls_sites.appendChild(controls_sites_title);

			// interface HTML: controls, sites, list
			// updated by interface_update_controls_sites_list
			var controls_sites_list = document.createElement("p");
			controls_sites_list.setAttribute("id", "controls_sites_list");
			controls_sites_list.innerHTML = "<b>Sites:<b/><br/>";
			controls_sites.appendChild(controls_sites_list);
		}
	}

	// interface HTML: media
	var media = document.createElement("div");
	media.setAttribute("style", "position: absolute; top: 80%; left: 5%; width: 70%; height: 20%; overflow: hidden");
	document.body.appendChild(media);
	{
		// interface HTML: media, images
		// updated by interface_update_media_images
		var media_images = document.createElement("div");
		media_images.setAttribute("id", "media_images");
		media_images.setAttribute("style", "position: absolute; margin: 0 0 0 0%; top: 0%; left: 0%; width: 192px; height: 100%");
		media.appendChild(media_images);
		{
			// interface HTML: media, images, previous
			var media_images_previous = document.createElement("div");
			media_images_previous.setAttribute("id", "media_images_previous");
			media_images_previous.setAttribute("title", "Previous image (" + KEY_LABEL_IMAGES_PREVIOUS + ")");
			media_images_previous.setAttribute("class", "button_size_small button_color_black");
			media_images_previous.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: -64px");
			media_images_previous.innerHTML = "✖";
			media_images.appendChild(media_images_previous);

			// interface HTML: media, images, play
			var media_images_play = document.createElement("div");
			media_images_play.setAttribute("id", "media_images_play");
			media_images_play.setAttribute("title", "Play / Pause image (" + KEY_LABEL_IMAGES_PLAY + ")");
			media_images_play.setAttribute("class", "button_size_medium button_color_black");
			media_images_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 4px");
			media_images_play.innerHTML = "✖";
			media_images.appendChild(media_images_play);

			// interface HTML: media, images, next
			var media_images_next = document.createElement("div");
			media_images_next.setAttribute("id", "media_images_next");
			media_images_next.setAttribute("title", "Next image (" + KEY_LABEL_IMAGES_NEXT + ")");
			media_images_next.setAttribute("class", "button_size_small button_color_black");
			media_images_next.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 12px; left: 32px");
			media_images_next.innerHTML = "✖";
			media_images.appendChild(media_images_next);

			// interface HTML: media, images, label
			var media_images_label = document.createElement("p");
			media_images_label.setAttribute("id", "media_images_label");
			media_images_label.setAttribute("style", "position: absolute; top: 40px; width: 100%; text-align: center");
			media_images.appendChild(media_images_label);

			// interface HTML: media, images, thumb
			var media_images_thumb = document.createElement("a");
			media_images_thumb.setAttribute("id", "media_images_thumb");
			media_images_thumb.setAttribute("title", "Open image (" + KEY_LABEL_IMAGES_OPEN + ")");
			media_images_thumb.setAttribute("target", "_blank");
			media_images.appendChild(media_images_thumb);
			{
				// interface HTML: media, images, thumb, image
				var media_images_thumb_image = document.createElement("img");
				media_images_thumb_image.setAttribute("id", "media_images_thumb_image");
				media_images_thumb_image.setAttribute("class", "thumbnail");
				media_images_thumb_image.setAttribute("src", BLANK);
				media_images_thumb_image.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 76px");
				media_images_thumb.appendChild(media_images_thumb_image);
			}

			// interface HTML: media, images, info
			var media_images_info = document.createElement("p");
			media_images_info.setAttribute("id", "media_images_info");
			media_images_info.setAttribute("style", "position: absolute; top: 144px; width: 100%; text-align: center");
			media_images.appendChild(media_images_info);
		}

		// interface HTML: media, controls
		// updated by interface_update_media_controls
		var media_controls = document.createElement("div");
		media_controls.setAttribute("id", "media_controls");
		media_controls.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 0%; left: -192px; width: 384px; height: 100%");
		media.appendChild(media_controls);
		{
			// interface HTML: media, controls, play
			var media_controls_play = document.createElement("div");
			media_controls_play.setAttribute("id", "media_controls_play");
			media_controls_play.setAttribute("title", "Play / Stop (" + KEY_LABEL_PLAY + ")");
			media_controls_play.setAttribute("class", "button_size_large button_color_pink");
			media_controls_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 8px");
			media_controls_play.innerHTML = "?";
			media_controls.appendChild(media_controls_play);

			// interface HTML: media, controls, label
			var media_controls_label = document.createElement("p");
			media_controls_label.setAttribute("id", "media_controls_label");
			media_controls_label.setAttribute("style", "position: absolute; top: 64px; left: 0%; width: 100%; text-align: center");
			media_controls.appendChild(media_controls_label);
		}

		// interface HTML: media, music
		var media_music = document.createElement("div");
		media_music.setAttribute("id", "media_music");
		media_music.setAttribute("style", "position: absolute; margin: 0 0 0 100%; top: 0%; left: -192px; width: 192px; height: 100%");
		media.appendChild(media_music);
	}

	interface_refresh(true);
}
