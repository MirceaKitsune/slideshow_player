// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://wiki.inkbunny.net/wiki/API

// the name string of this plugin
const name_inkbunny = "Inkbunny";

// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_inkbunny = 10;
// this should represent the maximum number of results the API may return per page
const page_limit_inkbunny = 100;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_inkbunny = 0.1;

// the active and maximum number of pages currently in use
var pages_inkbunny = 0;

// indicate that the plugin has finished working
function parse_inkbunny_ready(data) {
	plugins_busy_set(name_inkbunny, null);
}

// close the temporary guest session
function parse_inkbunny_logout(data) {
	plugins_get("https://inkbunny.net/api_logout.php?output_mode=json&sid=" + data.sid, "parse_inkbunny_ready", false);
}

// convert each entry into an image object for the player
function parse_inkbunny(data) {
	for(var entry in data.submissions) {
		const this_data = data.submissions[entry];
		var this_image = {};

		const this_data_url = "https://inkbunny.net/s/" + this_data.submission_id;
		this_image.src = String(this_data.file_url_full);
		this_image.thumb = String(this_data.thumbnail_url_huge || this_data.file_url_preview); // some entries don't provide a thumbnail, use the file preview if so
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.username);
		this_image.url = String(this_data_url);
		this_image.score = 0; // API doesn't provide a score
		this_image.tags = []; // API doesn't provide tags

		images_add(this_image);
	}

	--pages_inkbunny;
	if(pages_inkbunny <= 0)
		parse_inkbunny_logout(data);
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const type = "1,2,3,4,5,6";

	pages_inkbunny = 0;
	const pages = Math.max(Math.floor(page_count_inkbunny / keywords_all.length), 1);
	for(var item in keywords_all) {
		for(var page = 1; page <= pages; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				plugins_get("https://inkbunny.net/api_search.php?output_mode=json&sid=" + data.sid + "&type=" + type + "&text=" + this_keywords + "&page=" + this_page + "&submissions_per_page=" + page_limit_inkbunny, "parse_inkbunny", false);
			}, (pages_inkbunny * delay_inkbunny) * 1000);
			++pages_inkbunny;
		}
	}
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "yes" : "no";

	plugins_get("https://inkbunny.net/api_userrating.php?output_mode=json&sid=" + data.sid + "&tag[2]=" + nsfw + "&tag[3]=" + nsfw + "&tag[4]=" + nsfw + "&tag[5]=" + nsfw, "parse_inkbunny_rating", false);
}

// fetch the json object containing the data and execute it as a script
function images_inkbunny() {
	plugins_busy_set(name_inkbunny, 30);

	plugins_get("https://inkbunny.net/api_login.php?output_mode=json&username=guest", "parse_inkbunny_login", false);
}

// register the plugin
plugins_register(name_inkbunny, TYPE_IMAGES, images_inkbunny);
