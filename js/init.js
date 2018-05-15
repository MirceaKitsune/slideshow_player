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

// settings, cookie, set
function settings_cookie_set() {
	var expire = 365 * 24 * 60 * 60; // year, hour, minute, second
	var string = JSON.stringify(settings);
	var time = new Date();
	time.setTime(time.getTime() + 1 * expire * 1000);
	document.cookie = "slideshowplayer" + "=" + string + "; expires=" + time.toUTCString();
}

// settings, cookie, get
function settings_cookie_get() {
	var table = document.cookie.match(new RegExp("slideshowplayer" + "=([^;]+)"));
	if(table)
		settings = JSON.parse(table[1]);
}

// settings, global object
var settings = {
	sites: [],
	keywords: "",
	count: 0,
	duration: 0,
	shuffle: false
};
settings_cookie_get();

// plugins, global object
var plugins = {};

// plugins, functions, register
function plugins_register(name, func) {
	plugins[name] = {
		func: func,
		busy: false,
		busy_timeout: null
	};
	interface_update_controls_images_sites();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name].func();
}

// plugins, busy check
function plugins_busy() {
	// return true if any plugin is busy
	for(var plugin in plugins) {
		if(plugins[plugin].busy === true)
			return true;
	}
	return false;
}

// plugins, busy set
function plugins_busy_set(name, busy) {
	plugins[name].busy = busy;
	player_detach();

	// automatically mark the plugin as no longer busy after a given timeout
	clearTimeout(plugins[name].busy_timeout);
	if(busy === true) {
		plugins[name].busy_timeout = setTimeout(function() {
			plugins_busy_set(name, false);
		}, 1000 * 10);
	}
}

// data, global array
var data_images = [];

// data, images, functions, clear
function images_clear() {
	player_detach();
	data_images = [];
}

// data, images, functions, shuffle
function images_shuffle() {
	for(var i = data_images.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		[data_images[i], data_images[j]] = [data_images[j], data_images[i]];
	}
}

// data, images, functions, add
function images_add(item) {
	player_detach();

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
}

// data, images, functions, read
function images_read(index) {
	return data_images[index];
}

// initialize the interface
interface_init();
