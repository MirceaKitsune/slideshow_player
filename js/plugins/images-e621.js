// Slideshow Viewer, Plugins, e621
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://e621.net
// API documentation: https://e621.net/help/show/api

// the name string of this plugin
const name_e621 = "e621";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_e621 = 60;
// this should represent the maximum number of results the API may return per page
const page_limit_e621 = 320;
// number of seconds to wait for a response from the server before the plugin times out
const timeout_e621 = 10;
// the score multiplier for this source
// this value must be balanced between plugins, so that the score of an average submission is maintained at roughly 100
// if the API doesn't provide a score per submission, this value should be estimated at a bit below average
const score_e621 = 5;

// the keywords and page currently in use
var active_keywords_e621 = 0;
var active_page_e621 = 0;

// convert each entry into an image object for the player
function parse_e621(data) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_e621))
		return;

	const items = data.posts;
	for(var entry in items) {
		const this_data = items[entry];
		var this_image = {};

		if(this_data === null || this_data === undefined || typeof this_data !== "object")
			continue;

		const this_data_url = "https://e621.net/post/show/" + this_data.id;
		this_image.src = String(this_data.file.url);
		this_image.thumb = String(this_data.preview.url);
		this_image.title = String(this_data.id); // API doesn't provide the title, use the ID instead
		this_image.author = String(this_data.tags.artist[0]);
		this_image.url = String(this_data.sources[0] || this_data_url); // prefer the source URL, fallback to submission URL
		this_image.score = Number(this_data.score.total) * score_e621;
		this_image.tags = this_data.tags.general;

		images_add(this_image);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = typeof items !== "object" || items.length < page_limit_e621;
	request_e621(bump);
}

// request the json object from the website
function request_e621(bump) {
	const domain = plugins_settings_read("nsfw", TYPE_IMAGES) ? "e621" : "e926"; // e926 is the SFW version of e621

	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	// due to the search system of this API "," must be converted to " "
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES).replace(/,/g, encodeURIComponent(" "));
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_e621 > Math.floor(page_count_e621 / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_e621;
		active_page_e621 = 1;
		if(active_keywords_e621 > keywords_all.length) {
			plugins_busy_set(name_e621, null);
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_e621 - 1];

	plugins_get("https://" + domain + ".net/posts.json?tags=" + keywords_current + "&page=" + active_page_e621 + "&limit=" + page_limit_e621, "parse_e621", null);
	++active_page_e621;

	// we made a new request to the server, reset the timeout in which we wait for the response
	plugins_busy_set(name_e621, timeout_e621);
	plugins_update(TYPE_IMAGES);
}

// fetch the json object containing the data and execute it as a script
function images_e621() {
	active_keywords_e621 = 1;
	active_page_e621 = 1;
	request_e621(false);
}

// register the plugin
plugins_register(name_e621, TYPE_IMAGES, "https://e621.net", images_e621);
