/**
 * animations - 动画队列与缓动函数(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md §13 + UI 优化提示词 V2
 *
 * **变更说明**(UI 优化提示词 V2):
 *   - 新增 easeOutQuad 缓动函数(飞入背包动画)
 *   - 新增震屏偏移计算函数 failShakeOffset
 *   - 新增解锁闪烁 alpha 工具 unlockFlashAlpha
 *   - 新增背包满边框闪烁 alpha 工具 backpackFlashAlpha
 *   - 新增可点击卡片悬浮上浮量工具 hoverLiftOffset
 *   - 暴露缓动函数集合 EASINGS,供业务模块调用
 */
var constants = require('./constants.js');

/**
 * easeOutQuad 缓动函数(规范:飞入背包 250ms easeOutQuad)
 *  - p: 0~1 进度
 *  - 返回值: 0~1 经过缓动后的进度
 *  - 公式: 1 - (1 - p)^2
 */
function easeOutQuad(p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    return 1 - (1 - p) * (1 - p);
}

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

/**
 * **新增**: 失败震屏 X/Y 偏移(规范:失败时轻微震屏 300ms)
 *  - 总时长 = ANIM_FAIL_SHAKE_MS(300ms)
 *  - 振幅 8px,按 sin 衰减
 * @param {number} startTime 震屏起始时间
 * @returns {{x:number, y:number, done:boolean}}
 */
function failShakeOffset(startTime) {
    var dur = constants.ANIM_FAIL_SHAKE_MS || 300;
    var p = (Date.now() - startTime) / dur;
    if (p >= 1) return { x: 0, y: 0, done: true };
    var amp = 8 * (1 - p);
    return {
        x: Math.sin(p * Math.PI * 8) * amp,
        y: Math.cos(p * Math.PI * 6) * amp * 0.6,
        done: false
    };
}

/**
 * **新增**: 解锁闪烁 alpha(规范:下层解锁 150ms 渐亮+描边闪烁)
 *  - 总时长 = ANIM_UNLOCK_FLASH(150ms)
 *  - 0~0.5: alpha 上升 0→1
 *  - 0.5~1: alpha 衰减回 0
 * @param {number} startTime
 * @returns {number} 0~1
 */
function unlockFlashAlpha(startTime) {
    var dur = constants.ANIM_UNLOCK_FLASH || 150;
    var p = (Date.now() - startTime) / dur;
    if (p >= 1) return 0;
    if (p < 0.5) return p * 2;
    return 1 - (p - 0.5) * 2;
}

/**
 * **新增**: 背包满时边框闪烁 alpha(0~1 循环)
 * @param {number} startTime
 * @returns {number} 0.4~1 循环
 */
function backpackFlashAlpha(startTime) {
    var period = constants.ANIM_BACKPACK_FLASH_MS || 400;
    return 0.5 + 0.5 * Math.sin((Date.now() - startTime) / (period / (2 * Math.PI)));
}

/**
 * **新增**: 可点击卡片悬浮上浮 Y 偏移(规范:轻微上浮 2px)
 *  - 缓慢 sin 摆动 0~2px
 * @param {number} startTime
 * @returns {number} 0~2
 */
function hoverLiftOffset(startTime) {
    var lift = constants.ANIM_HOVER_LIFT_PX || 2;
    return Math.abs(Math.sin((Date.now() - startTime) / 600)) * lift;
}

/**
 * **新增**: 卡堆顶牌淡入 alpha(规范:0.1s 淡入)
 *  - 总时长 = ANIM_PILE_FADE_IN(100ms)
 * @param {number} startTime
 * @returns {number} 0~1
 */
function pileFadeInAlpha(startTime) {
    var dur = constants.ANIM_PILE_FADE_IN || 100;
    var p = (Date.now() - startTime) / dur;
    if (p >= 1) return 1;
    if (p <= 0) return 0;
    return p;
}

/**
 * **新增**: 根据名称获取缓动函数
 * @param {string} name
 * @returns {function}
 */
function getEasing(name) {
    if (name === constants.EASE_OUT_QUAD) return easeOutQuad;
    if (name === 'linear') {
        return function (p) { return p; };
    }
    if (name === 'easeInQuad') {
        return function (p) { return p * p; };
    }
    if (name === 'easeInOutQuad') {
        return function (p) {
            return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        };
    }
    return easeOutQuad;
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
    flashAlpha: flashAlpha,
    easeOutQuad: easeOutQuad,
    failShakeOffset: failShakeOffset,
    unlockFlashAlpha: unlockFlashAlpha,
    backpackFlashAlpha: backpackFlashAlpha,
    hoverLiftOffset: hoverLiftOffset,
    pileFadeInAlpha: pileFadeInAlpha,
    getEasing: getEasing,

    // 缓动集合(便于枚举)
    EASINGS: {
        linear: function (p) { return p; },
        easeOutQuad: easeOutQuad,
        easeInQuad: function (p) { return p * p; },
        easeInOutQuad: function (p) {
            return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        }
    }
};

module.exports = { Animations: Animations };