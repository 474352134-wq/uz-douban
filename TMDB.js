//@name:{LHM}TMDB视频源
//@version:5
//@webSite:https://www.themoviedb.org/
//@remark:使用TMDB API，年份筛选已覆盖至2026年，修复网络与解析问题
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
    UZUtils,
    ProData,
    ReqResponseType,
    ReqAddressType,
    req,
    getEnv,
    setEnv,
    goToVerify,
    openWebToBindEnv,
    toast,
    kIsDesktop,
    kIsAndroid,
    kIsIOS,
    kIsWindows,
    kIsMacOS,
    kIsTV,
    kLocale,
    kAppVersion,
    formatBackData,
} from '../core/uzUtils.js'

import { cheerio, Crypto, Encrypt, JSONbig } from '../core/uz3lib.js'
// ignore

// 关键修改：使用已知国内可用的旧 API 域名
var TMDB_API_KEY = '0c9ff73a2d99c4ece5f0134e2586c375';
var TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
var TMDB_API_BASE = 'https://api.tmdb.org/3';

function makeYearList(start, end) {
    var years = [{ name: '全部', id: '' }];
    for (var y = start; y >= end; y--) {
        years.push({ name: String(y), id: String(y) });
    }
    return years;
}

/**
 * 主分类列表
 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        backData.data = [
            { type_id: 'movie', type_name: '电影', hasSubclass: true },
            { type_id: 'tv', type_name: '电视剧', hasSubclass: true },
            { type_id: 'variety', type_name: '综艺', hasSubclass: true },
            { type_id: 'anime', type_name: '动漫', hasSubclass: true },
            { type_id: 'documentary', type_name: '纪录片', hasSubclass: true }
        ]
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 二级分类筛选列表
 */
async function getSubclassList(args) {
    var backData = new RepVideoSubclassList()
    try {
        var commonSort = [
            { name: '人气降序', id: 'popularity.desc' },
            { name: '人气升序', id: 'popularity.asc' },
            { name: '评分降序', id: 'vote_average.desc' },
            { name: '评分升序', id: 'vote_average.asc' },
            { name: '上映日期降序', id: 'primary_release_date.desc' },
            { name: '上映日期升序', id: 'primary_release_date.asc' }
        ]
        var filter = [
            { name: '年份', list: makeYearList(2026, 1990) },
            { name: '排序', list: commonSort }
        ]
        backData.data = new VideoSubclass()
        backData.data.filter = filter
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取分类视频列表（默认进入）
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        var type = String(args.url || 'movie')
        var page = Number(args.page || 1)
        var list = await fetchTMDBList(type, page, '', 'popularity.desc')
        backData.data = list
    } catch (error) {
        backData.error = error.toString()
        toast('列表加载失败: ' + (error.message || error.toString()), 3)
    }
    return JSON.stringify(backData)
}

/**
 * 获取二级分类视频列表（筛选后）—— 关键函数
 */
async function getSubclassVideoList(args) {
    var backData = new RepVideoList()
    try {
        var type = String(args.url || 'movie')
        var page = Number(args.page || 1)
        var year = args.year || ''
        var sort = args.sort || 'popularity.desc'
        var list = await fetchTMDBList(type, page, year, sort)
        backData.data = list
    } catch (error) {
        backData.error = error.toString()
        toast('筛选列表加载失败: ' + (error.message || error.toString()), 3)
    }
    return JSON.stringify(backData)
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var vodId = String(args.vod_id || '')
        if (!vodId) throw new Error('缺少 vod_id')

        var parts = vodId.split('_')
        var mediaType = parts[0]
        var tmdbId = parts[1]

        var detailUrl = ''
        if (mediaType === 'tv') {
            detailUrl = TMDB_API_BASE + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=zh-CN'
        } else {
            detailUrl = TMDB_API_BASE + '/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=zh-CN'
        }

        var resp = await req(detailUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        })

        var info = JSONbig.parse(resp.data || '{}')
        var detail = new VideoDetail()
        detail.vod_id = vodId
        detail.vod_name = info.title || info.name || ''
        detail.vod_pic = info.poster_path ? (TMDB_IMAGE_BASE + info.poster_path) : ''
        detail.vod_remarks = '评分 ' + (info.vote_average ? info.vote_average.toFixed(1) : 'N/A')
        detail.vod_content = info.overview || '暂无简介'

        if (info.release_date) {
            detail.vod_year = info.release_date.substring(0, 4)
        } else if (info.first_air_date) {
            detail.vod_year = info.first_air_date.substring(0, 4)
        }

        backData.data = detail
    } catch (error) {
        backData.error = error.toString()
        toast('详情请求失败: ' + (error.message || error.toString()), 3)
    }
    return JSON.stringify(backData)
}

