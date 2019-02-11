// Slideshow Viewer, Plugins, CCMixter
// Public Domain / CC0, MirceaKitsune 2018

// Music loading plugin for: http://ccmixter.org
// API documentation: http://ccmixter.org/query-api

// the name string of this plugin
const name_ccmixter = "CCMixter";

// maximum number of results the API may return per search
const limit_ccmixter = 15;

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

		music_add(this_song);
	}

	plugins_busy_set(name_ccmixter, TYPE_MUSIC, 0);
}

// fetch the json object containing the data and execute it as a script
function music_ccmixter() {
	// since this site doesn't offer builtin JSONP support, use a JSON to JSONP converter from: json2jsonp.com
	const url_prefix = "https://json2jsonp.com/?url=";
	const url_sufix = "&callback=parse_ccmixter";

	var keywords = plugins_settings_read("keywords", TYPE_MUSIC); // load the keywords
	keywords = keywords.replace(" ", ","); // json2jsonp.com returns an error when spaces are included in the URL, convert spaces to commas

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url_prefix + encodeURIComponent("http://ccmixter.org/api/query?f=json&tags=" + keywords + "&limit=" + limit_ccmixter) + url_sufix;
	document.body.appendChild(script);

	plugins_busy_set(name_ccmixter, TYPE_MUSIC, 10); // this site returns an invalid object if the given keywords are not found, use a low timeout
}

// register the plugin
plugins_register(name_ccmixter, TYPE_MUSIC, music_ccmixter);
