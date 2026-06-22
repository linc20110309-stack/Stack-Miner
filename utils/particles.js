/**
 * particles - 粒子系统
 * 严格遵循 UI_ART_STANDARDS.md §12 总上限 100
 * 颜色与糖果色风格保持一致(参考图片色调)
 */
var constants = require('./constants.js');

/**
 * 创建一个粒子对象
 */
function _createParticle(x, y, vx, vy, color, life, size) {
    return {
        x: x, y: y,
        vx: vx, vy: vy,
        color: color || '#FFD466',
        life: life || 1000,        // 生命周期 ms
        age: 0,                     // 已存活 ms
        size: size || 4,
        gravity: 0.15
    };
}

var Particles = {
    _list: [],

    /**
     * 灰尘粒子(挖出泥土,柔和浅棕)
     */
    spawnDust: function (x, y) {
        var n = 8;
        for (var i = 0; i < n; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
            var speed = 1 + Math.random() * 2;
            this._list.push(_createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#D4B896',     // 浅棕米(糖果色)
                500,
                2 + Math.random() * 2
            ));
        }
    },

    /**
     * 金币飞入粒子(暖黄)
     */
    spawnCoinFly: function (x, y, tx, ty) {
        for (var i = 0; i < 6; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            this._list.push(_createParticle(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                0, 0,
                '#FFD466',     // 暖黄糖果色
                600,
                5
            ));
            var p = this._list[this._list.length - 1];
            p.type = 'coinFly';
            p.tx = tx;
            p.ty = ty;
            p.t0 = Date.now();
            p.tdur = 600;
        }
    },

    /**
     * 宝石闪光粒子(粉蓝糖果色)
     */
    spawnGemSparkle: function (x, y) {
        var n = 12;
        for (var i = 0; i < n; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var angle = (i / n) * Math.PI * 2;
            var speed = 2 + Math.random() * 2;
            this._list.push(_createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#7EC8E3',     // 粉蓝糖果色
                700,
                4
            ));
        }
    },

    /**
     * 宝箱开启爆发(暖色糖果)
     */
    spawnTreasureBurst: function (x, y) {
        var n = constants.MAX_BURST_PARTICLES;
        var colors = ['#FFD466', '#E89B6C', '#F4B400', '#FFAB91'];
        for (var i = 0; i < n; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var angle = Math.random() * Math.PI * 2;
            var speed = 2 + Math.random() * 4;
            this._list.push(_createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 2,
                colors[(Math.random() * colors.length) | 0],
                800,
                3 + Math.random() * 3
            ));
        }
    },

    /**
     * 通关彩纸(糖果彩色)
     */
    spawnConfetti: function (x, y) {
        var n = constants.MAX_CELEBRATION_PARTICLES;
        var colors = ['#F4B400', '#FFD466', '#E89B6C', '#9DC9A8', '#7EC8E3', '#B49ED8'];
        for (var i = 0; i < n; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            this._list.push(_createParticle(
                x + (Math.random() - 0.5) * 200,
                y + (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 3,
                -Math.random() * 4 - 1,
                colors[(Math.random() * colors.length) | 0],
                1500,
                4 + Math.random() * 4
            ));
        }
    },

    /**
     * 错误抖动红点(挖到石头,柔和红)
     */
    spawnError: function (x, y) {
        for (var i = 0; i < 6; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            this._list.push(_createParticle(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                '#FF6B6B',     // 柔和红
                400,
                3
            ));
        }
    },

    /**
     * 数字漂浮(+20 金币提示)
     */
    spawnFloatingText: function (x, y, text, color) {
        if (this._list.length >= constants.MAX_PARTICLES) return;
        this._list.push({
            type: 'floatingText',
            x: x, y: y,
            vx: 0, vy: -1.5,
            text: text || '',
            color: color || '#FFD466',
            life: 800,
            age: 0,
            size: 20,
            gravity: 0
        });
    },

    /**
     * 每帧更新
     * @param {number} dt 毫秒
     */
    update: function (dt) {
        var kept = [];
        for (var i = 0; i < this._list.length; i++) {
            var p = this._list[i];
            p.age += dt;
            if (p.age >= p.life) continue;

            if (p.type === 'coinFly') {
                var pp = Math.min(1, p.age / p.tdur);
                p.x = p.x + (p.tx - p.x) * 0.18;
                p.y = p.y + (p.ty - p.y) * 0.18;
            } else if (p.type === 'floatingText') {
                p.y += p.vy;
                p.x += p.vx;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity || 0.15;
            }
            kept.push(p);
        }
        this._list = kept;
    },

    /**
     * 清空
     */
    clear: function () {
        this._list.length = 0;
    },

    /**
     * 获取所有粒子
     */
    list: function () { return this._list; }
};

module.exports = { Particles: Particles };
