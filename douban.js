//@name:[腾讯] 腾讯视频源
//@version:24
//@webSite:https://v.qq.com
//@remark:适用于 UZ 影视的腾讯视频源（改自 PPnix）
//@order:A05
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

/* -------------------------------------------------------------
   必须的依赖（由插件提供）
   - req          : 发起 HTTP 请求，返回 {statusCode, data, headers}
   - cheerio      : 类 jQuery 的 HTML 解析器
   - spider_runner: 自动把导出的函数注入 UZ
   ------------------------------------------------------------- */
const runner = require('spider_runner');

const appConfig = {
    _webSite: 'https://v.qq.com',
    get webSite() { return this._webSite },
    set webSite(v) { this._webSite = v },

    // 统一的请求头
    headers(referer) {
        return {
            "Referer": referer || this._webSite + '/cn/',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        };
    },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(v) { this._uzTag = v },
};

/* -------------------------------------------------------------
   1️⃣ 首页（分类）列表
   ------------------------------------------------------------- */
async function home(args) {
    const backData = new RepVideoClassList();
    try {
        backData.data = [
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv',   type_name: '电视剧' },
        ];
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/* -------------------------------------------------------------
   2️⃣ 分类下的视频列表
      规则：/cn/<分类>/---<page>-newstime.html
   ------------------------------------------------------------- */
async function category(args) {
    const backData = new RepVideoList();
    try {
        // PPnix 把第一页写成空字符串，保持兼容
        const pageIdx = args.page > 1 ? args.page - 1 : '';
        const url = `${appConfig.webSite}/cn/${args.url}/---${pageIdx}-newstime.html`;
        const response = await req(url, { headers: appConfig.headers() });
        const $ = cheerio.load(response.data);

        $('.lists-content ul li').each((_, li) => {
            const video = new VideoDetail();
            const $a = $(li).find('a').first();

            video.vod_id = $a.attr('href');
            video.vod_name = $a.find('img').attr('alt');
            video.vod_pic = $a.find('img').attr('src');
            video.vod_remarks = $(li).find('.orange, footer').first().text().trim();

            const score = $(li).find('.rate').text().trim();
            if (score && score !== '0.0') {
                video.topRightRemarks = '评分 ' + score;
            }
            backData.data.push(video);
        });
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/* -------------------------------------------------------------
   3️⃣ 视频详情（解析 m3u8）
   ------------------------------------------------------------- */
async function detail(args) {
    const backData = new RepVideoDetail();
    try {
        const url = appConfig.webSite + args.url;          // 完整详情页地址
        const response = await req(url, { headers: appConfig.headers() });
        const $ = cheerio.load(response.data);

        const video = new VideoDetail();
        video.vod_id = args.url;

        // 标题、封面、年份、导演、主演、简介
        const titleRaw = $('h1.product-title').text().trim();
        video.vod_name   = titleRaw.replace(/\s*\([^)]*\)\s*$/, '');
        video.vod_pic    = $('.product-header img').attr('src');
        video.vod_year   = (titleRaw.match(/\((\d{4})\)/) || [])[1] || '';
        video.vod_director = $(".product-excerpt:contains('导演：') span").text().trim();
        video.vod_actor    = $(".product-excerpt:contains('主演：') span")
                               .text().trim().replace(/\s*\/\s*/g, ",");
        video.vod_content  = $(".product-excerpt:contains('简介：')")
                               .text().replace('简介：', '').trim();

        // ------------------- 解析 m3u8 -------------------
        // 代码直接搬植自 PPnix，只是把基址换成腾讯
        const html = response.data;
        const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] ||
                       (args.url.match(/(\d+)\.html/) || [])[1];
        const m3u8Match = html.match(/m3u8\s*=\s*\[(.*?)\]/s);

        const episodes = [];
        if (m3u8Match) {
            const re = /'([^']*)'|"([^"]*)"/g;
            let m;
            while ((m = re.exec(m3u8Match[1])) !== null) {
                const epName = m[1] || m[2];
                if (epName) {
                    // 这里保持 PPnix 的格式，后续在 playurl 中会被拆解
                    episodes.push(`${epName}$${infoId}|${encodeURIComponent(epName)}|${encodeURIComponent(url)}`);
                }
            }
        }
        if (episodes.length) {
            video.vod_play_from = "PPnix";
            video.vod_play_url  = episodes.join('#');
        }
        // --------------------------------------------------

        backData.data = video;
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/* -------------------------------------------------------------
   4️⃣ 播放地址（将上一步拼装的参数还原为真实的 m3u8 链接）
   ------------------------------------------------------------- */
async function playurl(args) {
    const backData = new RepVideoPlayUrl();
    try {
        // args.url 的格式： epName$infoId|encodeURIComponent(epName)|encodeURIComponent(detailPage)
        const parts = args.url.split('|');
        const infoId = parts[0];                     // infoId
        const param  = decodeURIComponent(parts[1]); // epName (已 encode)
        const referer = decodeURIComponent(parts[2]); // 详情页 URL

        // 与 PPnix 完全相同的拼装方式
        const src = `${appConfig.webSite}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
        backData.url = src;
        backData.headers = appConfig.headers(referer);
        backData.parse = 0;      // 交给 UZ 自己去嗅探/解析
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/* -------------------------------------------------------------
   5️⃣ 搜索
   ------------------------------------------------------------- */
async function search(args) {
    const backData = new RepVideoList();
    try {
        const kw = encodeURIComponent(args.searchWord);
        const pagePart = args.page > 1 ? `-page-${args.page}` : '';
        const url = `${appConfig.webSite}/cn/search/${kw}--.html${pagePart}`;
        const response = await req(url, { headers: appConfig.headers() });
        const $ = cheerio.load(response.data);

        $('.lists-content ul li').each((_, el) => {
            const video = new VideoDetail();
            const $a = $(el).find('a').first();

            video.vod_id = $a.attr('href');
            video.vod_name = $a.find('img').attr('alt') || $a.attr('title');
            video.vod_pic = $a.find('img').attr('src');
            video.vod_remarks = $(el).find('footer').text().trim();

            backData.data.push(video);
        });
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/* -------------------------------------------------------------
   6️⃣ 子分类（PPnix 中未使用，保持空实现）
   ------------------------------------------------------------- */
async function subclassList(args) {
    return JSON.stringify(new RepVideoSubclassList());
}
async function subclassVideoList(args) {
    return JSON.stringify(new RepVideoList());
}

/* -------------------------------------------------------------
   导出 —— 必须使用 UZ 约定的函数名
   ------------------------------------------------------------- */
module.exports = {
    home,
    category,
    detail,
    playurl,
    search,
    subclassList,
    subclassVideoList,
};

/* -------------------------------------------------------------
   交给插件启动
   ------------------------------------------------------------- */
runner.run(module.exports);