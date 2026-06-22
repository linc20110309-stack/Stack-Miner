/**
 * game - 游戏主场景(Stack Miner 奇妙寻宝)
 *
 * **场景**(遵循 GAME_DESIGN §6):
 *   - 'home': 主菜单(关卡列表 + 设置 + 无限模式入口)
 *   - 'game': 关卡模式
 *     - level 0-8:9 关预设
 *     - level 9+:无限模式(动态生成)
 *
 * **modal actions**:
 *   - 'nextLevel': 下一关
 *   - 'retry': 重开本关
 *   - 'backToHome': 回主页
 *
 * **变更说明**(对标参考图 + 用户反馈):
 *   - 卡牌外壳:白底圆角 + 细绿边 + 加厚底部立体阴影(参考图样式)
 *   - **图案**:麻将 Unicode emoji 字符(🀄🀅🀆 等),在 Canvas 中渲染为彩色麻将图案
 *   - 棋盘主卡 + 牌堆顶牌 + 背包 slot 全部走 _drawMahjongCard 同一函数
 *   - 顶层 100% 实色 / 被压下层 0.45 alpha 发灰(层级透明规则)
 *   - 上层卡牌移走后,下层自动恢复实色(由 board._recompute 实时刷新 clickable)
 *   - 适配 2-4 层堆叠关卡
 */
var constants = require('../constants.js');
var drawing = require('../drawing.js');
var UI = require('../ui.js').UI;
var Board = require('../board.js').Board;
var Backpack = require('../backpack.js').Backpack;
var Validator = require('../validator.js').Validator;
var LevelGenerator = require('../level-generator.js').LevelGenerator;
var Treasures = require('../treasures.js').Treasures;
var AudioManager = require('../audio.js').AudioManager;
var SaveSystem = null;

var BUTTON_HEIGHT = 56;
var BACKPACK_BUTTON_GAP = 80;
var BOTTOM_MARGIN = 40;
var BACKPACK_GAP = 8;
var CARD_CORNER = constants.CARD_RADIUS;
var PILE_EDGE_GAP = 4;
var PILE_EDGE_W = 6;

/**
 * 进入关卡
 */
function onEnter(game, opts) {
    opts = opts || {};
    var level = opts.level;
    var seed = opts.seed;

    if (level === undefined) {
        level = SaveSystem ? SaveSystem.getCurrentLevel() : 0;
    }
    if (level < 0) level = 0;

    var data = seed !== undefined
        ? LevelGenerator.generate(level, seed)
        : LevelGenerator.generate(level);
    var board = Board.getInstance();
    board.loadLevel(data);

    game._gameBoard = board;
    game._gameCurrentLevel = level;
    game._gameSeed = seed;
    game._gameStartTime = Date.now();
    game._lastMatchRound = null;
    game._flyingItems = [];
    game._matchingItems = [];
}

/**
 * 渲染主游戏场景
 */
function render(ctx, game) {
    drawing.drawBackground(ctx,
        constants.COLORS.BG_TOP,
        constants.COLORS.BG_BOTTOM);

    var title = '第 ' + (game._gameCurrentLevel + 1) + ' 关';
    var hits = UI.drawNavBar(ctx, {
        title: title,
        onHome: true
    });
    game._gameNavHits = hits;

    _drawGameArea(ctx, game);
    _drawBackpack(ctx, game);
    _drawBottomButton(ctx, game);

    _updateAnimations(game);
    _drawFlying(ctx, game);
    _drawMatching(ctx, game);

    if (game._toast) {
        if (!UI.drawToast(ctx, game._toast)) {
            game._toast = null;
        }
    }
}

/**
 * 渲染层叠矿区(对齐参考图)
 *  - 顶层(clickable=true):100% 实色不透明,可点击
 *  - 中/底层(clickable=false):变浅发灰(全局 alpha=0.45),图案仍可见但不可点击
 *  - 兼容 2-4 层堆叠关卡
 *  - 动态晋升:上层卡牌被收集后,原下层 clickable=true → 自动恢复 100% 实色
 *
 * **绘制顺序**(z-order):
 *   1. 底层卡片先画(layer 大者先)
 *   2. 顶层卡片后画(layer 小者后),形成覆盖效果
 *   3. 牌堆顶牌最后画(覆盖在棋盘上)
 */
