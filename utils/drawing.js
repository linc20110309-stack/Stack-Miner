/**
 * drawing - 通用绘图函数
 * 严格遵循 UI_ART_STANDARDS.md §10.5 圆角矩形必备工具
 *
 * **变更说明**(对标参考图):
 *   - 新增 drawMahjongIcon:黑白线条麻將图案绘制函数
 *   - 全部 15 种宝物图案使用纯黑色线条/填充,移除彩色 emoji
 */
var constants = require('./constants.js');

/**
 * 圆角矩形路径
 */
function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * 绘制垂直渐变填充矩形
 */
function fillGradientRect(ctx, x, y, w, h, topColor, bottomColor, radius) {
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    if (radius && radius > 0) {
        roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, w, h);
    }
}

/**
 * 全屏背景渐变
 */
function drawBackground(ctx, topColor, bottomColor) {
    var grad = ctx.createLinearGradient(0, 0, 0, constants.LOGICAL_HEIGHT);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, constants.LOGICAL_WIDTH, constants.LOGICAL_HEIGHT);
}

/**
 * 绘制带阴影的圆角矩形
 */
function drawShadowedRect(ctx, x, y, w, h, color, radius, shadow) {
    if (shadow) {
        ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = shadow.blur || 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = shadow.offsetY || 4;
    }
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, radius || 0);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * 绘制加厚底部立体阴影的卡牌(对标参考图)
 *  - 顶层:offsetY 8,blur 10,黑色 0.30 → 厚实立体感
 *  - 底层:offsetY 3,blur 4,黑色 0.12 → 轻盈下沉感
 */
function drawShadowedCard(ctx, x, y, w, h, radius, isTop) {
    var shadow = isTop ? constants.MAHJONG_SHADOW_TOP : constants.MAHJONG_SHADOW_BOTTOM;
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.fillStyle = constants.MAHJONG_BG;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();
}

/**
 * 绘制文本(适配麻將图案)
 */
function drawText(ctx, text, x, y, color, font, align) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font || '24px sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
    ctx.restore();
}

/**
 * 绘制 Emoji / 文本符号
 *  - **默认不覆盖 emoji 原色**:让麻将字符(🀄🀅🀆 等)保持系统彩色麻将牌样式
 *  - 文本/按钮符号(← 🏠 ✕ 等)也保持 emoji 原色
 *  - 可选 fillColor 覆盖,用于强制纯色文本场景
 * @param {Object} ctx
 * @param {string} icon Unicode 字符或文本符号
 * @param {number} x
 * @param {number} y
 * @param {number} size 像素大小
 * @param {string} fillColor 可选,为 null/undefined 时保留 emoji 原色
 */
function drawEmoji(ctx, icon, x, y, size, fillColor) {
    ctx.save();
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (fillColor) {
        ctx.fillStyle = fillColor;
    }
    ctx.fillText(icon, x, y);
    ctx.restore();
}

/**
 * 命中测试(矩形)
 */
function hitTest(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
}

/**
 * 命中测试(圆形)
 */
function hitTestCircle(px, py, cx, cy, r) {
    var dx = px - cx;
    var dy = py - cy;
    return dx * dx + dy * dy <= r * r;
}

/**
 * 绘制筒子牌圆点(对标麻将图案:1-6 个圆点)
 * @param {Object} ctx
 * @param {number} count 圆点数量(1-6)
 * @param {number} x 中心 X
 * @param {number} y 中心 Y
 * @param {number} size 卡牌尺寸
 */
