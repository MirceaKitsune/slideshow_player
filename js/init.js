// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2016

// Set the user agent
Object.defineProperty(navigator, "userAgent", {
	get: function() {
		return "SlideshowViewer/0.1 (by MirceaKitsune)";
	}
});

// System status variables
var settings = {
	sites: [],
	keywords: "",
	count: 0,
	speed: 0
};
var player = {
	playing: false
};

// Define plugins
var plugins = {};

function plugins_register(name, func) {
	plugins[name] = func;
	interface_update_controls_images_sites();
}

function plugins_load(name, keywords, count) {
	plugins[name](keywords, count);
}

// Define data, images
var data_images = [];

function images_clear() {
	data_images = [];

	playing = false;
	interface_update_media_controls_play();
	interface_update_media_controls_label();
}

function images_add(item) {
	data_images.push(item);

	playing = false;
	interface_update_media_controls_play();
	interface_update_media_controls_label();
}

function images_read(index) {
	return data_images[index];
}

// Initialize the interface
interface_init();