function _drawGameArea(ctx, game) {
    var board = game._gameBoard;
    if (!board) return;

    var mainCards = board.getMainCards();
    var leftPile = board.getLeftPile();
    var rightPile = board.getRightPile();

    var hitList = [];

    // 按 layer 降序 = 深层先画(保证 z-order 遮挡正确)
    var sortedMain = mainCards.slice().sort(function (a, b) {
        return b.layer - a.layer;
    });

    // 统一渲染:每张卡根据 clickable 决定顶层/底层样式
    //  - 顶层:100% 实色,加厚底部立体阴影,清晰细绿边
    //  - 底层:0.45 alpha,轻盈下沉阴影,淡绿细边,图案仍可见但被压
    for (var i = 0; i < sortedMain.length; i++) {
        var card = sortedMain[i];
        if (card.hidden) continue; // 完全遮挡的卡片不渲染
        var isTop = card.clickable;
        _drawMahjongCard(ctx, card.type, card.x, card.y, card.w, card.h, isTop);
        if (isTop) {
            hitList.push({
                x: card.x, y: card.y, w: card.w, h: card.h,
                cardId: card.id, name: 'main_' + card.id
            });
        }
    }

    var leftPileHit = null;
    var rightPileHit = null;
    if (leftPile.length > 0) {
        leftPileHit = _drawPileStack(ctx, leftPile, 'left', game);
    }
    if (rightPile.length > 0) {
        rightPileHit = _drawPileStack(ctx, rightPile, 'right', game);
    }

    game._gameMainHits = hitList;
    game._gameLeftPileHit = leftPileHit;
    game._gameRightPileHit = rightPileHit;
}

/**
 * 牌堆渲染(规范 §7.8 Deck Tile)
 */
function _drawPileStack(ctx, pile, side, game) {
    var top = null;
    for (var i = 0; i < pile.length; i++) {
        if (pile[i].pileIndex === 0) {
            top = pile[i];
            break;
        }
    }
    if (!top) return null;

    var edgeCount = pile.length - 1;
    var direction = (side === 'left') ? -1 : 1;
    var visibleEdges = Math.min(edgeCount, constants.PILE_EDGE_LAYERS);
    var edgeStartX = (direction < 0) ? top.x : (top.x + top.w);
    for (var e = 0; e < visibleEdges; e++) {
        _drawPileEdge(ctx, top, e, edgeStartX, direction);
    }

    _drawPileTop(ctx, top, game, edgeCount + 1, side);

    return {
        x: top.x, y: top.y, w: top.w, h: top.h,
        name: side === 'left' ? 'leftPile' : 'rightPile'
    };
}

/**
 * 牌堆 edge(从里到外颜色渐深,表示剩余厚度)
 */
function _drawPileEdge(ctx, top, index, startX, direction) {
    var edgeW = PILE_EDGE_W;
    var edgeH = top.h - 4 - index;
    var x = startX + direction * (index * (PILE_EDGE_W + PILE_EDGE_GAP));
    var y = top.y + 2 + index / 2;

    var colorIdx = Math.min(index, constants.PILE_EDGE_COLORS.length - 1);
    var color = constants.PILE_EDGE_COLORS[colorIdx];

    ctx.save();
    ctx.fillStyle = color;
    drawing.roundRect(ctx, x, y, edgeW, edgeH, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 40, 25, 0.5)';
    ctx.lineWidth = 0.5;
    drawing.roundRect(ctx, x, y, edgeW, edgeH, 2);
    ctx.stroke();
    ctx.restore();
}

/**
 * 牌堆顶牌(与主棋盘卡牌/背包 slot 完全同源样式)
 *  - 白底 + 细绿边 + 加厚立体阴影 + 彩色麻将 emoji 图案
 *  - 数量徽章保留(右下红圆点表示剩余张数)
 */
function _drawPileTop(ctx, top, game, totalCount, side) {
    var x = top.x, y = top.y, w = top.w, h = top.h;

    var pressed = game._pressedButton === 'leftPile' || game._pressedButton === 'rightPile';
    if (pressed) {
        x += 2; y += 2;
        w -= 4; h -= 4;
    }

    // 复用 _drawMahjongCard(与棋盘/背包完全同款)
    _drawMahjongCard(ctx, top.type, x, y, w, h, true);

    // 数量徽章(右下红圆点)
    if (totalCount > 1) {
        var badgeX = x + w - 12;
        var badgeY = y + h - 12;
        var badgeR = 14;
        ctx.save();
        ctx.fillStyle = constants.COLORS.DANGER;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawing.drawText(ctx, '×' + totalCount,
            badgeX, badgeY,
            '#FFFFFF', 'bold 14px sans-serif', 'center');
    }
}

