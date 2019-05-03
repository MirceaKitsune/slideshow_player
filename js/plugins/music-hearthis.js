// Slideshow Viewer, Plugins, HearThis
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://hearthis.at
// API documentation: https://hearthis.at/api-v2

// the name string of this plugin
const name_hearthis = "HearThis";

// the number of pages to return per keyword pair
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_hearthis = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_hearthis = 20;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_hearthis = 0.5;

// this counter reaches 0 once all pages finished loading
var pages_hearthis = 0;

// the script elements for this plugin
var elements_hearthis = [];

// convert each entry into a music object for the player
function parse_hearthis(data) {
	for(var entry in data) {
		const this_data = data[entry];
		var this_song = {};

		this_song.src = String(this_data.download_url);
		this_song.thumb = String(this_data.thumb);
		this_song.title = String(this_data.title);
		this_song.author = String(this_data.user.username);
		this_song.url = String(this_data.permalink_url);
		this_song.score = Number(this_data.playback_count);
		this_song.tags = [this_data.genre];

		music_add(this_song);
	}

	--pages_hearthis;
	if(pages_hearthis <= 0) {
		for(var page = 1; page <= page_count_hearthis; page++) {
			if(document.body.contains(elements_hearthis[page])) {
				document.body.removeChild(elements_hearthis[page]);
				elements_hearthis[page] = null;
			}
		}

		plugins_busy_set(name_hearthis, null);
	}
}

// fetch the json object containing the data and execute it as a script
function music_hearthis() {
	plugins_busy_set(name_hearthis, 10); // this site returns an invalid object if the given keywords are not found, use a low timeout

	const keywords = plugins_settings_read("keywords", TYPE_MUSIC);
	const keywords_all = parse_keywords(keywords.split(",")[0].split(".")[0]); // only one word is supported for this API

	pages_hearthis = 0;
	for(var item in keywords_all) {
		for(var page = 1; page <= page_count_hearthis; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				elements_hearthis[page] = document.createElement("script");
				elements_hearthis[page].type = "text/javascript";
				elements_hearthis[page].src = parse_jsonp("https://api-v2.hearthis.at/categories/" + this_keywords + "/?page=" + this_page + "&count=" + page_limit_hearthis, "parse_hearthis");
				document.body.appendChild(elements_hearthis[page]);
			}, (pages_hearthis * delay_hearthis) * 1000);
			++pages_hearthis;
		}
	}
}

// register the plugin
plugins_register(name_hearthis, TYPE_MUSIC, music_hearthis);
