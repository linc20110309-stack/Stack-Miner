/**
 * animations - 动画队列
 * 严格遵循 UI_ART_STANDARDS.md §12 动效规范
 * 最多 3 个并发粒子源,最长动画 2 秒
 */
var constants = require('./constants.js');

/**
 * 弹性入场(0.3 -> 1.0)
 * @param {number} p 0~1
 * @returns {number}
 */
function elasticScale(p) {
    if (p >= 1) return 1;
    return 1 - Math.pow(2, -10 * p) * Math.cos(p * Math.PI * 2.5) * (1 - p);
}

/**
 * 抖动偏移(衰减)
 * @param {Object} anim 动画对象
 * @param {number} amp 振幅
 * @returns {number}
 */
function shakeOffset(anim, amp) {
    var p = (Date.now() - anim.startTime) / anim.duration;
    if (p >= 1) return 0;
    return Math.sin(p * Math.PI * 4) * amp * (1 - p);
}

/**
 * 闪烁 alpha
 * @param {number} startTime
 * @returns {number} 0~1
 */
function flashAlpha(startTime) {
    return 0.5 + 0.5 * Math.sin((Date.now() - startTime) / 100);
}

var Animations = {
    _list: [],

    /**
     * 添加动画
     * @param {Object} cfg {id, type, startTime, duration, ...}
     */
    add: function (cfg) {
        cfg.startTime = cfg.startTime || Date.now();
        this._list.push(cfg);
    },

    /**
     * 根据 id 读取动画
     * @param {string} id
     * @returns {Object|null}
     */
    get: function (id) {
        for (var i = 0; i < this._list.length; i++) {
            if (this._list[i].id === id) return this._list[i];
        }
        return null;
    },

    /**
     * 每帧更新,清理已完成的
     */
    update: function () {
        var now = Date.now();
        var kept = [];
        for (var i = 0; i < this._list.length; i++) {
            var a = this._list[i];
            if (now - a.startTime < a.duration) {
                kept.push(a);
            }
        }
        this._list = kept;
    },

    /**
     * 清空所有动画
     */
    clear: function () {
        this._list.length = 0;
    },

    /**
     * 触发弹窗入场动画
     * @returns {number} 当前缩放值
     */
    modalScale: function (startTime) {
        var p = (Date.now() - startTime) / constants.ANIM_MODAL;
        return elasticScale(Math.max(0, Math.min(1, p)));
    },

    /**
     * 触发按钮按下缩放
     * @param {boolean} pressed
     * @returns {number} 0.95~1.0
     */
    buttonScale: function (pressed) {
        return pressed ? 0.95 : 1.0;
    },

    /**
     * 屏幕闪烁 alpha
     * @param {number} startTime
     * @returns {number} 0~1
     */
    screenFlashAlpha: function (startTime) {
        var p = (Date.now() - startTime) / 80;
        if (p >= 1) return 0;
        return 0.4 * (1 - p);
    },

    // 暴露静态方法
    elasticScale: elasticScale,
    shakeOffset: shakeOffset,
    flashAlpha: flashAlpha
};

module.exports = { Animations: Animations };
