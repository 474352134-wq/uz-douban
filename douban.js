// ignore

//@name:豆瓣电影热映-最终修复版
//@webSite:https://movie.douban.com
//@version:3.0
//@remark:使用完全公开的JSONP接口，无需任何验证
//@codeID:

// ignore

/**
 * 核心配置
 */
// 使用豆瓣电影分类接口，完全公开无需验证
var BASE_URL = 'https://movie.douban.com/j/new_search_subjects?sort=U&range=0,10&tags=&start=';

/**
 * 入口函数
 */
function getVideoList(args) {
    var page = args.page || 1;
    var count = 20;
    var start = (page - 1) * count;

    var url = BASE_URL + start + '&count=' + count;

    try {
        // 构造请求头，伪装成普通浏览器
        var headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": "https://movie.douban.com/",
            "Accept": "application/json"
        };

        // 发起同步请求
        var response = http.get(url, headers);
        
        if (response && response.statusCode == 200) {
            var json = JSON.parse(response.body);
            
            // 检查是否有数据
            if (json.data && json.data.length > 0) {
                var videos = [];
                
                for (var i = 0; i < json.data.length; i++) {
                    var item = json.data[i];
                    
                    // 构建视频对象
                    var video = {
                        title: item.title,
                        url: item.url, // 详情页链接
                        cover: item.cover, // 封面图
                        desc: "评分: " + item.rate + " / " + item.year, // 评分和年份
                        type: 1 // 类型1表示跳转到网页
                    };
                    
                    videos.push(video);
                }
                
                return videos;
            } else {
                // 没有更多数据
                return [];
            }
        } else {
            // 请求失败
            console.error("请求失败: " + (response ? response.statusCode : "无响应"));
            return [];
        }
    } catch (e) {
        console.error("解析失败: " + e.message);
        return [];
    }
}
