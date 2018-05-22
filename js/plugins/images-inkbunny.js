// Slideshow Viewer, Plugins, Inkbunny
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://inkbunny.net
// API documentation: https://wiki.inkbunny.net/wiki/API

// indicate that the plugin has finished working
function parse_inkbunny_ready(data) {
	plugins_busy_set("Inkbunny", false);
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
		var this_data = data.submissions[entry];
		var this_image = {};

		this_image.src = String(this_data.file_url_full);
		this_image.thumb = String(this_data.thumbnail_url_huge || this_data.file_url_preview); // some entries don't provide a thumbnail, use the file preview if so
		this_image.title = String(this_data.title);
		this_image.author = String(this_data.username);
		this_image.url = String(this_data.file_url_full); // API doesn't provide the page URL, use the image file instead

		images_add(this_image);
	}

	parse_inkbunny_logout(data);
}

// change the rating, then call the image parser with the session id
function parse_inkbunny_rating(data) {
	var keywords = plugins_settings_images_read("keywords");
	var count = Math.min(plugins_settings_images_read("count"), 100); // this site supports a maximum of 100 results per page

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://inkbunny.net/api_search.php?output_mode=json&sid=" + data.sid + "&text=" + keywords + "&count_limit=" + count + "&submissions_per_page=" + count + "&callback=parse_inkbunny";
	document.body.appendChild(script);
}

// create a new session as guest, then call the rating api with its session id
function parse_inkbunny_login(data) {
	// whether or not to enable the NSFW tags
	var nsfw = plugins_settings_images_read("nsfw") === true ? "yes" : "no";

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
