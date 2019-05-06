// Slideshow Viewer, Plugins, SoFurry
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://sofurry.net
// API documentation: https://wiki.sofurry.com/wiki/SoFurry_2.0_API

// the name string of this plugin
const name_sofurry = "SoFurry";

// the number of pages to return per keyword pair
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_sofurry = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_sofurry = 100;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_sofurry = 0.5;

// this counter reaches 0 once all pages finished loading
var pages_sofurry = 0;

// the script elements for this plugin
var elements_sofurry = [];

// convert each entry into an image object for the player
function parse_sofurry(data) {
	const entries = data.data.entries.slice(0, plugins_settings_read("count", TYPE_IMAGES));
	for(var entry in entries) {
		const this_data = entries[entry];
		var this_image = {};

		const this_data_url = "https://www.sofurry.com/view/" + this_data.id;
		this_image.src = String(this_data.full) + "/";
		this_image.thumb = String(this_data.thumbnail) + "/";
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.artistName);
		this_image.url = String(this_data_url);
		this_image.score = 0; // API doesn't provide a score
		this_image.tags = this_data.tags.split(/[\s,]+/);

		images_add(this_image);
	}

	--pages_sofurry;
	if(pages_sofurry <= 0) {
		for(var page = 1; page <= page_count_sofurry; page++) {
			if(document.body.contains(elements_sofurry[page])) {
				document.body.removeChild(elements_sofurry[page]);
				elements_sofurry[page] = null;
			}
		}

		plugins_busy_set(name_sofurry, null);
	}
}

// fetch the json object containing the data and execute it as a script
function images_sofurry() {
	plugins_busy_set(name_sofurry, 30);

	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "2" : "0";
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const type = "artwork";

	pages_sofurry = 0;
	for(var item in keywords_all) {
		for(var page = 1; page <= page_count_sofurry; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				elements_sofurry[page] = document.createElement("script");
				elements_sofurry[page].type = "text/javascript";
				elements_sofurry[page].src = parse_jsonp("https://api2.sofurry.com/browse/search?format=json&search=" + this_keywords + "&filter=" + type + "&page=" + this_page + "&maxlevel=" + nsfw, "parse_sofurry");
				document.body.appendChild(elements_sofurry[page]);
			}, (pages_sofurry * delay_sofurry) * 1000);
			++pages_sofurry;
		}
	}
}

// register the plugin
plugins_register(name_sofurry, TYPE_IMAGES, images_sofurry);