/**
 * 获取播放地址（留空）
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    backData.data.play_url = ''
    return JSON.stringify(backData)
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        var kw = String(args.keywords || '')
        if (!kw) throw new Error('缺少搜索关键字')

        var url = TMDB_API_BASE + '/search/multi?api_key=' + TMDB_API_KEY + '&language=zh-CN&query=' + encodeURIComponent(kw) + '&page=1'
        var resp = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        })

        var json = JSONbig.parse(resp.data || '{}')
        var results = json.results || []
        var list = []
        for (var i = 0; i < results.length; i++) {
            var item = results[i]
            if (item.media_type === 'movie' || item.media_type === 'tv') {
                var vd = new VideoDetail()
                vd.vod_id = item.media_type + '_' + item.id
                vd.vod_name = item.title || item.name || ''
                vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : ''
                vd.vod_remarks = '评分 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A')
                list.push(vd)
            }
        }
        backData.data = list
        if (list.length === 0) {
            toast('未搜索到相关结果', 2)
        }
    } catch (error) {
        backData.error = error.toString()
        toast('搜索失败: ' + (error.message || error.toString()), 3)
    }
    return JSON.stringify(backData)
}

// ========== 辅助函数：请求 TMDB 列表（修复版） ==========
async function fetchTMDBList(type, page, year, sort) {
    var apiUrl = ''
    var isTV = false

    if (type === 'movie') {
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&include_adult=false'
    } else if (type === 'tv') {
        isTV = true
        apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&include_adult=false'
    } else if (type === 'variety') {
        isTV = true
        apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=10764'
    } else if (type === 'anime') {
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=16'
    } else if (type === 'documentary') {
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=99'
    } else {
        apiUrl = TMDB_API_BASE + '/movie/popular?api_key=' + TMDB_API_KEY + '&language=zh-CN&page=' + page
    }

    if (year) {
        if (isTV) {
            apiUrl += '&first_air_date_year=' + year
        } else {
            apiUrl += '&primary_release_year=' + year
        }
    }

    // 调试：可以在这里弹出请求的地址，检查参数是否正确
    // toast('请求地址: ' + apiUrl, 2)

    var resp = await req(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
    })

    // 检查响应状态
    if (resp.statusCode !== 200) {
        throw new Error('HTTP状态码: ' + resp.statusCode + '，响应内容: ' + (resp.data || '').substring(0, 100))
    }

    var json = JSONbig.parse(resp.data || '{}')
    // TMDB 有时会把错误信息放在 status_message 里
    if (json.status_message) {
        throw new Error('TMDB错误: ' + json.status_message)
    }

    var results = json.results || []
    var list = []

    for (var i = 0; i < results.length; i++) {
        var item = results[i]
        var vd = new VideoDetail()
        vd.vod_id = (isTV ? 'tv_' : 'movie_') + item.id
        vd.vod_name = item.title || item.name || ''
        vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : ''
        vd.vod_remarks = '评分 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A')
        list.push(vd)
    }

    return list
}
