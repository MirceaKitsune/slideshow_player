// Slideshow Viewer, Plugins, e621
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://e621.net
// API documentation: https://e621.net/help/show/api

// convert each entry into an image object for the player
function parse_e621(data) {
	for(var entry in data) {
		var this_data = data[entry];
		var this_image = {};

		this_image.src = String(this_data.file_url);
		this_image.thumb = String(this_data.preview_url);
		this_image.title = String(this_data.source); // API doesn't provide the title, use the file name instead
		this_image.author = String(this_data.artist);
		this_image.url = String(this_data.source);

		images_add(this_image);
	}

	plugins_busy_set("e621", false);
}

// fetch the json object containing the data and execute it as a script
function images_e621() {
	var domain = plugins_settings_images_read("nsfw") === true ? "e621" : "e926"; // e926 is the SFW version of e621
	var keywords = plugins_settings_images_read("keywords");
	var count = Math.min(plugins_settings_images_read("count"), 320); // this site supports a maximum of 320 results per page

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://" + domain + ".net/post/index.json?tags=" + keywords + "&limit=" + count + "&callback=parse_e621";
	document.body.appendChild(script);

	plugins_busy_set("e621", true);
}

// register the plugin
plugins_register("e621", images_e621);
