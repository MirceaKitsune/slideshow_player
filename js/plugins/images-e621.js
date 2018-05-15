// Slideshow Viewer, Plugins, e621
// Public Domain / CC0, MirceaKitsune 2018

// Image loading plugin for: https://e621.net
// API documentation: https://e621.net/help/show/api

// convert each entry into an image object for the player
function parse_e621(data) {
	for(var entry in data) {
		var this_data = data[entry];
		var this_image = {};

		this_image.image_url = this_data.file_url;
		this_image.image_thumb = this_data.preview_url;
		this_image.image_page = this_data.source;
		this_image.author_name = this_data.artist;
		this_image.author_thumb = "";
		this_image.author_page = "";

		images_add(this_image);
	}

	plugins_busy_set("e621", false);
}

// fetch the json object containing the data and execute it as a script
function images_e621() {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://e621.net/post/index.json?tags=" + settings.keywords + "&limit=" + settings.count + "&callback=" + "parse_e621";
	document.body.appendChild(script);

	plugins_busy_set("e621", true);
}

// register the plugin
plugins_register("e621", images_e621);
