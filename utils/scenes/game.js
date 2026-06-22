/**
 * game - 游戏主场景(Stack Miner 奇妙寻宝)
 *
 * 严格遵循 DEV_STANDARDS.md / GAME_DESIGN.md / UI_ART_STANDARDS.md
 *
 * **修复说明**(2026-06 用户反馈):
 *   - 修复飞入动画视觉残留 bug
 *   - _flyingItems 累积过期 items,导致 shadow 视觉残留
 *   - _updateAnimations 从未被调用
 *   - 修复:在 _drawFlying 中完全跳过 t >= 1 的 items + 清理过期 items
 *   - 修复:alpha 在 t > 0.65 时快速衰减,避免最后一帧可见
 *   - 修复:shadow 显式设为 transparent 避免残留
 */
var constants = require('../constants.js');
var drawing = require('../drawing.js');
var UI = require('../ui.js').UI;
var Board = require('../board.js').Board;
var Backpack = require('../backpack.js').Backpack;
var Validator = require('../validator.js').Validator;
var LevelGenerator = require('../level-generator.js').LevelGenerator;
var Treasures = require('../treasures.js').Treasures;
var Animations = require('../animations.js').Animations;
var Particles = require('../particles.js').Particles;
var AudioManager = require('../audio.js').AudioManager;
var SaveSystem = null;

var BUTTON_HEIGHT = constants.BUTTON_HEIGHT || 64;
var BACKPACK_BUTTON_GAP = 80;
var BOTTOM_MARGIN = constants.MARGIN_BOTTOM || 40;
var BACKPACK_GAP = 8;
var CARD_CORNER = constants.CARD_RADIUS;
var PILE_EDGE_GAP = 4;
var PILE_EDGE_W = 6;

var MIN_REVEAL_RATIO = 0.5;

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
    game._unlockFlashes = [];
    game._failShakeStart = null;
    game._failHintStart = null;
    game._backpackFlashStart = null;
    game._victoryStartTime = null;
    game._gameHoverStartTime = {};
}

/**
 * 渲染主游戏场景
 */
function render(ctx, game) {
    // **关键修复**:每帧清理过期的飞入 items,避免累积产生视觉残留
    _updateAnimations(game);

    drawing.drawBackground(ctx,
        constants.COLORS.BG_TOP,
        constants.COLORS.BG_BOTTOM);
    UI.drawBackgroundTexture(ctx);

    var shakeOffset = { x: 0, y: 0 };
    if (game._failShakeStart) {
        var s = Animations.failShakeOffset(game._failShakeStart);
        if (s.done) {
            game._failShakeStart = null;
        } else {
            shakeOffset = s;
        }
    }

    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);

    _drawParticles(ctx);

    var bestLevel = SaveSystem ? (SaveSystem.getUnlockedLevel() + 1) : 1;
    var currentStreak = SaveSystem ? SaveSystem.getBestStreak() : 0;
    var hits = UI.drawTopNavBar(ctx, {
        currentLevel: (game._gameCurrentLevel !== undefined ? game._gameCurrentLevel + 1 : 1),
        bestLevel: bestLevel,
        currentStreak: currentStreak,
        onBack: true
    });
    game._gameNavHits = hits;

    _drawGameArea(ctx, game);
    _drawBackpack(ctx, game);
    _drawBottomButton(ctx, game);
    _drawFlying(ctx, game);

    if (game._failHintStart) {
        var board = game._gameBoard;
        if (board) {
            var bpSlots = game._gameBackpackSlots || [];
            var cx = constants.LOGICAL_WIDTH / 2;
            var cy = bpSlots.length > 0 ? bpSlots[0].y + constants.BACKPACK_HEIGHT + 28 : 900;
            UI.drawFailHintText(ctx, cx, cy, '背包已满,无法消除', game._failHintStart);
        }
    }

    if (game._toast) {
        if (!UI.drawToast(ctx, game._toast)) {
            game._toast = null;
        }
    }

    ctx.restore();
}

/**
 * 绘制所有粒子
 */
function _drawParticles(ctx) {
    var list = Particles.list();
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p) continue;
        if (p.type === 'floatingText') {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.font = 'bold ' + p.size + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = Math.max(0, 1 - (p.age / p.life));
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        } else if (p.type === 'star' || p.type === 'coin') {
            Particles.drawParticleShape(ctx, p);
        } else {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - (p.age / p.life));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

