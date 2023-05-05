let fs = require("fs");
const puppeteer = require("puppeteer");
const colors = require("colors-console");
const {
  getFileName,
  readFilePromisify,
  getQuery,
  mkdirp,
  getAssetUrl,
  modifyAssetUrl,
} = require("./utils");

// 需要下载的网页 url
const configArr = require("./config");
// 保存资源的文件夹 名称
const filePath = "files";

(async () => {
  //  headless为false 则会弹出浏览器，为 fasle 打开一个无头浏览器。
  const browser = await puppeteer.launch({ headless: true });

  for (let m of configArr) {
    console.log(colors("cyan", `${m} 开始---------------------`));
    // 获取资源url
    const arr = await getAssetUrl({ browser, url: m });
    // 文件夹名称
    const mkName = getFileName(m).split(".html")[0] + "文件";
    // 创建文件夹
    mkdirp(`${filePath}/${mkName}/assets`);
    // 匹配 host+端口 'http://xxxxxx.com:3000'
    const host = m.match(/^(https?:\/\/)?[a-zA-Z0-9.-]+\.[a-z]{2,}(:\d+)?/);
    for (let v of arr) {
      const fileName = getFileName(v);
      // 获取请求方法
      const query = getQuery(v);
      if (!query) {
        console.log(
          colors("grey", `request break(不符合http url格式)---------------`),
          v
        );
        break;
      }
      // .html 特殊处理
      if (fileName.endsWith("html")) {
        let data = "";
        try {
          const response = await query(v);
          data = await readFilePromisify(response);
        } catch (error) {
          console.log(colors("red", `${v} 下载失败`), error);
        }
        if (!data) {
          break;
        }
        // 修改html代码（data）中 资源路径
        data = modifyAssetUrl({ urlArr: arr, content: data,  host });
        // 写入html文件
        fs.writeFile(`./${filePath}/${mkName}/index.html`, data, (err) => {
          if (err) {
            console.log(colors("red", "-----writeFile error-----"), error);
          }
        });
        console.log(colors("green", v), "html资源路径修改完毕");
      } else {
        let response;
        try {
          response = await query(v);
        } catch (error) {
          console.log(colors("red", `${v} 下载失败`), error);
        }
        if (!response) {
          break;
        }
        let ws = fs.createWriteStream(
          `./${filePath}/${mkName}/assets/${fileName}`
        );
        response.pipe(ws); // 将响应流写入文件流
        console.log(colors("green", v), "下载完毕");
      }
    }
    console.log(colors("blue", `${m} 结束---------------------`));
  }
  await browser.close(); // 关闭浏览器
})();
