//@name:[腾讯] 腾讯视频源
//@version:22
//@webSite:https://v.qq.com
//@remark:适用于UZ影视的腾讯视频源（改自PPnix）
//@order:A05
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

const cheerio = require('cheerio');
const runner = require('spider_runner');
runner.run(module.exports);

module.exports = { getClassList, getVideoList, getVideoDetail, getVideoPlayUrl, searchVideo, getSubclassList, getSubclassVideoList };

const appConfig = {
    _webSite: 'https://v.qq.com',
    get webSite() { return this._webSite },
    set webSite(v) { this._webSite = v },
    headers(referer) {
        return {
            "Referer": referer || this._webSite + '/cn/',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(v) { this._uzTag = v },
}

/** 分类列表 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        backData.data = [
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
        ]
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

/** 获取分类视频列表 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        const pageIdx = args.page > 1 ? args.page - 1 : ''
        const url = `${appConfig.webSite}/cn/${args.url}/---${pageIdx}-newstime.html`
        const resp = await OmniBox.request(url, { method: 'GET', headers: appConfig.headers() })
        const $ = cheerio.load(resp.data)
        $('.lists-content ul li').each((_, li) => {
            const video = new VideoDetail()
            const $a = $(li).find('a').first()
            video.vod_id = $a.attr('href')
            video.vod_name = $a.find('img').attr('alt')
            video.vod_pic = $a.find('img').attr('src')
            video.vod_remarks = $(li).find('.orange, footer').first().text().trim()
            const score = $(li).find('.rate').text().trim()
            if (score && score !== '0.0') video.topRightRemarks = '评分 ' + score
            backData.data.push(video)
        })
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

/** 获取视频详情 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        const url = appConfig.webSite + args.url
        const resp = await OmniBox.request(url, { method: 'GET', headers: appConfig.headers() })
        const $ = cheerio.load(resp.data)
        const video = new VideoDetail()
        video.vod_id = args.url
        const titleRaw = $('h1.product-title').text().trim()
        video.vod_name = titleRaw.replace(/\s*\([^)]*\)\s*$/,'')
        video.vod_pic = $('.product-header img').attr('src')
        video.vod_year = (titleRaw.match(/\((\d{4})\)/)||[])[1]||''
        video.vod_director = $(".product-excerpt:contains('导演：') span").text().trim()
        video.vod_actor = $(".product-excerpt:contains('主演：') span").text().trim().replace(/\s*\/\s*/g,",")
        video.vod_content = $(".product-excerpt:contains('简介：')").text().replace('简介：','').trim()
        // 解析 m3u8 信息
        const html = resp.data
        const infoId = (html.match(/infoid\s*=\s*(\d+)/)||[])[1] || (args.url.match(/(\d+)\.html/)||[])[1]
        const m3u8Match = html.match(/m3u8\s*=\s*\[(.*?)\]/s)
        const episodes = []
        if (m3u8Match) {
            const re = /'([^']*)'|"([^"]*)"/g
            let m
            while ((m = re.exec(m3u8Match[1])) !== null) {
                const ep = m[1]||m[2]
                if (ep) episodes.push(`${ep}$${infoId}|${encodeURIComponent(ep)}|${encodeURIComponent(url)}`)
            }
        }
        if (episodes.length) {
            video.vod_play_from = "PPnix"
            video.vod_play_url = episodes.join('#')
        }
        backData.data = video
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

/** 获取播放地址 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        const parts = args.url.split('|')
        const infoId = parts[0]
        const param = decodeURIComponent(parts[1])
        const referer = decodeURIComponent(parts[2])
        const src = `${appConfig.webSite}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`
        backData.url = src
        backData.headers = appConfig.headers(referer)
        backData.parse = 0
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

/** 搜索视频 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        const kw = encodeURIComponent(args.searchWord)
        const pagePart = args.page>1 ? `-page-${args.page}` : ''
        const url = `${appConfig.webSite}/cn/search/${kw}--.html${pagePart}`
        const resp = await OmniBox.request(url, { method: 'GET', headers: appConfig.headers() })
        const $ = cheerio.load(resp.data)
        $('.lists-content ul li').each((_, el) => {
            const video = new VideoDetail()
            const $a = $(el).find('a').first()
            video.vod_id = $a.attr('href')
            video.vod_name = $a.find('img').attr('alt') || $a.attr('title')
            video.vod_pic = $a.find('img').attr('src')
            video.vod_remarks = $(el).find('footer').text().trim()
            backData.data.push(video)
        })
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

// 保持原样
async function getSubclassList(args){return JSON.stringify(new RepVideoSubclassList())}
async function getSubclassVideoList(args){return JSON.stringify(new RepVideoList())}