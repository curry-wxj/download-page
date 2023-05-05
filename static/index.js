const path = require("path");
const express = require("express");
const { readdir, stat } = require("fs/promises");

const app = express();
app.use("/static", express.static("files"));

const port = 3000;
const filepath = path.join(__dirname, "../files");

app.set("views", __dirname);
app.set("view engine", "html");
app.engine(".html", require("ejs").__express);
app.get("/", async function (req, res) {
  let isDirectory;
  try {
    statObj = await stat(filepath);
    isDirectory = statObj.isDirectory();
  } catch (error) {}

  if (isDirectory) {
    let files = await readdir(filepath);
    res.render("index", {
      menuItems: files.map((v) => ({
        name: v,
        url: `/static/${v}/index.html`,
      })),
    });
  } else {
    res.send("未找到 file文件夹");
  }
});
app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
