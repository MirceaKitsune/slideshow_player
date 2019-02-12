// Slideshow Viewer, Plugins, e621
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://e621.net
// API documentation: https://e621.net/help/show/api

// the name string of this plugin
const name_e621 = "e621";

// the number of pages to return
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_e621 = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_e621 = 320;

// this counter reaches 0 once all pages finished loading
var pages_left_e621 = 0;

// convert each entry into an image object for the player
function parse_e621(data) {
	for(var entry in data) {
		const this_data = data[entry];
		var this_image = {};

		this_image.src = String(this_data.file_url);
		this_image.thumb = String(this_data.preview_url);
		this_image.title = String(this_data.source); // API doesn't provide the title, use the file name instead
		this_image.author = String(this_data.artist);
		this_image.url = String(this_data.source);
		this_image.score = Number(this_data.score);

		images_add(this_image);
	}

	--pages_left_e621;
	if(pages_left_e621 <= 0)
		plugins_busy_set(name_e621, TYPE_IMAGES, 0);
}

// fetch the json object containing the data and execute it as a script
function images_e621() {
	const domain = plugins_settings_read("nsfw", TYPE_IMAGES) === true ? "e621" : "e926"; // e926 is the SFW version of e621
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);

	for(var page = 1; page <= page_count_e621; page++) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://" + domain + ".net/post/index.json?tags=" + keywords + "&page=" + page + "&limit=" + page_limit_e621 + "&callback=parse_e621";
		document.body.appendChild(script);
	}

	pages_left_e621 = page_count_e621;
	plugins_busy_set(name_e621, TYPE_IMAGES, 10);
}

// register the plugin
plugins_register(name_e621, TYPE_IMAGES, images_e621);