/**
 * 统一的麻将卡牌渲染函数(对标参考图,棋盘 + 背包 + 牌堆 全部走这里)
 *
 * **最终风格**(对标参考图):
 *   - 白底(#FFFFFF)
 *   - 圆角(CARD_RADIUS=14)
 *   - 细绿边(isTop 1.5px 实色 / 被压 1px 淡绿)
 *   - **加厚底部立体阴影**(顶层:offsetY 8,blur 10,黑色 0.30)
 *   - **彩色麻将 emoji 图案**(🀄🀅🀆 等 Unicode 麻将字符,Canvas 自动渲染彩色)
 *
 * **层级透明规则**:
 *   - isTop=true  (顶层浮牌,clickable=true):
 *       globalAlpha=1.0,100% 实色,加厚立体阴影,可点击
 *   - isTop=false (被压下层,clickable=false):
 *       globalAlpha=0.45,变浅发灰,轻盈下沉阴影,不可点击
 *
 * @param {Object} ctx
 * @param {number} type 宝物 type(1-15)
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {boolean} isTop 是否顶层(clickable)
 */
function _drawMahjongCard(ctx, type, x, y, w, h, isTop) {
    // 1) 加厚立体阴影 + 白底
    drawing.drawShadowedCard(ctx, x, y, w, h, CARD_CORNER, isTop);

    // 2) 细绿边
    ctx.save();
    ctx.strokeStyle = isTop
        ? constants.MAHJONG_BORDER_GREEN
        : constants.MAHJONG_BORDER_GREEN_BOTTOM;
    ctx.lineWidth = isTop
        ? constants.MAHJONG_BORDER_WIDTH
        : constants.MAHJONG_BORDER_WIDTH_BOTTOM;
    drawing.roundRect(ctx, x, y, w, h, CARD_CORNER);
    ctx.stroke();
    ctx.restore();

    // 3) 彩色麻将 emoji 图案(中央)
    ctx.save();
    ctx.globalAlpha = isTop
        ? constants.MAHJONG_TOP_ALPHA
        : constants.MAHJONG_BOTTOM_ALPHA;
    var icon = Treasures.getIcon(type);
    var iconSize = Math.min(w, h) * 0.62;
    drawing.drawEmoji(ctx, icon,
        x + w / 2,
        y + h / 2,
        iconSize);
    ctx.restore();
}

/**
 * 背包 slot 渲染(完全套用主棋盘卡牌样式)
 *  - **对标参考图**:白底 + 细绿边 + 加厚立体阴影 + 彩色麻将 emoji 图案
 *  - 空 slot:浅灰虚线边(无内容时)
 *  - 有物品:与主棋盘卡牌完全相同的麻將风格(同源 _drawMahjongCard)
 *  - 委托 _drawMahjongCard 主函数实现,保证棋盘+背包样式完全一致
 */
function _drawBackpackSlotUnified(ctx, opts) {
    var x = opts.x, y = opts.y, w = opts.w, h = opts.h;
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
        // 有物品:与主棋盘卡牌完全同源 _drawMahjongCard
        _drawMahjongCard(ctx, type, x, y, w, h, true);
    } else {
        // 空 slot:浅灰虚线边(占位提示)
        ctx.save();
        ctx.fillStyle = 'rgba(245,250,240,0.5)';
        drawing.roundRect(ctx, x, y, w, h, CARD_CORNER);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,180,150,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        drawing.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, CARD_CORNER - 1);
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
        drawing.roundRect(ctx, x - 2, y - 2, w + 4, h + 4, CARD_CORNER + 2);
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * 背包区域(规范 §12)
 */
