/**
 * home - 主菜单场景(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md §7
 *  - Logo + 标题
 *  - 9 关卡网格(level 0-8)
 *  - 无限模式入口(第 10 关起)
 *  - 设置按钮(左上角齿轮) + 设置浮层
 *
 * **关卡设计**(规范 GAME_DESIGN §6):
 *   - level 0-8:9 关预设
 *   - level 9+:无限模式(动态生成)
 */
var constants = require('../constants.js');
var drawing = require('../drawing.js');
var UI = require('../ui.js').UI;
var SaveSystem = null;
var LevelGenerator = require('../level-generator.js').LevelGenerator;

/**
 * 渲染主菜单
 */
function render(ctx, game) {
    // 暖色背景(规范 §4.5)
    drawing.drawBackground(ctx,
        constants.COLORS.BG_TOP,
        constants.COLORS.BG_BOTTOM);

    // 标题(规范 §7)
    drawing.drawText(ctx, '奇妙寻宝',
        constants.LOGICAL_WIDTH / 2, constants.MARGIN_TOP + 80,
        constants.COLORS.BRAND, 'bold ' + constants.FONT_SIZE_TITLE + 'px sans-serif', 'center');
    drawing.drawText(ctx, 'Stack Miner',
        constants.LOGICAL_WIDTH / 2, constants.MARGIN_TOP + 128,
        constants.COLORS.TEXT_BODY, constants.FONT_SIZE_HINT + 'px sans-serif', 'center');

    // 设置按钮(左上角齿轮)
    _drawSettingsButton(ctx, game);

    // 统计卡片
    _drawStats(ctx, game);

    // 关卡列表
    _drawLevelGrid(ctx, game);

    // 无限模式入口
    _drawInfiniteEntry(ctx, game);

    // 设置浮层
    if (game._homeShowSettings) {
        _drawSettingsPanel(ctx, game);
    }

    if (game._toast) {
        if (!UI.drawToast(ctx, game._toast)) {
            game._toast = null;
        }
    }
}

/**
 * 统计卡片(最佳连胜/总局数/已通关)
 */
function _drawStats(ctx, game) {
    if (!SaveSystem) return;
    var cardY = constants.MARGIN_TOP + 180;
    var cardW = (constants.LOGICAL_WIDTH - constants.MARGIN_X * 2 - constants.CARD_GAP * 2) / 3;
    var cardH = 70;
    UI.drawInfoCard(ctx, {
        x: constants.MARGIN_X, y: cardY,
        w: cardW, h: cardH,
        icon: '🔥',
        label: '最佳连胜',
        value: SaveSystem.getBestStreak(),
        valueColor: constants.COLORS.BRAND
    });
    UI.drawInfoCard(ctx, {
        x: constants.MARGIN_X + (cardW + constants.CARD_GAP) * 1, y: cardY,
        w: cardW, h: cardH,
        icon: '🎮',
        label: '总局数',
        value: SaveSystem.getTotalPlays(),
        valueColor: constants.COLORS.TEXT_TITLE
    });
    UI.drawInfoCard(ctx, {
        x: constants.MARGIN_X + (cardW + constants.CARD_GAP) * 2, y: cardY,
        w: cardW, h: cardH,
        icon: '🏆',
        label: '已通关',
        value: (SaveSystem.getUnlockedLevel() + 1) + '/9',
        valueColor: constants.COLORS.BRAND
    });
}

/**
 * 设置按钮(左上角齿轮)
 */
function _drawSettingsButton(ctx, game) {
    var x = 60;
    var y = 60;
    var r = 28;

    var pressed = game._pressedButton === 'settings';
    if (pressed) r = r * 0.92;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.20)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = constants.COLORS.WHITE;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = constants.COLORS.TEXT_TITLE;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙', x, y);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = constants.COLORS.BRAND;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    game._homeSettingsHit = {
        x: x - r, y: y - r, w: r * 2, h: r * 2, name: 'settings'
    };
}

/**
 * 设置浮层(规范 UI_ART_STANDARDS §15)
 * 三个开关:音乐 / 音效 / 振动
 */
