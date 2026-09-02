const fs = require("fs");
const path = require("path");

const themesDir = path.join(__dirname, "themes");
const folders = fs.readdirSync(themesDir).filter((f) => {
  return fs.statSync(path.join(themesDir, f)).isDirectory();
});

const themes = [];
const IMG_EXTS = ["jpg", "jpeg", "png", "webp"];

for (const folder of folders) {
  const jsonPath = path.join(themesDir, folder, folder + ".json");
  if (!fs.existsSync(jsonPath)) continue;

  let name = folder;
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (data.name) name = data.name;
  } catch (e) {}

  let image = null;
  for (const ext of IMG_EXTS) {
    const imgPath = path.join(themesDir, folder, folder + "." + ext);
    if (fs.existsSync(imgPath)) {
      image = "themes/" + folder + "/" + folder + "." + ext;
      break;
    }
  }

  themes.push({
    id: folder,
    name: name,
    file: "themes/" + folder + "/" + folder + ".json",
    image: image
  });
}

const outPath = path.join(themesDir, "index.json");
fs.writeFileSync(outPath, JSON.stringify(themes, null, 2), "utf8");
console.log("Themes index created:", themes.length, "tema bulundu");
themes.forEach((t) => console.log(" -", t.id, t.image ? "(görsel var)" : "(görselsiz)"));
