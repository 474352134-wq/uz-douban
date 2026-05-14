//@name:{LHM}TMDB视频源
//@version:3
//@webSite:https://www.themoviedb.org/
//@remark:使用TMDB API获取电影、电视剧、综艺、动漫、纪录片，年份筛选已覆盖至2026年
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

var TMDB_API_KEY = '0c9ff73a2d99c4ece5f0134e2586c375';
var TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
var TMDB_API_BASE = 'https://api.themoviedb.org/3';

function makeYearList(start, end) {
  var years = [{ name: '全部', id: '' }];
  for (var y = start; y >= end; y--) {
    years.push({ name: String(y), id: String(y) });
  }
  return years;
}

async function getClassList(args) {
  var backData = new RepVideoClassList();
  backData.data = [
    { type_id: 'movie', type_name: '电影', hasSubclass: true },
    { type_id: 'tv', type_name: '电视剧', hasSubclass: true },
    { type_id: 'variety', type_name: '综艺', hasSubclass: true },
    { type_id: 'anime', type_name: '动漫', hasSubclass: true },
    { type_id: 'documentary', type_name: '纪录片', hasSubclass: true }
  ];
  return JSON.stringify(backData);
}

async function getSubclassList(args) {
  var backData = new RepVideoSubclassList();
  var commonSort = [
    { name: '人气降序', id: 'popularity.desc' },
    { name: '人气升序', id: 'popularity.asc' },
    { name: '评分降序', id: 'vote_average.desc' },
    { name: '评分升序', id: 'vote_average.asc' },
    { name: '上映日期降序', id: 'primary_release_date.desc' },
    { name: '上映日期升序', id: 'primary_release_date.asc' }
  ];
  var filter = [
    { name: '年份', list: makeYearList(2026, 1990) },
    { name: '排序', list: commonSort }
  ];
  backData.data = new VideoSubclass();
  backData.data.filter = filter;
  return JSON.stringify(backData);
}

async function getVideoList(args) {
  var backData = new RepVideoList();
  try {
    var type = args.url || args.id || args.type || 'movie';
    type = String(type);
    var page = Number(args.page || args.p || 1);
    var year = args.year || '';
    var sort = args.sort || 'popularity.desc';

    var apiUrl = '';
    var isTV = false;

    if (type === 'movie') {
      apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&include_adult=false';
    } else if (type === 'tv') {
      isTV = true;
      apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&include_adult=false';
    } else if (type === 'variety') {
      isTV = true;
      apiUrl = TMDB_API_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=10764';
    } else if (type === 'anime') {
      apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=16';
    } else if (type === 'documentary') {
      apiUrl = TMDB_API_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&sort_by=' + encodeURIComponent(sort) + '&page=' + page + '&with_genres=99';
    } else {
      apiUrl = TMDB_API_BASE + '/movie/popular?api_key=' + TMDB_API_KEY + '&language=zh-CN&page=' + page;
    }

    if (year) {
      if (isTV) {
        apiUrl += '&first_air_date_year=' + year;
      } else {
        apiUrl += '&primary_release_year=' + year;
      }
    }

    var resp = await req(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    var json = JSONbig.parse(resp.data || '{}');
    var results = json.results || [];
    var list = [];

    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var vd = new VideoDetail();
      vd.vod_id = (isTV ? 'tv_' : 'movie_') + item.id;
      vd.vod_name = item.title || item.name || '';
      vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : '';
      vd.vod_remarks = '评分 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A');
      list.push(vd);
    }

    backData.data = list;
    if (list.length === 0) {
      toast('未获取到数据，请检查网络或分类筛选条件', 2);
    }
  } catch (e) {
    backData.error = e.toString();
    toast('列表请求失败: ' + e.toString(), 3);
  }
  return JSON.stringify(backData);
}

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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
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
  } catch (e) {
    backData.error = e.toString();
    toast('详情请求失败: ' + e.message, 3);
  }
  return JSON.stringify(backData);
}

async function getVideoPlayUrl(args) {
  var backData = new RepVideoPlayUrl();
  backData.data.play_url = '';
  return JSON.stringify(backData);
}

async function searchVideo(args) {
  var backData = new RepVideoList();
  try {
    var kw = String(args.keywords || args.wd || '');
    if (!kw) throw new Error('缺少搜索关键字');

    var url = TMDB_API_BASE + '/search/multi?api_key=' + TMDB_API_KEY + '&language=zh-CN&query=' + encodeURIComponent(kw) + '&page=1';
    var resp = await req(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
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
    if (list.length === 0) {
      toast('未搜索到相关结果', 2);
    }
  } catch (e) {
    backData.error = e.toString();
    toast('搜索失败: ' + e.message, 3);
  }
  return JSON.stringify(backData);
}
