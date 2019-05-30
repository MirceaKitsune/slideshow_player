// Slideshow Viewer, Plugins, CCMixter
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://ccmixter.org
// API documentation: http://ccmixter.org/query-api

// the name string of this plugin
const name_ccmixter = "CCMixter";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_ccmixter = 30;
// this should represent the maximum number of results the API may return per page
const page_limit_ccmixter = 30;
// number of seconds after which the plugin stops listening for responses and is no longer marked as busy
const timeout_ccmixter = 10; // this site returns an invalid object if the given keywords are not found, use a low timeout

// the keywords and page currently in use
var active_keywords_ccmixter = 0;
var active_page_ccmixter = 0;

// convert each entry into a music object for the player
function parse_ccmixter(data) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_ccmixter))
		return;

	const items = data;
	for(var entry in items) {
		const this_data = items[entry];
		var this_song = {};

		this_song.src = String(this_data.files[0].download_url);
		this_song.thumb = String(this_data.license_logo_url); // API doesn't provide a thumbnail, use the logo instead
		this_song.title = String(this_data.upload_name);
		this_song.author = String(this_data.user_real_name);
		this_song.url = String(this_data.file_page_url);
		this_song.score = Number(this_data.upload_num_scores);
		this_song.tags = this_data.upload_tags ? this_data.upload_tags.split(",") : [];

		music_add(this_song);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = typeof items !== "object" || items.length < page_limit_ccmixter;
	request_ccmixter(bump);
}

// request the json object from the website
function request_ccmixter(bump) {
	const order = "score";

	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	const keywords = plugins_settings_read("keywords", TYPE_MUSIC);
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_ccmixter > Math.floor(page_count_ccmixter / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_ccmixter;
		active_page_ccmixter = 1;
		if(active_keywords_ccmixter > keywords_all.length) {
			plugins_busy_set(name_ccmixter, null);
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_ccmixter - 1];

	plugins_get("http://ccmixter.org/api/query?f=json&tags=" + keywords_current + "&sort=" + order + "&offset=" + active_page_ccmixter + "&limit=" + page_limit_ccmixter, "parse_ccmixter", null);
	++active_page_ccmixter;
}

// fetch the json object containing the data and execute it as a script
function music_ccmixter() {
	plugins_busy_set(name_ccmixter, timeout_ccmixter); // this site returns an invalid object if the given keywords are not found, use a low timeout

	active_keywords_ccmixter = 1;
	active_page_ccmixter = 1;
	request_ccmixter(false);
}

// register the plugin
plugins_register(name_ccmixter, TYPE_MUSIC, "http://ccmixter.org", music_ccmixter);
