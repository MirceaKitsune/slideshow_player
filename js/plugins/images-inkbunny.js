// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://wiki.inkbunny.net/wiki/API

// the name string of this plugin
const name_inkbunny = "Inkbunny";

// maximum number of results the API may return per page
const limit_inkbunny = 100;

// indicate that the plugin has finished working
function parse_inkbunny_ready(data) {
	plugins_busy_set(name_inkbunny, TYPE_IMAGES, 0);
}

// close the temporary guest session
function parse_inkbunny_logout(data) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://inkbunny.net/api_logout.php?output_mode=json&sid=" + data.sid + "&callback=parse_inkbunny_ready";
	document.body.appendChild(script);
}

// convert each entry into an image object for the player
function parse_inkbunny(data) {
	for(var entry in data.submissions) {
		const this_data = data.submissions[entry];
		var this_image = {};

		this_image.src = String(this_data.file_url_full);
		this_image.thumb = String(this_data.thumbnail_url_huge || this_data.file_url_preview); // some entries don't provide a thumbnail, use the file preview if so
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.username);
		this_image.url = String(this_data.file_url_full); // API doesn't provide the page URL, use the image file instead
		this_image.score = 0;

		images_add(this_image);
	}

	parse_inkbunny_logout(data);
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	const keywords = plugins_settings_read("keywords", TYPE_IMAGES);

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://inkbunny.net/api_search.php?output_mode=json&sid=" + data.sid + "&text=" + keywords + "&count_limit=" + limit_inkbunny + "&submissions_per_page=" + limit_inkbunny + "&callback=parse_inkbunny";
	document.body.appendChild(script);
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	// whether or not to enable the NSFW tags
	const nsfw = plugins_settings_read("nsfw", TYPE_IMAGES) === true ? "yes" : "no";

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://inkbunny.net/api_userrating.php?output_mode=json&sid=" + data.sid + "&tag[2]=" + nsfw + "&tag[3]=" + nsfw + "&tag[4]=" + nsfw + "&tag[5]=" + nsfw + "&callback=parse_inkbunny_rating";
	document.body.appendChild(script);
}

// fetch the json object containing the data and execute it as a script
function images_inkbunny() {
	var script = document.createElement("script");
	script.src = "https://inkbunny.net/api_login.php?output_mode=json&username=guest&callback=parse_inkbunny_login";
	document.body.appendChild(script);

	plugins_busy_set(name_inkbunny, TYPE_IMAGES, 30);
}

// register the plugin
plugins_register(name_inkbunny, TYPE_IMAGES, images_inkbunny);