function _drawSettingsPanel(ctx, game) {
    if (!SaveSystem) return;

    ctx.save();
    ctx.fillStyle = 'rgba(50,40,20,0.55)';
    ctx.fillRect(0, 0, constants.LOGICAL_WIDTH, constants.LOGICAL_HEIGHT);
    ctx.restore();

    var panelW = 540;
    var panelH = 540;
    var panelX = (constants.LOGICAL_WIDTH - panelW) / 2;
    var panelY = (constants.LOGICAL_HEIGHT - panelH) / 2 - 40;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = constants.COLORS.WHITE;
    drawing.roundRect(ctx, panelX, panelY, panelW, panelH, 24);
    ctx.fill();
    ctx.restore();

    drawing.drawText(ctx, '⚙ 设置',
        constants.LOGICAL_WIDTH / 2, panelY + 50,
        constants.COLORS.TEXT_TITLE, 'bold ' + constants.FONT_SIZE_SECTION + 'px sans-serif', 'center');

    var itemY = panelY + 110;
    var itemH = 90;
    var itemW = panelW - 60;
    var itemX = panelX + 30;

    var settings = [
        { key: 'music', icon: '🎵', title: '背景音乐', desc: '游戏中的背景音乐' },
        { key: 'sound', icon: '🔊', title: '音效', desc: '点击/三消/胜利等音效' },
        { key: 'vibration', icon: '📳', title: '振动反馈', desc: '三消/胜利时的短振' }
    ];

    game._homeSettingToggles = [];
    for (var i = 0; i < settings.length; i++) {
        var s = settings[i];
        var y = itemY + i * (itemH + 8);
        var enabled = SaveSystem.getSetting(s.key);

        ctx.save();
        ctx.fillStyle = enabled ? 'rgba(245,185,66,0.18)' : 'rgba(0,0,0,0.04)';
        drawing.roundRect(ctx, itemX, y, itemW, itemH, 12);
        ctx.fill();
        ctx.strokeStyle = enabled ? constants.COLORS.BRAND : 'rgba(0,0,0,0.10)';
        ctx.lineWidth = 1.5;
        drawing.roundRect(ctx, itemX, y, itemW, itemH, 12);
        ctx.stroke();
        ctx.restore();

        drawing.drawText(ctx, s.icon,
            itemX + 35, y + itemH / 2,
            constants.COLORS.TEXT_TITLE, '32px sans-serif', 'center');

        drawing.drawText(ctx, s.title,
            itemX + 80, y + 32,
            constants.COLORS.TEXT_TITLE, 'bold 18px sans-serif', 'left');
        drawing.drawText(ctx, s.desc,
            itemX + 80, y + 56,
            constants.COLORS.TEXT_HINT, '13px sans-serif', 'left');

        var toggleX = itemX + itemW - 50;
        var toggleY = y + itemH / 2;
        var toggleW = 50;
        var toggleH = 28;

        ctx.save();
        ctx.fillStyle = enabled ? constants.COLORS.BRAND : '#D4C8B8';
        drawing.roundRect(ctx, toggleX - toggleW / 2, toggleY - toggleH / 2, toggleW, toggleH, toggleH / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(enabled ? toggleX + toggleW / 4 : toggleX - toggleW / 4, toggleY, toggleH / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        game._homeSettingToggles.push({
            x: toggleX - toggleW / 2, y: toggleY - toggleH / 2,
            w: toggleW, h: toggleH, key: s.key
        });
    }

    var closeBtn = UI.drawGradientButton(ctx, {
        x: constants.LOGICAL_WIDTH / 2 - 100, y: panelY + panelH - 80,
        width: 200, height: 50,
        bgColor: constants.COLORS.BRAND,
        darkenColor: constants.COLORS.BRAND_DARK,
        icon: '✕', label: '关闭',
        pressed: game._pressedButton === 'settings_close'
    });
    game._homeSettingsCloseHit = closeBtn;

    game._homeSettingsMaskHit = {
        x: 0, y: 0, w: constants.LOGICAL_WIDTH, h: constants.LOGICAL_HEIGHT
    };
}

/**
 * 关卡网格(9 关预设,3x3 布局)
 */
function _drawLevelGrid(ctx, game) {
    if (!SaveSystem) return;
    var unlocked = SaveSystem.getUnlockedLevel();
    var cols = 3;
    var startY = constants.MARGIN_TOP + 280;
    var cardW = (constants.LOGICAL_WIDTH - constants.MARGIN_X * 2 - constants.CARD_GAP * 2) / 3;
    var cardH = 80;
    var hitList = [];
    for (var i = 0; i < constants.PRESET_LEVEL_COUNT; i++) {
        var lv = i;
        var col = i % cols;
        var row = (i / cols) | 0;
        var x = constants.MARGIN_X + col * (cardW + constants.CARD_GAP);
        var y = startY + row * (cardH + constants.CARD_GAP);
        var isUnlocked = lv <= unlocked;
        var isCurrent = lv === unlocked;
        var pressed = game._pressedButton === ('level_' + lv);

        drawing.drawShadowedRect(ctx, x, y, cardW, cardH,
            isUnlocked ? 'rgba(255,250,243,0.95)' : 'rgba(200,200,200,0.4)',
            constants.CARD_RADIUS,
            { color: 'rgba(0,0,0,0.15)', blur: 6, offsetY: 3 });

        if (isCurrent) {
            ctx.save();
            ctx.strokeStyle = constants.COLORS.BRAND;
            ctx.lineWidth = 3;
            drawing.roundRect(ctx, x, y, cardW, cardH, constants.CARD_RADIUS);
            ctx.stroke();
            ctx.restore();
        }

        if (isUnlocked) {
            drawing.drawText(ctx, isCurrent ? '▶' : '',
                x + cardW / 2, y + 16,
                constants.COLORS.BRAND, 'bold 14px sans-serif', 'center');
            drawing.drawText(ctx, '第 ' + (lv + 1) + ' 关',
                x + cardW / 2, y + 44,
                constants.COLORS.TEXT_TITLE, 'bold 18px sans-serif', 'center');
            drawing.drawText(ctx, isCurrent ? '当前' : '点击进入',
                x + cardW / 2, y + 64,
                isCurrent ? constants.COLORS.BRAND : constants.COLORS.TEXT_HINT,
                '12px sans-serif', 'center');
        } else {
            drawing.drawText(ctx, '🔒', x + cardW / 2, y + 30,
                constants.COLORS.TEXT_HINT, '28px sans-serif', 'center');
            drawing.drawText(ctx, '???', x + cardW / 2, y + 58,
                constants.COLORS.TEXT_HINT, 'bold 16px sans-serif', 'center');
        }

        hitList.push({ x: x, y: y, w: cardW, h: cardH, level: lv, locked: !isUnlocked, name: 'level_' + lv });
    }
    game._homeLevelHits = hitList;
}

/**
 * 无限模式入口(规范 GAME_DESIGN §6:第 10 关开始无限模式)
 */
function _drawInfiniteEntry(ctx, game) {
    if (!SaveSystem) return;
    var unlocked = SaveSystem.getUnlockedLevel();
    if (unlocked < constants.PRESET_LEVEL_COUNT - 1) {
        // 未通关 9 关:显示锁定状态
        var lockY = constants.LOGICAL_HEIGHT - constants.MARGIN_BOTTOM - 130;
        var lockW = constants.LOGICAL_WIDTH - constants.MARGIN_X * 2;
        var lockH = 60;
        drawing.drawShadowedRect(ctx, constants.MARGIN_X, lockY, lockW, lockH,
            'rgba(200,200,200,0.35)',
            constants.CARD_RADIUS,
            { color: 'rgba(0,0,0,0.10)', blur: 4, offsetY: 2 });
        drawing.drawText(ctx, '🔒',
            constants.MARGIN_X + 24, lockY + lockH / 2,
            constants.COLORS.TEXT_HINT, '24px sans-serif', 'center');
        var remaining = constants.PRESET_LEVEL_COUNT - (unlocked + 1);
        drawing.drawText(ctx, '通关全部 9 关,解锁「无限模式」',
            constants.MARGIN_X + 60, lockY + lockH / 2 - 8,
            constants.COLORS.TEXT_TITLE, 'bold 15px sans-serif', 'left');
        drawing.drawText(ctx, '还剩 ' + remaining + ' 关',
            constants.MARGIN_X + 60, lockY + lockH / 2 + 12,
            constants.COLORS.BRAND, 'bold 13px sans-serif', 'left');
        game._homeInfiniteHit = null;
    } else {
        // 已解锁无限模式
        var infY = constants.LOGICAL_HEIGHT - constants.MARGIN_BOTTOM - 110;
        var infW = constants.LOGICAL_WIDTH - constants.MARGIN_X * 2;
        var infH = 80;
        var pressed = game._pressedButton === 'infinite';

        drawing.drawShadowedRect(ctx, constants.MARGIN_X, infY, infW, infH,
            constants.COLORS.BRAND,
            constants.CARD_RADIUS,
            { color: 'rgba(0,0,0,0.20)', blur: 8, offsetY: 4 });

        drawing.drawText(ctx, '♾️ 无限模式',
            constants.MARGIN_X + 24, infY + infH / 2,
            constants.COLORS.WHITE, 'bold 22px sans-serif', 'left');
        drawing.drawText(ctx, '动态生成关卡,挑战无极限!',
            constants.MARGIN_X + 24, infY + infH / 2 + 22,
            'rgba(255,255,255,0.85)', '14px sans-serif', 'left');

        game._homeInfiniteHit = {
            x: constants.MARGIN_X, y: infY, w: infW, h: infH, name: 'infinite'
        };
    }
}

/**
 * 处理触摸
 */
function handleTouch(pos, game) {
    if (!game._homeLevelHits) return null;

    // 设置浮层打开时
    if (game._homeShowSettings) {
        if (game._homeSettingToggles) {
            for (var i = 0; i < game._homeSettingToggles.length; i++) {
                var t = game._homeSettingToggles[i];
                if (drawing.hitTest(pos.x, pos.y, t)) {
                    if (SaveSystem) {
                        var newVal = !SaveSystem.getSetting(t.key);
                        SaveSystem.setSetting(t.key, newVal);
                        if (t.key === 'music') {
                            var Audio = require('../audio.js').AudioManager;
                            if (newVal) Audio.playBgm();
                            else Audio.stopBgm();
                        }
                    }
                    return null;
                }
            }
        }
        if (game._homeSettingsCloseHit && drawing.hitTest(pos.x, pos.y, game._homeSettingsCloseHit)) {
            game._homeShowSettings = false;
            return null;
        }
        return null;
    }

    // 设置按钮(左上角)
    if (game._homeSettingsHit && drawing.hitTest(pos.x, pos.y, game._homeSettingsHit)) {
        game._homeShowSettings = true;
        return null;
    }

    // 关卡
    for (var i2 = 0; i2 < game._homeLevelHits.length; i2++) {
        var h = game._homeLevelHits[i2];
        if (drawing.hitTest(pos.x, pos.y, h)) {
            if (!h.locked) {
                if (SaveSystem) {
                    SaveSystem.setCurrentLevel(h.level);
                    SaveSystem.incrementTotalPlays();
                }
                return 'startGame';
            }
            game._toast = { text: '请先通关上一关', startTime: Date.now() };
            return null;
        }
    }

    // 无限模式入口
    if (game._homeInfiniteHit && drawing.hitTest(pos.x, pos.y, game._homeInfiniteHit)) {
        if (SaveSystem) {
            SaveSystem.setCurrentLevel(constants.INFINITE_MODE_START);
            SaveSystem.incrementTotalPlays();
        }
        return 'startGame';
    }

    return null;
}

module.exports = {
    render: render,
    handleTouch: handleTouch,
    setSaveSystem: function (s) { SaveSystem = s; }
};