function _drawTubeDots(ctx, count, x, y, size) {
    var radius = size * 0.10;
    var color = constants.MAHJONG_ICON_COLOR;
    ctx.save();
    ctx.fillStyle = color;
    if (count === 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 2) {
        ctx.beginPath();
        ctx.arc(x - size * 0.13, y - size * 0.10, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.13, y + size * 0.10, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 3) {
        ctx.beginPath();
        ctx.arc(x - size * 0.14, y - size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.14, y - size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 4) {
        ctx.beginPath();
        ctx.arc(x - size * 0.13, y - size * 0.13, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.13, y - size * 0.13, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - size * 0.13, y + size * 0.13, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.13, y + size * 0.13, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 5) {
        ctx.beginPath();
        ctx.arc(x - size * 0.14, y - size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.14, y - size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - size * 0.14, y + size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.14, y + size * 0.14, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 6) {
        for (var row = 0; row < 2; row++) {
            for (var col = 0; col < 3; col++) {
                ctx.beginPath();
                ctx.arc(
                    x - size * 0.14 + col * size * 0.14,
                    y - size * 0.12 + row * size * 0.24,
                    radius, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
    ctx.restore();
}

/**
 * 绘制汉字牌面(中央文字)
 */
function _drawCharCard(ctx, ch, x, y, size, boxed) {
    var color = constants.MAHJONG_ICON_COLOR;
    ctx.save();
    if (boxed) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, size * 0.04);
        var boxSize = size * 0.6;
        ctx.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize);
    }
    ctx.fillStyle = color;
    ctx.font = 'bold ' + Math.floor(size * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y + size * 0.02);
    ctx.restore();
}

/**
 * 绘制麻将黑白线条图案(对标参考图,统一 15 种宝物)
 *  - 全部使用 #2A2A2A 黑色/深灰线条绘制
 *  - 不依赖系统 emoji 字体,跨平台一致
 *  - 适配任何尺寸(由 size 决定)
 *
 * 15 种图案:
 *   1: 中(框 + 红中点)
 *   2: 发(框 + ¥)
 *   3: 白(框 + 三横)
 *   4: 东(箭头形)
 *   5: 南(倒箭头形)
 *   6: 西(双横箭头)
 *   7: 北(双纵箭头)
 *   8: 一筒(1 个圆点)
 *   9: 二筒(2 个圆点)
 *   10: 三筒(3 个圆点)
 *   11: 四筒(4 个圆点)
 *   12: 五筒(5 个圆点)
 *   13: 六筒(6 个圆点)
 *   14: 春(花)
 *   15: 夏(太阳)
 *
 * @param {Object} ctx
 * @param {number} type 宝物 type(1-15)
 * @param {number} x 中心 X
 * @param {number} y 中心 Y
 * @param {number} size 边长
 */
function drawMahjongIcon(ctx, type, x, y, size) {
    ctx.save();
    ctx.fillStyle = constants.MAHJONG_ICON_COLOR;
    ctx.strokeStyle = constants.MAHJONG_ICON_COLOR;
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var half = size / 2;
    var r = size * 0.35;

    switch (type) {
        case 1: // 红中(框 + 中心实心点)
            ctx.strokeRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
            ctx.beginPath();
            ctx.arc(x, y, size * 0.10, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 2: // 发财(框 + ¥)
            ctx.strokeRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
            ctx.font = 'bold ' + Math.floor(size * 0.42) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('¥', x, y + size * 0.02);
            break;
        case 3: // 白板(框 + 三横线)
            ctx.strokeRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
            ctx.lineWidth = Math.max(1.2, size * 0.025);
            for (var i3 = 0; i3 < 3; i3++) {
                var ly = y - r * 0.35 + i3 * r * 0.35;
                ctx.beginPath();
                ctx.moveTo(x - r * 0.4, ly);
                ctx.lineTo(x + r * 0.4, ly);
                ctx.stroke();
            }
            break;
        case 4: // 东风(向上箭头)
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r * 0.6, y);
            ctx.lineTo(x + r * 0.25, y);
            ctx.lineTo(x + r * 0.25, y + r);
            ctx.lineTo(x - r * 0.25, y + r);
            ctx.lineTo(x - r * 0.25, y);
            ctx.lineTo(x - r * 0.6, y);
            ctx.closePath();
            ctx.stroke();
            break;
        case 5: // 南风(向下箭头)
            ctx.beginPath();
            ctx.moveTo(x, y + r);
            ctx.lineTo(x + r * 0.6, y);
            ctx.lineTo(x + r * 0.25, y);
            ctx.lineTo(x + r * 0.25, y - r);
            ctx.lineTo(x - r * 0.25, y - r);
            ctx.lineTo(x - r * 0.25, y);
            ctx.lineTo(x - r * 0.6, y);
            ctx.closePath();
            ctx.stroke();
            break;
        case 6: // 西风(双横箭头)
            ctx.lineWidth = Math.max(1.5, size * 0.05);
            ctx.beginPath();
            ctx.moveTo(x - r, y);
            ctx.lineTo(x + r, y);
            ctx.stroke();
            // 左箭头
            ctx.beginPath();
            ctx.moveTo(x - r * 0.7, y - r * 0.5);
            ctx.lineTo(x - r, y);
            ctx.lineTo(x - r * 0.7, y + r * 0.5);
            ctx.stroke();
            // 右箭头
            ctx.beginPath();
            ctx.moveTo(x + r * 0.7, y - r * 0.5);
            ctx.lineTo(x + r, y);
            ctx.lineTo(x + r * 0.7, y + r * 0.5);
            ctx.stroke();
            break;
        case 7: // 北风(双纵箭头)
            ctx.lineWidth = Math.max(1.5, size * 0.05);
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x, y + r);
            ctx.stroke();
            // 上箭头
            ctx.beginPath();
            ctx.moveTo(x - r * 0.5, y - r * 0.7);
            ctx.lineTo(x, y - r);
            ctx.lineTo(x + r * 0.5, y - r * 0.7);
            ctx.stroke();
            // 下箭头
            ctx.beginPath();
            ctx.moveTo(x - r * 0.5, y + r * 0.7);
            ctx.lineTo(x, y + r);
            ctx.lineTo(x + r * 0.5, y + r * 0.7);
            ctx.stroke();
            break;
        case 8:  _drawTubeDots(ctx, 1, x, y, size); break;
        case 9:  _drawTubeDots(ctx, 2, x, y, size); break;
        case 10: _drawTubeDots(ctx, 3, x, y, size); break;
        case 11: _drawTubeDots(ctx, 4, x, y, size); break;
        case 12: _drawTubeDots(ctx, 5, x, y, size); break;
        case 13: _drawTubeDots(ctx, 6, x, y, size); break;
        case 14: // 春(花朵)
        {
            // 中心圆
            ctx.beginPath();
            ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            // 5 个花瓣
            for (var p = 0; p < 5; p++) {
                var angle = (Math.PI * 2 / 5) * p - Math.PI / 2;
                var px = x + Math.cos(angle) * size * 0.20;
                var py = y + Math.sin(angle) * size * 0.20;
                ctx.beginPath();
                ctx.arc(px, py, size * 0.13, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 15: // 夏(太阳)
        {
            // 中心圆(空心)
            ctx.beginPath();
            ctx.arc(x, y, size * 0.16, 0, Math.PI * 2);
            ctx.stroke();
            // 8 条光芒
            ctx.lineWidth = Math.max(1.5, size * 0.035);
            for (var r2 = 0; r2 < 8; r2++) {
                var ang = (Math.PI * 2 / 8) * r2;
                var dx = Math.cos(ang);
                var dy = Math.sin(ang);
                ctx.beginPath();
                ctx.moveTo(x + dx * size * 0.22, y + dy * size * 0.22);
                ctx.lineTo(x + dx * size * 0.34, y + dy * size * 0.34);
                ctx.stroke();
            }
            break;
        }
        default:
            // 兜底:绘制一个问号
            _drawCharCard(ctx, '?', x, y, size, true);
            break;
    }
    ctx.restore();
}

module.exports = {
    roundRect: roundRect,
    fillGradientRect: fillGradientRect,
    drawBackground: drawBackground,
    drawShadowedRect: drawShadowedRect,
    drawShadowedCard: drawShadowedCard,
    drawEmoji: drawEmoji,
    drawMahjongIcon: drawMahjongIcon,
    drawText: drawText,
    hitTest: hitTest,
    hitTestCircle: hitTestCircle
};
