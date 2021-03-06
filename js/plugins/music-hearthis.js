// Slideshow Viewer, Plugins, HearThis
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://hearthis.at
// API documentation: https://hearthis.at/api-v2

// the name string of this plugin
const name_hearthis = "HearThis";
// the maximum number of total pages to return, adjusted to fit the number of keyword pairs
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_hearthis = 60;
// this should represent the maximum number of results the API may return per page
const page_limit_hearthis = 20;
// number of seconds to wait for a response from the server before the plugin times out
const timeout_hearthis = 10;
// the score multiplier for this source
// this value must be balanced between plugins, so that the score of an average submission is maintained at roughly 100
// if the API doesn't provide a score per submission, this value should be estimated at a bit below average
const score_hearthis = 5;

// the keywords and page currently in use
var active_keywords_hearthis = 0;
var active_page_hearthis = 0;

// convert each entry into a music object for the player
function parse_hearthis(data) {
	// stop here if the plugin is no longer working
	if(!plugins_busy_get(name_hearthis))
		return;

	const items = data;
	for(var entry in items) {
		const this_data = items[entry];
		var this_song = {};

		if(this_data === null || this_data === undefined || typeof this_data !== "object")
			continue;

		this_song.src = String(this_data.stream_url) + "/";
		this_song.thumb = String(this_data.thumb);
		this_song.title = String(this_data.title);
		this_song.author = this_data.user ? String(this_data.user.username) : "Unknown";
		this_song.url = String(this_data.permalink_url);
		this_song.score = Number(this_data.playback_count) * score_hearthis;
		this_song.tags = [this_data.genre];

		music_add(this_song);
	}

	// request the next page from the server
	// if this page returned less items than the maximum amount, that means it was the last page, request the next keyword pair
	const bump = typeof items !== "object" || items.length < page_limit_hearthis;
	request_hearthis(bump);
}

// request the json object from the website
function request_hearthis(bump) {
	// if we reached the maximum number of pages per keyword pair, fetch the next keyword pair
	// in case this is the last keyword pair, stop making requests here
	const keywords = plugins_settings_read("keywords", TYPE_MUSIC);
	const keywords_all = parse_keywords(keywords);
	const keywords_bump = bump || (active_page_hearthis > Math.floor(page_count_hearthis / keywords_all.length));
	if(keywords_bump) {
		++active_keywords_hearthis;
		active_page_hearthis = 1;
		if(active_keywords_hearthis > keywords_all.length) {
			plugins_busy_set(name_hearthis, null);
			return;
		}
	}
	const keywords_current = keywords_all[active_keywords_hearthis - 1];

	plugins_get("https://api-v2.hearthis.at/categories/" + keywords_current + "/?page=" + active_page_hearthis + "&count=" + page_limit_hearthis, "parse_hearthis", null);
	++active_page_hearthis;

	// we made a new request to the server, reset the timeout in which we wait for the response
	plugins_busy_set(name_hearthis, timeout_hearthis);
	plugins_update(TYPE_MUSIC);
}

// fetch the json object containing the data and execute it as a script
function music_hearthis() {
	active_keywords_hearthis = 1;
	active_page_hearthis = 1;
	request_hearthis(false);
}

// register the plugin
plugins_register(name_hearthis, TYPE_MUSIC, "http://hearthis.at", music_hearthis);
