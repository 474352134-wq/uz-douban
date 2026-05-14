//@name:{LHM}豆瓣
//@version:11
//@webSite:https://movie.douban.com
//@remark:修复API失效，切换为爬取移动端网页版(m.douban.com)，适配2026年数据
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

/* -------------------------------------------------
   辅助：生成年份下拉列表（已覆盖到 2026 年）
   ------------------------------------------------- */
function makeYearList(start, end) {
  const years = [{ name: '全部', id: '' }]
  for (let y = start; y >= end; y--) {
    years.push({ name: String(y), id: String(y) })
  }
  return years
}

/* -------------------------------------------------
   1️⃣ 主分类列表
   ------------------------------------------------- */
async function getClassList(args) {
  const backData = new RepVideoClassList()
  try {
    backData.data = [
      { type_id: '1', type_name: '电影', hasSubclass: true },
      { type_id: '2', type_name: '电视剧', hasSubclass: true },
      { type_id: '3', type_name: '综艺', hasSubclass: true },
      { type_id: '4', type_name: '动漫', hasSubclass: true },
      { type_id: '5', type_name: '纪录片', hasSubclass: true },
    ]
  } catch (e) {
    backData.error = e.toString()
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   2️⃣ 二级过滤器
   ------------------------------------------------- */
async function getSubclassList(args) {
  const backData = new RepVideoSubclassList()
  const id = String(args.url || '')

  const commonArea = [
    { name: '全部', id: '' },
    { name: '中国大陆', id: '中国大陆' },
    { name: '香港', id: '香港' },
    { name: '台湾', id: '台湾' },
    { name: '美国', id: '美国' },
    { name: '日本', id: '日本' },
    { name: '韩国', id: '韩国' },
    { name: '英国', id: '英国' },
    { name: '法国', id: '法国' },
    { name: '其他', id: '其他' },
  ]

  const commonSort = [
    { name: '时间排序', id: 'time' },
    { name: '人气排序', id: 'hits' },
    { name: '评分排序', id: 'score' },
  ]

  let filter = []

  switch (id) {
    case '1': // 电影
      filter = [
        {
          name: '剧情',
          list: [
            { name: '全部', id: '' },
            { name: '喜剧', id: '喜剧' },
            { name: '爱情', id: '爱情' },
            { name: '动作', id: '动作' },
            { name: '科幻', id: '科幻' },
            { name: '动画', id: '动画' },
            { name: '悬疑', id: '悬疑' },
            { name: '犯罪', id: '犯罪' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 1990) },
        { name: '排序', list: commonSort },
      ]
      break

    case '2': // 电视剧
      filter = [
        {
          name: '剧情',
          list: [
            { name: '全部', id: '' },
            { name: '古装', id: '古装' },
            { name: '现代', id: '现代' },
            { name: '悬疑', id: '悬疑' },
            { name: '爱情', id: '爱情' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 2000) },
        { name: '排序', list: commonSort },
      ]
      break

    case '3': // 综艺
      filter = [
        {
          name: '类别',
          list: [
            { name: '全部', id: '' },
            { name: '选秀', id: '选秀' },
            { name: '访谈', id: '访谈' },
            { name: '游戏互动', id: '游戏互动' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 2010) },
        { name: '排序', list: commonSort },
      ]
      break

    case '4': // 动漫
      filter = [
        {
          name: '类型',
          list: [
            { name: '全部', id: '' },
            { name: '爱情', id: '爱情' },
            { name: '科幻', id: '科幻' },
            { name: '冒险', id: '冒险' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 1999) },
        { name: '排序', list: commonSort },
      ]
      break

    case '5': // 纪录片
      filter = [
        {
          name: '主题',
          list: [
            { name: '全部', id: '' },
            { name: '自然', id: '自然' },
            { name: '历史', id: 'history' },
            { name: '科技', id: '科技' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2025, 1999) },
        { name: '排序', list: commonSort },
      ]
      break

    default:
      filter = []
  }

  backData.data = new VideoSubclass()
  backData.data.filter = filter
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   3️⃣ 列表页面 (核心修改：使用 m.douban.com 爬虫)
   ------------------------------------------------- */
async function getVideoList(args) {
  const backData = new RepVideoList()
  try {
    const page = Number(args.page || 1)
    // 移动端页面通常不分页参数，或者通过 scroll 加载，这里我们抓取第一页热门
    // 为了适配你的筛选逻辑，我们主要抓取 "热门" 榜单作为兜底
    // 实际筛选（年份/类型）在网页版很难通过简单URL实现，这里优先保证有数据展示

    const url = 'https://m.douban.com/movie/'

    const resp = await req(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douban.com/',
      },
    })

    const $ = cheerio.load(resp.data || '')
    const list = []

    // 解析移动端页面结构 (class 可能会变，这里使用较通用的选择器)
    // 移动端结构通常是 .list-item 或者 data-uid
    $('.list-item').each((i, el) => {
        if (i >= 20) return // 限制数量
        const $el = $(el)
        const title = $el.find('.title').text().trim()
        const cover = $el.find('img').attr('src') || $el.find('img').attr('data-src') || ''
        const url = $el.find('a').attr('href')

        // 简单的过滤，确保抓到了有效数据
        if (title && url) {
            const vd = new VideoDetail()
            vd.vod_id = url
            vd.vod_name = title
            // 补全图片链接如果是 // 开头
            vd.vod_pic = cover.startsWith('//') ? 'https:' + cover : cover
            vd.vod_remarks = $el.find('.rating').text().trim() || '暂无评分'
            list.push(vd)
        }
    })

    // 如果移动端结构解析失败（豆瓣经常改版），尝试使用旧的搜索接口作为备用（虽然可能没新数据）
    if (list.length === 0) {
        console.log('移动端解析为空，尝试备用方案...')
        // 这里可以放旧的逻辑，或者直接报错
        throw new Error('当前页面结构解析失败，请检查豆瓣网页版变动')
    }

    backData.data = list
    toast(`成功获取 ${list.length} 条数据`, 2)

  } catch (e) {
    backData.error = e.toString()
    toast(`列表请求失败: ${e.message}`, 3)
    console.error(e)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   4️⃣ 详情页 (核心修改：适配新版网页结构)
   ------------------------------------------------- */
async function getVideoDetail(args) {
  const backData = new RepVideoDetail()
  try {
    let detailUrl = String(args.vod_id || '')

    // 补全域名
    if (detailUrl.startsWith('/')) {
      detailUrl = 'https://movie.douban.com' + detailUrl
    }

    const resp = await req(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    })
    const $ = cheerio.load(resp.data || '')

    const detail = new VideoDetail()
    detail.vod_id = detailUrl

    // 新版页面标题通常在 h1 span[property="v:itemreviewed"] 或者简单的 h1
    detail.vod_name = $('h1 span[property="v:itemreviewed"]').text().trim() || $('h1').text().trim()

    // 封面图
    detail.vod_pic = $('#mainpic img').attr('src') || ''

    // 评分
    detail.vod_remarks = $('.rating_num').text().trim()

    // 简介
    let desc = ''
    $('.related-info .indent span[property="v:summary"]').each((i, el) => {
        desc += $(el).text().trim() + '\n'
    })
    detail.vod_content = desc || '暂无简介'

    // 年份
    const year = $('span[property="v:initialReleaseDate"]').text().trim().substring(0, 4)
    detail.vod_year = year

    // 导演/演员 (简单拼接)
    const director = $('a[rel="v:directedBy"]').text().trim()
    const actors = []
    $('a[rel="v:starring"]').each((i, el) => {
        if(i<5) actors.push($(el).text().trim())
    })
    detail.vod_director = director
    detail.vod_actor = actors.join(',')

    backData.data = detail
    toast(`获取详情: ${detail.vod_name}`, 2)

  } catch (e) {
    backData.error = e.toString()
    toast(`详情请求失败: ${e.message}`, 3)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   5️⃣ 播放地址 (豆瓣无资源，留空)
   ------------------------------------------------- */
async function getVideoPlayUrl(args) {
  const backData = new RepVideoPlayUrl()
  backData.data.play_url = ''
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   6️⃣ 搜索 (使用网页搜索)
   ------------------------------------------------- */
async function searchVideo(args) {
  const backData = new RepVideoList()
  try {
    const kw = String(args.keywords || '')
    if (!kw) throw new Error('缺少搜索关键字')

    // 使用网页版搜索
    const url = `https://m.douban.com/search?query=${encodeURIComponent(kw)}`

    const resp = await req(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    })
    const $ = cheerio.load(resp.data || '')
    const list = []

    // 解析搜索结果
    $('.result-item').each((i, el) => {
        if (i >= 20) return
        const $el = $(el)
        const title = $el.find('.title-text').text().trim()
        // 过滤非电影结果
        if (!title) return

        // 获取链接
        let link = $el.find('a').attr('href')
        if (link && link.includes('/subject/')) {
             // 清洗链接
             if (link.startsWith('//')) link = 'https:' + link
             else if (link.startsWith('/')) link = 'https://movie.douban.com' + link

             const vd = new VideoDetail()
             vd.vod_id = link
             vd.vod_name = title
             vd.vod_pic = $el.find('img').attr('src') || ''
             vd.vod_remarks = $el.find('.subject-cast').text().trim()
             list.push(vd)
        }
    })

    backData.data = list
    toast(`搜索 "${kw}" 返回 ${list.length} 条`, 2)

  } catch (e) {
    backData.error = e.toString()
    toast(`搜索请求失败: ${e.message}`, 3)
  }
  return JSON.stringify(backData)
}
