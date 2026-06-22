/**
 * backpack - 背包三消逻辑(Stack Miner 奇妙寻宝)
 * 规则(参考 GAME_DESIGN §5):
 *   - 背包固定 7 格
 *   - 添加宝物后立即检查 3 个相同 → 自动消除
 *   - 背包满 + 无法形成三消 → 失败
 *   - 失败判定:已无任何可见宝物可收集 + 背包满 + 不可三消
 */
var constants = require('./constants.js');

/**
 * 检查背包,找出所有可以三消的类型
 * @param {Array} backpack
 * @returns {Array<number>} 可消除的索引数组
 */
function findMatchIndices(backpack) {
    var byType = {};
    for (var i = 0; i < backpack.length; i++) {
        var t = backpack[i];
        if (t <= 0) continue;
        if (!byType[t]) byType[t] = [];
        byType[t].push(i);
    }
    var matchIdx = [];
    for (var type in byType) {
        if (!byType.hasOwnProperty(type)) continue;
        var list = byType[type];
        while (list.length >= constants.MATCH_COUNT) {
            for (var k = 0; k < constants.MATCH_COUNT; k++) {
                matchIdx.push(list.shift());
            }
        }
    }
    return matchIdx;
}

/**
 * 从背包中清除指定索引(其他元素左移,末尾补 0)
 * @param {Array} backpack
 * @param {Array<number>} indicesToRemove
 */
function removeAt(backpack, indicesToRemove) {
    indicesToRemove.sort(function (a, b) { return b - a; });
    for (var i = 0; i < indicesToRemove.length; i++) {
        backpack.splice(indicesToRemove[i], 1);
        backpack.push(0);
    }
}

/**
 * 完整处理一次添加 + 多次三消(链式)
 * @param {Object} board
 * @param {number} type
 * @returns {Object} {ok, matched:Array<Array<number>>, boardCleared:boolean}
 */
function addAndMatch(board, type) {
    var result = {
        ok: false,
        type: type,
        matchedRounds: [],
        boardCleared: false
    };
    // 1. 添加(注意:addToBackpack 返回 slot index(>=0)或 -1(满))
    // 旧代码用 !board.addToBackpack(type) 错误(0 是 falsy),改为 < 0
    var slot = board.addToBackpack(type);
    if (slot < 0) {
        return result;  // 背包满
    }
    result.ok = true;

    // 2. 链式三消(消除后可能触发新的三消)
    var backpack = board.getBackpack();
    var safety = 0;
    while (safety++ < 10) {
        var idxs = findMatchIndices(backpack);
        if (idxs.length === 0) break;
        result.matchedRounds.push(idxs);
        removeAt(backpack, idxs);
    }

    // 3. 检查关卡是否清空
    result.boardCleared = board.isCleared();

    return result;
}

/**
 * 检查当前状态是否失败
 * 失败条件:背包满 AND 没有任何类型可以三消
 * @param {Object} board
 * @returns {boolean}
 */
function isFailed(board) {
    if (!board.isBackpackFull()) return false;
    var backpack = board.getBackpack();
    var idxs = findMatchIndices(backpack);
    return idxs.length === 0;
}

/**
 * 检查关卡是否死局
 * 死局条件:
 *   1. 背包未满(失败条件)
 *   2. 但所有剩余可见宝物收集后都无法三消
 * 简化:用背包状态推断,只要当前背包不失败,且仍有可见宝物,就不是死局
 * @param {Object} board
 * @returns {boolean}
 */
function isDeadLock(board) {
    if (isFailed(board)) return false;
    if (board.isCleared()) return false;
    if (!board.hasAnyVisible()) return true;
    return false;
}

var Backpack = {
    findMatchIndices: findMatchIndices,
    removeAt: removeAt,
    addAndMatch: addAndMatch,
    isFailed: isFailed,
    isDeadLock: isDeadLock
};

module.exports = { Backpack: Backpack };
