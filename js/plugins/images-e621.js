// Slideshow Viewer, Plugins, e621
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://e621.net
// API documentation: https://e621.net/help/show/api

// the name string of this plugin
const name_e621 = "e621";

// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_e621 = 10;
// this should represent the maximum number of results the API may return per page
const page_limit_e621 = 320;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_e621 = 0.1;

// the active and maximum number of pages currently in use
var pages_e621 = 0;
var pages_total_e621 = 0;

// the script elements for this plugin
var elements_e621 = [];

// convert each entry into an image object for the player
function parse_e621(data) {
	for(var entry in data) {
		const this_data = data[entry];
		var this_image = {};

		const this_data_url = "https://e621.net/post/show/" + this_data.id;
		this_image.src = String(this_data.file_url);
		this_image.thumb = String(this_data.preview_url);
		this_image.title = String(this_data.id); // API doesn't provide the title, use the ID instead
		this_image.author = String(this_data.artist[0]);
		this_image.url = String(this_data.source || this_data_url); // prefer the source URL, fallback to submission URL
		this_image.score = Number(this_data.score);
		this_image.tags = this_data.tags.split(" ");

		images_add(this_image);
	}

	--pages_e621;
	if(pages_e621 <= 0) {
		for(var page = 1; page <= pages_total_e621; page++) {
			if(document.body.contains(elements_e621[page])) {
				document.body.removeChild(elements_e621[page]);
				elements_e621[page] = null;
			}
		}

		pages_e621 = 0;
		pages_total_e621 = 0;
		plugins_busy_set(name_e621, null);
	}
}

// fetch the json object containing the data and execute it as a script
function images_e621() {
	plugins_busy_set(name_e621, 30);

	const domain = plugins_settings_read("nsfw", TYPE_IMAGES) ? "e621" : "e926"; // e926 is the SFW version of e621
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);

	pages_e621 = 0;
	pages_total_e621 = Math.max(Math.floor(page_count_e621 / keywords_all.length), 1);
	for(var item in keywords_all) {
		for(var page = 1; page <= pages_total_e621; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				elements_e621[page] = document.createElement("script");
				elements_e621[page].type = "text/javascript";
				elements_e621[page].src = "https://" + domain + ".net/post/index.json?tags=" + this_keywords + "&page=" + this_page + "&limit=" + page_limit_e621 + "&callback=parse_e621";
				document.body.appendChild(elements_e621[page]);
			}, (pages_e621 * delay_e621) * 1000);
			++pages_e621;
		}
	}
}

// register the plugin
plugins_register(name_e621, TYPE_IMAGES, images_e621);
