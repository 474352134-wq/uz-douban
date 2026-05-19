// ignore

//@name:豆瓣电影最终修复版(含闭合)
//@webSite:https://movie.douban.com
//@version:6
//@remark:补全了结尾，修复语法错误
//@isAV:0
//@deprecated:0

// ignore

import {
    VideoClass,
    RepVideoClassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    UZArgs,
    UZSubclassVideoListArgs,
} from '../core/uzVideo.js'

import {
    UZUtils,
    req,
    ReqResponseType,
    toast,
} from '../core/uzUtils.js'

import { cheerio } from '../core/uz3lib.js'

// ignore

const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
    // 👇 你的Cookie填在这里
    _cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; dbcl2="295088353:j8wOlKpy4Kw"; push_noty_num=0; push_doumail_num=0; ck=jx66; ap_v=0,6.0; frodotik_db="a9ffbd125fb0de6bfdff37371f129b41"; __utmc=30149280; __utmz=30149280.1779154707.6.4.utmccn=(referral)|utmcsr=cn.bing.com|utmcct=/|utmcmd=referral|utmcct=/; __utmv=30149280.29508; __utma=30149280.827381539.1772196852.1779154707.1779157261.7; __utmb=30149280.0.10.1779157261',
}

// 模拟分类数据（硬编码，确保一定能显示）
const CLASS_LIST = [
    { type_name: '热映电影', type_id: 'nowplaying' },
    { type_name: '即将上映', type_id: 'soon' },
    { type_name: 'Top250', type_id: 'top250' },
    { type_name: '口碑榜', type_id: 'weekly' },
    { type_name: '北美票房榜', type_id: 'us_box' },
    { type_name: '新片榜', type_id: 'new_movies' },
];

// 获取分类列表
async function getClassList(uzArgs) {
    let list = [];
    try {
        // 直接返回硬编码的分类，不依赖网络请求，防止首页改版导致分类消失
        CLASS_LIST.forEach(item => {
            let videoClass = new VideoClass();
            videoClass.type_name = item.type_name;
            videoClass.type_id = item.type_id;
            list.push(videoClass);
        });
    } catch (e) {
        UZUtils.error("获取分类失败", e);
    }
    return new RepVideoClassList(list);
}

// 获取视频列表
async function getVideoList(uzArgs, subclassVideoListArgs) {
    let list = [];
    let typeId = subclassVideoListArgs.type_id;
    let url = '';

    // 构造不同分类的URL
    if (typeId === 'top250') {
        url = `${appConfig.webSite}/top250`;
    } else if (typeId === 'us_box') {
        url = `${appConfig.webSite}/us_box`;
    } else if (typeId === 'weekly') {
        url = `${appConfig.webSite}/weekly`;
    } else if (typeId === 'new_movies') {
        url = `${appConfig.webSite}/cinema/nowplaying/`; // 简化处理，实际可能需要更精准链接
    } else {
        // 默认走热映/即将上映
        url = `${appConfig.webSite}/cinema/nowplaying/`;
    }

    try {
        let response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Cookie': appConfig._cookie,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': appConfig.webSite,
            },
            responseType: ReqResponseType.STRING
        });

        let html = response.result;
        let $ = cheerio.load(html);

        // 根据不同页面结构解析
        if (typeId === 'top250') {
            // Top250 解析逻辑
            $('.grid_view li').each((i, el) => {
                try {
                    let title = $(el).find('.info .title').eq(0).text().trim();
                    let cover = $(el).find('.pic img').attr('src');
                    let detailUrl = $(el).find('.pic a').attr('href');
                    let desc = $(el).find('.inq').text().trim();
                    let score = $(el).find('.rating_num').text().trim();

                    if (title) {
                        let video = new RepVideoList();
                        video.vod_name = title;
                        video.vod_pic = cover;
                        video.vod_remarks = `评分: ${score}`;
                        video.vod_content = desc;
                        video.vod_id = detailUrl; // ID就是详情页链接
                        list.push(video);
                    }
                } catch (e) {}
            });
        } else {
            // 热映/即将上映 解析逻辑 (豆瓣影院页面结构)
            $('#showing-soon .list li, .lists .list li').each((i, el) => {
                try {
                    let title = $(el).find('.title a').text().trim();
                    let cover = $(el).find('.cover img').attr('src');
                    let detailUrl = $(el).find('.title a').attr('href');
                    let info = $(el).find('.subject-abstract').text().trim(); // 导演/演员信息
                    let score = $(el).find('.rating span').text().trim();

                    if (title) {
                        let video = new RepVideoList();
                        video.vod_name = title;
                        video.vod_pic = cover;
                        video.vod_remarks = info.split('/')[0]; // 比如上映日期或类型
                        video.vod_content = info;
                        video.vod_id = detailUrl;
                        list.push(video);
                    }
                } catch (e) {}
            });
        }

    } catch (e) {
        UZUtils.error("获取列表失败", e);
        toast("错误: " + e.message);
    }

    return new RepVideoList(list);
}

// 获取详情页（这里简单处理，直接返回ID作为播放页）
async function getVideoDetail(uzArgs, id) {
    let detail = new RepVideoDetail();
    detail.vod_id = id;
    // 这里的逻辑比较复杂，通常直接跳转到浏览器打开，或者解析播放源
    // 豆瓣主要是信息展示，没有直接的播放源，所以这里做个占位
    detail.vod_play_url = '豆瓣详情$' + id;
    detail.vod_play_from = '浏览器打开';
    return detail;
}

// 获取播放地址
async function getPlayUrl(uzArgs, flag, id) {
    // 豆瓣没有直接播放源，直接返回原链接让系统浏览器打开
    let result = new RepVideoPlayUrl();
    result.playUrl = id;
    return result;
}

// 搜索功能
async function searchVideo(uzArgs, key) {
    let list = [];
    try {
        let url = `${appConfig.webSite}/search?q=${encodeURIComponent(key)}&cat=1002`;
        let response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Cookie': appConfig._cookie,
            },
            responseType: ReqResponseType.STRING
        });
        let html = response.result;
        let $ = cheerio.load(html);

        $('.result-list .result').each((i, el) => {
            try {
                let title = $(el).find('.title a').text().trim();
                let cover = $(el).find('.pic img').attr('src');
                let detailUrl = $(el).find('.title a').attr('href');
                let desc = $(el).find('.subject-cast').text().trim();

                if (title) {
                    let video = new RepVideoList();
                    video.vod_name = title;
                    video.vod_pic = cover;
                    video.vod_remarks = desc;
                    video.vod_id = detailUrl;
                    list.push(video);
                }
            } catch (e) {}
        });
    } catch (e) {
        UZUtils.error("搜索失败", e);
    }
    return new RepVideoList(list);
}

// 👇 关键：这里必须导出，否则就会报你截图里的那个错
export default {
    getClassList: getClassList,
    getVideoList: getVideoList,
    getVideoDetail: getVideoDetail,
    getPlayUrl: getPlayUrl,
    searchVideo: searchVideo,
    appConfig: appConfig,
};
