// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://wiki.inkbunny.net/wiki/API

// the name string of this plugin
const name_inkbunny = "Inkbunny";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_inkbunny = 30;
// this should represent the maximum number of results the API may return per page
const page_limit_inkbunny = 100;
// number of seconds after which the plugin stops listening for responses and is no longer marked as busy
const timeout_inkbunny = 60;

// the keywords and page currently in use
// this site also requires a SID
var active_keywords_inkbunny = 0;
var active_page_inkbunny = 0;
var sid_inkbunny = null;

// indicate that the plugin has finished working
function parse_inkbunny_ready() {
	sid_inkbunny = null;
	plugins_busy_set(name_inkbunny, null);
}

// close the temporary guest session
function parse_inkbunny_logout() {
	plugins_get("https://inkbunny.net/api_logout.php?output_mode=json&sid=" + sid_inkbunny, "parse_inkbunny_ready", false);
}

// convert each entry into an image object for the player
function parse_inkbunny(data) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_inkbunny))
		return;

	const items = data.submissions;
	for(var entry in items) {
		const this_data = items[entry];
		var this_image = {};

		const this_data_url = "https://inkbunny.net/s/" + this_data.submission_id;
		this_image.src = String(this_data.file_url_full);
		this_image.thumb = String(this_data.thumbnail_url_huge || this_data.file_url_preview); // some entries don't provide a thumbnail, use the file preview if so
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.username);
		this_image.url = String(this_data_url);
		this_image.score = 10; // API doesn't provide a score, assume a below average default compared to plugins that do
		this_image.tags = []; // API doesn't provide tags

		images_add(this_image);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = typeof items !== "object" || items.length < page_limit_inkbunny;
	request_inkbunny(bump);
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	active_page_inkbunny = 1;
	active_keywords_inkbunny = 1;

	request_inkbunny(false);
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "yes" : "no";

	sid_inkbunny = data.sid;
	plugins_get("https://inkbunny.net/api_userrating.php?output_mode=json&sid=" + sid_inkbunny + "&tag[2]=" + nsfw + "&tag[3]=" + nsfw + "&tag[4]=" + nsfw + "&tag[5]=" + nsfw, "parse_inkbunny_rating", false);
}

// request the json object from the website
function request_inkbunny(bump) {
	const type = "1,2,3,4,5,6";
	const order = "views";

	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_inkbunny > Math.floor(page_count_inkbunny / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_inkbunny;
		active_page_inkbunny = 1;
		if(active_keywords_inkbunny > keywords_all.length) {
			parse_inkbunny_logout();
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_inkbunny - 1];

	plugins_get("https://inkbunny.net/api_search.php?output_mode=json&sid=" + sid_inkbunny + "&type=" + type + "&orderby=" + order + "&text=" + keywords_current + "&page=" + active_page_inkbunny + "&submissions_per_page=" + page_limit_inkbunny, "parse_inkbunny", false);
	++active_page_inkbunny;
}

// fetch the json object containing the data and execute it as a script
function images_inkbunny() {
	plugins_busy_set(name_inkbunny, timeout_inkbunny);

	sid_inkbunny = null;
	plugins_get("https://inkbunny.net/api_login.php?output_mode=json&username=guest", "parse_inkbunny_login", false);
}

// register the plugin
plugins_register(name_inkbunny, TYPE_IMAGES, "https://inkbunny.net", images_inkbunny);
