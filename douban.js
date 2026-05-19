// @name: 豆瓣推荐（PPnix 模仿）
// @author: adapted by Minis
// @description: UZ 影视专用插件，接口基于 PPnix 逻辑，使用 Omnibox 豆瓣源内部变量
// @version: 23

// ----------- ① 引入 Omnibox 豆瓣源 ---------------------------------
const oomunic = require("./douban_source.js"); // 假设放在同一目录，或根据实际路径修改
// 只需拿到需要的常量: 例如 webSite、headers 等
const { webSite: O_SITE, headers: O_HEADERS } = oomunic;

// 这里我们将 Omnibox 里的函数（如 request）直接挂到全局，供后面用
// Omnibox SDK 在 UZ 环境下已可访问，无需手动导入
// const OmniBox = require("omnibox_sdk");

// ----------- ② UZ 官方要求的常量 --------------------------------
const appConfig = {
  webSite: O_SITE || "https://www.ppnix.com",
  headers(referer) {
    // 用 Omnibox 请求头为基准
    return O_HEADERS && typeof O_HEADERS === "function"
      ? O_HEADERS(referer)
      : {
          Referer: referer || this.webSite + "/cn/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        };
  },
};

// ---------- ③ 分类列表 -----------------------------------------
async function getClassList(args) {
  const backData = new RepVideoClassList();
  backData.data = [
    { type_id: "movie", type_name: "电影" },
    { type_id: "tv", type_name: "电视剧" },
    { type_id: "show", type_name: "综艺" },
  ];
  return JSON.stringify(backData);
}

// ---------- ④ 分类视频列表 ------------------------------------
async function getVideoList(args) {
  const backData = new RepVideoList();
  try {
    const page = args.page > 1 ? args.page - 1 : "";
    const url = `${appConfig.webSite}/cn/${args.url}/---${page}-newstime.html`;
    const resp = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(resp.data);
    backData.data = [];
    $(".lists-content ul li").each((_, li) => {
      const $li = $(li);
      const video = new RepVideoItem();
      const $a = $li.find("a").first();
      video.vod_id = $a.attr("href");
      video.vod_name = $a.find("img").attr("alt") || $a.attr("title");
      video.vod_pic = $a.find("img").attr("src") || "";
      video.vod_remarks = $li.find(".orange, footer").first().text().trim();
      backData.data.push(video);
    });
  } catch (err) {
    backData.error = err.toString();
  }
  return JSON.stringify(backData);
}

// ---------- ⑤ 视频详情 ---------------------------------------
async function getVideoDetail(args) {
  const backData = new RepVideoDetail();
  try {
    const url = appConfig.webSite + args.url;
    const resp = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(resp.data);

    const video = new RepVideoDetail();
    video.vod_id = args.url;

    const titleRaw = $("h1.product-title").text().trim();
    video.vod_name = titleRaw.replace(/\s*\([^)]*\)\s*$/, "");
    video.vod_pic = $(".product-header img").attr("src") || "";

    // 演员 / 导演 / 年份 / 片长 / 备注
    const yearMatch = titleRaw.match(/\((\d{4})\)/);
    video.vod_year = yearMatch ? yearMatch[1] : "";
    video.vod_director = $(".product-excerpt:contains('导演：') span").text().trim();
    video.vod_actor =
      $(".product-excerpt:contains('主演：') span")
        .text()
        .trim()
        .replace(/\s*\/\s*/g, ",") || "";
    video.vod_content =
      $(".product-excerpt:contains('简介：')")
        .text()
        .replace("简介：", "")
        .trim() || "";

    // ---- m3u8 解析 ----
    const html = resp.data;
    const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] || (args.url.match(/(\d+)\.html/) || [])[1];
    const m3u8Match = html.match(/m3u8\s*=\s*\[(.*?)\]/s);
    const episodes = [];
    if (m3u8Match) {
      const re = /'([^']*)'|"([^"]*)"/g;
      let mm;
      while ((mm = re.exec(m3u8Match[1])) !== null) {
        const epName = mm[1] || mm[2];
        if (epName) episodes.push(`${epName}$${infoId}|${encodeURIComponent(epName)}|${encodeURIComponent(url)}`);
      }
    }
    if (episodes.length) {
      video.vod_play_from = "PPnix";
      video.vod_play_url = episodes.join("#");
    }

    backData.data = video;
  } catch (err) {
    backData.error = err.toString();
  }
  return JSON.stringify(backData);
}

// ---------- ⑥ 播放地址 ----------------------------------------
async function getVideoPlayUrl(args) {
  const backData = new RepVideoPlayUrl();
  try {
    const parts = args.url.split("|");
    const infoId = parts[0];
    const param = decodeURIComponent(parts[1] ?? "");
    const refer = decodeURIComponent(parts[2] ?? appConfig.webSite);
    const sourceUrl = `${appConfig.webSite}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
    backData.url = sourceUrl;
    backData.headers = appConfig.headers(refer);
    backData.parse = 0;
  } catch (err) {
    backData.error = err.toString();
  }
  return JSON.stringify(backData);
}

// ---------- ⑦ 搜索 ------------------------------------------
async function searchVideo(args) {
  const backData = new RepVideoList();
  try {
    const encoded = encodeURIComponent(args.searchWord);
    const pageStr = args.page > 1 ? `-page-${args.page}` : "";
    const url = `${appConfig.webSite}/cn/search/${encoded}--${pageStr}.html`;
    const resp = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(resp.data);
    backData.data = [];
    $(".lists-content ul li").each((_, li) => {
      const $a = $(li).find("a").first();
      const video = new RepVideoItem();
      video.vod_id = $a.attr("href");
      video.vod_name = $a.find("img").attr("alt") || $a.attr("title");
      video.vod_pic = $a.find("img").attr("src") || "";
      video.vod_remarks = $(li).find(".orange, footer").first().text().trim();
      backData.data.push(video);
    });
  } catch (err) {
    backData.error = err.toString();
  }
  return JSON.stringify(backData);
}

// ---------- ⑧ 模块导出 ------------------------------------
module.exports = {
  getClassList,
  getVideoList,
  getVideoDetail,
  getVideoPlayUrl,
  searchVideo,
};