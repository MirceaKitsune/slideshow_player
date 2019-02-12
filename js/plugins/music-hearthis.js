// Slideshow Viewer, Plugins, HearThis
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://hearthis.at
// API documentation: https://hearthis.at/api-v2

// the name string of this plugin
const name_hearthis = "HearThis";

// the number of pages to return
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_hearthis = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_hearthis = 20;

// this counter reaches 0 once all pages finished loading
var pages_left_hearthis = 0;

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

		music_add(this_song);
	}

	--pages_left_hearthis;
	if(pages_left_hearthis <= 0)
		plugins_busy_set(name_hearthis, TYPE_MUSIC, 0);
}

// fetch the json object containing the data and execute it as a script
function music_hearthis() {
	// since this site doesn't offer builtin JSONP support, use a JSON to JSONP converter from: json2jsonp.com
	const url_prefix = "https://json2jsonp.com/?url=";
	const url_sufix = "&callback=parse_hearthis";

	var keywords = plugins_settings_read("keywords", TYPE_MUSIC); // load the keywords
	keywords = keywords.replace(" ", ","); // json2jsonp.com returns an error when spaces are included in the URL, convert spaces to commas

	for(var page = 1; page <= page_count_hearthis; page++) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = url_prefix + encodeURIComponent("http://api-v2.hearthis.at/categories/" + keywords + "/?page=" + page + "&count=" + page_limit_hearthis) + url_sufix;
		document.body.appendChild(script);
	}

	pages_left_hearthis = page_count_hearthis;
	plugins_busy_set(name_hearthis, TYPE_MUSIC, 10); // this site returns an invalid object if the given keywords are not found, use a low timeout
}

// register the plugin
plugins_register(name_hearthis, TYPE_MUSIC, music_hearthis);
