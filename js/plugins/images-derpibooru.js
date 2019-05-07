// Slideshow Viewer, Plugins, Derpibooru
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://derpibooru.org
// API documentation: https://derpibooru.org/pages/api

// the name string of this plugin
const name_derpibooru = "Derpibooru";

// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_derpibooru = 10;
// this should represent the maximum number of results the API may return per page
const page_limit_derpibooru = 50;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_derpibooru = 0.1;

// the active and maximum number of pages currently in use
var pages_derpibooru = 0;

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
		this_image.tags = this_data.tags.split(/[\s,]+/);

		images_add(this_image);
	}

	--pages_derpibooru;
	if(pages_derpibooru <= 0)
		plugins_busy_set(name_derpibooru, null);
}

// fetch the json object containing the data and execute it as a script
function images_derpibooru() {
	plugins_busy_set(name_derpibooru, 30);

	const filter_id = plugins_settings_read("nsfw", TYPE_IMAGES) ? "56027" : "100073"; // pick the appropriate filter from: https://www.derpibooru.org/filters
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);

	pages_derpibooru = 0;
	const pages = Math.max(Math.floor(page_count_derpibooru / keywords_all.length), 1);
	for(var item in keywords_all) {
		for(var page = 1; page <= pages; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				plugins_get("https://derpibooru.org/search.json?q=" + this_keywords + "&page=" + this_page + "&perpage=" + page_limit_derpibooru + "&filter_id=" + filter_id, "parse_derpibooru", null);
			}, (pages_derpibooru * delay_derpibooru) * 1000);
			++pages_derpibooru;
		}
	}
}

// register the plugin
plugins_register(name_derpibooru, TYPE_IMAGES, images_derpibooru);
