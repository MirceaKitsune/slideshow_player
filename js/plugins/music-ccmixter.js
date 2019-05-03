// Slideshow Viewer, Plugins, CCMixter
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://ccmixter.org
// API documentation: http://ccmixter.org/query-api

// the name string of this plugin
const name_ccmixter = "CCMixter";

// the number of pages to return per keyword pair
// remember that each page issues a new request, keep this low to avoid flooding the server and long waiting times
const page_count_ccmixter = 5;
// this should represent the maximum number of results the API may return per page
const page_limit_ccmixter = 15;

// the number of seconds between requests made to the server
// lower values mean less waiting time, but are more likely to trigger the flood protection of servers
const delay_ccmixter = 0.5;

// this counter reaches 0 once all pages finished loading
var pages_ccmixter = 0;

// the script elements for this plugin
var elements_ccmixter = [];

// convert each entry into a music object for the player
function parse_ccmixter(data) {
	for(var entry in data) {
		const this_data = data[entry];
		var this_song = {};

		this_song.src = String(this_data.files[0].download_url);
		this_song.thumb = String(this_data.license_logo_url); // API doesn't provide a thumbnail, use the logo instead
		this_song.title = String(this_data.upload_name);
		this_song.author = String(this_data.user_real_name);
		this_song.url = String(this_data.file_page_url);
		this_song.score = Number(this_data.upload_num_scores);
		this_song.tags = this_data.upload_tags.split(",");

		music_add(this_song);
	}

	--pages_ccmixter;
	if(pages_ccmixter <= 0) {
		for(var page = 1; page <= page_count_ccmixter; page++) {
			if(document.body.contains(elements_ccmixter[page])) {
				document.body.removeChild(elements_ccmixter[page]);
				elements_ccmixter[page] = null;
			}
		}

		plugins_busy_set(name_ccmixter, null);	
	}
}

// fetch the json object containing the data and execute it as a script
function music_ccmixter() {
	plugins_busy_set(name_ccmixter, 10); // this site returns an invalid object if the given keywords are not found, use a low timeout

	const keywords = plugins_settings_read("keywords", TYPE_MUSIC);
	const keywords_all = parse_keywords(keywords);

	pages_ccmixter = 0;
	for(var item in keywords_all) {
		for(var page = 1; page <= page_count_ccmixter; page++) {
			const this_keywords = keywords_all[item];
			const this_page = page;
			setTimeout(function() {
				elements_ccmixter[page] = document.createElement("script");
				elements_ccmixter[page].type = "text/javascript";
				elements_ccmixter[page].src = parse_jsonp("http://ccmixter.org/api/query?f=json&tags=" + this_keywords + "&offset=" + this_page + "&limit=" + page_limit_ccmixter, "parse_ccmixter");
				document.body.appendChild(elements_ccmixter[page]);
			}, (pages_ccmixter * delay_ccmixter) * 1000);
			++pages_ccmixter;
		}
	}
}

// register the plugin
plugins_register(name_ccmixter, TYPE_MUSIC, music_ccmixter);
