let fs = require("fs");
const http = require("http");
const https = require("https");
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

// 获取网页的资源url 例如 http://xxx.css  xxx.js 文件
async function getAssetUrl({ browser, url }) {
  const arr = [];
  // 创建一个页面
  const page = await browser.newPage();
  // 监听页面的http文件加载，并将加载的图片 js css地址push到数组
  page.on("response", (request) => {
    arr.push(request.url());
  });
  // page的其他用法
  // await page.setViewport({ width: 1400, height: 1024 }); // 设置浏览器宽高
  // await page.screenshot({ path: "example.png" });
  // await page.exposeFunction("getArr", (text) => arr); // 注入 getArr到window对象上

  // 加载页面
  try {
    await page.goto(url); // 会同步执行 page.on("response"
  } catch (error) {
    console.log(colors("red", `加载页面${m}失败`), error);
  }
  return arr;
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

// 获取promise版本的 http.get方法 或 https.get方法
function getQuery(url) {
  let request;
  // 判断页面资源是 http还是 https
  if (url.startsWith("https")) {
    request = https;
  } else if (url.startsWith("http")) {
    request = http;
  } else {
    // todo 非http资源如何获取 读取 文件内容 比如base64图片
    return;
  }
  return promisify(request.get);
}

//  修改html中 资源路径
function modifyAssetUrl({ urlArr, content, host }) {
  // 修改html中 资源路径
  urlArr.forEach((c) => {
    const curryName = getFileName(c);
    if (c.endsWith("html")) {
      // html资源就是网页本身 不用做处理。 todo iframe嵌入的html需要特殊处理
      return;
    }
    if (c.startsWith(host[0])) {
      // 处理 本地资源，host相同
      // 匹配 引号或双引号、非引号或双引号0次或多次、curryName、引号或双引号
      // 例如 'href="../static/css/main.css">'  统一修改为 'href="./assets/main.css">'
      const regex = new RegExp(`["'][^'"]*${curryName}["']`, "g");
      content = content.replace(regex, `"./assets/${curryName}"`);
    } else {
      // 处理http资源
      // https://xxx/xxx/bootstrapmin_1645176572503.css 修改为 ./assets/bootstrapmin_1645176572503.css
      content = content.replace(c, `./assets/${curryName}`);
    }
  });
  return content;
}

module.exports = {
  getFileName,
  readFilePromisify,
  mkdirp,
  getAssetUrl,
  getQuery,
  modifyAssetUrl,
};

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
