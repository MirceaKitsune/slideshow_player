// Slideshow Viewer, Plugins, Derpibooru
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://derpibooru.org
// API documentation: https://derpibooru.org/pages/api

// the name string of this plugin
const name_derpibooru = "Derpibooru";

// the number of pages to return
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_derpibooru = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_derpibooru = 50;

// this counter reaches 0 once all pages finished loading
var pages_left_derpibooru = 0;

// the script elements for this plugin
var elements_derpibooru = [];

// convert each entry into an image object for the player
function parse_derpibooru(data) {
	for(var entry in data.search) {
		const this_data = data.search[entry];
		var this_image = {};

		const this_data_url = "https://derpibooru.org/" + this_data.id;
		this_image.src = "https:" + String(this_data.representations.large); // representations.full is better but occasionally causes errors
		this_image.thumb = "https:" + String(this_data.representations.thumb);
		this_image.title = String(this_data.id); // API doesn't provide the title, use the ID instead
		this_image.author = String(this_data.uploader);
		this_image.url = String(this_data_url);
		this_image.score = Number(this_data.score);
		this_image.tags = this_data.tags.split(",");

		// remove spaces from the beginning of tag names
		for(var tag in this_image.tags) {
			if(this_image.tags[tag].substring(0, 1) == " ")
				this_image.tags[tag] = this_image.tags[tag].substring(1);
		}

		images_add(this_image);
	}

	--pages_left_derpibooru;
	if(pages_left_derpibooru <= 0) {
		for(var page = 1; page <= page_count_derpibooru; page++) {
			document.body.removeChild(elements_derpibooru[page]);
			elements_derpibooru[page] = null;
		}

		plugins_busy_set(name_derpibooru, null);
	}
}

// fetch the json object containing the data and execute it as a script
function images_derpibooru() {
	plugins_busy_set(name_derpibooru, 10);

	// since this site doesn't offer builtin JSONP support, use a JSON to JSONP converter from: json2jsonp.com
	const url_prefix = "https://json2jsonp.com/?url=";
	const url_sufix = "&callback=parse_derpibooru";

	var keywords = plugins_settings_read("keywords", TYPE_IMAGES); // load the keywords
	keywords = keywords.replace(" ", ","); // json2jsonp.com returns an error when spaces are included in the URL, convert spaces to commas
	const filter_id = plugins_settings_read("nsfw", TYPE_IMAGES) ? "56027" : "100073"; // pick the appropriate filter from: https://www.derpibooru.org/filters

	for(var page = 1; page <= page_count_derpibooru; page++) {
		elements_derpibooru[page] = document.createElement("script");
		elements_derpibooru[page].type = "text/javascript";
		elements_derpibooru[page].src = url_prefix + encodeURIComponent("https://derpibooru.org/search.json?q=" + keywords + "&page=" + page + "&perpage=" + page_limit_derpibooru + "&filter_id=" + filter_id) + url_sufix;
		document.body.appendChild(elements_derpibooru[page]);
	}

	pages_left_derpibooru = page_count_derpibooru;
}

// register the plugin
plugins_register(name_derpibooru, TYPE_IMAGES, images_derpibooru);
