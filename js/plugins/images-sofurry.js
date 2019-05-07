// Slideshow Viewer, Plugins, SoFurry
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://sofurry.com
// API documentation: https://wiki.sofurry.com/wiki/SoFurry_2.0_API

// the name string of this plugin
const name_sofurry = "SoFurry";

// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_sofurry = 10;
// this should represent the maximum number of results the API may return per page
const page_limit_sofurry = 100;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_sofurry = 0.1;

// the active and maximum number of pages currently in use
var pages_sofurry = 0;

// convert each entry into an image object for the player
function parse_sofurry(data) {
	for(var entry in data.data.entries) {
		const this_data = data.data.entries[entry];
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

	--pages_sofurry;
	if(pages_sofurry <= 0)
		plugins_busy_set(name_sofurry, null);
}

// fetch the json object containing the data and execute it as a script
function images_sofurry() {
	plugins_busy_set(name_sofurry, 30);

	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "2" : "0";
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const type = "artwork";
	const order = "popularity";

	pages_sofurry = 0;
	const pages = Math.max(Math.floor(page_count_sofurry / keywords_all.length), 1);
	for(var item in keywords_all) {
		for(var page = 1; page <= pages; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				plugins_get("https://api2.sofurry.com/browse/search?format=json&search=" + this_keywords + "&filter=" + type + "&sort=" + order + "&page=" + this_page + "&maxlevel=" + nsfw, "parse_sofurry", true);
			}, (pages_sofurry * delay_sofurry) * 1000);
			++pages_sofurry;
		}
	}
}

// register the plugin
plugins_register(name_sofurry, TYPE_IMAGES, "https://sofurry.com", images_sofurry);
