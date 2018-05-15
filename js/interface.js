// Slideshow Viewer, Interface
// Public Domain / CC0, MirceaKitsune 2018

// interface, functions, refresh
function interface_refresh() {
	images_clear();
	interface_update_media_controls("reload");
}

// interface, functions, plugin loader
function interface_load() {
	images_clear();

	var elements_settings = document.forms["controls_images_settings"].elements;
	var elements_list = document.forms["controls_images_sites"].elements;

	// configure the system settings
	settings.sites = [];
	for(var i = 0; i < elements_list.length; i++) {
		if(elements_list[i].checked)
			settings.sites.push(elements_list[i].name);
	}
	settings.keywords = elements_settings["controls_images_settings_keywords"].value;
	settings.count = Number(elements_settings["controls_images_settings_count"].value);
	settings.duration = Number(elements_settings["controls_images_settings_duration"].value);
	settings.shuffle = Boolean(elements_settings["controls_images_settings_shuffle"].checked);
	settings_cookie_set();

	// evenly distribute the total image count to each source
	settings.count = Math.floor(settings.count / settings.sites.length);

	// load every selected plugin
	for(var site in settings.sites)
		plugins_load(settings.sites[site]);
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
function interface_update_controls_images_sites() {
	var sites = document.getElementById("controls_images_sites");
	sites.innerHTML = "";

	// interface HTML: controls, images, sites, list
	var sites_list = document.createElement("p");
	sites_list.setAttribute("id", "controls_images_sites_list");
	sites_list.innerHTML = "Sites:<br/>";
	sites.appendChild(sites_list);
	for(var item in plugins) {
		// interface HTML: controls, images, sites, list, checkbox
		var sites_list_checkbox = document.createElement("input");
		sites_list_checkbox.setAttribute("id", "controls_images_list_sites_checkbox_" + item);
		sites_list_checkbox.setAttribute("title", "Whether to fetch images from " + item);
		sites_list_checkbox.setAttribute("type", "checkbox");
		sites_list_checkbox.setAttribute("name", item);
		if(settings.sites.indexOf(item) >= 0)
			sites_list_checkbox.setAttribute("checked", true);
		sites_list_checkbox.setAttribute("onclick", "interface_refresh()");
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
	var total_seconds = total_images * settings.duration;
	var total_date = new Date(null);
	total_date.setSeconds(total_seconds);
	var total_time = total_date.toISOString().substr(11, 8);
	var label_status =
		"<b>Total images:</b> " + total_images + "<br/>" +
		"<b>Estimated time:</b> " + total_time;

	switch(state) {
		case "busy":
			play.innerHTML = "⧗";
			play.setAttribute("onclick", "interface_load()");
			label.innerHTML = "<b>Loading content</b>";
			document.title = "Slideshow Player";
			break;
		case "reload":
			play.innerHTML = "⟳";
			play.setAttribute("onclick", "interface_load()");
			label.innerHTML = "<b>Click to apply settings</b>";
			document.title = "Slideshow Player";
			break;
		case "none:":
			play.innerHTML = "✖";
			play.removeAttribute("onclick");
			label.innerHTML = "<b>Not enough content to play</b>";
			document.title = "Slideshow Player";
		case "stop":
			play.innerHTML = "■";
			play.setAttribute("onclick", "interface_play()");
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (▶)";
			break;
		case "play":
			play.innerHTML = "▶";
			play.setAttribute("onclick", "interface_play()");
			label.innerHTML = label_status;
			document.title = "Slideshow Player - " + total_images + " images (■)";
			break;
		default:
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
	controls.setAttribute("style", "position: absolute; top: 0%; left: 80%; width: 20%; height: 100%; background-color: #c0c0c0");
	document.body.appendChild(controls);
	{
		// interface HTML: controls, images
		var controls_images = document.createElement("div");
		controls_images.setAttribute("id", "controls_images");
		controls_images.setAttribute("style", "position: absolute; top: 0%; left: 0%; width: 100%; height: 50%; overflow: auto; background-color: #ffffff");
		controls.appendChild(controls_images);
		{
			// interface HTML: media, controls, title
			var controls_images_title = document.createElement("p");
			controls_images_title.setAttribute("style", "text-align: center");
			controls_images_title.innerHTML = "<b>Image settings</b>";
			controls_images.appendChild(controls_images_title);

			// interface HTML: controls, images, settings
			var controls_images_settings = document.createElement("form");
			controls_images_settings.setAttribute("id", "controls_images_settings");
			controls_images.appendChild(controls_images_settings);
			{
				// interface HTML: controls, images, settings, keywords
				var controls_images_settings_keywords = document.createElement("p");
				controls_images_settings_keywords.innerHTML = "Keywords:<br/>";
				controls_images_settings.appendChild(controls_images_settings_keywords);
				{
					// interface HTML: controls, images, settings, keywords, input
					var controls_images_settings_keywords_input = document.createElement("input");
					controls_images_settings_keywords_input.setAttribute("id", "controls_images_settings_keywords");
					controls_images_settings_keywords_input.setAttribute("title", "Images matching those keywords will be used in the slideshow");
					controls_images_settings_keywords_input.setAttribute("type", "text");
					controls_images_settings_keywords_input.setAttribute("value", settings.keywords);
					controls_images_settings_keywords_input.setAttribute("onkeyup", "interface_refresh()");
					controls_images_settings_keywords.appendChild(controls_images_settings_keywords_input);
				}

				// interface HTML: controls, images, settings, count
				var controls_images_settings_count = document.createElement("p");
				controls_images_settings_count.innerHTML = "Count:<br/>";
				controls_images_settings.appendChild(controls_images_settings_count);
				{
					// interface HTML: controls, images, settings, count, input
					var controls_images_settings_count_input = document.createElement("input");
					controls_images_settings_count_input.setAttribute("id", "controls_images_settings_count");
					controls_images_settings_count_input.setAttribute("title", "The total number of images to be used in the slideshow");
					controls_images_settings_count_input.setAttribute("type", "number");
					controls_images_settings_count_input.setAttribute("value", settings.count);
					controls_images_settings_count_input.setAttribute("step", "5");
					controls_images_settings_count_input.setAttribute("min", "5");
					controls_images_settings_count_input.setAttribute("max", "1000");
					controls_images_settings_count_input.setAttribute("onkeyup", "interface_refresh()");
					controls_images_settings_count.appendChild(controls_images_settings_count_input);
				}

				// interface HTML: controls, images, settings, duration
				var controls_images_settings_duration = document.createElement("p");
				controls_images_settings_duration.innerHTML = "Duration:<br/>";
				controls_images_settings.appendChild(controls_images_settings_duration);
				{
					// interface HTML: controls, images, settings, duration, input
					var controls_images_settings_duration_input = document.createElement("input");
					controls_images_settings_duration_input.setAttribute("id", "controls_images_settings_duration");
					controls_images_settings_duration_input.setAttribute("title", "Number of seconds for which to display each image");
					controls_images_settings_duration_input.setAttribute("type", "number");
					controls_images_settings_duration_input.setAttribute("value", settings.duration);
					controls_images_settings_duration_input.setAttribute("step", "1");
					controls_images_settings_duration_input.setAttribute("min", "5");
					controls_images_settings_duration_input.setAttribute("max", "100");
					controls_images_settings_duration_input.setAttribute("onkeyup", "interface_refresh()");
					controls_images_settings_duration.appendChild(controls_images_settings_duration_input);
				}

				// interface HTML: controls, images, settings, shuffle
				var controls_images_settings_shuffle = document.createElement("p");
				controls_images_settings_shuffle.innerHTML = "Shuffle:<br/>";
				controls_images_settings.appendChild(controls_images_settings_shuffle);
				{
					// interface HTML: controls, images, settings, shuffle, input
					var controls_images_settings_shuffle_input = document.createElement("input");
					controls_images_settings_shuffle_input.setAttribute("id", "controls_images_settings_shuffle");
					controls_images_settings_shuffle_input.setAttribute("title", "Whether to shuffle the images before playing");
					controls_images_settings_shuffle_input.setAttribute("type", "checkbox");
					if(settings.shuffle === true)
						controls_images_settings_shuffle_input.setAttribute("checked", true);
					controls_images_settings_shuffle_input.setAttribute("onclick", "interface_refresh()");
					controls_images_settings_shuffle.appendChild(controls_images_settings_shuffle_input);

					// interface HTML: controls, images, settings, shuffle, label
					var controls_images_settings_shuffle_label = document.createElement("label");
					controls_images_settings_shuffle_label.innerHTML = "Enabled<br/>";
					controls_images_settings_shuffle.appendChild(controls_images_settings_shuffle_label);
				}

				// interface HTML: controls, images, sites
				// updated by interface_update_controls_images_sites
				var controls_images_list = document.createElement("form");
				controls_images_list.setAttribute("id", "controls_images_sites");
				controls_images.appendChild(controls_images_list);
			}
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
			media_controls_play.setAttribute("style",
				"position: absolute; margin: 0 0 0 50%; top: 8px; left: -32px; width: 64px; height: 64px; " +
				"border-radius: 100%; border:2px solid black; box-shadow: 0 0 2px #000000; " +
				"text-align: center; line-height: 56px; font-size: 24px; color: #000000"
			);
			media_controls_play.innerHTML = "✖";
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

	interface_refresh();
}
