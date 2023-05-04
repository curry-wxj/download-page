let fs = require("fs");
const http = require("http");
const https = require("https");
const puppeteer = require("puppeteer");
const colors = require("colors-console");

// const configArr = require("./config");
const configArr = ["http://zhufengpeixun.com/strong/index.html"];

const filePath = "files";

// 获取 http://zhufengpeixun.com/strong/html/20.action.html 中的 action.html
function getFileName(url) {
  const arrUrl = url.split("/");
  const fileName = arrUrl[arrUrl.length - 1];
  return fileName;
}
// 创建文件夹
function mkdirp(dirPath) {
  let paths = dirPath.split("/");
  !(function next(index) {
    if (index > paths.length) return;
    let current = paths.slice(0, index).join("/");
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current);
    }
    next(index + 1);
  })(1);
}
// 将 http.get 转为promise
function promisify(fn) {
  return function (...args) {
    return new Promise(function (resolve, reject) {
      fn(...args, (res) => {
        resolve(res);
      }).on("error", (e) => {
        console.log("promisify-----------------");
        reject(e);
      });
    });
  };
}

// 封装 fs.createReadStream  为一个 Promise，以便于在异步代码中使用
function readFilePromisify(stream) {
  return new Promise(function (resolve, reject) {
    // const stream = fs.createReadStream(path, { encoding: 'utf-8' });
    let data = "";
    stream.on("data", (chunk) => {
      data += chunk;
    });

    stream.on("end", () => {
      resolve(data);
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}
(async () => {
  //  headless为false 则会弹出浏览器，为 fasle 打开一个无头浏览器。
  const browser = await puppeteer.launch({ headless: true });

  for (let m of configArr) {
    console.log(colors("cyan", `${m} 开始---------------------`));
    const arr = [];
    // 创建一个页面
    const page = await browser.newPage();
    // 监听页面的http文件加载，并将加载的图片 js css地址push到数组
    page.on("response", (request) => {
      arr.push(request.url());
    });
    // 加载页面
    try {
      await page.goto(m);
    } catch (error) {
      console.log(colors("red", `加载页面${m}失败`), error);
    }

    // await page.setViewport({ width: 1400, height: 1024 }); // 设置浏览器宽高
    // await page.screenshot({ path: "example.png" });
    // await page.exposeFunction("getArr", (text) => arr); // 注入 getArr到window对象上
    // await browser.close();

    // 文件夹名称
    const mkName = getFileName(m).split(".html")[0] + "文件";
    // 创建文件夹
    mkdirp(`${filePath}/${mkName}/assets`);
    for (let v of arr) {
      const fileName = getFileName(v);
      // 判断页面资源是 http还是 https
      let request;
      if (v.startsWith("https")) {
        request = https;
      } else if (v.startsWith("http")) {
        request = http;
      }
      if (!request) {
        console.log(
          colors("grey", `request break(不符合http url格式)---------------`),
          v
        );
        break;
      }
      const query = promisify(request.get);
      // .html特殊文件
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
        // 修改html中 资源路径
        arr.forEach((c) => {
          // todo这里可以判断 m和c的前缀名一致
          if (c.includes("static/css/main.css")) {
            // 有的文件引入的 是 ../static/css/main.css和static/css/main.css 统一修改为  ./assets/main.css
            data = data.replace("../static/css/main.css", "./assets/main.css");
            data = data.replace("static/css/main.css", "./assets/main.css");
          } else {
            // https://xxx/xxx/bootstrapmin_1645176572503.css 修改为 ./assets/bootstrapmin_1645176572503.css
            const curryName = getFileName(c);
            data = data.replace(c, `./assets/${curryName}`);
          }
        });
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

  // 上面是 使用node下载 html中的资源，
  // 相比node读写文件，这里使用a标签下载，a标签download只能指定文件名 不能指定存储目录

  // evaluate中可以拿到 document和window对象
  // const dimensions = await page.evaluate(async () => {
  //   const arr = await window.getArr(); // exposeFunction注入的变量
  //   arr.forEach((v) => {
  //     const a = document.createElement("a");
  //     const arrUrl = v.split("/");
  //     a.download = arrUrl[arrUrl.length - 1];
  //     a.href = v;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //   });

  //   return {
  //     width: document.documentElement.clientWidth,
  //     height: document.documentElement.clientHeight,
  //     deviceScaleFactor: window.devicePixelRatio,
  //   };
  // });
  // console.log("Dimensions:", dimensions);
})();
