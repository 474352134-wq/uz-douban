//@name:{LHM}豆瓣
//@version:9
//@webSite:https://movie.douban.com
//@remark:使用网页爬取的方式实现豆瓣视频源，已在年份过滤中加入 2026 年（搜索 API 版）
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
   1️⃣ 主分类列表（电影、电视剧、综艺、动漫、纪录片）
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
   2️⃣ 二级过滤器（在每个主分类里都加入 2026 年）
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
        // ★ 关键点：把年份从 2026 开始
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
        // 示例里不需要 2026，可自行改成 makeYearList(2026,1999)
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
   3️⃣ 列表页面（使用豆瓣搜索 API，更稳定）
   ------------------------------------------------- */
async function getVideoList(args) {
  const backData = new RepVideoList()
  try {
    const page = Number(args.page || 1)
    const startIdx = (page - 1) * 20   // 每页 20 条
    const url = `https://movie.douban.com/j/search_subjects?type=movie&tag=热门&sort=recommend&page_limit=20&page_start=${startIdx}`

    const resp = await req(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    })
    const json = JSONbig.parse(resp.data || '{}')
    const list = (json?.subjects || []).map((s) => {
      const vd = new VideoDetail()
      vd.vod_id = s.url
      vd.vod_name = s.title
      vd.vod_pic = s.cover
      vd.vod_remarks = `评分 ${s.rating}`
      return vd
    })
    backData.data = list

    // 调试：显示返回条数（可删）
    toast(`豆瓣列表返回 ${list.length} 条`, 2)
  } catch (e) {
    backData.error = e.toString()
    toast(`列表请求失败: ${e.message}`, 3)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   4️⃣ 详情页（抓取豆瓣单条电影页面）
   ------------------------------------------------- */
async function getVideoDetail(args) {
  const backData = new RepVideoDetail()
  try {
    const detailUrl = String(args.vod_id || '')
    if (!detailUrl) throw new Error('缺少 vod_id')

    const resp = await req(detailUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    })
    const $ = cheerio.load(resp.data || '')

    const detail = new VideoDetail()
    detail.vod_id = detailUrl
    detail.vod_name = $('.subject h1 span').first().text().trim()
    detail.vod_pic = $('.subject .nbg img').attr('src') || ''
    detail.vod_remarks = $('.rating_self .rating_num').text().trim()
    detail.vod_content = $('#link-report .intro p')
      .toArray()
      .map((p) => $(p).text().trim())
      .join('\n')

    // 将年份写入 detail（可选）
    const year = $('.subject .info span[property="v:initialReleaseDate"]')
      .first()
      .text()
      .trim()
    if (year) detail.vod_year = year

    backData.data = detail

    // 调试：显示详情标题（可删）
    toast(`详情: ${detail.vod_name}`, 2)
  } catch (e) {
    backData.error = e.toString()
    toast(`详情请求失败: ${e.message}`, 3)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   5️⃣ 播放地址（豆瓣本体没有资源，这里返回空）
   ------------------------------------------------- */
async function getVideoPlayUrl(args) {
  const backData = new RepVideoPlayUrl()
  // 如有自己解析到的磁力链、网盘链接，可在这里返回
  backData.data.play_url = ''
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   6️⃣ 搜索（使用豆瓣公开搜索接口）
   ------------------------------------------------- */
async function searchVideo(args) {
  const backData = new RepVideoList()
  try {
    const kw = String(args.keywords || '')
    if (!kw) throw new Error('缺少搜索关键字')

    const url = `https://movie.douban.com/j/search_subjects?type=movie&tag=热门&sort=recommend&page_limit=20&page_start=0&keyword=${encodeURIComponent(
      kw
    )}`
    const resp = await req(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    })
    const json = JSONbig.parse(resp.data || '{}')
    const list = (json?.subjects || []).map((s) => {
      const vd = new VideoDetail()
      vd.vod_id = s.url
      vd.vod_name = s.title
      vd.vod_pic = s.cover
      vd.vod_remarks = `评分 ${s.rating}`
      return vd
    })
    backData.data = list

    // 调试：显示搜索结果条数（可删）
    toast(`搜索 "${kw}" 返回 ${list.length} 条`, 2)
  } catch (e) {
    backData.error = e.toString()
    toast(`搜索请求失败: ${e.message}`, 3)
  }
  return JSON.stringify(backData)
}
