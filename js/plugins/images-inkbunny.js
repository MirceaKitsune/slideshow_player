// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://inkbunny.net/help/show/api

// convert each entry into an image object for the player
function parse_inkbunny(data) {
	for(var entry in data.submissions) {
		var this_data = data.submissions[entry];
		var this_image = {};

		this_image.image_url = this_data.file_url_full;
		this_image.image_thumb = this_data.thumbnail_url_huge;
		this_image.image_page = "";
		this_image.author_name = this_data.username;
		this_image.author_thumb = "";
		this_image.author_page = "";

		images_add(this_image);
	}

	plugins_busy_set("Inkbunny", false);
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://inkbunny.net/api_search.php?output_mode=json&sid=" + data.sid + "&text=" + plugins_settings_read("keywords") + "&count_limit=" + plugins_settings_read("count") + "&submissions_per_page=" + plugins_settings_read("count") + "&callback=parse_inkbunny";
	document.body.appendChild(script);
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	// whether or not to enable the NSFW tags
	var nsfw = plugins_settings_read("nsfw") === true ? "yes" : "no";

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

	plugins_busy_set("Inkbunny", true);
}

// register the plugin
plugins_register("Inkbunny", images_inkbunny);