function _drawBackpack(ctx, game) {
    var board = game._gameBoard;
    if (!board) return;
    var backpack = board.getBackpack();
    var bpY = constants.LOGICAL_HEIGHT - BOTTOM_MARGIN - BUTTON_HEIGHT - BACKPACK_BUTTON_GAP - constants.BACKPACK_HEIGHT;
    var padding = constants.MARGIN_X;
    var gap = BACKPACK_GAP;
    var slotW = (constants.LOGICAL_WIDTH - padding * 2 - gap * (constants.BACKPACK_CAPACITY - 1)) / constants.BACKPACK_CAPACITY;
    var slotH = constants.BACKPACK_HEIGHT;

    drawing.drawText(ctx, '🎒 背包 (7)',
        padding, bpY - 24,
        constants.COLORS.TEXT_TITLE, 'bold ' + constants.FONT_SIZE_HINT + 'px sans-serif', 'left');

    var slotPositions = [];
    for (var i = 0; i < constants.BACKPACK_CAPACITY; i++) {
        var x = padding + i * (slotW + gap);
        var y = bpY;
        var type = backpack[i] || 0;
        // **关键**:背包 slot 使用与主棋盘完全同款样式
        //  委托 _drawBackpackSlotUnified → _drawMahjongCard
        //  保证棋盘与背包卡牌视觉完全一致(对标参考图)
        _drawBackpackSlotUnified(ctx, {
            x: x, y: y, w: slotW, h: slotH,
            type: type,
            pressed: false
        });
        slotPositions.push({ x: x + slotW / 2, y: y + slotH / 2 });
    }
    game._gameBackpackHits = { y: bpY, h: slotH };
    game._gameBackpackSlots = slotPositions;
}

/**
 * 底部按钮(重玩本关)
 */
function _drawBottomButton(ctx, game) {
    var y0 = constants.LOGICAL_HEIGHT - BOTTOM_MARGIN - BUTTON_HEIGHT;
    var btnW = constants.LOGICAL_WIDTH - constants.MARGIN_X * 2;
    var btnH = BUTTON_HEIGHT;

    UI.drawGradientButton(ctx, {
        x: constants.MARGIN_X, y: y0,
        width: btnW, height: btnH,
        bgColor: constants.COLORS.BRAND,
        darkenColor: constants.COLORS.BRAND_DARK,
        icon: '', label: '重玩本关',
        font: 'bold 18px sans-serif',
        pressed: game._pressedButton === 'restart'
    });
    game._gameButtonHits = {
        restart: { x: constants.MARGIN_X, y: y0, w: btnW, h: btnH }
    };
}

/**
 * 触摸处理
 */
function handleTouch(pos, game) {
    if (game._gameNavHits && game._gameNavHits.homeHit &&
        drawing.hitTest(pos.x, pos.y, game._gameNavHits.homeHit)) {
        AudioManager.play('click');
        return 'backToHome';
    }

    if (game._gameButtonHits && game._gameButtonHits.restart) {
        if (drawing.hitTest(pos.x, pos.y, game._gameButtonHits.restart)) {
            AudioManager.play('click');
            _onRestart(game);
            return null;
        }
    }

    if (game._gameMainHits) {
        for (var i = 0; i < game._gameMainHits.length; i++) {
            var h = game._gameMainHits[i];
            if (drawing.hitTest(pos.x, pos.y, h)) {
                _onCollectCard(game, h.cardId, h);
                return null;
            }
        }
    }

    if (game._gameLeftPileHit && drawing.hitTest(pos.x, pos.y, game._gameLeftPileHit)) {
        _onCollectLeftPile(game, game._gameLeftPileHit);
        return null;
    }

    if (game._gameRightPileHit && drawing.hitTest(pos.x, pos.y, game._gameRightPileHit)) {
        _onCollectRightPile(game, game._gameRightPileHit);
        return null;
    }

    return null;
}

/**
 * 收集卡片
 */
function _onCollectCard(game, cardId, hit) {
    var board = game._gameBoard;
    if (!board) return;
    if (board.isCleared()) return;

    var card = board.getCardById(cardId);
    if (!card) return;

    AudioManager.play('click');

    var fromX = hit.x + hit.w / 2;
    var fromY = hit.y + hit.h / 2;

    var type = board.collectById(cardId);
    if (type <= 0) return;

    _doCollectType(game, type, fromX, fromY);
}

/**
 * 翻左牌堆
 */
function _onCollectLeftPile(game, hit) {
    var board = game._gameBoard;
    if (!board) return;
    AudioManager.play('click');

    var fromX = hit.x + hit.w / 2;
    var fromY = hit.y + hit.h / 2;

    var type = board.collectFromLeftPile();
    if (type <= 0) return;

    _doCollectType(game, type, fromX, fromY);
}

/**
 * 翻右牌堆
 */
