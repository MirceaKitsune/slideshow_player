// Slideshow Viewer, Plugins, Derpibooru
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://derpibooru.org
// API documentation: https://derpibooru.org/pages/api

// convert each entry into an image object for the player
function parse_derpibooru(data) {
	for(var entry in data.search) {
		var this_data = data.search[entry];
		var this_image = {};

		this_image.image_url = "https:" + this_data.representations.large; // representations.full is better but occasionally causes errors
		this_image.image_thumb = "https:" + this_data.representations.thumb;
		this_image.image_page = this_data.representations.full; // API doesn't provide a page link, use the image instead
		this_image.author_name = this_data.uploader;
		this_image.author_thumb = "";
		this_image.author_page = "";

		images_add(this_image);
	}

	plugins_busy_set("Derpibooru", false);
}

// fetch the json object containing the data and execute it as a script
function images_derpibooru() {
	// since this site doesn't offer builtin JSONP support, use a JSON to JSONP converter from: json2jsonp.com
	var url_prefix = "https://json2jsonp.com/?url=";
	var url_sufix = "&callback=parse_derpibooru";

	var keywords = plugins_settings_images_read("keywords"); // load the keywords
	var count = Math.min(plugins_settings_images_read("count"), 50); // this site supports a maximum of 50 results per page
	var filter_id = plugins_settings_images_read("nsfw") ? "56027" : "100073"; // pick the appropriate filter from: https://www.derpibooru.org/filters

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url_prefix + encodeURIComponent("https://derpibooru.org/search.json?q=" + keywords + "&perpage=" + count + "&filter_id=" + filter_id) + url_sufix;
	document.body.appendChild(script);

	plugins_busy_set("Derpibooru", true);
}

// register the plugin
plugins_register("Derpibooru", images_derpibooru);
