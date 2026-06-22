/**
 * modals - 弹窗集合(Stack Miner 奇妙寻宝)
 * 仅保留胜利/失败两个弹窗(规范 AI_DEV_PROMPT §5)
 * 严格遵循 UI_ART_STANDARDS.md §14
 *
 * **胜利弹窗**(规范 §14 + UI 优化提示词 V2):
 *   - 主色:成功绿(#42C96F → 渐变)
 *   - 显示 🎉 挑战成功
 *   - 按钮:下一关 / 返回首页
 *   - 按钮规格:180×64 圆角 32,28px bold,间距 30
 *
 * **失败弹窗**(规范 §14 + UI 优化提示词 V2):
 *   - 主色:失败红(#FF6B6B → 渐变)
 *   - 显示 😭 挑战失败
 *   - 按钮:重新挑战 / 返回首页
 *   - 按钮规格同上
 *
 * **关键设计**:
 *   - modals.js 只设置 `_modalAction`,**不主动清空**
 *   - 让 game.js 主入口根据 `_modalAction` 决定 switchScene
 *   - 避免双端逻辑冲突
 */
var constants = require('../constants.js');
var drawing = require('../drawing.js');
var UI = require('../ui.js').UI;
var Board = require('../board.js').Board;
var LevelGenerator = require('../level-generator.js').LevelGenerator;
var SaveSystem = null;

/**
 * 渲染弹窗
 */
function render(ctx, game) {
    if (!game._modal) return;
    if (game._modal === constants.MODAL_WIN) {
        _renderWin(ctx, game);
    } else if (game._modal === constants.MODAL_FAIL) {
        _renderFail(ctx, game);
    }
}

/**
 * 处理弹窗触摸
 */
function handleTouch(pos, game) {
    if (!game._modal) return false;
    return _handleInnerTouch(pos, game);
}

/**
 * 弹窗内按钮触摸处理
 *  - 只清空 `_modal` 和 `_modalHits`,不主动清空 `_modalAction`
 *  - 让 game.js 主入口根据 _modalAction 决定 switchScene
 */
function _handleInnerTouch(pos, game) {
    var hits = game._modalHits;
    if (!hits) return false;
    if (game._modal === constants.MODAL_WIN) {
        if (hits.nextBtn && drawing.hitTest(pos.x, pos.y, hits.nextBtn)) {
            game._modal = null;
            game._modalHits = null;
            // _modalAction 保留为 'nextLevel' → game.js 主入口会处理
            return true;
        }
        if (hits.homeBtn && drawing.hitTest(pos.x, pos.y, hits.homeBtn)) {
            game._modal = null;
            game._modalHits = null;
            game._modalAction = 'backToHome';
            return true;
        }
    } else if (game._modal === constants.MODAL_FAIL) {
        if (hits.retryBtn && drawing.hitTest(pos.x, pos.y, hits.retryBtn)) {
            var lv = game._gameCurrentLevel;
            var seed = game._gameSeed;
            var data = seed !== undefined
                ? LevelGenerator.generate(lv, seed)
                : LevelGenerator.generate(lv);
            if (game._gameBoard) {
                game._gameBoard.loadLevel(data);
            }
            game._modal = null;
            game._modalHits = null;
            game._modalAction = 'retry';
            return true;
        }
        if (hits.homeBtn && drawing.hitTest(pos.x, pos.y, hits.homeBtn)) {
            game._modal = null;
            game._modalHits = null;
            game._modalAction = 'backToHome';
            return true;
        }
    }
    return true;
}

/**
 * 胜利弹窗(规范 UI_ART_STANDARDS §14 + UI 优化提示词 V2)
 *  - 圆角 24、白色背景、阴影
 *  - 标题"🎉 挑战成功"
 *  - 头部渐变:绿色三色渐变 #42C96F → #7FE5A0 → #2DA856(成功色)
 *  - 按钮规格:180×64 圆角 32,28px bold
 *  - 按钮间距 30
 */
