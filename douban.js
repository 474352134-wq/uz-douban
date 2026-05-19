// ignore
//@name:豆瓣推荐
//@version:8
//@webSite:https://v.qq.com
//@remark:修复语法错误，适配UZ影视规范
//@isAV:0
//@deprecated:0

const appConfig = {
    ver: 1,
    title: '豆瓣推荐',
    site: 'v.qq.com',
};

// 首页分类
async function home() {
    const classes = [
        { type_id: "movie", type_name: "选电影" },
        { type_id: "tv", type_name: "选剧集" },
        { type_id: "show", type_name: "选综艺" },
        { type_id: "movie_filter", type_name: "电影筛选" },
        { type_id: "tv_filter", type_name: "电视剧筛选" },
        { type_id: "show_filter", type_name: "综艺筛选" },
    ];

    const filters = {
        movie: [
            { key: "category", name: "类型", init: "热门", value: [{ name: "热门", value: "热门" }, { name: "最新", value: "最新" }, { name: "豆瓣高分", value: "豆瓣高分" }, { name: "冷门佳片", value: "冷门佳片" }] },
            { key: "type", name: "地区", init: "全部", value: [{ name: "全部", value: "全部" }, { name: "华语", value: "华语" }, { name: "欧美", value: "欧美" }, { name: "韩国", value: "韩国" }, { name: "日本", value: "日本" }] },
        ],
        tv: [
            { key: "category", name: "类型", init: "热门", value: [{ name: "热门", value: "热门" }, { name: "最新", value: "最新" }, { name: "国产剧", value: "国产剧" }, { name: "英美剧", value: "英美剧" }] },
            { key: "type", name: "地区", init: "全部", value: [{ name: "全部", value: "全部" }, { name: "内地", value: "内地" }, { name: "美国", value: "美国" }, { name: "英国", value: "英国" }, { name: "韩国", value: "韩国" }] },
        ],
        show: [
            { key: "category", name: "类型", init: "热门", value: [{ name: "热门", value: "热门" }, { name: "脱口秀", value: "脱口秀" }, { name: "真人秀", value: "真人秀" }] },
        ],
    };

    return JSON.stringify({
        class: classes,
        filters: filters
    });
}

// 首页推荐和分类列表
async function homeVod() {
    // 抓取腾讯视频Banner数据作为推荐
    try {
        let url = 'https://v.qq.com/';
        let html = await req(url);
        let videos = [];

        // 简单的正则匹配提取Banner图和视频信息 (根据实际网页结构调整)
        // 注意：腾讯视频网页版结构经常变，这里用了一个比较通用的匹配逻辑
        let regex = /<a.*?href="(.*?)".*?title="(.*?)".*?src="(.*?)".*?>/g;
        let matches = html.matchAll(regex);

        for (let match of matches) {
            let link = match[1];
            let title = match[2];
            let img = match[3];

            // 过滤掉非视频链接或不完整的图片
            if (link.includes('/x/') && img.includes('http')) {
                // 补全图片链接如果它是相对路径
                if (img.startsWith('//')) img = 'https:' + img;

                videos.push({
                    vod_id: link,
                    vod_name: title,
                    vod_pic: img,
                    vod_remarks: "推荐"
                });

                // 只需要前20个推荐
                if (videos.length >= 20) break;
            }
        }

        return JSON.stringify({
            list: videos
        });
    } catch (e) {
        console.log('Error in homeVod: ' + e);
        return JSON.stringify({ list: [] });
    }
}

// 分类列表（兼容原脚本逻辑，这里简化处理，实际可能需要根据分类ID去请求不同接口）
async function category(tid, pg, filter, extend) {
    // 这里为了演示，简单返回空或者根据tid做简单跳转
    // 实际逻辑需要根据腾讯视频的搜索接口来写
    return JSON.stringify({
        list: [],
        page: pg,
        pagecount: 1,
        limit: 20,
        total: 0
    });
}

// 搜索（可选）
async function search(wd, quick) {
    // 腾讯视频搜索接口示例
    let url = `https://s.video.qq.com/getsmart?q=${wd}&app_name=video_web_v &platform=10201&video_type=0&rn=20`;
    try {
        let data = await req(url);
        let json = JSON.parse(data);
        let videos = [];
        // 解析搜索结果的JSON逻辑...
        return JSON.stringify({ list: videos });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}
