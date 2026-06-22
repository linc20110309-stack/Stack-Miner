/**
 * treasures - 宝物定义(Stack Miner 奇妙寻宝)
 *
 * **变更说明**(对标参考图 + 用户反馈):
 *   - 卡牌外壳:白底圆角 + 细绿边 + 加厚底部立体阴影(参考图样式)
 *   - **图案**:通用彩色 emoji(樱桃、苹果、草莓、蛋糕、汽车、吉他等)
 *     - 这些 emoji 在所有平台(iOS/Android/微信小游戏/H5)的系统 emoji 字体中
 *       都能稳定渲染为**清晰彩色图案**(参考图右图风格)
 *     - 不依赖麻将 Unicode 区段(那些在某些环境下会渲染为淡色)
 *   - 15 种宝物对应不同彩色 emoji,玩家容易识别
 */
var constants = require('./constants.js');

/**
 * 15 种宝物(通用彩色 emoji,跨平台稳定彩色渲染)
 *  - 5 种水果:🍒🍎🍓🍇🍉
 *  - 4 种花卉:🌸🌻🌼🌷
 *  - 3 种物品:🚗🍰🎸
 *  - 2 种乐器:🎻🪕
 *  - 1 种装饰:💎
 */
var TREASURES = [
    {
        type: 1,
        name: '樱桃',
        icon: '🍒',         // 樱桃(红色)
        color: '#E94B6F',
        desc: '水果'
    },
    {
        type: 2,
        name: '苹果',
        icon: '🍎',         // 苹果(红色)
        color: '#E94B6F',
        desc: '水果'
    },
    {
        type: 3,
        name: '草莓',
        icon: '🍓',         // 草莓(红色)
        color: '#FF6B6B',
        desc: '水果'
    },
    {
        type: 4,
        name: '葡萄',
        icon: '🍇',         // 葡萄(紫色)
        color: '#B07CD0',
        desc: '水果'
    },
    {
        type: 5,
        name: '西瓜',
        icon: '🍉',         // 西瓜(绿色+红)
        color: '#3DBE65',
        desc: '水果'
    },
    {
        type: 6,
        name: '樱花',
        icon: '🌸',         // 樱花(粉色)
        color: '#FF7EB6',
        desc: '花卉'
    },
    {
        type: 7,
        name: '向日葵',
        icon: '🌻',         // 向日葵(黄色)
        color: '#FFC940',
        desc: '花卉'
    },
    {
        type: 8,
        name: '雏菊',
        icon: '🌼',         // 雏菊(黄色)
        color: '#FFC940',
        desc: '花卉'
    },
    {
        type: 9,
        name: '郁金香',
        icon: '🌷',         // 郁金香(粉色)
        color: '#FF7EB6',
        desc: '花卉'
    },
    {
        type: 10,
        name: '汽车',
        icon: '🚗',         // 汽车(红色)
        color: '#E94B6F',
        desc: '物品'
    },
    {
        type: 11,
        name: '蛋糕',
        icon: '🍰',         // 蛋糕(彩色)
        color: '#FF8C42',
        desc: '物品'
    },
    {
        type: 12,
        name: '披萨',
        icon: '🍕',         // 披萨(彩色)
        color: '#FF8C42',
        desc: '物品'
    },
    {
        type: 13,
        name: '吉他',
        icon: '🎸',         // 吉他(彩色)
        color: '#D4884A',
        desc: '乐器'
    },
    {
        type: 14,
        name: '小提琴',
        icon: '🎻',         // 小提琴(棕色)
        color: '#A0522D',
        desc: '乐器'
    },
    {
        type: 15,
        name: '钻石',
        icon: '💎',         // 钻石(蓝色)
        color: '#5A8FE0',
        desc: '装饰'
    }
];

// 索引
var _index = {};
(function () {
    for (var i = 0; i < TREASURES.length; i++) {
        _index[TREASURES[i].type] = TREASURES[i];
    }
})();

var Treasures = {
    LIST: TREASURES,
    COUNT: constants.TREASURE_TYPE_COUNT,

    get: function (type) {
        return _index[type] || null;
    },
    getAll: function () {
        return TREASURES;
    },
    getIcon: function (type) {
        var info = _index[type];
        return info ? info.icon : '';
    },
    /**
     * 获取宝物主色(emoji 本身就是彩色的,此颜色仅作记录)
     */
    getColor: function (type) {
        var info = _index[type];
        return info ? info.color : '#333333';
    },
    getName: function (type) {
        var info = _index[type];
        return info ? info.name : '';
    },
    isValid: function (type) {
        return _index.hasOwnProperty(type);
    }
};

module.exports = { Treasures: Treasures };