function _renderWin(ctx, game) {
    UI.drawMask(ctx);
    var scale = game._modalStartTime ?
        0.3 + 0.7 * Math.min(1, (Date.now() - game._modalStartTime) / constants.ANIM_MODAL) : 1;

    var isInfinite = game._gameCurrentLevel >= constants.INFINITE_MODE_START;
    var nextLabel = isInfinite ? '下一关(无限)' : '下一关';
    var nextIcon = '→';

    var info = UI.drawModalContainer(ctx, constants.MODAL_WIDTH_WIN, constants.MODAL_HEIGHT_WIN, {
        scale: scale,
        headerHeight: constants.MODAL_HEADER_HEIGHT,
        // 头部:绿色三色渐变(胜利主色)
        headerGradient: [
            constants.COLORS.MODAL_WIN_GRADIENT_TOP,
            constants.COLORS.MODAL_WIN_GRADIENT_MID,
            constants.COLORS.MODAL_WIN_GRADIENT_BOTTOM
        ]
    });

    // 标题(规范 §5 字号 28 bold)
    var title = isInfinite ? '🎉 无限模式通关!' : '🎉 挑战成功';
    drawing.drawText(ctx, title,
        constants.LOGICAL_WIDTH / 2, info.y + 60,
        constants.COLORS.WHITE, 'bold ' + constants.FONT_SIZE_SECTION + 'px sans-serif', 'center');

    // 主体文字
    var bodyY = info.y + info.headerH + 30;
    if (isInfinite) {
        drawing.drawText(ctx, 'Lv ' + (game._gameCurrentLevel + 1) + ' 通关!',
            constants.LOGICAL_WIDTH / 2, bodyY,
            constants.COLORS.TEXT_TITLE, 'bold ' + constants.FONT_SIZE_BODY + 'px sans-serif', 'center');
        drawing.drawText(ctx, '继续挑战更高关卡',
            constants.LOGICAL_WIDTH / 2, bodyY + 36,
            constants.COLORS.TEXT_BODY, constants.FONT_SIZE_HINT + 'px sans-serif', 'center');
    } else {
        drawing.drawText(ctx, '全部宝物已清空!',
            constants.LOGICAL_WIDTH / 2, bodyY,
            constants.COLORS.TEXT_TITLE, 'bold ' + constants.FONT_SIZE_BODY + 'px sans-serif', 'center');
        drawing.drawText(ctx, '🎊 下一关更精彩',
            constants.LOGICAL_WIDTH / 2, bodyY + 50,
            constants.COLORS.TEXT_BODY, constants.FONT_SIZE_HINT + 'px sans-serif', 'center');
    }

    // 按钮(规范 §14 + 优化提示词:间距 30,28px bold)
    var btnGap = constants.MODAL_BUTTON_GAP;
    var btnW = (info.w - 60 - btnGap) / 2;
    var btnY = info.y + info.h - constants.MODAL_BTN_HEIGHT - 24;

    var nextBtn = UI.drawModalButton(ctx, {
        x: info.x + 30, y: btnY,
        width: btnW, height: constants.MODAL_BTN_HEIGHT,
        bgColor: constants.COLORS.SUCCESS,
        darkenColor: constants.COLORS.SUCCESS_DARK,
        icon: nextIcon, label: nextLabel,
        pressed: game._pressedButton === 'modal_next'
    });
    var homeBtn = UI.drawModalButton(ctx, {
        x: info.x + 30 + btnW + btnGap, y: btnY,
        width: btnW, height: constants.MODAL_BTN_HEIGHT,
        bgColor: constants.COLORS.BRAND,
        darkenColor: constants.COLORS.BRAND_DARK,
        icon: '🏠', label: '返回首页',
        pressed: game._pressedButton === 'modal_home_win'
    });
    game._modalHits = { nextBtn: nextBtn, homeBtn: homeBtn };
    // 设置动作:下一关
    game._modalAction = 'nextLevel';
}

/**
 * 失败弹窗(规范 §14 + UI 优化提示词 V2)
 *  - 圆角 24、白色背景、阴影
 *  - 标题"😭 挑战失败"
 *  - 头部渐变:红色三色渐变 #FF6B6B → #FFB0B0 → #E04F4F(失败色)
 *  - 按钮规格:180×64 圆角 32,28px bold
 *  - 按钮间距 30
 */
function _renderFail(ctx, game) {
    UI.drawMask(ctx);
    var scale = game._modalStartTime ?
        0.3 + 0.7 * Math.min(1, (Date.now() - game._modalStartTime) / constants.ANIM_MODAL) : 1;
    var info = UI.drawModalContainer(ctx, constants.MODAL_WIDTH_FAIL, constants.MODAL_HEIGHT_FAIL, {
        scale: scale,
        headerHeight: constants.MODAL_HEADER_HEIGHT_FAIL,
        // 头部:红色三色渐变(失败主色)
        headerGradient: [
            constants.COLORS.MODAL_FAIL_GRADIENT_TOP,
            constants.COLORS.MODAL_FAIL_GRADIENT_MID,
            constants.COLORS.MODAL_FAIL_GRADIENT_BOTTOM
        ]
    });
    // 标题(规范 §5 字号 28 bold)
    drawing.drawText(ctx, '😭 挑战失败',
        constants.LOGICAL_WIDTH / 2, info.y + 55,
        constants.COLORS.WHITE, 'bold ' + constants.FONT_SIZE_SECTION + 'px sans-serif', 'center');

    var bodyY = info.y + info.headerH + 30;
    drawing.drawText(ctx, '背包已满,无法消除!',
        constants.LOGICAL_WIDTH / 2, bodyY,
        constants.COLORS.TEXT_TITLE, 'bold ' + constants.FONT_SIZE_BODY + 'px sans-serif', 'center');
    drawing.drawText(ctx, '别灰心,重开再来一次~',
        constants.LOGICAL_WIDTH / 2, bodyY + 40,
        constants.COLORS.TEXT_BODY, constants.FONT_SIZE_HINT + 'px sans-serif', 'center');

    var btnGap = constants.MODAL_BUTTON_GAP;
    var btnW = (info.w - 60 - btnGap) / 2;
    var btnY = info.y + info.h - constants.MODAL_BTN_HEIGHT - 24;
    var retryBtn = UI.drawModalButton(ctx, {
        x: info.x + 30, y: btnY,
        width: btnW, height: constants.MODAL_BTN_HEIGHT,
        bgColor: constants.COLORS.DANGER,
        darkenColor: constants.COLORS.DANGER_DARK,
        icon: '🔄', label: '重新挑战',
        pressed: game._pressedButton === 'modal_retry'
    });
    var homeBtn = UI.drawModalButton(ctx, {
        x: info.x + 30 + btnW + btnGap, y: btnY,
        width: btnW, height: constants.MODAL_BTN_HEIGHT,
        bgColor: constants.COLORS.BUTTON_DISABLED,
        darkenColor: '#A89882',
        icon: '🏠', label: '返回首页',
        pressed: game._pressedButton === 'modal_home_fail'
    });
    game._modalHits = { retryBtn: retryBtn, homeBtn: homeBtn };
}

module.exports = {
    render: render,
    handleTouch: handleTouch,
    setSaveSystem: function (s) { SaveSystem = s; }
};