function _onCollectRightPile(game, hit) {
    var board = game._gameBoard;
    if (!board) return;
    AudioManager.play('click');

    var fromX = hit.x + hit.w / 2;
    var fromY = hit.y + hit.h / 2;

    var type = board.collectFromRightPile();
    if (type <= 0) return;

    _doCollectType(game, type, fromX, fromY);
}

/**
 * 处理收集:飞入背包 + 三消检测
 */
function _doCollectType(game, type, fromX, fromY) {
    var board = game._gameBoard;
    var backpack = board.getBackpack();
    var targetSlot = -1;
    for (var i = 0; i < backpack.length; i++) {
        if (backpack[i] === 0) { targetSlot = i; break; }
    }
    if (targetSlot === -1) targetSlot = 0;
    var slots = game._gameBackpackSlots || [];
    var toX = slots[targetSlot] ? slots[targetSlot].x : fromX;
    var toY = slots[targetSlot] ? slots[targetSlot].y : fromY;

    _startFlying(game, type, fromX, fromY, toX, toY);

    game._lastCollectType = type;

    var result = Backpack.addAndMatch(board, type);
    var matchedRounds = (result && result.matchedRounds) ? result.matchedRounds : [];
    game._lastMatchRound = matchedRounds;

    if (matchedRounds.length > 0) {
        var roundsForAnim = matchedRounds;
        setTimeout(function () {
            _triggerMatchingAnim(game, roundsForAnim);
        }, constants.ANIM_FLY + 30);
        AudioManager.play('correct');
        AudioManager.vibrate();
    }

    var status = Validator.checkGameStatus(board);
    if (status === 'win') {
        _onWin(game);
    } else if (status === 'fail') {
        _onFail(game);
    }
}

/**
 * 触发三消动画
 */
function _triggerMatchingAnim(game, matchedRounds) {
    if (!matchedRounds || matchedRounds.length === 0) return;
    if (!game._flyingItems || game._flyingItems.length === 0) {
        _startMatching(game, matchedRounds);
    } else {
        var checkInterval = setInterval(function () {
            if (!game._flyingItems || game._flyingItems.length === 0) {
                clearInterval(checkInterval);
                _startMatching(game, matchedRounds);
            }
        }, 30);
    }
}

/**
 * 飞入动画(使用彩色麻将 emoji + 加厚阴影,保持视觉一致)
 */
function _startFlying(game, type, fromX, fromY, toX, toY) {
    if (!game._flyingItems) game._flyingItems = [];
    game._flyingItems.push({
        type: type,
        fromX: fromX, fromY: fromY,
        toX: toX, toY: toY,
        startTime: Date.now(),
        duration: constants.ANIM_FLY,
        ctrlX: (fromX + toX) / 2,
        ctrlY: Math.min(fromY, toY) - 60
    });
}

/**
 * 三消动画(使用彩色麻将 emoji)
 */
function _startMatching(game, matchedRounds) {
    if (!game._matchingItems) game._matchingItems = [];
    if (!matchedRounds || !matchedRounds.length) return;
    var slots = game._gameBackpackSlots || [];
    for (var ri = 0; ri < matchedRounds.length; ri++) {
        var round = matchedRounds[ri];
        if (!round || round.length === 0) continue;
        var type = game._lastCollectType || 0;
        for (var j = 0; j < round.length; j++) {
            var slotIdx = round[j];
            var pos = slots[slotIdx];
            if (pos) {
                game._matchingItems.push({
                    type: type,
                    x: pos.x, y: pos.y,
                    startTime: Date.now(),
                    duration: constants.ANIM_MATCH
                });
            }
        }
    }
}

/**
 * 动画更新(清理已完成)
 */
function _updateAnimations(game) {
    var now = Date.now();
    if (game._flyingItems) {
        game._flyingItems = game._flyingItems.filter(function (item) {
            return now - item.startTime < item.duration;
        });
    }
    if (game._matchingItems) {
        game._matchingItems = game._matchingItems.filter(function (item) {
            return now - item.startTime < item.duration;
        });
    }
}

/**
 * 绘制飞入动画(彩色麻将 emoji + 加厚阴影 + 旋转 + 缩放)
 */
