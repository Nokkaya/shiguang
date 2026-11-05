/* 模拟数据。后续接接口时，保持 canteens / windows / dishes 这三层结构即可。 */
window.CANTEEN_DATA = {
  campus: "示例大学",
  canteens: [
    { id: "c1", name: "一食堂", area: "东区", hours: "06:30–20:30" },
    { id: "c2", name: "二食堂", area: "西区", hours: "07:00–21:30" },
    { id: "c3", name: "南苑食堂", area: "南区", hours: "07:00–20:00" }
  ],
  windows: [
    { id: "w-chuan", canteenId: "c1", name: "川味现炒", rating: 4.6, reviewCount: 328, wait: "8 分钟", warning: false, note: "回锅肉和藤椒鸡都稳，高峰期会偏咸一点。" },
    { id: "w-gai", canteenId: "c1", name: "家常盖饭", rating: 4.4, reviewCount: 256, wait: "5 分钟", warning: false, note: "番茄鸡蛋几乎不翻车，适合赶课。" },
    { id: "w-mian", canteenId: "c1", name: "兰州拉面", rating: 4.5, reviewCount: 410, wait: "10 分钟", warning: false, note: "汤清面劲，中午这队最长。" },
    { id: "w-zao", canteenId: "c1", name: "早餐粥铺", rating: 4.2, reviewCount: 190, wait: "3 分钟", warning: false, note: "七点半前最热乎，油条现炸。" },
    { id: "w-tie", canteenId: "c2", name: "铁板烧", rating: 3.6, reviewCount: 142, wait: "12 分钟", warning: false, note: "味道可以，排队久，分量时多时少。" },
    { id: "w-ri", canteenId: "c2", name: "日式简餐", rating: 4.5, reviewCount: 168, wait: "6 分钟", warning: false, note: "新品照烧鸡排口碑好，酱汁偏甜。" },
    { id: "w-xiang", canteenId: "c2", name: "麻辣香锅", rating: 4.0, reviewCount: 221, wait: "9 分钟", warning: false, note: "自选要看师傅手，少放豆芽更值。" },
    { id: "w-zha", canteenId: "c2", name: "炸鸡汉堡", rating: 2.4, reviewCount: 96, wait: "4 分钟", warning: true, note: "油温不稳，外皮软、里层凉，近期差评集中。" },
    { id: "w-fen", canteenId: "c3", name: "南苑粉面", rating: 4.7, reviewCount: 305, wait: "7 分钟", warning: false, note: "桂林米粉是南区最稳的一碗。" },
    { id: "w-qing", canteenId: "c3", name: "轻食窗口", rating: 4.3, reviewCount: 88, wait: "4 分钟", warning: false, note: "能量碗新鲜，价格是全食堂最高的一档。" },
    { id: "w-huang", canteenId: "c3", name: "黄焖鸡", rating: 2.8, reviewCount: 134, wait: "6 分钟", warning: true, note: "鸡肉柴、汤汁稀，连续两周评分下滑。" },
    { id: "w-ye", canteenId: "c2", name: "夜宵档口", rating: 3.8, reviewCount: 77, wait: "5 分钟", warning: false, note: "下午和晚上才出摊，烤冷面能填肚子，别期待精致。" }
  ],
  dishes: [
    {
      id: "d-huiguo", name: "回锅肉盖饭", windowId: "w-chuan", price: 14, rating: 4.8, reviewCount: 420,
      taste: "medium", tags: ["下饭", "猪肉"], meals: ["lunch", "dinner"], isNew: false,
      summary: "肥瘦相间，豆瓣香够，配饭量也实在。想稳一顿就点它。",
      reviews: [
        { user: "计科 22 级", when: "昨天", score: 5, text: "十一点四十去基本不用排太久，肥瘦比例刚好。" },
        { user: "外院", when: "3 天前", score: 4, text: "稍微有点咸，但比隔壁盖饭香很多。" }
      ]
    },
    {
      id: "d-tengjiao", name: "藤椒鸡盖饭", windowId: "w-chuan", price: 15, rating: 4.6, reviewCount: 86,
      taste: "hot", tags: ["新品", "鸡肉"], meals: ["lunch", "dinner"], isNew: true,
      summary: "这周新上的。藤椒是香不是咸，鸡腿肉，比回锅肉清爽。",
      reviews: [
        { user: "建环 23 级", when: "今天", score: 5, text: "新品里少数值得再点一次的，花椒味很清。" },
        { user: "研一", when: "昨天", score: 4, text: "辣度对得起重口，不吃花椒就算了。" }
      ]
    },
    {
      id: "d-yuxiang", name: "鱼香肉丝", windowId: "w-chuan", price: 13, rating: 4.3, reviewCount: 188,
      taste: "medium", tags: ["下饭"], meals: ["lunch", "dinner"], isNew: false,
      summary: "酸甜口，肉丝给得不算吝啬，适合吃腻了回锅肉的时候。",
      reviews: [
        { user: "数学 21 级", when: "上周", score: 4, text: "稳定，没有惊喜，也没有翻车。" }
      ]
    },
    {
      id: "d-fanqie", name: "番茄鸡蛋盖饭", windowId: "w-gai", price: 11, rating: 4.6, reviewCount: 310,
      taste: "mild", tags: ["清淡", "赶课"], meals: ["lunch", "tea", "dinner"], isNew: false,
      summary: "味道几乎每天一样。吃辣吃腻、或者只剩二十分钟时很合适。",
      reviews: [
        { user: "法学 22 级", when: "昨天", score: 5, text: "十一块能吃饱，番茄是酸的，不是糖精味。" },
        { user: "软工 23 级", when: "4 天前", score: 4, text: "窗口出餐快，下课铃响了也能赶上。" }
      ]
    },
    {
      id: "d-gongbao", name: "宫保鸡丁盖饭", windowId: "w-gai", price: 13, rating: 4.1, reviewCount: 146,
      taste: "medium", tags: ["花生"], meals: ["lunch", "dinner"], isNew: false,
      summary: "花生脆，鸡丁偏干。想吃辣又怕太辣可以选它。",
      reviews: [
        { user: "新闻 21 级", when: "上周", score: 4, text: "中规中矩，花生给得挺多。" }
      ]
    },
    {
      id: "d-niurou", name: "牛肉拉面", windowId: "w-mian", price: 15, rating: 4.7, reviewCount: 390,
      taste: "medium", tags: ["汤面"], meals: ["lunch", "dinner"], isNew: false,
      summary: "汤清，面条有劲。牛肉片不多，但汤是认真熬的。",
      reviews: [
        { user: "机械 22 级", when: "昨天", score: 5, text: "中午要排大约十分钟，值得。别点加面，碗装不下。" },
        { user: "研二", when: "5 天前", score: 4, text: "清汤比重辣汤更好喝。" }
      ]
    },
    {
      id: "d-suancai", name: "酸菜肉丝面", windowId: "w-mian", price: 12, rating: 4.2, reviewCount: 121,
      taste: "hot", tags: ["汤面"], meals: ["lunch", "dinner"], isNew: false,
      summary: "酸和辣都明显，适合想喝到汤的人。",
      reviews: [
        { user: "能动 23 级", when: "3 天前", score: 4, text: "酸菜够味，肉丝少一点。" }
      ]
    },
    {
      id: "d-pidan", name: "皮蛋瘦肉粥", windowId: "w-zao", price: 6, rating: 4.5, reviewCount: 204,
      taste: "mild", tags: ["早餐", "热食"], meals: ["breakfast"], isNew: false,
      summary: "早上最稳的一碗。皮蛋是软的，配一个鲜肉包就够。",
      reviews: [
        { user: "临床医学", when: "今天", score: 5, text: "七点二十到还是热的，晚十分钟就剩锅底。" }
      ]
    },
    {
      id: "d-bao", name: "鲜肉包", windowId: "w-zao", price: 3, rating: 4.4, reviewCount: 176,
      taste: "mild", tags: ["早餐"], meals: ["breakfast"], isNew: false,
      summary: "皮薄馅多，两个就饱。建议趁热，凉了会发干。",
      reviews: [
        { user: "中文 22 级", when: "昨天", score: 4, text: "三块钱一个，比校门口的包子实在。" }
      ]
    },
    {
      id: "d-youtiao", name: "豆浆油条", windowId: "w-zao", price: 5, rating: 4.0, reviewCount: 98,
      taste: "mild", tags: ["早餐"], meals: ["breakfast"], isNew: false,
      summary: "油条现炸才脆。八点以后经常是回锅的。",
      reviews: [
        { user: "外语 23 级", when: "上周", score: 4, text: "豆浆是甜的，不喝甜浆可以说一声。" }
      ]
    },
    {
      id: "d-niuliu", name: "黑椒牛柳铁板", windowId: "w-tie", price: 16, rating: 3.6, reviewCount: 132,
      taste: "hot", tags: ["铁板"], meals: ["lunch", "dinner"], isNew: false,
      summary: "胡椒味重，牛肉质量不稳定。赶时间就别排这队。",
      reviews: [
        { user: "土木 21 级", when: "4 天前", score: 3, text: "排了十二分钟，肉有一块偏老。" }
      ]
    },
    {
      id: "d-zhaoshao", name: "照烧鸡排饭", windowId: "w-ri", price: 16, rating: 4.5, reviewCount: 97,
      taste: "mild", tags: ["新品", "鸡排"], meals: ["lunch", "tea", "dinner"], isNew: true,
      summary: "酱汁偏甜，鸡排现炸，配菜比多数窗口新鲜。",
      reviews: [
        { user: "设计 22 级", when: "今天", score: 5, text: "下午三点还是脆的。甜口能接受就值得试。" },
        { user: "经管 23 级", when: "2 天前", score: 4, text: "十六块稍贵，但没有食堂味。" }
      ]
    },
    {
      id: "d-nengliang", name: "三文鱼能量碗", windowId: "w-qing", price: 18, rating: 4.3, reviewCount: 64,
      taste: "mild", tags: ["新品", "轻食"], meals: ["lunch", "tea"], isNew: true,
      summary: "全食堂最贵的一档。蔬菜新鲜，适合这周想吃清淡的人。",
      reviews: [
        { user: "体育学院", when: "昨天", score: 4, text: "三文鱼分量诚实，饭可以要求少一点。" }
      ]
    },
    {
      id: "d-xiangguo", name: "麻辣香锅小份", windowId: "w-xiang", price: 17, rating: 4.0, reviewCount: 210,
      taste: "hot", tags: ["自选"], meals: ["lunch", "dinner"], isNew: false,
      summary: "小份其实不小。少拿豆芽和宽粉，多拿菜和肉才划算。",
      reviews: [
        { user: "光电 22 级", when: "3 天前", score: 4, text: "辣度可以调，默认微辣刚刚好。" }
      ]
    },
    {
      id: "d-zhaji", name: "芝士炸鸡堡", windowId: "w-zha", price: 13, rating: 2.3, reviewCount: 88,
      taste: "hot", tags: ["快餐"], meals: ["lunch", "tea", "dinner"], isNew: false,
      summary: "看起来省事，实际经常是凉的，油味重。队伍短是因为没人回购。",
      reviews: [
        { user: "计科 21 级", when: "昨天", score: 1, text: "鸡排中间是凉的，芝士板结。不建议再试。" },
        { user: "匿名", when: "上周", score: 2, text: "炸完放太久，外皮是软的。" }
      ]
    },
    {
      id: "d-guilin", name: "桂林米粉", windowId: "w-fen", price: 12, rating: 4.8, reviewCount: 360,
      taste: "medium", tags: ["汤粉", "酸笋"], meals: ["lunch", "tea", "dinner"], isNew: false,
      summary: "汤底每天差不多，这在食堂里已经很难得。酸笋可以另要。",
      reviews: [
        { user: "南区宿舍", when: "今天", score: 5, text: "下午来吃也不会坨。汤是热的。" },
        { user: "历史 22 级", when: "2 天前", score: 5, text: "十二块，料比一食堂的面还齐。" }
      ]
    },
    {
      id: "d-laoyou", name: "老友粉", windowId: "w-fen", price: 13, rating: 4.6, reviewCount: 74,
      taste: "hot", tags: ["新品", "酸辣"], meals: ["lunch", "dinner"], isNew: true,
      summary: "新口味，酸辣够。不吃香菜记得拿之前说。",
      reviews: [
        { user: "马克思学院", when: "昨天", score: 5, text: "比想象中辣，喜欢酸辣粉的会喜欢。" }
      ]
    },
    {
      id: "d-huangmen", name: "黄焖鸡米饭", windowId: "w-huang", price: 14, rating: 2.6, reviewCount: 141,
      taste: "medium", tags: ["炖菜"], meals: ["lunch", "dinner"], isNew: false,
      summary: "土豆比鸡多，汤很稀。同样的钱不如去粉面窗口。",
      reviews: [
        { user: "化工 23 级", when: "昨天", score: 2, text: "鸡块柴，酱汁像兑了水。" },
        { user: "研一", when: "4 天前", score: 2, text: "连续两周都这样，先别去这个窗口。" }
      ]
    },
    {
      id: "d-ciba", name: "红糖糍粑", windowId: "w-ye", price: 6, rating: 4.4, reviewCount: 83,
      taste: "mild", tags: ["小吃", "热食"], meals: ["tea", "late"], isNew: false,
      summary: "下午四点出锅，外脆里糯。当正餐不够，垫一口正好。",
      reviews: [
        { user: "艺术 22 级", when: "今天", score: 5, text: "红糖给得大方，四点半前去还有脆的。" }
      ]
    },
    {
      id: "d-kaolengmian", name: "烤冷面", windowId: "w-ye", price: 8, rating: 3.7, reviewCount: 69,
      taste: "medium", tags: ["夜宵"], meals: ["dinner", "late"], isNew: false,
      summary: "能填肚子，酱偏甜。晚上没窗口时可以吃，别和正餐比。",
      reviews: [
        { user: "宿舍楼长", when: "上周", score: 4, text: "九点还有，十点窗口就收了。" }
      ]
    }
  ]
};
