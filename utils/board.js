/**
 * board - 游戏板(Stack Miner 奇妙寻宝)
 *
 * **数据结构**(遵循 DEV_STANDARDS §6):
 *   - _mainCards[]:主藏宝区卡片(网状覆盖 = Overlay Tile)
 *   - _leftPile[]:左牌堆(只显示顶牌,Stack 行为 = Deck Tile)
 *   - _rightPile[]:右牌堆(只显示顶牌,Stack 行为 = Deck Tile)
 *   - _backpack[]:背包 7 格
 *
 * **覆盖规则**(严格遵循 GAME_DESIGN §7.4):
 *   - 可点击判定:clickable === true(由 coveredRatio 决定)
 *   - clickable = (coveredRatio < CLICK_BLOCK_RATIO) && !hidden
 *   - hidden:被覆盖面积 ≥ 90% 时不渲染(数据保留,规范 §7.4)
 *
 * **遮挡阈值拆分**:
 *   - CLICK_BLOCK_RATIO (0.15): 覆盖 ≥ 15% → 不可点击
 *   - HIDDEN_OVERLAP_RATIO (0.90): 覆盖 ≥ 90% → 不渲染
 *
 * **解锁规则**:
 *   - 移除卡片后重新计算 coveredBy + coveredRatio
 *   - 当 coveredRatio 减少,可能 clickable 从 false 变 true
 */
var constants = require('./constants.js');

/**
 * 矩形重叠面积
 * @param {Object} a 矩形 {x, y, w, h}
 * @param {Object} b 矩形 {x, y, w, h}
 * @returns {number}
 */
function _overlapArea(a, b) {
    var x1 = Math.max(a.x, b.x);
    var y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w);
    var y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return 0;
    return (x2 - x1) * (y2 - y1);
}

/** 旧版本 _computeCoverage 已删除(只设 coveredBy 未设 coveredArea/coveredRatio),
    完整计算逻辑见下面新版本。 */

/**
 * 重新计算(覆盖 + 隐藏 + 可点击)
 *  - 在 loadLevel / collectById 后调用,保持 _mainCards 状态同步
 */
function _recompute(cards) {
    _computeCoverage(cards);
    _computeHidden(cards);
    _computeClickable(cards);
}

/**
 * 计算隐藏(完全遮挡)
 *  - 若 card.coveredRatio ≥ HIDDEN_OVERLAP_RATIO,则 hidden = true
 *  - hidden 卡片保留数据但不渲染
 */
function _computeHidden(cards) {
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (card.isPile) { card.hidden = false; continue; }
        card.hidden = card.coveredRatio >= constants.HIDDEN_OVERLAP_RATIO;
    }
}

/**
 * 计算可点击状态(遵循 GAME_DESIGN §7.4:覆盖 ≥ 15% 不可点击)
 *  - clickable = !hidden && coveredRatio < CLICK_BLOCK_RATIO (0.15)
 *  - isPile 永远可点
 */
function _computeClickable(cards) {
    for (var k = 0; k < cards.length; k++) {
        var c = cards[k];
        if (c.isPile) {
            c.clickable = true;
            continue;
        }
        c.clickable = !c.hidden && c.coveredRatio < constants.CLICK_BLOCK_RATIO;
    }
}

/**
 * 计算覆盖关系(上层 layer 小,下层 layer 大)
 *  - card.coveredBy:覆盖此卡的上层卡片 id 列表
 *  - card.coveredArea:被上层覆盖的总面积(像素²)
 *  - card.coveredRatio:被覆盖面积 / 自身面积(0~1)
 *
 * **关键修复**: 原版本只设 coveredBy 未设 coveredArea 和 coveredRatio,
 *   导致后续 _computeClickable 中所有卡 coveredRatio=0 → 全部 clickable。
 *   必须在此函数内同步计算 coveredRatio。
 */
