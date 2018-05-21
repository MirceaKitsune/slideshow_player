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

// interface, update HTML, image sites
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
			play.setAttribute("class", "button button_color_blue");
			play.innerHTML = "⧗";
			play.setAttribute("onclick", "interface_load()");
			label.innerHTML = "<b>Loading content</b>";
			document.title = "Slideshow Player";
			break;
		case "reload":
			play.setAttribute("class", "button button_color_cyan");
			play.innerHTML = "⟳";
			play.setAttribute("onclick", "interface_load()");
			label.innerHTML = "<b>Click to apply settings</b>";
			document.title = "Slideshow Player";
			break;
		case "none":
			play.setAttribute("class", "button button_color_red");
			play.innerHTML = "✖";
			play.removeAttribute("onclick");
			label.innerHTML = "<b>Unable to play</b>";
			document.title = "Slideshow Player";
			break;
		case "stop":
			play.setAttribute("class", "button button_color_yellow");
			play.innerHTML = "■";
			play.setAttribute("onclick", "interface_play()");
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (▶)";
			break;
		case "play":
			play.setAttribute("class", "button button_color_green");
			play.innerHTML = "▶";
			play.setAttribute("onclick", "interface_play()");
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (■)";
			break;
		default:
			play.setAttribute("class", "button button_color_pink");
			play.innerHTML = "?";
			play.removeAttribute("onclick");
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
	controls.setAttribute("style", "position: absolute; top: 0%; left: 80%; width: 20%; height: 100%; background-color: #c0c0c0; overflow: auto");
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
			controls_images_title.innerHTML = "<big><b>Image settings</b></big>";
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
			controls_sites_title.innerHTML = "<big><b>Sources</b></big>";
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
	media.setAttribute("style", "position: absolute; top: 80%; left: 5%; width: 70%; height: 20%");
	document.body.appendChild(media);
	{
		// interface HTML: media, images
		var media_images = document.createElement("div");
		media_images.setAttribute("id", "media_images");
		media_images.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 15%; height: 100%; overflow: hidden");
		media.appendChild(media_images);

		// interface HTML: media, controls
		var media_controls = document.createElement("div");
		media_controls.setAttribute("id", "media_controls");
		media_controls.setAttribute("style", "position: absolute; top: 0%; left: 35%; width: 30%; height: 100%; overflow: hidden");
		media.appendChild(media_controls);
		{
			// interface HTML: media, controls, play
			// updated by interface_update_media_controls
			var media_controls_play = document.createElement("div");
			media_controls_play.setAttribute("id", "media_controls_play");
			media_controls_play.setAttribute("class", "button button_color_pink");
			media_controls_play.setAttribute("style", "position: absolute; margin: 0 0 0 50%; top: 8px; left: -32px; width: 64px; height: 64px");
			media_controls_play.innerHTML = "?";
			media_controls.appendChild(media_controls_play);

			// interface HTML: media, controls, label
			// updated by interface_update_media_controls
			var media_controls_label = document.createElement("p");
			media_controls_label.setAttribute("id", "media_controls_label");
			media_controls_label.setAttribute("style", "position: absolute; top: 50%; left: 0%; width: 100%; height: 50%; text-align: center");
			media_controls.appendChild(media_controls_label);
		}

		// interface HTML: media, music
		var media_music = document.createElement("div");
		media_music.setAttribute("id", "media_music");
		media_music.setAttribute("style", "position: absolute; top: 0%; left: 85%; width: 15%; height: 100%; overflow: hidden");
		media.appendChild(media_music);
	}

	interface_refresh(true);
}
