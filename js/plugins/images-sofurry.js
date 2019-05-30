// Slideshow Viewer, Plugins, SoFurry
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://sofurry.com
// API documentation: https://wiki.sofurry.com/wiki/SoFurry_2.0_API

// the name string of this plugin
const name_sofurry = "SoFurry";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_sofurry = 30;
// this should represent the maximum number of results the API may return per page
const page_limit_sofurry = 30;
// number of seconds after which the plugin stops listening for responses and is no longer marked as busy
const timeout_sofurry = 30;

// the keywords and page currently in use
var active_keywords_sofurry = 0;
var active_page_sofurry = 0;

// convert each entry into an image object for the player
function parse_sofurry(data) {
	const items = data.data.entries;
	for(var entry in items) {
		const this_data = items[entry];
		var this_image = {};

		const this_data_url = "https://www.sofurry.com/view/" + this_data.id;
		this_image.src = String(this_data.full) + "/";
		this_image.thumb = String(this_data.thumbnail) + "/";
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.artistName);
		this_image.url = String(this_data_url);
		this_image.score = 10; // API doesn't provide a score, assume a below average default compared to plugins that do
		this_image.tags = this_data.tags.split(/[\s,]+/);

		images_add(this_image);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = items.length < page_limit_sofurry;
	request_sofurry(bump);
}

// request the json object from the website
function request_sofurry(bump) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_sofurry))
		return;

	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "2" : "0";
	const type = "artwork";
	const order = "popularity";

	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_sofurry > Math.floor(page_count_sofurry / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_sofurry;
		active_page_sofurry = 1;
		if(active_keywords_sofurry > keywords_all.length) {
			plugins_busy_set(name_sofurry, null);
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_sofurry - 1];

	plugins_get("https://api2.sofurry.com/browse/search?format=json&search=" + keywords_current + "&filter=" + type + "&sort=" + order + "&page=" + active_page_sofurry + "&maxlevel=" + nsfw, "parse_sofurry", true);
	++active_page_sofurry;
}

// fetch the json object containing the data and execute it as a script
function images_sofurry() {
	plugins_busy_set(name_sofurry, timeout_sofurry);

	active_keywords_sofurry = 1;
	active_page_sofurry = 1;
	request_sofurry(false);
}

// register the plugin
plugins_register(name_sofurry, TYPE_IMAGES, "https://sofurry.com", images_sofurry);