function _drawFlying(ctx, game) {
    if (!game._flyingItems || game._flyingItems.length === 0) return;
    var now = Date.now();
    for (var i = 0; i < game._flyingItems.length; i++) {
        var item = game._flyingItems[i];
        var t = (now - item.startTime) / item.duration;
        if (t > 1) t = 1;

        var inv = 1 - t;
        var x = inv * inv * item.fromX + 2 * inv * t * item.ctrlX + t * t * item.toX;
        var y = inv * inv * item.fromY + 2 * inv * t * item.ctrlY + t * t * item.toY;
        var scale = 1.0 - t * 0.5;
        var alpha = 1.0 - t * 0.6;
        var rotation = t * (constants.FLY_ROTATION_DEG * Math.PI / 180);

        var icon = Treasures.getIcon(item.type);
        var size = 70 * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;
        // 白底 + 加厚阴影 + 绿边
        drawing.drawShadowedCard(ctx, -size / 2, -size / 2, size, size, CARD_CORNER, true);
        ctx.strokeStyle = constants.MAHJONG_BORDER_GREEN;
        ctx.lineWidth = constants.MAHJONG_BORDER_WIDTH;
        drawing.roundRect(ctx, -size / 2, -size / 2, size, size, CARD_CORNER);
        ctx.stroke();
        // 彩色麻将 emoji
        drawing.drawEmoji(ctx, icon, 0, 0, size * 0.62);
        ctx.restore();
    }
}

/**
 * 绘制三消动画(白底 + 彩色麻将 emoji + 缩放/渐出)
 */
function _drawMatching(ctx, game) {
    if (!game._matchingItems || game._matchingItems.length === 0) return;
    var now = Date.now();
    for (var i = 0; i < game._matchingItems.length; i++) {
        var item = game._matchingItems[i];
        var t = (now - item.startTime) / item.duration;
        if (t > 1) t = 1;

        var scale;
        if (t < 0.3) {
            scale = 1.0 + (1.3 - 1.0) * (t / 0.3);
        } else {
            scale = 1.3 * (1 - (t - 0.3) / 0.7);
        }
        var alpha;
        if (t < 0.5) {
            alpha = 1.0;
        } else {
            alpha = 1.0 - (t - 0.5) / 0.5;
        }

        var icon = Treasures.getIcon(item.type);
        var size = 70 * scale;

        if (alpha <= 0 || size <= 0) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        // 加厚阴影 + 白底
        drawing.drawShadowedCard(ctx,
            item.x - size / 2, item.y - size / 2,
            size, size, CARD_CORNER, true);
        ctx.strokeStyle = constants.MAHJONG_BORDER_GREEN;
        ctx.lineWidth = constants.MAHJONG_BORDER_WIDTH;
        drawing.roundRect(ctx,
            item.x - size / 2, item.y - size / 2,
            size, size, CARD_CORNER);
        ctx.stroke();
        // 彩色麻将 emoji
        drawing.drawEmoji(ctx, icon,
            item.x, item.y, size * 0.62);
        ctx.restore();
    }
}

/**
 * 重玩本关
 */
function _onRestart(game) {
    var level = game._gameCurrentLevel;
    var seed = game._gameSeed;
    var data = seed !== undefined
        ? LevelGenerator.generate(level, seed)
        : LevelGenerator.generate(level);
    if (game._gameBoard) {
        game._gameBoard.loadLevel(data);
    }
    game._gameStartTime = Date.now();
    game._lastMatchRound = null;
    game._modal = null;
    game._flyingItems = [];
    game._matchingItems = [];
    game._toast = { text: 'Level Restarted', startTime: Date.now() };
}

/**
 * 通关处理
 */
function _onWin(game) {
    var lv = game._gameCurrentLevel;
    if (SaveSystem) {
        SaveSystem.unlockLevel(lv + 1);
        SaveSystem.setBestLevel(lv, Date.now());
        if (SaveSystem.getFirstClearTime() === null) {
            SaveSystem.setFirstClearTime(Date.now());
        }
        if (lv < constants.PRESET_LEVEL_COUNT - 1) {
            SaveSystem.setCurrentLevel(lv + 1);
        } else {
            SaveSystem.setCurrentLevel(constants.INFINITE_MODE_START);
        }
    }

    game._modal = constants.MODAL_WIN;
    game._modalStartTime = Date.now();
    AudioManager.play('victory');
    AudioManager.vibrate();
}

/**
 * 失败处理
 */
function _onFail(game) {
    game._modal = constants.MODAL_FAIL;
    game._modalStartTime = Date.now();
    AudioManager.play('fail');
    AudioManager.vibrate();
}

module.exports = {
    onEnter: onEnter,
    render: render,
    handleTouch: handleTouch,
    setSaveSystem: function (s) { SaveSystem = s; }
};