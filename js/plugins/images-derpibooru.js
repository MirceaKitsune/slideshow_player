// Slideshow Viewer, Plugins, Derpibooru
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://derpibooru.org
// API documentation: https://derpibooru.org/pages/api

// the name string of this plugin
const name_derpibooru = "Derpibooru";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_derpibooru = 50;
// this should represent the maximum number of results the API may return per page
const page_limit_derpibooru = 50;
// number of seconds to wait for a response from the server before the plugin times out
const timeout_derpibooru = 5;

// the keywords and page currently in use
var active_keywords_derpibooru = 0;
var active_page_derpibooru = 0;

// convert each entry into an image object for the player
function parse_derpibooru(data) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_derpibooru))
		return;

	const items = data.search;
	for(var entry in items) {
		const this_data = items[entry];
		var this_image = {};

		const this_data_url = "https://derpibooru.org/" + this_data.id;
		this_image.src = "https:" + String(this_data.representations.large); // representations.full is better but occasionally causes errors
		this_image.thumb = "https:" + String(this_data.representations.thumb);
		this_image.title = String(this_data.id); // API doesn't provide the title, use the ID instead
		this_image.author = String(this_data.uploader);
		this_image.url = String(this_data_url);
		this_image.score = Number(this_data.score);
		this_image.tags = this_data.tags ? this_data.tags.split(/[\s,]+/) : [];

		images_add(this_image);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = typeof items !== "object" || items.length < page_limit_derpibooru;
	request_derpibooru(bump);
}

// request the json object from the website
function request_derpibooru(bump) {
	const filter_id = plugins_settings_read("nsfw", TYPE_IMAGES) ? "56027" : "100073"; // pick the appropriate filter from: https://www.derpibooru.org/filters

	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_derpibooru > Math.floor(page_count_derpibooru / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_derpibooru;
		active_page_derpibooru = 1;
		if(active_keywords_derpibooru > keywords_all.length) {
			plugins_busy_set(name_derpibooru, null);
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_derpibooru - 1];

	plugins_get("https://derpibooru.org/search.json?q=" + keywords_current + "&page=" + active_page_derpibooru + "&perpage=" + page_limit_derpibooru + "&filter_id=" + filter_id, "parse_derpibooru", null);
	++active_page_derpibooru;

	// we made a new request to the server, reset the timeout in which we wait for the response
	plugins_busy_set(name_derpibooru, timeout_derpibooru);
}

// fetch the json object containing the data and execute it as a script
function images_derpibooru() {
	active_keywords_derpibooru = 1;
	active_page_derpibooru = 1;
	request_derpibooru(false);
}

// register the plugin
plugins_register(name_derpibooru, TYPE_IMAGES, "https://derpibooru.org", images_derpibooru);
