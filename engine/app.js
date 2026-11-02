// app.js: the engine of the photo site.
// It does four jobs, in order:
//   1. Load your settings (data/site.json)
//   2. Load your theme (a CSS file)
//   3. Load your photo list (data/photos.json) and draw the gallery
//   4. Make the lightbox (big photo view) work

// ---------- Job 1: loading data ----------

// fetch() asks for a file. It takes time, so we use "async/await":
// "await" means "wait here until the file has arrived".
async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Could not load " + path);
  }
  return response.json(); // turns the text into a JavaScript object
}

// ---------- Job 2: loading a theme ----------

// We look for your own theme in data/themes/ first.
// If it isn't there, we use a built-in one from engine/themes/.
function loadTheme(themeName) {
  const myPath = "data/themes/" + themeName + "/theme.css";
  const builtInPath = "engine/themes/" + themeName + "/theme.css";

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = myPath;
  // onerror runs if the file wasn't found: try the built-in theme instead.
  link.onerror = function () {
    link.onerror = null;
    link.href = builtInPath;
  };
  document.head.appendChild(link);
}

// ---------- Job 3: drawing the gallery ----------

function showSiteInfo(site) {
  document.title = site.title;
  document.getElementById("site-title").textContent = site.title;
  document.getElementById("site-subtitle").textContent = site.subtitle || "";
  document.getElementById("site-footer").textContent = site.footer || "";
}

// Makes one photo "card": a picture with its title under it.
function makePhotoCard(photo) {
  const figure = document.createElement("figure");
  figure.className = "photo-card";

  const img = document.createElement("img");
  img.src = "data/images/" + photo.file;
  img.alt = photo.title || photo.file;
  img.loading = "lazy"; // only download when scrolled near

  const caption = document.createElement("figcaption");
  caption.textContent = photo.title || "";

  figure.appendChild(img);
  figure.appendChild(caption);

  // When the card is clicked, open the lightbox.
  figure.addEventListener("click", function () {
    openLightbox(photo);
  });
  return figure;
}

function showGallery(photos) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  for (const photo of photos) {
    gallery.appendChild(makePhotoCard(photo));
  }
}

// ---------- Job 4: the lightbox ----------

const lightbox = document.getElementById("lightbox");

function openLightbox(photo) {
  document.getElementById("lightbox-image").src = "data/images/" + photo.file;
  document.getElementById("lightbox-image").alt = photo.title || photo.file;
  // textContent (not innerHTML) keeps text safe: it can never run as code.
  document.getElementById("lightbox-caption").textContent =
    [photo.title, photo.description].filter(Boolean).join(" - ");
  lightbox.hidden = false;
}

function closeLightbox() {
  lightbox.hidden = true;
}

document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
// Clicking the dark background (not the photo) also closes it.
lightbox.addEventListener("click", function (event) {
  if (event.target === lightbox) closeLightbox();
});
// Pressing the Escape key closes it too.
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeLightbox();
});

// ---------- Start everything ----------

async function start() {
  try {
    const site = await loadJson("data/site.json");
    loadTheme(site.theme || "classic");
    showSiteInfo(site);
    showGallery(await loadJson("data/photos.json"));
  } catch (error) {
    // If something goes wrong, show the message so it's easy to debug.
    document.getElementById("gallery").textContent = "Oops: " + error.message;
  }
}

start();
