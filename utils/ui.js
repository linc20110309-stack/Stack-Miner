/**
 * ui - 通用 UI 组件库(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md §11 必备组件清单
 *
 * **变更说明**(对标参考图 + 用户反馈):
 *   - 卡牌外壳:白底圆角 + 细绿边 + 加厚底部立体阴影(参考图样式)
 *   - **图案**:彩色 emoji 字符(🍒🍎🍓🍇🍉🌸🌻🌼🌷🚗🍰🍕🎸🎻💎),Canvas 自动渲染彩色
 *   - 返回首页按钮(🏠)放在**左侧**(用户反馈)
 *   - 棋盘+背包+弹窗预览 全部统一为同款样式
 */
var constants = require('./constants.js');
var drawing = require('./drawing.js');
var Treasures = require('./treasures.js').Treasures;

var UI = {

    /**
     * 信息卡片(白底 + 暖色阴影)
     */
    drawInfoCard: function (ctx, opts) {
        var x = opts.x, y = opts.y, w = opts.w, h = opts.h;
        var radius = opts.radius || constants.CARD_RADIUS;
        var color = opts.color || constants.COLOR_CARD_LIGHT;
        var shadow = opts.shadow || constants.SHADOW_CARD;

        drawing.drawShadowedRect(ctx, x, y, w, h, color, radius, shadow);

        if (opts.icon) {
            ctx.save();
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(opts.icon, x + 16, y + h / 2);
            ctx.restore();
        }

        if (opts.label) {
            drawing.drawText(ctx, opts.label,
                x + (opts.icon ? 56 : 16), y + h / 2 - 12,
                opts.labelColor || constants.COLOR_TEXT_SUB,
                '14px sans-serif', 'left');
        }
        if (opts.value !== undefined && opts.value !== null) {
            drawing.drawText(ctx, String(opts.value),
                x + w - 16, y + h / 2 + 8,
                opts.valueColor || constants.COLOR_TEXT_TITLE,
                opts.valueFont || 'bold 22px sans-serif', 'right');
        }
        return { x: x, y: y, w: w, h: h };
    },

    /**
     * 渐变按钮
     */
    drawGradientButton: function (ctx, opts) {
        var x = opts.x, y = opts.y, w = opts.width, h = opts.height;
        var radius = opts.radius !== undefined ? opts.radius : h / 2;
        var pressed = !!opts.pressed;
        var disabled = !!opts.disabled;

        if (pressed) {
            x = x + (1 - 0.95) * w / 2;
            y = y + (1 - 0.95) * h / 2;
            w = w * 0.95;
            h = h * 0.95;
        }

        if (!disabled) {
            ctx.save();
            ctx.shadowColor = 'rgba(50,80,110,0.30)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            var grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, opts.bgColor);
            grad.addColorStop(1, opts.darkenColor || opts.bgColor);
            ctx.fillStyle = grad;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            drawing.roundRect(ctx, x + 4, y + 4, w - 8, (h - 8) / 2, Math.max(0, radius - 4));
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = '#D4C8B8';
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
        }

        var textColor = disabled ? '#A89882' : (opts.textColor || constants.COLOR_WHITE);
        var cx = x + w / 2;
        var cy = y + h / 2;
        var label = opts.label || '';
        if (opts.icon) {
            drawing.drawEmoji(ctx, opts.icon,
                cx - (label.length * 11), cy,
                h * 0.4);
            drawing.drawText(ctx, label,
                cx + (opts.icon ? 10 : 0), cy,
                textColor,
                opts.font || ('bold ' + (h * 0.32) + 'px sans-serif'),
                'center');
        } else {
            drawing.drawText(ctx, label, cx, cy,
                textColor,
                opts.font || ('bold ' + (h * 0.36) + 'px sans-serif'),
                'center');
        }
        return { x: opts.x, y: opts.y, w: opts.width, h: opts.height };
    },

    /**
     * 圆形 FAB 按钮
     */
    drawCircleButton: function (ctx, opts) {
        var x = opts.x, y = opts.y, r = opts.r || constants.FAB_DIAMETER / 2;
        var pressed = !!opts.pressed;
        var color = opts.color || constants.COLOR_NAV_FAB || '#FFFFFF';

        if (pressed) r = r * 0.95;

        ctx.save();
        ctx.shadowColor = 'rgba(50,80,110,0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawing.drawEmoji(ctx, opts.icon || '?', x, y, r * 1.0);

        return { x: x, y: y, r: r, type: 'circle' };
    },

    /**
     * 弹窗容器
     */
    drawModalContainer: function (ctx, w, h, opts) {
        var scale = opts.scale || 1;
        var radius = opts.radius || constants.MODAL_RADIUS;
        var headerH = opts.headerHeight || 80;
        var x = (constants.LOGICAL_WIDTH - w) / 2;
        var y = (constants.LOGICAL_HEIGHT - h) / 2;
        var cx = x + w / 2;
        var cy = y + h / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);

        ctx.shadowColor = opts.shadowColor || 'rgba(50,80,110,0.35)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 15;

        ctx.fillStyle = constants.COLOR_CARD_LIGHT;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (opts.headerGradient) {
            var hg = opts.headerGradient;
            var grad = ctx.createLinearGradient(x, y, x, y + headerH);
            grad.addColorStop(0, hg[0]);
            grad.addColorStop(0.5, hg[1] || hg[0]);
            grad.addColorStop(1, hg[2] || hg[1] || hg[0]);
            ctx.save();
            ctx.beginPath();
            drawing.roundRect(ctx, x, y, w, headerH + radius, radius);
            ctx.rect(x, y + headerH, w, h - headerH);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
        return { x: x, y: y, w: w, h: h, headerH: headerH };
    },

    /**
     * 蒙层
     */
    drawMask: function (ctx) {
        ctx.fillStyle = constants.COLOR_MODAL_MASK;
        ctx.fillRect(0, 0, constants.LOGICAL_WIDTH, constants.LOGICAL_HEIGHT);
    },

    /**
     * 顶部导航栏
     *  - hasBack:左侧绘制 ← 返回按钮
     *  - onHome:左侧绘制 🏠 返回首页按钮(用户反馈:从右侧移到左侧)
     */
    drawNavBar: function (ctx, opts) {
        var y0 = constants.MARGIN_TOP;
        drawing.fillGradientRect(ctx,
            0, y0,
            constants.LOGICAL_WIDTH, constants.NAV_HEIGHT,
            constants.COLOR_CARD_LIGHT,
            constants.COLOR_BG_LIGHT_BOTTOM,
            0);

        ctx.save();
        ctx.fillStyle = 'rgba(50,80,110,0.15)';
        ctx.fillRect(0, y0 + constants.NAV_HEIGHT - 1, constants.LOGICAL_WIDTH, 1);
        ctx.restore();

        var hit = {};
        // **变更**: 返回首页按钮放在左侧(用户反馈)
        // hasBack 与 onHome 都在左侧,优先显示 hasBack(子页面返回)
        if (opts.hasBack) {
            this.drawCircleButton(ctx, {
                x: 30 + constants.FAB_DIAMETER / 2,
                y: y0 + constants.NAV_HEIGHT / 2,
                r: constants.FAB_DIAMETER / 2,
                icon: '←',
                color: '#FFFFFF'
            });
            hit.backHit = {
                x: 30,
                y: y0 + (constants.NAV_HEIGHT - constants.FAB_DIAMETER) / 2,
                w: constants.FAB_DIAMETER,
                h: constants.FAB_DIAMETER
            };
        } else if (opts.onHome) {
            // **变更**: 从右侧移到左侧(用户反馈)
            this.drawCircleButton(ctx, {
                x: 30 + constants.FAB_DIAMETER / 2,
                y: y0 + constants.NAV_HEIGHT / 2,
                r: constants.FAB_DIAMETER / 2,
                icon: '🏠',
                color: '#FFFFFF'
            });
            hit.homeHit = {
                x: 30,
                y: y0 + (constants.NAV_HEIGHT - constants.FAB_DIAMETER) / 2,
                w: constants.FAB_DIAMETER,
                h: constants.FAB_DIAMETER
            };
        }

        drawing.drawText(ctx, opts.title || '',
            constants.LOGICAL_WIDTH / 2, y0 + constants.NAV_HEIGHT / 2,
            constants.COLOR_TEXT_TITLE, 'bold 24px sans-serif', 'center');

        return hit;
    },

    /**
     * 规则胶囊标签
     */
    drawPill: function (ctx, opts) {
        var text = opts.text || '';
        var padding = 14;
        ctx.font = '14px sans-serif';
        var tw = text.length * 14;
        var iw = opts.icon ? 18 : 0;
        var w = padding * 2 + tw + iw + 4;
        var h = constants.PILL_HEIGHT;
        var radius = h / 2;
        var x = opts.x, y = opts.y;

        ctx.save();
        ctx.fillStyle = constants.COLOR_CARD_LIGHT;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.strokeStyle = opts.color || constants.COLOR_BRAND;
        ctx.lineWidth = 1.5;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
        ctx.restore();

        var cx = x + padding;
        if (opts.icon) {
            drawing.drawEmoji(ctx, opts.icon, cx + 8, y + h / 2, 14);
            cx += 22;
        }
        drawing.drawText(ctx, text, cx + tw / 2, y + h / 2,
            constants.COLOR_TEXT_BODY, '14px sans-serif', 'center');
        return { x: x, y: y, w: w, h: h };
    },

    /**
     * 关闭按钮
     */
    drawCloseButton: function (ctx, opts) {
        var size = opts.size || 44;
        var x = opts.x, y = opts.y;
        ctx.save();
        ctx.fillStyle = 'rgba(92,67,38,0.18)';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawing.drawText(ctx, '✕', x + size / 2, y + size / 2,
            constants.COLOR_NAV_TITLE, 'bold 24px sans-serif', 'center');
        return { x: x, y: y, w: size, h: size };
    },

    /**
     * Toast
     */
    drawToast: function (ctx, opts) {
        var dt = Date.now() - opts.startTime;
        if (dt > 1500) return false;
        var text = opts.text || '';
        var padding = 24;
        var tw = text.length * 16;
        var w = padding * 2 + tw;
        var h = 56;
        var x = (constants.LOGICAL_WIDTH - w) / 2;
        var y = constants.MARGIN_TOP + 30;

        var alpha = dt < 200 ? dt / 200 : (dt > 1300 ? (1500 - dt) / 200 : 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(50,80,110,0.30)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(50,80,110,0.92)';
        drawing.roundRect(ctx, x, y, w, h, h / 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        drawing.drawText(ctx, text, x + w / 2, y + h / 2,
            '#FFFFFF', 'bold 18px sans-serif', 'center');
        ctx.restore();
        return true;
    },

    /**
     * 背包格(对标参考图:白底+细绿边+加厚立体阴影+彩色 emoji)
     *  - 与游戏主场景棋盘/背包完全同款样式
     *  - 空 slot:浅灰虚线边
     *  - 有物品:白底 + 细绿边 + 加厚立体阴影 + 彩色 emoji
     */
    drawBackpackSlot: function (ctx, opts) {
        var x = opts.x, y = opts.y, w = opts.w, h = opts.h;
        var radius = opts.radius || constants.BACKPACK_RADIUS;
        var type = opts.type || 0;
        var pressed = !!opts.pressed;
        var matched = !!opts.matched;

        if (pressed) {
            x = x + (1 - 0.95) * w / 2;
            y = y + (1 - 0.95) * h / 2;
            w = w * 0.95;
            h = h * 0.95;
        }

        if (type > 0) {
            // 有物品:白底 + 加厚立体阴影
            drawing.drawShadowedCard(ctx, x, y, w, h, radius, true);
            // 细绿边
            ctx.save();
            ctx.strokeStyle = constants.MAHJONG_BORDER_GREEN;
            ctx.lineWidth = constants.MAHJONG_BORDER_WIDTH;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.stroke();
            ctx.restore();
            // 彩色 emoji 图案
            drawing.drawEmoji(ctx, Treasures.getIcon(type),
                x + w / 2, y + h / 2, Math.min(w, h) * 0.62);
        } else {
            // 空 slot:浅灰虚线边(占位提示)
            ctx.save();
            ctx.fillStyle = 'rgba(245,250,240,0.5)';
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
            ctx.strokeStyle = 'rgba(150,180,150,0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            drawing.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, radius - 1);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // 三消闪烁
        if (matched) {
            ctx.save();
            var a = 0.5 + 0.5 * Math.sin(Date.now() / 100);
            ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
            ctx.lineWidth = 3;
            drawing.roundRect(ctx, x - 2, y - 2, w + 4, h + 4, radius + 2);
            ctx.stroke();
            ctx.restore();
        }

        return { x: opts.x, y: opts.y, w: opts.w, h: opts.h };
    },

    /**
     * 宝物格(层叠区/预览卡:对标参考图,白底+细绿边+加厚立体阴影+彩色 emoji)
     *  - 顶层 visible=true:100% 实色,加厚立体阴影,可点击
     *  - 底层 visible=false:0.45 alpha 发灰,轻盈阴影,不可点击
     */
    drawTreasureCell: function (ctx, opts) {
        var x = opts.x, y = opts.y, w = opts.w, h = opts.h;
        var radius = opts.radius || constants.CELL_RADIUS;
        var type = opts.type || 0;
        var visible = opts.visible !== false;
        var pressed = !!opts.pressed;

        if (pressed) {
            x = x + (1 - 0.95) * w / 2;
            y = y + (1 - 0.95) * h / 2;
            w = w * 0.95;
            h = h * 0.95;
        }

        if (type === 0) return { x: opts.x, y: opts.y, w: opts.w, h: opts.h };

        // 白底 + 加厚阴影(顶层/底层透明度不同)
        drawing.drawShadowedCard(ctx, x, y, w, h, radius, visible);

        // 细绿边
        ctx.save();
        ctx.strokeStyle = visible
            ? constants.MAHJONG_BORDER_GREEN
            : constants.MAHJONG_BORDER_GREEN_BOTTOM;
        ctx.lineWidth = visible
            ? constants.MAHJONG_BORDER_WIDTH
            : constants.MAHJONG_BORDER_WIDTH_BOTTOM;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
        ctx.restore();

        // 彩色 emoji 图案
        ctx.save();
        ctx.globalAlpha = visible
            ? constants.MAHJONG_TOP_ALPHA
            : constants.MAHJONG_BOTTOM_ALPHA;
        drawing.drawEmoji(ctx, Treasures.getIcon(type),
            x + w / 2, y + h / 2, Math.min(w, h) * 0.62);
        ctx.restore();

        return { x: opts.x, y: opts.y, w: opts.w, h: opts.h };
    }
};

module.exports = { UI: UI };