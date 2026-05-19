//@name:豆瓣推荐 (腾讯源)
//@version:15
//@webSite:https://v.qq.com
//@remark:适配UZ影视规范，抓取腾讯视频数据
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// --- 核心配置 ---
const appConfig = {
    _webSite: 'https://v.qq.com',
    get webSite() {
        return this._webSite;
    },
    set webSite(value) {
        this._webSite = value;
    },
    headers(referer) {
        return {
            "Referer": referer || this._webSite + '/',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        };
    },
};

// --- 1. 分类列表 (getClassList) ---
async function getClassList(args) {
    var backData = {
        code: 0,
        msg: "ok",
        page: 1,
        pagecount: 1,
        limit: 20,
        total: 4,
        list: [
            { type_id: 'movie', type_name: '电影', hasSubclass: false },
            { type_id: 'tv', type_name: '电视剧', hasSubclass: false },
            { type_id: 'variety', type_name: '综艺', hasSubclass: false },
            { type_id: 'anime', type_name: '动漫', hasSubclass: false },
        ]
    };
    return JSON.stringify(backData);
}

// --- 2. 获取视频列表 (getVideoList) ---
async function getVideoList(args) {
    var backData = {
        code: 0,
        msg: "ok",
        page: 1,
        pagecount: 1,
        limit: 20,
        total: 0,
        list: []
    };

    try {
        const { type_id, page = 1 } = args;

        // 腾讯视频频道页 URL 映射
        const typeIdMap = { 'movie': 'channel/movie', 'tv': 'channel/tv', 'variety': 'channel/variety', 'anime': 'channel/cartoon' };
        const path = typeIdMap[type_id] || 'channel/movie';
        const url = `${appConfig.webSite}/x/bu/pagesheet/list?_all=1&append=1&channel=${path}&listpage=1&offset=${(page - 1) * 30}&pagesize=30`;

        const response = await req(url, { headers: appConfig.headers() });
        const json = JSON.parse(response.data);

        if (json.data && json.data.item_list) {
            json.data.item_list.forEach(item => {
                const video = {
                    vod_id: item.id || item.cover, // 使用 ID 或图片链接作为唯一标识
                    vod_name: item.title || item.name,
                    vod_pic: item.cover || item.pic,
                    vod_remarks: item.description || item.update_info || ''
                };
                backData.list.push(video);
            });
            backData.total = json.data.total || 0;
        }

    } catch (error) {
        backData.code = 1;
        backData.msg = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 3. 搜索视频 (searchVideo) ---
async function searchVideo(args) {
    var backData = {
        code: 0,
        msg: "ok",
        page: 1,
        pagecount: 1,
        limit: 20,
        total: 0,
        list: []
    };

    try {
        const { searchWord, page = 1 } = args;
        const encoded = encodeURIComponent(searchWord);
        const url = `${appConfig.webSite}/x/search/?q=${encoded}&page_type=video&offset=${(page - 1) * 30}&pagesize=30`;

        const response = await req(url, { headers: appConfig.headers() });
        const json = JSON.parse(response.data);

        if (json.data && json.data.item_list) {
            json.data.item_list.forEach(item => {
                const video = {
                    vod_id: item.id,
                    vod_name: item.title,
                    vod_pic: item.cover,
                    vod_remarks: item.description || ''
                };
                backData.list.push(video);
            });
            backData.total = json.data.total || 0;
        }

    } catch (error) {
        backData.code = 1;
        backData.msg = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 4. 视频详情 (getVideoDetail) ---
async function getVideoDetail(args) {
    var backData = {
        code: 0,
        msg: "ok",
        data: {}
    };

    try {
        const url = args.url.startsWith('http') ? args.url : appConfig.webSite + args.url;
        const response = await req(url, { headers: appConfig.headers(url) });

        // 尝试从网页源码中提取信息 (简单正则)
        const html = response.data;
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const descMatch = html.match(/name="description" content="(.*?)"/);

        const video = {
            vod_id: args.url,
            vod_name: titleMatch ? titleMatch[1].replace(/-.*$/, '') : '',
            vod_pic: '', // 详情页图片较难提取，留空
            vod_content: descMatch ? descMatch[1] : '',
            vod_play_from: "腾讯视频",
            vod_play_url: `播放$${encodeURIComponent(url)}`
        };

        backData.data = video;

    } catch (error) {
        backData.code = 1;
        backData.msg = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 5. 获取播放地址 (getVideoPlayUrl) ---
async function getVideoPlayUrl(args) {
    var backData = {
        code: 0,
        msg: "ok",
        url: "",
        parse: 0,
        header: {}
    };

    try {
        const targetUrl = decodeURIComponent(args.url);
        backData.url = targetUrl;
        backData.header = appConfig.headers(targetUrl);
        backData.parse = 0; // 0 表示直接请求，让 APP 嗅探视频流
    } catch (error) {
        backData.code = 1;
        backData.msg = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 空函数实现 ---
async function getSubclassList(args) { return JSON.stringify({code: 0, msg: "ok", list: []}); }
async function getSubclassVideoList(args) { return JSON.stringify({code: 0, msg: "ok", list: []}); }
async function getFyVideoList(args) { return JSON.stringify({code: 0, msg: "ok", list: []}); }