function _computeCoverage(cards) {
    // Step 1: 初始化 coveredBy 与 coveredArea
    for (var i = 0; i < cards.length; i++) {
        var c0 = cards[i];
        c0.coveredBy = [];
        c0.coveredArea = 0;
    }
    // Step 2: 累加上层覆盖面积(other.layer < card.layer → 上层覆盖下层)
    for (var i2 = 0; i2 < cards.length; i2++) {
        var card = cards[i2];
        if (card.isPile) continue;
        for (var j = 0; j < cards.length; j++) {
            if (j === i2) continue;
            var other = cards[j];
            if (other.isPile) continue;
            if (other.layer < card.layer) {
                var ov = _overlapArea(other, card);
                if (ov > 0) {
                    card.coveredBy.push(other.id);
                    card.coveredArea += ov;
                }
            }
        }
    }
    // Step 3: 计算 coveredRatio = coveredArea / 自面积
    for (var k = 0; k < cards.length; k++) {
        var c = cards[k];
        if (c.isPile) continue;
        var area = c.w * c.h;
        c.coveredRatio = area > 0 ? Math.min(1, c.coveredArea / area) : 0;
    }
}

/**
 * 重新分配 id
 */
function _reassignIds(cards) {
    for (var i = 0; i < cards.length; i++) {
        cards[i].id = i;
    }
}

