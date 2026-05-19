// ignore

//@name:豆瓣电影列表源
//@webSite:https://movie.douban.com
//@version:2
//@remark:提供豆瓣热映、Top250列表，并支持跳转搜索播放
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

const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
}

// ==================== 1. 获取分类列表 (首页显示的菜单) ====================
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        // 手动定义三个核心分类
        let class1 = new VideoClass()
        class1.type_name = "🔥 豆瓣热映"
        class1.type_id = "nowplaying" // 标识符

        let class2 = new VideoClass()
        class2.type_name = "⏳ 即将上映"
        class2.type_id = "soon"

        let class3 = new VideoClass()
        class3.type_name = "🏆 豆瓣Top250"
        class3.type_id = "top250"

        backData.class = [class1, class2, class3]
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// ==================== 2. 获取视频列表 (点击分类后显示的列表) ====================
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        let page = args.page || 1
        let typeId = args.classId // 获取点击的分类ID (nowplaying, soon, top250)
        let url = ''

        // 根据不同分类拼接豆瓣URL
        if (typeId === 'nowplaying') {
            url = `${appConfig.webSite}/cinema/nowplaying/` // 热映
        } else if (typeId === 'soon') {
            url = `${appConfig.webSite}/cinema/soon/` // 即将上映
        } else if (typeId === 'top250') {
            let start = (page - 1) * 25
            url = `${appConfig.webSite}/top250?start=${start}` // Top250分页
        }

        // 发起请求
        const response = await req({
            url: url,
            method: 'GET',
            responseType: ReqResponseType.TEXT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': appConfig.webSite
            }
        })

        if (response.code !== 200) {
            throw new Error(`网络错误: ${response.code}`)
        }

        const $ = cheerio.load(response.body)
        let videoList = []

        // --- 解析热映和即将上映 (结构相同) ---
        if (typeId === 'nowplaying' || typeId === 'soon') {
            // 豆瓣热映列表通常在 #nowplaying 或 .lists 下
            $('.lists .item').each((i, elem) => {
                try {
                    let title = $(elem).attr('data-title') || $(elem).find('img').attr('alt')
                    let url = $(elem).find('a').attr('href')
                    let cover = $(elem).find('img').attr('src')

                    // 清洗封面链接 (去除 ?xxx 参数，防止加载失败)
                    if (cover && cover.includes('?')) {
                        cover = cover.split('?')[0]
                    }

                    if (title && url) {
                        let video = new VideoDetail() // 这里暂时用 VideoDetail 结构凑数据，UZ 会自动转换，或者你可以 new 一个简易对象
                        // 实际上 UZ 的 RepVideoList 需要的是包含特定字段的对象
                        // 我们直接 push 一个符合规范的纯对象更稳妥
                        videoList.push({
                            vod_name: title,
                            vod_pic: cover,
                            vod_remarks: $(elem).find('.subject-cast').text(), // 演员表作为备注
                            vod_id: url, // 详情页链接作为ID
                            vod_play_url: '搜索播放$SEARCH' // 关键：标记为搜索播放
                        })
                    }
                } catch (e) { console.log(e) }
            })
        }

        // --- 解析 Top250 ---
        else if (typeId === 'top250') {
            $('#content .grid_view .item').each((i, elem) => {
                try {
                    let title = $(elem).find('.info .title').text()
                    let url = $(elem).find('.pic a').attr('href')
                    let cover = $(elem).find('.pic img').attr('src')
                    let rating = $(elem).find('.rating_num').text()

                    if (cover && cover.includes('?')) {
                        cover = cover.split('?')[0]
                    }

                    if (title && url) {
                        videoList.push({
                            vod_name: title,
                            vod_pic: cover,
                            vod_remarks: '评分: ' + rating,
                            vod_id: url,
                            vod_play_url: '搜索播放$SEARCH'
                        })
                    }
                } catch (e) { console.log(e) }
            })
        }

        backData.list = videoList
        backData.page = page
        backData.pagecount = typeId === 'top250' ? 10 : 1 // 简单分页处理，Top250大约10页，其他暂不分页

    } catch (error) {
        backData.error = error.toString()
        toast("抓取失败: " + error.toString())
    }
    return JSON.stringify(backData)
}

// ==================== 3. 获取详情 (核心：点击后触发搜索) ====================
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        // args.vodId 就是我们在 getVideoList 里传的详情页链接 (例如 https://movie.douban.com/subject/1292052/)
        const detailUrl = args.vodId

        // 1. 请求豆瓣详情页，获取精准的电影名称
        const response = await req({
            url: detailUrl,
            method: 'GET',
            responseType: ReqResponseType.TEXT,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        let movieName = ""
        if (response.code === 200) {
            const $ = cheerio.load(response.body)
            // 获取 span[property="v:itemreviewed"] 的文本
            movieName = $('span[property="v:itemreviewed"]').text().trim()
        }

        // 如果没抓取到名字，尝试从URL或者参数里凑一个（防止失败）
        if (!movieName) {
            movieName = detailUrl // 兜底
        }

        // 2. 构造返回数据
        // 这里我们不返回具体的集数，而是返回一个特殊的标记，告诉 UZ 去搜索
        backData.vod_name = movieName
        backData.vod_pic = "" // 可选：再次请求获取海报
        backData.vod_content = "点击播放按钮，UZ将自动搜索全网资源进行播放。"
        backData.vod_play_from = "全网搜索源"
        // 格式：集数名称$搜索关键词
        backData.vod_play_url = `点击搜索《${movieName}》$${encodeURIComponent(movieName)}`

    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// ==================== 4. 播放地址 (这里其实不会走到这里，因为上面返回的是搜索标记) ====================
// 但为了完整性，如果上面返回的是真实链接，这里需要解析。
// 针对本需求，主要是为了处理上面的 $SEARCH 逻辑（如果UZ内部机制需要）
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        // 如果 getVideoDetail 返回的是豆瓣链接，这里其实不需要做太多
        // UZ 的核心逻辑通常是在 getVideoDetail 返回特殊的播放字符串时自动处理
        // 或者你可以在这里写：return JSON.stringify({url: args.playUrl})
        backData.url = args.playUrl
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// ==================== 5. 搜索 (如果用户在UZ首页直接搜索，也会走这里) ====================
async function searchVideo(args) {
    // 可以直接调用 getVideoList 的逻辑，或者留空让用户去详情页触发
    // 这里简单实现：直接返回空，主要依赖详情页跳转
    var backData = new RepVideoList()
    return JSON.stringify(backData)
}

// ignore
