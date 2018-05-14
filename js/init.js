// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2018

// valid extensions
const EXTENSIONS_IMG = ["jpg", "jpeg", "png", "gif"];

// set the user agent
Object.defineProperty(navigator, "userAgent", {
	get: function() {
		return "SlideshowViewer/0.1 (by MirceaKitsune)";
	}
});

// global system variables
var settings = {
	sites: [],
	keywords: "",
	count: 0,
	duration: 0
};

// plugins, global object
var plugins = {};

// plugins, functions, register
function plugins_register(name, func) {
	plugins[name] = func;
	interface_update_controls_images_sites();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name]();
}

// data, global array
var data_images = [];

// data, images, functions, clear
function images_clear() {
	data_images = [];

	player_detach();
	interface_update_media_controls_play(0);
	interface_update_media_controls_label();
}

// data, images, functions, add
function images_add(item) {
	// check that this image doesn't already exist
	for(image in data_images) {
		if(data_images[image].image_url === item.image_url)
			return;
	}

	// check that the extension is a valid image
	var valid_ext = false;
	for(extension in EXTENSIONS_IMG) {
		var check_ext = EXTENSIONS_IMG[extension];
		var str_url = item.image_url;
		var str_ext = str_url.substring(str_url.length, str_url.length - check_ext.length).toLowerCase();
		if(str_ext === check_ext) {
			valid_ext = true;
			break;
		}
	}
	if(valid_ext !== true)
		return;

	data_images.push(item);

	player_detach();
	interface_update_media_controls_play(2);
	interface_update_media_controls_label();
}

// data, images, functions, read
function images_read(index) {
	return data_images[index];
}

// initialize the interface
interface_init();
