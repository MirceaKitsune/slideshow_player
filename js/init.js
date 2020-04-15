// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2018

// animation update rate in milliseconds (1000 = 1 second)
// lower values are smoother but use more system resources
const RATE = 1000 / 120; // 120 FPS

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const SRC_BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// shortcut definitions
const KEY_PLAY = "Enter";
const KEY_IMAGES_PREVIOUS = "ArrowLeft";
const KEY_IMAGES_PLAY = "Backspace";
const KEY_IMAGES_NEXT = "ArrowRight";
const KEY_IMAGES_OPEN = "Tab";
const KEY_MUSIC_PREVIOUS = "ArrowDown";
const KEY_MUSIC_PLAY = "\\";
const KEY_MUSIC_NEXT = "ArrowUp";
const KEY_MUSIC_OPEN = "`";

// parse, keywords
function parse_keywords(keywords) {
	var search = keywords.toLowerCase();

	// properly format symbols that act as separators
	search = search.replace(/ /g, "_");
	search = search.replace(/\./g, ",");
	search = search.replace(/\:/g, ";");

	// return an array of search items separated by a common symbol
	// allow no more than 100 characters and 10 search pairs
	search = search.substring(0, 100);
	return search.split(";").slice(0, 10);
}

// settings, global object
const settings_default = {
	sites: [],
	images: {
		keywords: "anthro",
		count: 1000,
		duration: 10,
		nsfw: false,
		loop: true,
		shuffle: true
	},
	music: {
		keywords: "trance",
		count: 100,
		loop: true,
		shuffle: true,
		volume: 1
	}
};

var settings = {
	sites: settings_default.sites.slice(),
	images: Object.assign({}, settings_default.images),
	music: Object.assign({}, settings_default.music)
};

settings_url_get();

// settings, url, set
function settings_url_set() {
	var params = "";

	// images
	for(var entry in settings.images) {
		const setting_name = "images_" + entry;
		const setting_value = settings.images[entry];
		const setting_value_default = settings_default.images[entry];
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}
	// music
	for(var entry in settings.music) {
		const setting_name = "music_" + entry;
		const setting_value = settings.music[entry];
		const setting_value_default = settings_default.music[entry];
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}
	// sites
	if(settings.sites.length > 0 && settings.sites.length < Object.keys(plugins).length)
	{
		const setting_name = "sites";
		const setting_value = settings.sites.toString();
		const setting_value_default = settings_default.sites.toString();
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}

	if(params.length > 0)
		params = params.substring(0, params.length - 1); // remove the last &
	else
		params = "default";

	if("#" + params !== window.location.hash) {
		window.location.hash = params;
		onhashchange_block = true; // we don't want a manual update to reload the page, block onhashchange for the next detection
	}
}

// settings, url, get
function settings_url_get() {
	const url = window.location.hash;
	const params = url.substring(1).split("&");
	for(var entry in params) {
		const param = params[entry];
		const param_namevalue = param.split("="); // [0] = param type + name, [1] = param value
		const param_typename = param_namevalue[0].split("_"); // [0] = param type, [1] = param name

		const param_type = param_typename[0];
		const param_name = param_typename.length > 1 ? param_typename[1] : param_typename[0];
		var param_value = param_namevalue[1];

		// convert the value to the proper type
		if(!isNaN(param_value))
			param_value = Number(param_value);
		else if(param_value === "true" || param_value === "false")
			param_value = param_value === "true";

		if(param_value !== null && param_value !== undefined && param_value !== "") {
			if(param_type == "images")
				settings.images[param_name] = param_value;
			else if(param_type == "music")
				settings.music[param_name] = param_value;
			else if(param_type == "sites")
				settings[param_name] = param_value.split(",");
		}
	}
}

// set the user agent
Object.defineProperty(navigator, "userAgent", {
	get: function() {
		return "Slideshow Player (by MirceaKitsune)";
	}
});

// bind shortcut keys to the events of their corresponding elements
document.onkeydown = function(event) {
	// don't handle the event if the key was used inside an input element
	if(event.target.id !== "")
		return;

	switch(event.key) {
		case KEY_PLAY:
			if(typeof interface.media_controls_play.onclick === "function")
				interface.media_controls_play.onclick.apply(interface.media_controls_play);
			break;
		case KEY_IMAGES_PREVIOUS:
			if(typeof interface.media_images_previous.onclick === "function")
				interface.media_images_previous.onclick.apply(interface.media_images_previous);
			break;
		case KEY_IMAGES_PLAY:
			if(typeof interface.media_images_play.onclick === "function")
				interface.media_images_play.onclick.apply(interface.media_images_play);
			break;
		case KEY_IMAGES_NEXT:
			if(typeof interface.media_images_next.onclick === "function")
				interface.media_images_next.onclick.apply(interface.media_images_next);
			break;
		case KEY_IMAGES_OPEN:
			if(typeof interface.media_images_thumb.href === "string" && interface.media_images_thumb.href !== "")
				window.open(interface.media_images_thumb.href, "_blank");
			break;
		case KEY_MUSIC_PREVIOUS:
			if(typeof interface.media_music_previous.onclick === "function")
				interface.media_music_previous.onclick.apply(interface.media_music_previous);
			break;
		case KEY_MUSIC_PLAY:
			if(typeof interface.media_music_play.onclick === "function")
				interface.media_music_play.onclick.apply(interface.media_music_play);
			break;
		case KEY_MUSIC_NEXT:
			if(typeof interface.media_music_next.onclick === "function")
				interface.media_music_next.onclick.apply(interface.media_music_next);
			break;
		case KEY_MUSIC_OPEN:
			if(typeof interface.media_music_thumb.href === "string" && interface.media_music_thumb.href !== "")
				window.open(interface.media_music_thumb.href, "_blank");
			break;
	}
}

// ask the user to confirm they want to leave if the player is busy
window.onbeforeunload = function() {
	if(player_active())
		return "Closing this page will end the current slideshow. Are you sure?";
}

// refresh the page if settings have been updated in the hash URL
// this behavior can be blocked for a turn by setting the blocker to true
var onhashchange_block = false;
window.onhashchange = function() {
	if(onhashchange_block)
		onhashchange_block = false;
	else
		window.location.reload();
}
