/**
 * validator - 规则校验器(Stack Miner 奇妙寻宝)
 * 负责:
 *   - 校验点击位置是否有效
 *   - 校验关卡生成是否合理
 *   - 检查游戏状态(进行中/胜利/失败)
 * 参考 GAME_DESIGN §4 §5 §15
 */
var constants = require('./constants.js');
var Backpack = require('./backpack.js').Backpack;

/**
 * 校验点击位置是否有效
 * @param {Object} board
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isValidClick(board, row, col) {
    if (!board) return false;
    if (board.isCleared()) return false;
    if (!board.isVisible(row, col)) return false;
    return true;
}

/**
 * 校验关卡数据是否合法
 * @param {Object} data
 * @returns {{ok:boolean, reason:string}}
 */
function validateLevel(data) {
    if (!data) return { ok: false, reason: '关卡数据为空' };
    if (!data.layers || !data.layers.length) return { ok: false, reason: '至少需要 1 层' };

    var totalTreasures = 0;
    var counts = {};
    var hasVisible = false;

    for (var l = 0; l < data.layers.length; l++) {
        var layer = data.layers[l];
        if (!layer.length) return { ok: false, reason: '第 ' + l + ' 层为空' };
        var cols = layer[0].length;
        for (var r = 0; r < layer.length; r++) {
            if (layer[r].length !== cols) {
                return { ok: false, reason: '第 ' + l + ' 层列数不统一' };
            }
            for (var c = 0; c < cols; c++) {
                var t = layer[r][c];
                if (t === 0) continue;
                if (t < 0 || t > constants.TREASURE_TYPE_COUNT) {
                    return { ok: false, reason: '未知宝物类型: ' + t };
                }
                counts[t] = (counts[t] || 0) + 1;
                totalTreasures++;
                // 检查该格是否可见(上方无遮挡)
                if (!hasVisible) {
                    var blocked = false;
                    for (var upper = 0; upper < l; upper++) {
                        if (data.layers[upper][r] && data.layers[upper][r][c] > 0) {
                            blocked = true;
                            break;
                        }
                    }
                    if (!blocked) hasVisible = true;
                }
            }
        }
    }

    if (totalTreasures === 0) return { ok: false, reason: '关卡无任何宝物' };
    if (!hasVisible) return { ok: false, reason: '没有可见宝物(开局不可点击)' };
    if (totalTreasures > constants.BACKPACK_CAPACITY * 3) {
        // 超过背包容量 3 倍,几乎肯定失败
        // 警告而非阻止,让关卡设计有弹性
    }
    // 检查至少一个类型数量是 3 的倍数(可三消)
    var hasMatchable = false;
    for (var k in counts) {
        if (counts.hasOwnProperty(k) && counts[k] >= 3) {
            hasMatchable = true;
            break;
        }
    }
    if (!hasMatchable) {
        return { ok: false, reason: '没有任何类型数量 >= 3(无法三消)' };
    }
    return { ok: true, reason: '' };
}

/**
 * 检查游戏当前状态
 * @param {Object} board
 * @returns {string} 'playing' | 'win' | 'fail'
 */
function checkGameStatus(board) {
    if (board.isCleared()) return 'win';
    if (Backpack.isFailed(board)) return 'fail';
    return 'playing';
}

var Validator = {
    isValidClick: isValidClick,
    validateLevel: validateLevel,
    checkGameStatus: checkGameStatus
};

module.exports = { Validator: Validator };
