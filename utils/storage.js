/**
 * storage - 存档系统(Stack Miner 奇妙寻宝)
 * 字段命名遵循 GAME_DESIGN.md §10 + DEV_STANDARDS §12
 * 不修改字段名称,只调整字段内容(删除 dailyChallenge 等越界字段)
 *
 * **关卡设计**(严格遵循 GAME_DESIGN §6):
 *   - 前 9 关(level 0-8)固定布局(新手关)
 *   - 第 10 关(level 9)开始无限模式(动态生成)
 *   - 通关当前关 → 解锁下一关
 *
 * **结构兼容**:
 *   - schemaVersion 升级到 2
 *   - 旧字段(dailyChallenge)保留默认值,_migrate 中识别后丢弃
 *   - 不强制迁移老存档,字段缺失自动填充默认
 */
var constants = require('./constants.js');

/**
 * 获取默认存档数据
 * 字段顺序遵循 GAME_DESIGN.md §10 + DEV_STANDARDS §12
 */
function getDefaultData() {
    return {
        // 基础进度(字段名遵循规范,不可修改)
        currentLevel: 0,
        unlockedLevel: 0,
        bestLevels: {},
        bestStreak: 0,
        firstClearTime: null,
        totalPlays: 0,

        // 玩家偏好
        settings: {
            music: false,
            sound: true,
            vibration: true
        },

        // 教程
        tutorialCompleted: false,

        // 系统字段
        schemaVersion: 2,           // 当前存档版本(GAME_DESIGN §10 规范字段)
        createTime: 0,
        lastPlayTime: 0
    };
}

/**
 * 跨平台读取存档
 */
function rawGet(key) {
    try {
        if (typeof wx !== 'undefined' && wx.getStorageSync) {
            return wx.getStorageSync(key);
        }
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }
    } catch (e) {
        console.error('[Storage] 读档失败:', e);
    }
    return null;
}

/**
 * 跨平台写入存档
 */
function rawSet(key, value) {
    try {
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync(key, value);
            return;
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
    } catch (e) {
        console.error('[Storage] 写档失败:', e);
    }
}

var SaveSystem = {
    _data: null,

    /**
     * 初始化存档
     */
    init: function () {
        var raw = rawGet(constants.SAVE_KEY);
        if (!raw) {
            this._data = getDefaultData();
            this._data.createTime = Date.now();
            this.save();
            console.log('[SaveSystem] 初始化默认存档');
        } else {
            try {
                this._data = JSON.parse(raw);
                this._migrate(this._data);
                console.log('[SaveSystem] 读档成功');
            } catch (e) {
                console.error('[SaveSystem] 存档损坏,使用默认:', e);
                this._data = getDefaultData();
            }
        }
    },

    /**
     * 字段迁移/兼容
     * - 不修改字段名,只对老字段(越界字段如 dailyChallenge)做丢弃处理
     * - 字段缺失则填充默认值
     */
    _migrate: function (data) {
        var defaults = getDefaultData();
        // 1. 缺失字段补默认值
        for (var k in defaults) {
            if (defaults.hasOwnProperty(k) && data[k] === undefined) {
                data[k] = defaults[k];
            }
        }
        // 2. settings 内部字段补全
        if (!data.settings) data.settings = {};
        for (var sk in defaults.settings) {
            if (data.settings[sk] === undefined) {
                data.settings[sk] = defaults.settings[sk];
            }
        }
        // 3. 删除越界字段(不删除字段名,只是从数据中清除,符合"不修改字段名"约束)
        if (data.dailyChallenge !== undefined) {
            console.log('[SaveSystem] 移除越界字段:dailyChallenge');
            delete data.dailyChallenge;
        }
        // 4. 解锁关卡封顶 8(0-8 共 9 关,level 9 为无限模式起点,不计入解锁)
        if (data.unlockedLevel > 8) {
            data.unlockedLevel = 8;
        }
        // 5. 升级 schemaVersion 标记
        if (data.schemaVersion < 2) {
            data.schemaVersion = 2;
        }
    },

    /**
     * 读取完整存档
     */
    load: function () {
        return this._data;
    },

    /**
     * 写入存档
     */
    save: function () {
        this._data.lastPlayTime = Date.now();
        try {
            rawSet(constants.SAVE_KEY, JSON.stringify(this._data));
        } catch (e) {
            console.error('[SaveSystem] 序列化失败:', e);
        }
    },

    /** ===== 字段 getter/setter(字段名遵循规范,不可修改)===== */
    getCurrentLevel: function () { return this._data.currentLevel; },
    setCurrentLevel: function (lv) { this._data.currentLevel = Math.max(0, lv | 0); this.save(); },

    getUnlockedLevel: function () { return this._data.unlockedLevel; },
    /**
     * 解锁层数(只升不降,封顶 8)
     * level 9+ 进入无限模式,不影响 unlockedLevel
     */
    unlockLevel: function (lv) {
        var maxLv = 8;  // 0-8 共 9 关
        var newLv = lv | 0;
        if (newLv > maxLv) newLv = maxLv;
        if (newLv > this._data.unlockedLevel) {
            this._data.unlockedLevel = newLv;
            this.save();
        }
    },

    getBestStreak: function () { return this._data.bestStreak; },
    setBestStreak: function (v) { this._data.bestStreak = Math.max(0, v | 0); this.save(); },

    getTotalPlays: function () { return this._data.totalPlays; },
    incrementTotalPlays: function () { this._data.totalPlays += 1; this.save(); },

    getFirstClearTime: function () { return this._data.firstClearTime; },
    setFirstClearTime: function (v) { this._data.firstClearTime = v; this.save(); },

    getBestLevel: function (lv) { return this._data.bestLevels[lv] || null; },
    setBestLevel: function (lv, clearTime) {
        this._data.bestLevels[lv] = clearTime;
        this.save();
    },

    /** ===== 设置 ===== */
    getSetting: function (key) { return this._data.settings[key]; },
    setSetting: function (key, v) { this._data.settings[key] = !!v; this.save(); },

    /** ===== 教程 ===== */
    isTutorialCompleted: function () { return this._data.tutorialCompleted; },
    completeTutorial: function () { this._data.tutorialCompleted = true; this.save(); },

    /**
     * 清档
     */
    reset: function () {
        this._data = getDefaultData();
        this._data.createTime = Date.now();
        this.save();
    }
};

module.exports = { SaveSystem: SaveSystem };