var Board = {
    _instance: null,

    getInstance: function () {
        if (!this._instance) this._instance = this._create();
        return this._instance;
    },

    _create: function () {
        var inst = {
            _mainCards: [],
            _leftPile: [],
            _rightPile: [],
            _backpack: [],
            _cleared: false
        };
        for (var k in this) {
            if (typeof this[k] === 'function' && k !== 'getInstance' && k !== '_create') {
                inst[k] = this[k].bind(inst);
            }
        }
        return inst;
    },

    /**
     * 加载关卡数据
     * @param {Object} data {mainArea, leftPile, rightPile}
     */
    loadLevel: function (data) {
        if (!data) return;
        this._mainCards = (data.mainArea && data.mainArea.cards) ? data.mainArea.cards.map(function (c) {
            return {
                id: c.id,
                type: c.type,
                layer: c.layer,
                x: c.x, y: c.y, w: c.w, h: c.h,
                coveredBy: [],
                coveredArea: 0,
                coveredRatio: 0,
                hidden: false,
                clickable: true,
                isPile: false
            };
        }) : [];
        this._leftPile = (data.leftPile && data.leftPile.cards) ? data.leftPile.cards.map(function (c) {
            return {
                id: c.id, type: c.type,
                x: c.x, y: c.y, w: c.w, h: c.h,
                isPile: true, pileIndex: c.pileIndex,
                clickable: true
            };
        }) : [];
        this._rightPile = (data.rightPile && data.rightPile.cards) ? data.rightPile.cards.map(function (c) {
            return {
                id: c.id, type: c.type,
                x: c.x, y: c.y, w: c.w, h: c.h,
                isPile: true, pileIndex: c.pileIndex,
                clickable: true
            };
        }) : [];
        this._backpack = [];
        for (var k = 0; k < constants.BACKPACK_CAPACITY; k++) {
            this._backpack.push(0);
        }
        this._cleared = false;
        _recompute(this._mainCards);
    },

    /**
     * 获取主藏宝区所有卡片
     */
    getMainCards: function () { return this._mainCards; },

    /**
     * 获取左牌堆
     */
    getLeftPile: function () { return this._leftPile; },

    /**
     * 获取右牌堆
     */
    getRightPile: function () { return this._rightPile; },

    /**
     * 通过 id 获取卡片
     */
    getCardById: function (id) { return this._mainCards[id] || null; },

    /**
     * 卡片是否被覆盖(任一上层遮挡,覆盖面积 ≥ 15%)
     */
    isCovered: function (id) {
        var card = this._mainCards[id];
        if (!card) return false;
        return card.coveredRatio >= constants.CLICK_BLOCK_RATIO;
    },

    /**
     * 卡片是否完全遮挡(hidden)
     */
    isHidden: function (id) {
        var card = this._mainCards[id];
        if (!card) return false;
        return !!card.hidden;
    },

    /**
     * 卡片是否可点
     *  - 覆盖面积 < 15%
     *  - 不在 hidden 状态
     *  - 牌堆永远可点
     */
    canClick: function (id) {
        var card = this._mainCards[id];
        if (!card) return false;
        return !!card.clickable;
    },

    /**
     * 收集指定 id 的卡片(主藏宝区)
     *  - 隐藏卡片不可点
     *  - 被覆盖卡片(覆盖面积 ≥ 15%)不可点
     */
    collectById: function (id) {
        var card = this._mainCards[id];
        if (!card) return 0;
        if (!card.clickable) return 0;
        var type = card.type;
        this._mainCards.splice(id, 1);
        _reassignIds(this._mainCards);
        _recompute(this._mainCards);
        return type;
    },

    /**
     * 从左牌堆翻一张(只翻顶牌,Stack 行为)
     */
    collectFromLeftPile: function () {
        if (this._leftPile.length === 0) return 0;
        var topIdx = 0;
        for (var i = 1; i < this._leftPile.length; i++) {
            if (this._leftPile[i].pileIndex < this._leftPile[topIdx].pileIndex) {
                topIdx = i;
            }
        }
        var type = this._leftPile[topIdx].type;
        this._leftPile.splice(topIdx, 1);
        for (var j = 0; j < this._leftPile.length; j++) {
            this._leftPile[j].pileIndex--;
        }
        return type;
    },

    /**
     * 从右牌堆翻一张
     */
    collectFromRightPile: function () {
        if (this._rightPile.length === 0) return 0;
        var topIdx = 0;
        for (var i = 1; i < this._rightPile.length; i++) {
            if (this._rightPile[i].pileIndex < this._rightPile[topIdx].pileIndex) {
                topIdx = i;
            }
        }
        var type = this._rightPile[topIdx].type;
        this._rightPile.splice(topIdx, 1);
        for (var j = 0; j < this._rightPile.length; j++) {
            this._rightPile[j].pileIndex--;
        }
        return type;
    },

    /**
     * 背包管理
     */
    getBackpack: function () { return this._backpack; },

    addToBackpack: function (type) {
        for (var i = 0; i < this._backpack.length; i++) {
            if (this._backpack[i] === 0) {
                this._backpack[i] = type;
                return i;
            }
        }
        return -1;
    },

    clearBackpack: function () {
        for (var i = 0; i < this._backpack.length; i++) {
            this._backpack[i] = 0;
        }
    },

    findBackpackIndices: function (type) {
        var list = [];
        for (var i = 0; i < this._backpack.length; i++) {
            if (this._backpack[i] === type) list.push(i);
        }
        return list;
    },

    /**
     * 背包是否满
     */
    isBackpackFull: function () {
        for (var i = 0; i < this._backpack.length; i++) {
            if (this._backpack[i] === 0) return false;
        }
        return true;
    },

    /**
     * 还有无可见卡片(主区+牌堆,排除 hidden + 被覆盖)
     */
    hasAnyVisible: function () {
        for (var i = 0; i < this._mainCards.length; i++) {
            if (this._mainCards[i].clickable) return true;
        }
        if (this._leftPile.length > 0) return true;
        if (this._rightPile.length > 0) return true;
        return false;
    },

    /**
     * 是否通关
     */
    isCleared: function () {
        return this._cleared ||
            (this._mainCards.length === 0 && this._leftPile.length === 0 && this._rightPile.length === 0);
    },

    /**
     * 检查胜利
     */
    checkWin: function () {
        return this._mainCards.length === 0 && this._leftPile.length === 0 && this._rightPile.length === 0;
    }
};

module.exports = { Board: Board };
