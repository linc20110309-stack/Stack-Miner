/**
 * ui - 通用 UI 组件库(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md + UI 优化提示词 V2
 *
 * **变更说明**(UI 优化提示词 V2):
 *   - 新增 drawTopNavBar: 顶部三栏信息区(当前关卡/最佳关卡/当前连胜)
 *   - 新增 drawBackgroundTexture: 背景藏宝图纹理
 *   - 新增 drawBackpackContainer: 背包白底圆角容器
 *   - 新增 drawBackpackFullBorder: 背包满时红色闪烁边框
 *   - 新增 drawPrimaryButton / drawSecondaryButton: 规格化按钮(280x64 圆角32)
 *   - 新增 drawModalButton: 弹窗按钮(28px bold,间距 30)
 *   - 新增 drawUnlockFlash: 解锁闪烁描边
 *   - 新增 drawClickableHighlight: 可点击高亮描边(寻宝金)
 *   - 新增 drawFailText: 失败辅助文字
 */
var constants = require('./constants.js');
var drawing = require('./drawing.js');
var Treasures = require('./treasures.js').Treasures;

var UI = {

    /**
     * **新增**: 顶部信息区(规范 UI_ART_STANDARDS §9)
     *  - 90px 高,寻宝金 + 宝石蓝配色
     *  - 三栏:当前关卡 / 最佳关卡 / 当前连胜
     *  - 数字 28px bold + 1px 描边(提升辨识度)
     *  - 标签 14px #888888
     *  - 轻微金币纹理背景
     * @param {Object} ctx
     * @param {Object} opts {currentLevel, bestLevel, currentStreak, onBack}
     * @returns {Object} hitAreas {backHit}
     */
    drawTopNavBar: function (ctx, opts) {
        var y0 = constants.MARGIN_TOP;
        var w = constants.LOGICAL_WIDTH;
        var h = constants.NAV_HEIGHT;

        // 1) 背景渐变(顶部白 → 底部暖色)
        var grad = ctx.createLinearGradient(0, y0, 0, y0 + h);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, constants.COLORS.BG_TOP);
        ctx.save();
        ctx.fillStyle = grad;
        drawing.roundRect(ctx, 0, y0, w, h, 0);
        ctx.fill();

        // 2) 轻微金币纹理背景(规范要求)
        var tileSize = 32;
        ctx.fillStyle = constants.COLORS.NAV_GOLD_TINT;
        for (var ty = y0; ty < y0 + h; ty += tileSize) {
            for (var tx = 0; tx < w; tx += tileSize) {
                if (((tx / tileSize) + (ty / tileSize)) % 2 === 0) {
                    ctx.fillRect(tx, ty, tileSize / 2, tileSize / 2);
                }
            }
        }

        // 3) 底部阴影分隔
        ctx.fillStyle = 'rgba(50,40,20,0.08)';
        ctx.fillRect(0, y0 + h - 2, w, 2);
        ctx.restore();

        // 4) 返回首页按钮(左上)
        var hit = {};
        if (opts.onBack) {
            this.drawCircleButton(ctx, {
                x: 30 + constants.FAB_DIAMETER / 2,
                y: y0 + h / 2,
                r: constants.FAB_DIAMETER / 2,
                icon: '🏠',
                color: '#FFFFFF'
            });
            hit.backHit = {
                x: 30,
                y: y0 + (h - constants.FAB_DIAMETER) / 2,
                w: constants.FAB_DIAMETER,
                h: constants.FAB_DIAMETER
            };
        }

        // 5) 三栏信息(从左到右:当前关卡 / 最佳关卡 / 当前连胜)
        var sectionW = (w - 60 - (3 - 1) * constants.NAV_SECTION_GAP) / 3;
        var sectionY = y0;
        var sectionH = h;

        var labels = [
            { label: '当前关卡', value: opts.currentLevel, unit: '' },
            { label: '最佳关卡', value: opts.bestLevel, unit: '' },
            { label: '当前连胜', value: opts.currentStreak, unit: '' }
        ];

        var valueFont = 'bold ' + constants.FONT_SIZE_NAV_VALUE + 'px sans-serif';
        var labelFont = constants.FONT_SIZE_NAV_LABEL + 'px sans-serif';

        var sectionHit = [];
        for (var i = 0; i < labels.length; i++) {
            var sec = labels[i];
            var sx = 60 + i * (sectionW + constants.NAV_SECTION_GAP);
            var cx = sx + sectionW / 2;
            // 数字(1px 描边,提升辨识度)
            drawing.drawTextStroke(ctx, String(sec.value !== undefined ? sec.value : '--'),
                cx, sectionY + sectionH / 2 - 8,
                constants.COLORS.NAV_LEVEL_TEXT,
                valueFont,
                '#FFFFFF',
                2,
                'center');
            // 标签
            drawing.drawText(ctx, sec.label,
                cx, sectionY + sectionH / 2 + 18,
                constants.COLORS.NAV_LEVEL_SUBTEXT,
                labelFont, 'center');
            sectionHit.push({ x: sx, y: sectionY, w: sectionW, h: sectionH, name: 'nav_' + i });
        }

        hit.sectionHit = sectionHit;
        return hit;
    },

    /**
     * **新增**: 背景藏宝图纹理(规范:页面背景 + 低透明度纹理)
     *  - 在背景渐变之上绘制极淡的纹理点线
     *  - 极小性能开销(纯 canvas 绘制)
     */
    drawBackgroundTexture: function (ctx) {
        var w = constants.LOGICAL_WIDTH;
        var h = constants.LOGICAL_HEIGHT;
        var size = constants.BG_TEXTURE_PATTERN_SIZE || 64;
        ctx.save();
        ctx.strokeStyle = constants.COLORS.BG_TEXTURE_LINE_COLOR;
        ctx.lineWidth = 1;

        // 1) 横向波浪线(地图等高线效果)
        for (var y = size; y < h; y += size * 2) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (var x = 0; x < w; x += size) {
                ctx.lineTo(x, y + Math.sin(x / 30) * 4);
            }
            ctx.stroke();
        }

        // 2) 散落小点(藏宝图 X 标记)
        ctx.fillStyle = constants.COLORS.BG_TEXTURE_DOT_COLOR;
        var seed = 1234;
        for (var dy = size / 2; dy < h; dy += size * 3) {
            for (var dx = size / 2; dx < w; dx += size * 3) {
                seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
                if (seed % 5 === 0) {
                    ctx.beginPath();
                    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    },

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
     * 渐变按钮(保留旧接口以兼容旧调用方)
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
     * **新增**: 主按钮(规范:280×64 圆角 32,寻宝金填充 + 白色文字)
     *  - 默认尺寸 280×64,圆角 32
     *  - 点击反馈 120ms 缩放(1.0→0.95→1.0)
     *  - 轻微顶部高光
     */
    drawPrimaryButton: function (ctx, opts) {
        var x = opts.x, y = opts.y;
        var w = opts.width || constants.BUTTON_WIDTH;
        var h = opts.height || constants.BUTTON_HEIGHT;
        var radius = opts.radius || constants.BUTTON_RADIUS;
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
            ctx.shadowColor = 'rgba(216,154,42,0.35)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
            var grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, constants.COLORS.BRAND);
            grad.addColorStop(1, constants.COLORS.BRAND_DARK);
            ctx.fillStyle = grad;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            // 顶部高光
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            drawing.roundRect(ctx, x + 6, y + 4, w - 12, (h - 8) / 2, Math.max(0, radius - 6));
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = constants.COLORS.BUTTON_DISABLED;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
        }

        var textColor = disabled ? constants.COLORS.BUTTON_DISABLED_TEXT : constants.COLORS.BTN_PRIMARY_TEXT;
        var cx = x + w / 2;
        var cy = y + h / 2;
        var label = opts.label || '';
        var fontSize = opts.fontSize || 24;
        if (opts.icon) {
            drawing.drawEmoji(ctx, opts.icon,
                cx - (label.length * 12), cy,
                h * 0.4);
            drawing.drawText(ctx, label,
                cx + (opts.icon ? 14 : 0), cy,
                textColor,
                opts.font || ('bold ' + fontSize + 'px sans-serif'),
                'center');
        } else {
            drawing.drawText(ctx, label, cx, cy,
                textColor,
                opts.font || ('bold ' + fontSize + 'px sans-serif'),
                'center');
        }
        return { x: opts.x, y: opts.y, w: opts.width || constants.BUTTON_WIDTH, h: opts.height || constants.BUTTON_HEIGHT };
    },

    /**
     * **新增**: 辅助按钮(规范:宝石蓝描边 + 文字,白底)
     *  - 默认尺寸 280×64,圆角 32
     */
    drawSecondaryButton: function (ctx, opts) {
        var x = opts.x, y = opts.y;
        var w = opts.width || constants.BUTTON_WIDTH;
        var h = opts.height || constants.BUTTON_HEIGHT;
        var radius = opts.radius || constants.BUTTON_RADIUS;
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
            // 白底
            ctx.fillStyle = constants.COLORS.BTN_SECONDARY_BG;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
            // 描边
            ctx.strokeStyle = constants.COLORS.BTN_SECONDARY_STROKE;
            ctx.lineWidth = 2;
            drawing.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, radius);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.fillStyle = constants.COLORS.BUTTON_DISABLED;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
        }

        var textColor = disabled ? constants.COLORS.BUTTON_DISABLED_TEXT : constants.COLORS.BTN_SECONDARY_TEXT;
        var cx = x + w / 2;
        var cy = y + h / 2;
        var label = opts.label || '';
        var fontSize = opts.fontSize || 24;
        if (opts.icon) {
            drawing.drawEmoji(ctx, opts.icon,
                cx - (label.length * 12), cy,
                h * 0.4);
            drawing.drawText(ctx, label,
                cx + (opts.icon ? 14 : 0), cy,
                textColor,
                opts.font || ('bold ' + fontSize + 'px sans-serif'),
                'center');
        } else {
            drawing.drawText(ctx, label, cx, cy,
                textColor,
                opts.font || ('bold ' + fontSize + 'px sans-serif'),
                'center');
        }
        return { x: opts.x, y: opts.y, w: opts.width || constants.BUTTON_WIDTH, h: opts.height || constants.BUTTON_HEIGHT };
    },

    /**
     * **新增**: 弹窗按钮(规范:弹窗内按钮,28px bold,间距 30)
     *  - 默认尺寸 180×64
     *  - 点击反馈缩放
     */
    drawModalButton: function (ctx, opts) {
        var x = opts.x, y = opts.y;
        var w = opts.width || constants.MODAL_BTN_WIDTH;
        var h = opts.height || constants.MODAL_BTN_HEIGHT;
        var radius = h / 2;
        var pressed = !!opts.pressed;
        var disabled = !!opts.disabled;
        var bg = opts.bgColor || constants.COLORS.BRAND;
        var dark = opts.darkenColor || constants.COLORS.BRAND_DARK;
        var textColor = opts.textColor || constants.COLORS.MODAL_BTN_TEXT;

        if (pressed) {
            x = x + (1 - 0.95) * w / 2;
            y = y + (1 - 0.95) * h / 2;
            w = w * 0.95;
            h = h * 0.95;
        }

        if (!disabled) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.20)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            var grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, bg);
            grad.addColorStop(1, dark);
            ctx.fillStyle = grad;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            drawing.roundRect(ctx, x + 5, y + 4, w - 10, (h - 8) / 2, Math.max(0, radius - 5));
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = constants.COLORS.BUTTON_DISABLED;
            drawing.roundRect(ctx, x, y, w, h, radius);
            ctx.fill();
        }

        var cx = x + w / 2;
        var cy = y + h / 2;
        var label = opts.label || '';
        if (opts.icon) {
            drawing.drawEmoji(ctx, opts.icon,
                cx - (label.length * 13), cy,
                h * 0.4);
            drawing.drawText(ctx, label,
                cx + (opts.icon ? 14 : 0), cy,
                textColor,
                constants.MODAL_BTN_FONT,
                'center');
        } else {
            drawing.drawText(ctx, label, cx, cy,
                textColor,
                constants.MODAL_BTN_FONT,
                'center');
        }
        return { x: opts.x, y: opts.y, w: opts.width || constants.MODAL_BTN_WIDTH, h: opts.height || constants.MODAL_BTN_HEIGHT };
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
     * 顶部导航栏(保留旧接口以兼容旧调用方,内部委托 drawTopNavBar)
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
     * **新增**: 背包容器(规范:白色背景 #FFFFFF + 20px 圆角,96px 高)
     *  - 在 7 个背包 slot 外绘制圆角白底容器
     *  - 失败时叠加红色闪烁边框
     */
    drawBackpackContainer: function (ctx, x, y, w, h, opts) {
        opts = opts || {};
        var radius = opts.radius || constants.BACKPACK_CONTAINER_RADIUS;

        ctx.save();
        // 1) 阴影(轻微)
        if (opts.shadow !== false) {
            ctx.shadowColor = 'rgba(0,0,0,0.12)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 3;
        }
        // 2) 白底
        ctx.fillStyle = constants.COLORS.BACKPACK_BG;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 3) 失败闪烁边框(规范:背包满时边框闪烁 #FF6B6B)
        if (opts.flashing && opts.flashStartTime) {
            var alpha = 0.5 + 0.5 * Math.sin((Date.now() - opts.flashStartTime) / 120);
            ctx.strokeStyle = 'rgba(255,107,107,' + alpha + ')';
            ctx.lineWidth = 3;
            drawing.roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, radius);
            ctx.stroke();
        }
        ctx.restore();
    },

    /**
     * 背包格(对标参考图:白底+细绿边+加厚立体阴影+彩色 emoji)
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
            // 空 slot:浅灰虚线边
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
     * 宝物格(层叠区/预览卡)
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

        // 白底 + 加厚阴影
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
    },

    /**
     * **新增**: 可点击高亮描边(规范:寻宝金 #F5B942 高亮描边)
     *  - 在 _drawMahjongCard 之后调用,叠加在外围
     *  - 含轻微光晕(寻宝金 + alpha)
     */
    drawClickableHighlight: function (ctx, x, y, w, h, radius) {
        ctx.save();
        // 外层光晕
        ctx.shadowColor = 'rgba(245,185,66,' + constants.CLICKABLE_GLOW_ALPHA + ')';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = constants.CLICKABLE_BORDER_COLOR;
        ctx.lineWidth = constants.CLICKABLE_BORDER_WIDTH;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
    },

    /**
     * **新增**: 解锁闪烁描边(规范:下层解锁 150ms 渐亮 + 描边闪烁)
     *  - 在 _computeClickable 状态从 false→true 时调用
     *  - 持续 150ms 闪烁后自动消失
     */
    drawUnlockFlash: function (ctx, x, y, w, h, radius, startTime) {
        var dur = constants.ANIM_UNLOCK_FLASH || 150;
        var dt = Date.now() - startTime;
        if (dt >= dur) return false;
        var p = dt / dur;
        var alpha = (p < 0.5) ? p * 2 : 1 - (p - 0.5) * 2;
        if (alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = constants.CLICKABLE_BORDER_COLOR;
        ctx.lineWidth = constants.CLICKABLE_BORDER_WIDTH;
        drawing.roundRect(ctx, x - 1, y - 1, w + 2, h + 2, radius);
        ctx.stroke();
        // 外层光晕
        ctx.shadowColor = 'rgba(245,185,66,' + (alpha * 0.5) + ')';
        ctx.shadowBlur = 10;
        drawing.roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
        return true;
    },

    /**
     * **新增**: 失败辅助文字(规范:短暂显示"背包已满,无法消除"18px #888888)
     *  - 显示 1.5 秒后自动隐藏
     */
    drawFailHintText: function (ctx, x, y, text, startTime) {
        var dt = Date.now() - startTime;
        if (dt > 1500) return false;
        var alpha = dt < 200 ? dt / 200 : (dt > 1300 ? (1500 - dt) / 200 : 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        drawing.drawText(ctx, text || '背包已满,无法消除',
            x, y,
            constants.COLORS.TEXT_HINT,
            '18px sans-serif',
            'center');
        ctx.restore();
        return true;
    }
};

module.exports = { UI: UI };