/**
 * 渲染层叠矿区
 *  - 只渲染 clickable=true 的卡片(不可点击的不渲染)
 *  - 只渲染露出 >= 50% 的卡片(避免"小卡片"干扰)
 */
function _drawGameArea(ctx, game) {
    var board = game._gameBoard;
    if (!board) return;

    var mainCards = board.getMainCards();
    var leftPile = board.getLeftPile();
    var rightPile = board.getRightPile();

    var hitList = [];

    for (var i = 0; i < mainCards.length; i++) {
        var card = mainCards[i];
        if (card.hidden) continue;

        var isTop = card.clickable;

        // 过滤 1:不可点击的不渲染
        if (!isTop) continue;

        // 过滤 2:露出 < 50% 的不渲染
        if (card.coveredRatio >= MIN_REVEAL_RATIO) continue;

        _drawMahjongCard(ctx, card.type, card.x, card.y, card.w, card.h, true, 1.0);

        var hoverTime = game._gameHoverStartTime && game._gameHoverStartTime[card.id] ?
            game._gameHoverStartTime[card.id] : (game._gameStartTime || Date.now());
        var liftY = Animations.hoverLiftOffset(hoverTime);
        UI.drawClickableHighlight(ctx, card.x, card.y - liftY, card.w, card.h, CARD_CORNER);
        hitList.push({
            x: card.x, y: card.y - liftY, w: card.w, h: card.h,
            cardId: card.id, name: 'main_' + card.id
        });

        if (game._unlockFlashes && game._unlockFlashes[card.id]) {
            UI.drawUnlockFlash(ctx, card.x, card.y, card.w, card.h, CARD_CORNER,
                game._unlockFlashes[card.id]);
            if (Date.now() - game._unlockFlashes[card.id] > constants.ANIM_UNLOCK_FLASH) {
                delete game._unlockFlashes[card.id];
            }
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
 * 牌堆渲染
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

function _drawPileTop(ctx, top, game, totalCount, side) {
    var x = top.x, y = top.y, w = top.w, h = top.h;

    var pressed = game._pressedButton === 'leftPile' || game._pressedButton === 'rightPile';
    if (pressed) {
        x += 2; y += 2;
        w -= 4; h -= 4;
    }

    var fadeAlpha = 1;
    if (game._pileTopFadeStart) {
        fadeAlpha = Animations.pileFadeInAlpha(game._pileTopFadeStart);
        if (fadeAlpha >= 1) {
            game._pileTopFadeStart = null;
        }
    }

    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    _drawMahjongCard(ctx, top.type, x, y, w, h, true, 1.0);
    if (totalCount > 1) {
        var badgeX = x + w - 12;
        var badgeY = y + h - 12;
        var badgeR = 14;
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
    } else {
        ctx.restore();
    }
}

function _drawMahjongCard(ctx, type, x, y, w, h, isTop, layerAlpha) {
    drawing.drawShadowedCard(ctx, x, y, w, h, CARD_CORNER, isTop);

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

    var alpha = isTop ? constants.MAHJONG_TOP_ALPHA : (layerAlpha || constants.DIM_ALPHA);
    ctx.save();
    ctx.globalAlpha = alpha;
    var icon = Treasures.getIcon(type);
    var iconSize = Math.min(w, h) * 0.62;
    drawing.drawEmoji(ctx, icon,
        x + w / 2,
        y + h / 2,
        iconSize);
    ctx.restore();
}

/**
 * 背包区
 */
function _drawBackpack(ctx, game) {
    var board = game._gameBoard;
    if (!board) return;
    var backpack = board.getBackpack();

    var btnY0 = constants.LOGICAL_HEIGHT - BOTTOM_MARGIN - BUTTON_HEIGHT;
    var bpY = btnY0 - BACKPACK_BUTTON_GAP - constants.BACKPACK_HEIGHT;
    var padding = constants.MARGIN_X;
    var gap = BACKPACK_GAP;
    var slotW = (constants.LOGICAL_WIDTH - padding * 2 - gap * (constants.BACKPACK_CAPACITY - 1)) / constants.BACKPACK_CAPACITY;
    var slotH = constants.BACKPACK_HEIGHT;
    var containerW = constants.LOGICAL_WIDTH - padding * 2;
    var containerH = constants.BACKPACK_HEIGHT + 16;
    var containerY = bpY - 8;

    UI.drawBackpackContainer(ctx, padding, containerY, containerW, containerH, {
        flashing: game._backpackFlashStart !== null,
        flashStartTime: game._backpackFlashStart
    });

    var slotPositions = [];
    for (var i = 0; i < constants.BACKPACK_CAPACITY; i++) {
        var x = padding + i * (slotW + gap);
        var y = bpY;
        var type = backpack[i] || 0;
        _drawBackpackSlotUnified(ctx, {
            x: x, y: y, w: slotW, h: slotH,
            type: type,
            pressed: false
        });
        slotPositions.push({ x: x + slotW / 2, y: y + slotH / 2 });
    }
    game._gameBackpackHits = { y: containerY, h: containerH };
    game._gameBackpackSlots = slotPositions;
}

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
        _drawMahjongCard(ctx, type, x, y, w, h, true, 1.0);
    } else {
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
 * 底部操作区
 */
function _drawBottomButton(ctx, game) {
    var y0 = constants.LOGICAL_HEIGHT - BOTTOM_MARGIN - BUTTON_HEIGHT;
    var btnW = constants.BUTTON_WIDTH;
    var x = (constants.LOGICAL_WIDTH - btnW) / 2;

    UI.drawPrimaryButton(ctx, {
        x: x, y: y0,
        width: btnW, height: BUTTON_HEIGHT,
        icon: '🔄', label: '重玩本关',
        fontSize: 22,
        pressed: game._pressedButton === 'restart'
    });
    game._gameButtonHits = {
        restart: { x: x, y: y0, w: btnW, h: BUTTON_HEIGHT }
    };
}

/**
 * 触摸处理
 */
function handleTouch(pos, game) {
    if (game._modal) {
        return null;
    }

    if (game._gameNavHits && game._gameNavHits.backHit &&
        drawing.hitTest(pos.x, pos.y, game._gameNavHits.backHit)) {
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

    var prevClickable = {};
    var mainCards = board.getMainCards();
    for (var pi = 0; pi < mainCards.length; pi++) {
        prevClickable[mainCards[pi].id] = mainCards[pi].clickable;
    }

    var type = board.collectById(cardId);
    if (type <= 0) return;

    if (!game._unlockFlashes) game._unlockFlashes = [];
    var newCards = board.getMainCards();
    for (var ni = 0; ni < newCards.length; ni++) {
        var nc = newCards[ni];
        if (prevClickable[nc.id] === false && nc.clickable === true) {
            if (nc.coveredRatio < MIN_REVEAL_RATIO) {
                game._unlockFlashes[nc.id] = Date.now();
                AudioManager.play('special');
            }
        }
    }

    _doCollectType(game, type, fromX, fromY);
}

function _onCollectLeftPile(game, hit) {
    var board = game._gameBoard;
    if (!board) return;
    AudioManager.play('click');

    var fromX = hit.x + hit.w / 2;
    var fromY = hit.y + hit.h / 2;

    var type = board.collectFromLeftPile();
    if (type <= 0) return;

    game._pileTopFadeStart = Date.now();
    _doCollectType(game, type, fromX, fromY);
}

function _onCollectRightPile(game, hit) {
    var board = game._gameBoard;
    if (!board) return;
    AudioManager.play('click');

    var fromX = hit.x + hit.w / 2;
    var fromY = hit.y + hit.h / 2;

    var type = board.collectFromRightPile();
    if (type <= 0) return;

    game._pileTopFadeStart = Date.now();
    _doCollectType(game, type, fromX, fromY);
}

/**
 * 处理收集:飞入背包 + 三消检测
 *  - **关键**:这里只调用 _startFlying 添加一个飞入动画项
 *  - 不复制卡片、不生成额外卡片
 *  - backpack 数据通过 Backpack.addAndMatch 添加(原有逻辑)
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
        var positionsForParticles = [];
        var firstRound = matchedRounds[0];
        for (var pi = 0; pi < firstRound.length; pi++) {
            var slotIdx = firstRound[pi];
            if (slots[slotIdx]) positionsForParticles.push(slots[slotIdx]);
        }
        setTimeout(function () {
            Particles.spawnMatchSuccess(positionsForParticles);
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
 * 飞入动画启动(原卡牌从棋盘滑入背包的位移动画)
 *  - 只添加一个 flying item,不复制、不生成额外卡片
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
 * **关键**:每帧清理过期 flying items
 *  - 防止累积,避免 shadow 视觉残留
 */
function _updateAnimations(game) {
    var now = Date.now();
    if (game._flyingItems && game._flyingItems.length > 0) {
        var kept = [];
        for (var i = 0; i < game._flyingItems.length; i++) {
            var item = game._flyingItems[i];
            if (now - item.startTime < item.duration) {
                kept.push(item);
            }
        }
        game._flyingItems = kept;
    }
}

/**
 * 绘制飞入动画
 *  - **关键修复**:完全跳过 t >= 1 的 items(避免 shadow 视觉残留)
 *  - alpha 在 t > 0.7 时快速衰减到 0
 *  - shadow 显式设为 transparent 避免残留
 *  - 在最后阶段禁用 shadow,防止 Canvas shadow 不受 globalAlpha 影响的 bug
 */
function _drawFlying(ctx, game) {
    if (!game._flyingItems || game._flyingItems.length === 0) return;
    var now = Date.now();
    for (var i = 0; i < game._flyingItems.length; i++) {
        var item = game._flyingItems[i];
        var t = (now - item.startTime) / item.duration;

        // **关键修复**:完全跳过过期 items,避免 shadow 视觉残留
        if (t >= 1) continue;

        var eP = Animations.easeOutQuad(t);

        var x = (1 - eP) * item.fromX + eP * item.toX;
        var y = (1 - eP) * item.fromY + eP * item.toY;

        var arcY = item.ctrlY - (1 - Math.abs(2 * eP - 1)) * 40;

        var scale = 1.0 - t * 0.35;
        // **关键修复**:alpha 在 t > 0.7 时快速衰减到 0,避免最后一帧可见
        var alpha;
        if (t < 0.7) {
            alpha = 1.0;
        } else {
            alpha = Math.max(0, 1.0 - (t - 0.7) / 0.3);
        }
        var rotation = t * (constants.FLY_ROTATION_DEG * Math.PI / 180);

        var icon = Treasures.getIcon(item.type);
        var size = 70 * scale;

        ctx.save();
        ctx.translate(x, arcY);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;

        // **关键修复**:在 alpha 较低时禁用 shadow,避免视觉残留
        if (alpha < 0.5) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }

        // 白底
        ctx.fillStyle = constants.MAHJONG_BG;
        drawing.roundRect(ctx, -size / 2, -size / 2, size, size, CARD_CORNER);
        ctx.fill();

        // 绿边
        ctx.strokeStyle = constants.MAHJONG_BORDER_GREEN;
        ctx.lineWidth = constants.MAHJONG_BORDER_WIDTH;
        drawing.roundRect(ctx, -size / 2, -size / 2, size, size, CARD_CORNER);
        ctx.stroke();

        // emoji
        drawing.drawEmoji(ctx, icon, 0, 0, size * 0.62);
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
    game._unlockFlashes = [];
    game._failShakeStart = null;
    game._failHintStart = null;
    game._backpackFlashStart = null;
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

    var cx = constants.LOGICAL_WIDTH / 2;
    var cy = constants.LOGICAL_HEIGHT / 2;
    Particles.spawnVictoryConfetti(cx, cy);

    game._victoryStartTime = Date.now();
    setTimeout(function () {
        game._modal = constants.MODAL_WIN;
        game._modalStartTime = Date.now();
    }, 300);

    AudioManager.play('victory');
    AudioManager.vibrate();
}

/**
 * 失败处理
 */
function _onFail(game) {
    game._failShakeStart = Date.now();
    game._backpackFlashStart = Date.now();
    game._failHintStart = Date.now();

    var board = game._gameBoard;
    if (board) {
        var slots = game._gameBackpackSlots || [];
        if (slots.length > 0) {
            var cx = 0, cy = 0;
            for (var si = 0; si < slots.length; si++) {
                cx += slots[si].x;
                cy += slots[si].y;
            }
            cx /= slots.length;
            cy /= slots.length;
            Particles.spawnBackpackFull(cx, cy);
        }
    }

    setTimeout(function () {
        game._modal = constants.MODAL_FAIL;
        game._modalStartTime = Date.now();
    }, 300);

    AudioManager.play('fail');
    AudioManager.vibrate();
}

module.exports = {
    onEnter: onEnter,
    render: render,
    handleTouch: handleTouch,
    setSaveSystem: function (s) { SaveSystem = s; }
};