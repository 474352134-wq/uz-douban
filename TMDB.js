//@name:TMDB视频源
//@version:1
//@webSite:https://www.themoviedb.org/
//@remark:支持电影、电视剧、综艺、动漫、纪录片，年份筛选至2026年
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

/* -------------------------------------------------
   全局配置
   ------------------------------------------------- */
var TMDB_API_KEY = '0c9ff73a2d99c4ece5f0134e2586c375';
var TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
var TMDB_API_BASE = 'https://api.themoviedb.org/3';

/* -------------------------------------------------
   辅助函数：生成年份列表（2026 - 1990）
   ------------------------------------------------- */
function makeYearList(start, end) {
  var years = [{ name: '全部', id: '' }];
  for (var y = start; y >= end; y--) {
    years.push({ name: String(y), id: String(y) });
  }
  return years;
}

/* -------------------------------------------------
   1️⃣ 主分类列表
   ------------------------------------------------- */
async function getClassList(args) {
  var backData = new RepVideoClassList();
  try {
    backData.data = [
      { type_id: 'movie', type_name: '电影', hasSubclass: true },
      { type_id: 'tv', type_name: '电视剧', hasSubclass: true },
      { type_id: 'variety', type_name: '综艺', hasSubclass: true },
      { type_id: 'anime', type_name: '动漫', hasSubclass: true },
      { type_id: 'documentary', type_name: '纪录片', hasSubclass: true },
    ];
    toast('TMDB视频源加载成功', 2);
  } catch (e) {
    backData.error = e.toString();
  }
  return JSON.stringify(backData);
}

/* -------------------------------------------------
   2️⃣ 二级分类列表（年份 + 排序）
   ------------------------------------------------- */
async function getSubclassList(args) {
  var backData = new RepVideoSubclassList();
  var typeId = String(args.url || 'movie');

  var commonSort = [
    { name: '人气降序', id: 'popularity.desc' },
    { name: '人气升序', id: 'popularity.asc' },
    { name: '评分降序', id: 'vote_average.desc' },
    { name: '评分升序', id: 'vote_average.asc' },
    { name: '上映日期降序', id: 'primary_release_date.desc' },
    { name: '上映日期升序', id: 'primary_release_date.asc' },
  ];

  var filter = [
    { name: '年份', list: makeYearList(2026, 1990) },
    { name: '排序', list: commonSort },
  ];

  backData.data = new VideoSubclass();
  backData.data.filter = filter;
  return JSON.stringify(backData);
}

/* -------------------------------------------------
   3️⃣ 视频列表（核心）
   ------------------------------------------------- */
async function getVideoList(args) {
  var backData = new RepVideoList();
  try {
    var type = String(args.url || 'movie');
    var page = Number(args.page || 1);
    var year = args.year || '';
    var sort = args.sort || 'popularity.desc';

    var apiUrl = '';
    var isTV = false;

    // 根据分类构建不同的TMDB API请求
    switch (type) {
      case 'movie':
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&sort_by=' + encodeURIComponent(sort) +
                 '&page=' + page + '&include_adult=false';
        break;
      case 'tv':
        isTV = true;
        apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&sort_by=' + encodeURIComponent(sort) +
                 '&page=' + page + '&include_adult=false';
        break;
      case 'variety':
        apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&sort_by=' + encodeURIComponent(sort) +
                 '&page=' + page + '&with_genres=10764'; // Talk Show
        break;
      case 'anime':
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&sort_by=' + encodeURIComponent(sort) +
                 '&page=' + page + '&with_genres=16'; // 动画
        break;
      case 'documentary':
        apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&sort_by=' + encodeURIComponent(sort) +
                 '&page=' + page + '&with_genres=99'; // 纪录片
        break;
      default:
        apiUrl = TMDB_API_BASE + '/movie/popular?api_key=' + TMDB_API_KEY +
                 '&language=zh-CN&page=' + page;
    }

    if (year) {
      apiUrl += isTV ? '&first_air_date_year=' + year : '&primary_release_year=' + year;
    }

    var resp = await req(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    var json = JSONbig.parse(resp.data || '{}');
    var results = json.results || [];
    var list = results.map(function(item) {
      var vd = new VideoDetail();
      vd.vod_id = (isTV ? 'tv_' : 'movie_') + item.id;
      vd.vod_name = item.title || item.name || '';
      vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : '';
      vd.vod_remarks = '评分 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A');
      return vd;
    });

    backData.data = list;
    toast('TMDB 返回 ' + list.length + ' 条数据', 2);
  } catch (e) {
    backData.error = e.toString();
    toast('列表请求失败: ' + e.message, 3);
  }
  return JSON.stringify(backData);
}

/* -------------------------------------------------
   4️⃣ 视频详情
   ------------------------------------------------- */
async function getVideoDetail(args) {
  var backData = new RepVideoDetail();
  try {
    var vodId = String(args.vod_id || '');
    if (!vodId) throw new Error('缺少 vod_id');

    var parts = vodId.split('_');
    var mediaType = parts[0];
    var tmdbId = parts[1];

    var detailUrl = '';
    if (mediaType === 'tv') {
      detailUrl = TMDB_API_BASE + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=zh-CN';
    } else {
      detailUrl = TMDB_API_BASE + '/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=zh-CN';
    }

    var resp = await req(detailUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    var info = JSONbig.parse(resp.data || '{}');
    var detail = new VideoDetail();
    detail.vod_id = vodId;
    detail.vod_name = info.title || info.name || '';
    detail.vod_pic = info.poster_path ? (TMDB_IMAGE_BASE + info.poster_path) : '';
    detail.vod_remarks = '评分 ' + (info.vote_average ? info.vote_average.toFixed(1) : 'N/A');
    detail.vod_content = info.overview || '暂无简介';
    if (info.release_date) {
      detail.vod_year = info.release_date.substring(0, 4);
    } else if (info.first_air_date) {
      detail.vod_year = info.first_air_date.substring(0, 4);
    }
    backData.data = detail;
    toast('详情: ' + detail.vod_name, 2);
  } catch (e) {
    backData.error = e.toString();
    toast('详情请求失败: ' + e.message, 3);
  }
  return JSON.stringify(backData);
}

/* -------------------------------------------------
   5️⃣ 播放地址（留空）
   ------------------------------------------------- */
async function getVideoPlayUrl(args) {
  var backData = new RepVideoPlayUrl();
  backData.data.play_url = '';
  return JSON.stringify(backData);
}

/* -------------------------------------------------
   6️⃣ 搜索功能
   ------------------------------------------------- */
async function searchVideo(args) {
  var backData = new RepVideoList();
  try {
    var kw = String(args.keywords || '');
    if (!kw) throw new Error('缺少搜索关键字');

    var url = TMDB_API_BASE + '/search/multi?api_key=' + TMDB_API_KEY +
              '&language=zh-CN&query=' + encodeURIComponent(kw) + '&page=1';
    var resp = await req(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    var json = JSONbig.parse(resp.data || '{}');
    var results = json.results || [];
    var list = [];
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        var vd = new VideoDetail();
        vd.vod_id = item.media_type + '_' + item.id;
        vd.vod_name = item.title || item.name || '';
        vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : '';
        vd.vod_remarks = '评分 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A');
        list.push(vd);
      }
    }
    backData.data = list;
    toast('搜索到 ' + list.length + ' 条结果', 2);
  } catch (e) {
    backData.error = e.toString();
    toast('搜索失败: ' + e.message, 3);
  }
  return JSON.stringify(backData);
}
