//@name:TMDB
//@version:8
//@webSite:https://www.themoviedb.org/
//@order:A01
//@isAV:0
//@deprecated:0

// ignore
import { VideoDetail, VideoSubclass, RepVideoClassList, RepVideoSubclassList, RepVideoList, RepVideoDetail, RepVideoPlayUrl } from '../core/uzVideo.js'
import { req, JSONbig } from '../core/uzUtils.js'
// ignore

var K = '0c9ff73a2d99c4ece5f0134e2586c375'
var B = 'https://api.tmdb.org/3'
var I = 'https://image.tmdb.org/t/p/w500'

function makeYearList(s, e) {
    var a = [{ name: '全部', id: '' }]
    for (var y = s; y >= e; y--) a.push({ name: String(y), id: String(y) })
    return a
}

async function getClassList(args) {
    var d = new RepVideoClassList()
    d.data = [
        { type_id: 'movie', type_name: '电影', hasSubclass: true },
        { type_id: 'tv', type_name: '电视剧', hasSubclass: true }
    ]
    return JSON.stringify(d)
}

async function getSubclassList(args) {
    var d = new RepVideoSubclassList()
    var s = [
        { name: '人气降序', id: 'popularity.desc' },
        { name: '评分降序', id: 'vote_average.desc' },
        { name: '上映日期降序', id: 'primary_release_date.desc' }
    ]
    d.data = new VideoSubclass()
    d.data.filter = [
        { name: '年份', list: makeYearList(2026, 1990) },
        { name: '排序', list: s }
    ]
    return JSON.stringify(d)
}

async function getVideoList(args) {
    return await getSubclassVideoList(args)
}

async function getSubclassVideoList(args) {
    var d = new RepVideoList()
    try {
        var t = String(args.url || 'movie')
        var p = Number(args.page || 1)
        var y = args.year || ''
        var s = args.sort || 'popularity.desc'
        var u = ''
        var isTv = false
        if (t === 'movie') {
            u = B + '/discover/movie?api_key=' + K + '&language=zh-CN&sort_by=' + encodeURIComponent(s) + '&page=' + p
        } else {
            isTv = true
            u = B + '/discover/tv?api_key=' + K + '&language=zh-CN&sort_by=' + encodeURIComponent(s) + '&page=' + p
        }
        if (y) u += isTv ? '&first_air_date_year=' + y : '&primary_release_year=' + y
        var r = await req(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
        var j = JSONbig.parse(r.data || '{}')
        var list = []
        var items = j.results || []
        for (var i = 0; i < items.length; i++) {
            var it = items[i]
            var v = new VideoDetail()
            v.vod_id = (isTv ? 'tv_' : 'movie_') + it.id
            v.vod_name = it.title || it.name || ''
            v.vod_pic = it.poster_path ? I + it.poster_path : ''
            v.vod_remarks = '评分 ' + (it.vote_average ? it.vote_average.toFixed(1) : '?')
            list.push(v)
        }
        d.data = list
    } catch (e) {
        d.error = String(e)
    }
    return JSON.stringify(d)
}

async function getVideoDetail(args) {
    var d = new RepVideoDetail()
    try {
        var id = String(args.vod_id || '')
        if (!id) throw new Error('no id')
        var parts = id.split('_')
        var type = parts[0], tid = parts[1]
        var u = B + '/' + (type === 'tv' ? 'tv' : 'movie') + '/' + tid + '?api_key=' + K + '&language=zh-CN'
        var r = await req(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
        var info = JSONbig.parse(r.data || '{}')
        var v = new VideoDetail()
        v.vod_id = id
        v.vod_name = info.title || info.name || ''
        v.vod_pic = info.poster_path ? I + info.poster_path : ''
        v.vod_remarks = '评分 ' + (info.vote_average ? info.vote_average.toFixed(1) : '?')
        v.vod_content = info.overview || ''
        if (info.release_date) v.vod_year = info.release_date.substring(0, 4)
        else if (info.first_air_date) v.vod_year = info.first_air_date.substring(0, 4)
        d.data = v
    } catch (e) {
        d.error = String(e)
    }
    return JSON.stringify(d)
}

async function getVideoPlayUrl(args) {
    var d = new RepVideoPlayUrl()
    d.data.play_url = ''
    return JSON.stringify(d)
}

async function searchVideo(args) {
    var d = new RepVideoList()
    try {
        var kw = String(args.keywords || '')
        if (!kw) throw new Error('no keyword')
        var u = B + '/search/multi?api_key=' + K + '&language=zh-CN&query=' + encodeURIComponent(kw) + '&page=1'
        var r = await req(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
        var j = JSONbig.parse(r.data || '{}')
        var list = []
        var items = j.results || []
        for (var i = 0; i < items.length; i++) {
            var it = items[i]
            if (it.media_type === 'movie' || it.media_type === 'tv') {
                var v = new VideoDetail()
                v.vod_id = it.media_type + '_' + it.id
                v.vod_name = it.title || it.name || ''
                v.vod_pic = it.poster_path ? I + it.poster_path : ''
                v.vod_remarks = '评分 ' + (it.vote_average ? it.vote_average.toFixed(1) : '?')
                list.push(v)
            }
        }
        d.data = list
    } catch (e) {
        d.error = String(e)
    }
    return JSON.stringify(d)
}
