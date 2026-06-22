/**
 * levels - 关卡预设数据(Stack Miner 奇妙寻宝)
 * 严格遵循 DEV_STANDARDS.md §3 + GAME_DESIGN.md §6
 *
 * **关卡设计**:
 *   - PRESETS(level 0-8):前 9 关固定布局(新手关)
 *   - level 9+ 进入无限模式(level-generator 动态生成)
 *
 * **字段含义**(与 level-generator._paramsFor 一致):
 *   - layers:堆叠层数
 *   - layerRows:每层行数(下层多、上层少 → 金字塔)
 *   - cols:列数
 *   - layerStepY:Y 方向层间距
 *   - sameTypeMinDist:同类宝物最小距离
 *   - sameTypeLayerSpan:同类跨层权重
 *   - types:宝物种类数
 *   - pileCountEach:左右牌堆各几张
 *   - shufflePile:是否乱序牌堆
 *   - pileMixRatio:牌堆混比(预留字段)
 *
 * **难度曲线**:
 *   L1-L3(0-2):种类少(3-5),同类聚集,引导玩家
 *   L4-L6(3-5):种类中等(6-8),中等间距
 *   L7-L9(6-8):种类多(9-12),强分散,挑战
 */
var LEVELS = [
    // ===== L1(索引 0)引导关: 种类 3,同类聚集(minDist=0)=====
    {
        level: 0,
        layers: 1,
        layerRows: [5],
        cols: 7,
        layerStepY: 24,
        sameTypeMinDist: 0,
        sameTypeLayerSpan: 1,
        types: 3,
        pileCountEach: 4,
        shufflePile: false,
        pileMixRatio: 0.00
    },

    // ===== L2(索引 1)同类聚集,种类略增=====
    {
        level: 1,
        layers: 2,
        layerRows: [3, 5],
        cols: 7,
        layerStepY: 24,
        sameTypeMinDist: 1,
        sameTypeLayerSpan: 1,
        types: 4,
        pileCountEach: 4,
        shufflePile: false,
        pileMixRatio: 0.00
    },

    // ===== L3(索引 2)同类仍聚集,种类 5=====
    {
        level: 2,
        layers: 2,
        layerRows: [4, 6],
        cols: 7,
        layerStepY: 24,
        sameTypeMinDist: 2,
        sameTypeLayerSpan: 1,
        types: 5,
        pileCountEach: 5,
        shufflePile: false,
        pileMixRatio: 0.00
    },

    // ===== L4(索引 3)中等种类,同类中等间距=====
    {
        level: 3,
        layers: 3,
        layerRows: [3, 5, 6],
        cols: 7,
        layerStepY: 26,
        sameTypeMinDist: 3,
        sameTypeLayerSpan: 2,
        types: 6,
        pileCountEach: 5,
        shufflePile: true,
        pileMixRatio: 0.00
    },

    // ===== L5(索引 4)中等种类 + 跨度 2=====
    {
        level: 4,
        layers: 3,
        layerRows: [3, 5, 7],
        cols: 7,
        layerStepY: 26,
        sameTypeMinDist: 3,
        sameTypeLayerSpan: 2,
        types: 7,
        pileCountEach: 6,
        shufflePile: true,
        pileMixRatio: 0.00
    },

    // ===== L6(索引 5)中等种类 8 + minDist 4=====
    {
        level: 5,
        layers: 3,
        layerRows: [4, 6, 7],
        cols: 7,
        layerStepY: 26,
        sameTypeMinDist: 4,
        sameTypeLayerSpan: 2,
        types: 8,
        pileCountEach: 7,
        shufflePile: true,
        pileMixRatio: 0.00
    },

    // ===== L7(索引 6)多种类 9,强制分散 minDist=5 span=3=====
    {
        level: 6,
        layers: 4,
        layerRows: [3, 4, 5, 6],
        cols: 7,
        layerStepY: 28,
        sameTypeMinDist: 5,
        sameTypeLayerSpan: 3,
        types: 9,
        pileCountEach: 8,
        shufflePile: true,
        pileMixRatio: 0.00
    },

    // ===== L8(索引 7)多种类 10,强制分散 minDist=6 span=3=====
    {
        level: 7,
        layers: 4,
        layerRows: [3, 5, 6, 7],
        cols: 7,
        layerStepY: 22,
        sameTypeMinDist: 6,
        sameTypeLayerSpan: 3,
        types: 10,
        pileCountEach: 8,
        shufflePile: true,
        pileMixRatio: 0.00
    },

    // ===== L9(索引 8)大量种类 12,同类强分散 minDist=7 span=4=====
    {
        level: 8,
        layers: 5,
        layerRows: [3, 4, 5, 6, 7],
        cols: 7,
        layerStepY: 20,
        sameTypeMinDist: 7,
        sameTypeLayerSpan: 4,
        types: 12,
        pileCountEach: 9,
        shufflePile: true,
        pileMixRatio: 0.00
    }
];

/**
 * 无限模式参数生成(level 9+)
 *  - 随关卡递增
 *  - 起点使用 L9 的配置,逐步加强
 */
function getInfiniteParams(level) {
    var over = Math.max(0, level - 8);
    return {
        level: level,
        layers: 5,
        layerRows: [3, 4, 5, 6, 7],
        cols: 7,
        layerStepY: Math.min(20 + over * 2, 30),
        sameTypeMinDist: Math.min(7 + over, 10),
        sameTypeLayerSpan: Math.min(4 + Math.floor(over / 2), 5),
        types: Math.min(13 + Math.floor(over / 2), 15),
        pileCountEach: Math.min(10 + Math.floor(over / 2), 12),
        shufflePile: true,
        pileMixRatio: Math.min(0.65 + over * 0.03, 0.80)
    };
}

module.exports = {
    LEVELS: LEVELS,
    PRESET_COUNT: LEVELS.length,
    getInfiniteParams: getInfiniteParams
};
