// ignore

//@name:豆瓣电影热映
//@webSite:https://movie.douban.com
//@version:22
//@remark:修复ReferenceError，使用原生请求
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// ignore

/**
 * 配置区域
 */
// ⚠️ 必须替换为你自己的 Cookie，否则无法获取数据
var MY_COOKIE = 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0';

// 豆瓣接口
var API_URL = 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=';

/**
 * 入口函数
 * UZ 播放器会调用这个函数来获取数据
 */
function getVideoList(args) {
    // 1. 检查参数
    var page = args.page || 1;
    var start = (page - 1) * 20; // 豆瓣每页20条

    // 2. 构建请求
    var url = API_URL + start;

    try {
        // 3. 发起同步请求 (UZ 环境支持)
        var response = req(url, {
            method: 'GET',
            headers: {
                'Cookie': MY_COOKIE,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Accept': 'application/json'
            }
        });

        // 4. 解析 JSON
        var data = JSON.parse(response);

        if (!data.subjects || data.subjects.length === 0) {
            return JSON.stringify({ code: 0, msg: "无数据", list: [] });
        }

        // 5. 转换数据格式为 UZ 标准
        var list = [];
        for (var i = 0; i < data.subjects.length; i++) {
            var item = data.subjects[i];
            list.push({
                vod_id: item.id,            // 视频ID
                vod_name: item.title,       // 视频名称
                vod_pic: item.cover,        // 封面图
                vod_remarks: item.rate,     // 评分
                vod_year: item.year,        // 年份
                // UZ 播放器点击后通常会尝试播放，这里我们构造一个详情页链接或假链接
                vod_play_url: '查看详情$' + item.url
            });
        }

        // 6. 返回结果
        return JSON.stringify({
            code: 1,
            msg: "成功",
            page: page,
            pagecount: 50, // 假设有很多页
            limit: 20,
            total: 1000,
            list: list
        });

    } catch (e) {
        // 错误处理
        return JSON.stringify({ code: 0, msg: "解析错误: " + e.message, list: [] });
    }
}
