//@name:{LHM}TMDB调试版
//@version:6
//@webSite:https://www.themoviedb.org/
//@remark:纯调试用
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// ignore
import {
    FilterLabel,
    FilterTitle,
    VideoClass,
    VideoSubclass,
    VideoDetail,
    RepVideoClassList,
    RepVideoSubclassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    UZArgs,
    UZSubclassVideoListArgs,
} from '../core/uzVideo.js'

import {
    req,
    toast,
    JSONbig,
} from '../core/uzUtils.js'
// ignore

var TMDB_API_KEY = '0c9ff73a2d99c4ece5f0134e2586c375';

async function getClassList(args) {
    var backData = new RepVideoClassList();
    try {
        // 调试：直接尝试请求 TMDB 热门电影
        var testUrl = 'https://api.tmdb.org/3/movie/popular?api_key=' + TMDB_API_KEY + '&language=zh-CN&page=1';
        var resp = await req(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        
        // 把服务器返回的原始数据截取前200个字符弹出来
        var raw = String(resp.data).substring(0, 200);
        toast('原始数据: ' + raw, 5);
        
        // 如果成功，返回一个基本分类
        backData.data = [
            { type_id: 'movie', type_name: '电影', hasSubclass: true }
        ];
    } catch (e) {
        // 强制转字符串
        var errMsg = '';
        try {
            errMsg = JSON.stringify(e);
        } catch (e2) {
            errMsg = String(e);
        }
        toast('请求失败: ' + errMsg, 3);
        backData.error = errMsg;
    }
    return JSON.stringify(backData);
}

// 其他函数保持空实现，只为了不报错
async function getSubclassList(args) {
    var backData = new RepVideoSubclassList();
    return JSON.stringify(backData);
}

async function getVideoList(args) {
    var backData = new RepVideoList();
    return JSON.stringify(backData);
}

async function getSubclassVideoList(args) {
    var backData = new RepVideoList();
    return JSON.stringify(backData);
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    return JSON.stringify(backData);
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    backData.data.play_url = '';
    return JSON.stringify(backData);
}

async function searchVideo(args) {
    var backData = new RepVideoList();
    return JSON.stringify(backData);
}
