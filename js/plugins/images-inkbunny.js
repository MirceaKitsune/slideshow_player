// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://wiki.inkbunny.net/wiki/API

// the name string of this plugin
const name_inkbunny = "Inkbunny";

// the number of pages to return per keyword pair
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_inkbunny = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_inkbunny = 100;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_inkbunny = 0.5;

// this counter reaches 0 once all pages finished loading
var pages_inkbunny = 0;

// the script elements for this plugin
var element_login_inkbunny = null;
var element_logout_inkbunny = null;
var element_rating_inkbunny = null;
var elements_inkbunny = [];

// indicate that the plugin has finished working
function parse_inkbunny_ready(data) {
	document.body.removeChild(element_logout_inkbunny);
	element_logout_inkbunny = null;

	plugins_busy_set(name_inkbunny, null);
}

// close the temporary guest session
function parse_inkbunny_logout(data) {
	element_logout_inkbunny = document.createElement("script");
	element_logout_inkbunny.type = "text/javascript";
	element_logout_inkbunny.src = "https://inkbunny.net/api_logout.php?output_mode=json&sid=" + data.sid + "&callback=parse_inkbunny_ready";
	document.body.appendChild(element_logout_inkbunny);
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
	if(pages_inkbunny <= 0) {
		parse_inkbunny_logout(data);

		for(var page = 1; page <= page_count_inkbunny; page++) {
			if(document.body.contains(elements_inkbunny[page])) {
				document.body.removeChild(elements_inkbunny[page]);
				elements_inkbunny[page] = null;
			}
		}
	}
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);
	const keywords_all = parse_keywords(keywords);
	const type = "1,2,3,4,5,6";

	pages_inkbunny = 0;
	for(var item in keywords_all) {
		for(var page = 1; page <= page_count_inkbunny; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				elements_inkbunny[page] = document.createElement("script");
				elements_inkbunny[page].type = "text/javascript";
				elements_inkbunny[page].src = "https://inkbunny.net/api_search.php?output_mode=json&sid=" + data.sid + "&type=" + type + "&text=" + this_keywords + "&page=" + this_page + "&submissions_per_page=" + page_limit_inkbunny + "&callback=parse_inkbunny";
				document.body.appendChild(elements_inkbunny[page]);
			}, (pages_inkbunny * delay_inkbunny) * 1000);
			++pages_inkbunny;
		}
	}

	document.body.removeChild(element_rating_inkbunny);
	element_rating_inkbunny = null;
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) ? "yes" : "no";

	element_rating_inkbunny = document.createElement("script");
	element_rating_inkbunny.type = "text/javascript";
	element_rating_inkbunny.src = "https://inkbunny.net/api_userrating.php?output_mode=json&sid=" + data.sid + "&tag[2]=" + nsfw + "&tag[3]=" + nsfw + "&tag[4]=" + nsfw + "&tag[5]=" + nsfw + "&callback=parse_inkbunny_rating";
	document.body.appendChild(element_rating_inkbunny);

	document.body.removeChild(element_login_inkbunny);
	element_login_inkbunny = null;
}

// fetch the json object containing the data and execute it as a script
function images_inkbunny() {
	plugins_busy_set(name_inkbunny, 30);

	element_login_inkbunny = document.createElement("script");
	element_login_inkbunny.src = "https://inkbunny.net/api_login.php?output_mode=json&username=guest&callback=parse_inkbunny_login";
	document.body.appendChild(element_login_inkbunny);
}

// register the plugin
plugins_register(name_inkbunny, TYPE_IMAGES, images_inkbunny);
