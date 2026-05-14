// ignore

//@name:豆瓣电影热映
//@webSite:https://movie.douban.com
//@version:23
//@remark:纯原生代码，无Import依赖
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// ignore

/**
 * 核心配置
 */
// ⚠️ 必须替换为你抓包获取的 Cookie，否则无法访问豆瓣接口
var MY_COOKIE = 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0';

// 豆瓣搜索接口
var BASE_URL = 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=';

/**
 * 入口函数
 * UZ 播放器会自动调用此函数
 * args: 包含 page (页码) 等信息
 */
function getVideoList(args) {
    // 1. 计算分页
    var page = args.page || 1;
    var start = (page - 1) * 20;
    var url = BASE_URL + start;

    // 2. 发起网络请求
    // 使用 UZ 内置的 req 对象，不依赖 import
    var res = req(url, {
        headers: {
            'Cookie': MY_COOKIE,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://movie.douban.com/',
            'Accept': 'application/json'
        },
        method: 'GET'
    });

    // 3. 处理响应
    if (res && res.code === 200 && res.body) {
        try {
            var data = JSON.parse(res.body);
            if (data.subjects && data.subjects.length > 0) {
                var list = [];
                data.subjects.forEach(function(item) {
                    list.push({
                        vod_id: item.id,          // 视频ID
                        vod_name: item.title,     // 视频标题
                        vod_pic: item.cover,      // 封面图
                        vod_remarks: item.rate    // 评分
                    });
                });

                // 返回结果给 UZ
                return {
                    list: list,
                    page: page,
                    pagecount: data.subjects.length === 20 ? page + 1 : page // 简单分页逻辑
                };
            }
        } catch (e) {
            console.log('解析JSON失败: ' + e);
        }
    }

    // 请求失败或无数据
    return { list: [], page: page, pagecount: page };
}
