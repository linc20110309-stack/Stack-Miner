/**
 * particles - 粒子系统(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md §19 + UI 优化提示词 V2
 *  - 粒子总数 ≤ MAX_PARTICLES(100)
 *  - 同时动画 ≤ MAX_ANIMATIONS(50)
 *  - 同时音效 ≤ 3 个
 *
 * **变更说明**(UI 优化提示词 V2):
 *   - 新增 spawnMatchSuccess: 三消成功绿色粒子(规范 #42C96F)
 *   - 新增 spawnBackpackFull: 背包满失败红色粒子
 *   - 新增 spawnVictoryConfetti: 胜利彩带/金币/星星粒子(规范 30~50 个)
 *   - 新增 spawnStarBurst: 星星粒子辅助
 *   - 优化已有粒子色彩(更符合规范卡通寻宝风格)
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
        life: life || 1000,
        age: 0,
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
                '#D4B896',
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
                '#FFD466',
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
                '#7EC8E3',
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
     * **新增**: 三消成功绿色粒子(规范:三消时搭配绿色 #42C96F 粒子)
     *  - 从每个待消除 slot 位置向四周扩散
     *  - 绿色调为主,少量黄色高光
     * @param {Array<{x:number, y:number}>} positions 槽位位置数组
     */
    spawnMatchSuccess: function (positions) {
        if (!positions || positions.length === 0) return;
        var limit = constants.MAX_MATCH_PARTICLES || 12;
        var per = Math.floor(limit / positions.length) || 4;
        var greens = ['#42C96F', '#2DA856', '#7FE5A0', '#A8E6BC'];
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            for (var k = 0; k < per; k++) {
                if (this._list.length >= constants.MAX_PARTICLES) break;
                var angle = Math.random() * Math.PI * 2;
                var speed = 2 + Math.random() * 3;
                var color = greens[(Math.random() * greens.length) | 0];
                this._list.push(_createParticle(
                    pos.x + (Math.random() - 0.5) * 16,
                    pos.y + (Math.random() - 0.5) * 16,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed - 1.5,
                    color,
                    500,
                    3 + Math.random() * 3
                ));
            }
        }
    },

    /**
     * **新增**: 背包满时红色闪烁粒子(失败色 #FF6B6B)
     *  - 从背包中心向外喷出,提示玩家背包已满
     */
    spawnBackpackFull: function (cx, cy) {
        var n = 10;
        for (var i = 0; i < n; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var angle = Math.random() * Math.PI * 2;
            var speed = 2 + Math.random() * 2;
            this._list.push(_createParticle(
                cx + (Math.random() - 0.5) * 60,
                cy + (Math.random() - 0.5) * 30,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 1,
                '#FF6B6B',
                600,
                3 + Math.random() * 2
            ));
        }
    },

    /**
     * **新增**: 胜利彩带 + 金币 + 星星粒子(规范:30~50 个粒子,800ms)
     *  - 三种粒子混合发射,营造庆典感
     *  - 总数限制 = MAX_VICTORY_PARTICLES
     * @param {number} cx 屏幕中心 X
     * @param {number} cy 屏幕中心 Y
     */
    spawnVictoryConfetti: function (cx, cy) {
        var limit = constants.MAX_VICTORY_PARTICLES || 50;
        var colors = ['#F4B400', '#FFD466', '#FF9F43', '#9DC9A8', '#7EC8E3', '#B49ED8', '#42C96F'];
        // 1) 彩带(向下飘落)
        var confettiCount = Math.floor(limit * 0.5);
        for (var i = 0; i < confettiCount; i++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            this._list.push(_createParticle(
                cx + (Math.random() - 0.5) * 300,
                cy - 100 + (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 4,
                -Math.random() * 3 - 1,
                colors[(Math.random() * colors.length) | 0],
                1200,
                4 + Math.random() * 4
            ));
        }
        // 2) 金币粒子(向上喷出)
        var coinCount = Math.floor(limit * 0.25);
        for (var j = 0; j < coinCount; j++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
            var sp = 3 + Math.random() * 3;
            this._list.push(_createParticle(
                cx + (Math.random() - 0.5) * 60,
                cy + 20,
                Math.cos(ang) * sp,
                Math.sin(ang) * sp,
                '#FFD466',
                1000,
                5 + Math.random() * 3
            ));
        }
        // 3) 星星粒子(从中心向外散射)
        var starCount = Math.floor(limit * 0.25);
        for (var k = 0; k < starCount; k++) {
            if (this._list.length >= constants.MAX_PARTICLES) break;
            var sang = (k / starCount) * Math.PI * 2;
            var ssp = 4 + Math.random() * 2;
            this._list.push(_createParticle(
                cx, cy,
                Math.cos(sang) * ssp,
                Math.sin(sang) * ssp,
                '#FFF7C2',
                800,
                6 + Math.random() * 3
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
                '#FF6B6B',
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
     * **新增**: 绘制圆形粒子(胜利星星/金币专用)
     *  - 在渲染循环中由 game.js 主动调用
     */
    drawParticleShape: function (ctx, p) {
        if (!p) return;
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - (p.age / p.life));
        if (p.type === 'star') {
            // 五角星(简化版)
            ctx.translate(p.x, p.y);
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var a1 = (Math.PI * 2 / 5) * i - Math.PI / 2;
                var a2 = a1 + Math.PI / 5;
                ctx.lineTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
                ctx.lineTo(Math.cos(a2) * p.size * 0.4, Math.sin(a2) * p.size * 0.4);
            }
            ctx.closePath();
            ctx.fill();
        } else if (p.type === 'coin') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 默认圆点
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    /**
     ** 每帧更新
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
            } else if (p.type === 'star' || p.type === 'coin') {
                // 星星/金币 带重力 + 轻衰减
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08;
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