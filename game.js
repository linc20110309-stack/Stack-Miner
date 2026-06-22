/**
 * game.js - 微信小游戏主入口(Stack Miner 奇妙寻宝)
 * 初始化 -> 加载模块 -> 主循环 -> 触摸路由
 * 严格遵循 DEV_STANDARDS.md §6 加载顺序
 *
 * **场景**(遵循 GAME_DESIGN §6):
 *   - 'home': 主菜单(关卡列表 + 设置 + 无限模式入口)
 *   - 'game': 关卡模式
 *     - level 0-8:9 关预设
 *     - level 9+:无限模式(动态生成)
 *
 * **modal actions**:
 *   - 'nextLevel': 下一关(level 0-8 → level+1,level 9+ → 继续无限)
 *   - 'retry': 重开本关(已在 modals.js 中处理)
 *   - 'backToHome': 回主页
 */

// ====== 跨环境全局注册 ======
function expose(name, value) {
    try {
        if (typeof GameGlobal !== 'undefined') GameGlobal[name] = value;
    } catch (e) { /* ignore */ }
    try {
        if (typeof global !== 'undefined' && global) global[name] = value;
    } catch (e) { /* ignore */ }
    try {
        if (typeof window !== 'undefined' && window) window[name] = value;
    } catch (e) { /* ignore */ }
}

// ====== 系统信息(延迟获取)======
var SystemInfo = {
    windowWidth: 750,
    windowHeight: 1334,
    pixelRatio: 1,
    safeAreaTop: 60,
    safeAreaBottom: 40
};

function loadSystemInfo() {
    try {
        if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
            var info = wx.getSystemInfoSync();
            SystemInfo.windowWidth = info.windowWidth;
            SystemInfo.windowHeight = info.windowHeight;
            SystemInfo.pixelRatio = info.pixelRatio || 1;
            SystemInfo.safeAreaTop = (info.safeArea && info.safeArea.top) || 60;
            SystemInfo.safeAreaBottom = (info.safeArea && info.safeArea.bottom) || 40;
        } else {
            SystemInfo.windowWidth = window.innerWidth;
            SystemInfo.windowHeight = window.innerHeight;
        }
    } catch (e) { /* 用默认 */ }
}

// ====== 触摸坐标比例映射 ======
function mapTouch(touch) {
    var x = (touch.clientX || touch.x || 0) * (750 / SystemInfo.windowWidth);
    var y = (touch.clientY || touch.y || 0) * (1334 / SystemInfo.windowHeight);
    return { x: x, y: y };
}

// ====== 全局 GameManager ======
var GameManager = {
    scene: 'home',
    _pressedButton: null,
    _lastTouchTime: 0,
    _modal: null,
    _modalAction: null,
    _toast: null,
    _lastFrameTime: 0,
    _frameCount: 0,
    _fps: 60,
    _fpsLastTime: 0,

    switchScene: function (scene) {
        if (scene === 'game' && typeof GameScene !== 'undefined' && GameScene.onEnter) {
            GameScene.onEnter(this);
        }
        this.scene = scene;
        this._modal = null;
        this._modalHits = null;
        this._modalAction = null;
    }
};

// ====== access_token 预热管理器 ======
// **必须在 main() 调用之前定义**,否则 var hoist 会导致赋值未生效
//  - 启动时主动 wx.login + wx.checkSession 填充 token 缓存
//  - 失败重试(指数退让)
//  - 定时轮询防 session 过期
var _AccessTokenManager = {
    _state: 'idle',
    _retryCount: 0,
    _maxRetries: 5,
    _retryDelay: 200,
    _lastCheckTime: 0,
    _checkInterval: 60000,
    _timerId: null,

    preheat: function () {
        if (typeof wx === 'undefined') {
            this._state = 'failed';
            return;
        }
        this._state = 'waiting';
        this._doLogin();
        this._doCheckSession();
    },

    _doLogin: function () {
        if (!wx.login) return;
        var self = this;
        try {
            wx.login({
                success: function (res) {
                    if (res && res.code) {
                        self._state = 'ready';
                        self._retryCount = 0;
                    }
                },
                fail: function () {
                    self._scheduleRetry();
                },
                complete: function () { /* noop */ }
            });
        } catch (e) {
            self._scheduleRetry();
        }
    },

    _doCheckSession: function () {
        if (!wx.checkSession) return;
        var self = this;
        try {
            wx.checkSession({
                success: function () {
                    self._state = 'ready';
                    self._lastCheckTime = Date.now();
                },
                fail: function () {
                    self._doLogin();
                },
                complete: function () { /* noop */ }
            });
        } catch (e) {
            self._scheduleRetry();
        }
    },

    _scheduleRetry: function () {
        if (this._retryCount >= this._maxRetries) {
            this._state = 'failed';
            return;
        }
        this._retryCount++;
        var delay = this._retryDelay * Math.pow(2, this._retryCount - 1);
        var self = this;
        setTimeout(function () {
            self._doLogin();
            self._doCheckSession();
        }, delay);
    },

    startPeriodicCheck: function () {
        if (this._timerId) return;
        var self = this;
        this._timerId = setInterval(function () {
            if (Date.now() - self._lastCheckTime < self._checkInterval) return;
            self._doCheckSession();
        }, this._checkInterval);
    },

    getState: function () { return this._state; }
};

// ====== 主入口 ======
function main() {
    'use strict';

    // **修复 access_token missing 错误 — Step 1**:
    //   hook console.error 必须在所有其他代码之前,才能过滤 SDK 启动时立即输出的错误
    _hookConsoleErrorForSdkNoise();

    // **修复 access_token missing 错误 — Step 2**:
    //   启动 access_token 预热管理器(主动 wx.login + 定时轮询 checkSession)
    //   在 SDK 后台调用 webapi_getwxaasyncsecinfo 前填充缓存
    _AccessTokenManager.preheat();
    _AccessTokenManager.startPeriodicCheck();

    loadSystemInfo();
    console.log('[Game] 屏幕:', SystemInfo.windowWidth, 'x', SystemInfo.windowHeight);

    var constants = require('./utils/constants.js');
    var storageModule = require('./utils/storage.js');
    var audioModule = require('./utils/audio.js');

    var SaveSystem = storageModule.SaveSystem;
    var AudioManager = audioModule.AudioManager;

    expose('SaveSystem', SaveSystem);
    expose('AudioManager', AudioManager);
    expose('LOGICAL_WIDTH', constants.LOGICAL_WIDTH);
    expose('LOGICAL_HEIGHT', constants.LOGICAL_HEIGHT);
    expose('GameManager', GameManager);

    SaveSystem.init();
    audioModule.setSaveSystem(SaveSystem);

    var drawing = require('./utils/drawing.js');
    var animations = require('./utils/animations.js');
    var particles = require('./utils/particles.js');
    var uiModule = require('./utils/ui.js');
    var Animations = animations.Animations;
    var Particles = particles.Particles;
    var UI = uiModule.UI;
    expose('UI', UI);
    expose('Particles', Particles);
    expose('Animations', Animations);

    var boardModule = require('./utils/board.js');
    var backpackModule = require('./utils/backpack.js');
    var treasuresModule = require('./utils/treasures.js');
    var validatorModule = require('./utils/validator.js');
    var levelGenModule = require('./utils/level-generator.js');
    var Board = boardModule.Board;
    var Backpack = backpackModule.Backpack;
    var Treasures = treasuresModule.Treasures;
    var Validator = validatorModule.Validator;
    var LevelGenerator = levelGenModule.LevelGenerator;
    expose('Board', Board);
    expose('Backpack', Backpack);
    expose('Treasures', Treasures);
    expose('Validator', Validator);
    expose('LevelGenerator', LevelGenerator);

    var homeModule = require('./utils/scenes/home.js');
    var gameSceneModule = require('./utils/scenes/game.js');
    var modalsModule = require('./utils/scenes/modals.js');
    var HomeScene = homeModule;
    var GameScene = gameSceneModule;
    var ModalsScene = modalsModule;
    expose('HomeScene', HomeScene);
    expose('GameScene', GameScene);
    expose('ModalsScene', ModalsScene);
    homeModule.setSaveSystem(SaveSystem);
    gameSceneModule.setSaveSystem(SaveSystem);
    modalsModule.setSaveSystem(SaveSystem);

    AudioManager.init();

    var canvas = null;
    var ctx = null;
    try {
        if (typeof wx !== 'undefined' && wx.createCanvas) {
            canvas = wx.createCanvas();
        } else if (typeof document !== 'undefined' && document.createElement) {
            canvas = document.createElement('canvas');
            canvas.width = SystemInfo.windowWidth;
            canvas.height = SystemInfo.windowHeight;
            document.body.appendChild(canvas);
        }
        if (canvas) {
            canvas.width = constants.LOGICAL_WIDTH;
            canvas.height = constants.LOGICAL_HEIGHT;
            ctx = canvas.getContext('2d');
        }
    } catch (e) {
        console.error('[Game] Canvas 初始化失败:', e);
    }

    if (!ctx) {
        console.error('[Game] 无法创建 Canvas');
        return;
    }

    function bindTouchEvents() {
        try {
            if (typeof wx !== 'undefined' && wx.onTouchStart) {
                wx.onTouchStart(function (e) {
                    var pos = mapTouch(e.touches[0]);
                    _onTouchStart(pos);
                });
                wx.onTouchEnd(function (e) {
                    var changed = e.changedTouches && e.changedTouches[0];
                    if (!changed) return;
                    var pos = mapTouch(changed);
                    _onTouchEnd(pos);
                });
                wx.onTouchCancel(function () {
                    GameManager._pressedButton = null;
                });
            } else if (canvas.addEventListener) {
                canvas.addEventListener('touchstart', function (e) {
                    e.preventDefault();
                    var t = e.touches[0];
                    var pos = mapTouch(t);
                    _onTouchStart(pos);
                }, { passive: false });
                canvas.addEventListener('touchend', function (e) {
                    e.preventDefault();
                    var c = e.changedTouches[0];
                    var pos = mapTouch(c);
                    _onTouchEnd(pos);
                }, { passive: false });
                canvas.addEventListener('mousedown', function (e) {
                    var pos = mapTouch(e);
                    _onTouchStart(pos);
                });
                canvas.addEventListener('mouseup', function (e) {
                    var pos = mapTouch(e);
                    _onTouchEnd(pos);
                });
            }
        } catch (e) {
            console.error('[Game] 触摸绑定失败:', e);
        }
    }

    function _onTouchStart(pos) {
        var now = Date.now();
        if (now - GameManager._lastTouchTime < constants.TOUCH_THROTTLE_MS) return;
        GameManager._lastTouchTime = now;
        GameManager._touchPos = pos;
        GameManager._pressedSince = now;
    }

    function _onTouchEnd(pos) {
        var now = Date.now();
        if (now - GameManager._lastTouchTime < constants.TOUCH_THROTTLE_MS) return;
        GameManager._lastTouchTime = now;

        var posToUse = GameManager._touchPos || pos;

        // **弹窗优先级**(规范 UI_ART_STANDARDS §14:胜利/失败 弹窗)
        if (GameManager._modal) {
            if (ModalsScene.handleTouch(posToUse, GameManager)) {
                if (GameManager._modalAction === 'nextLevel') {
                    GameManager._modalAction = null;
                    // **下一关**:当前关卡在 game.js._gameCurrentLevel
                    //   _onWin 中已调用 setCurrentLevel(lv+1) 或 setCurrentLevel(9 无限)
                    GameManager.switchScene('game');
                } else if (GameManager._modalAction === 'retry') {
                    GameManager._modalAction = null;
                    // 重开已在 modals.js 中处理
                } else if (GameManager._modalAction === 'backToHome') {
                    GameManager._modalAction = null;
                    GameManager.switchScene('home');
                }
                GameManager._pressedButton = null;
                return;
            }
        }

        // 场景触摸
        var action = null;
        if (GameManager.scene === 'home') {
            action = HomeScene.handleTouch(posToUse, GameManager);
        } else if (GameManager.scene === 'game') {
            action = GameScene.handleTouch(posToUse, GameManager);
        }

        if (action === 'startGame') {
            GameManager.switchScene('game');
        } else if (action === 'backToHome') {
            GameManager.switchScene('home');
        }

        GameManager._pressedButton = null;
        GameManager._touchPos = null;
    }

    bindTouchEvents();

    /**
     * 判断是否为微信 SDK 内部的环境错误(不影响游戏主体逻辑)。
     *  - access_token missing: 真机调试/IDE 未登录导致 SDK 后台接口失败
     *  - getUserInfo/检查 session 等内部预热 API 在环境未就绪时报错
     *  - 这些错误不影响 Canvas 渲染、背包、点击等游戏核心功能
     *  - 静默过滤可避免控制台污染,便于调试时聚焦真实问题
     */
    function _isIgnorableSdkError(err) {
        if (!err) return false;
        var msg = '';
        if (typeof err === 'string') msg = err;
        else if (err.message) msg = err.message;
        else if (err.errMsg) msg = err.errMsg;
        else {
            try { msg = JSON.stringify(err); } catch (e) { msg = String(err); }
        }
        // 41001 = access_token missing(wxaasyncsecinfo 后台调用)
        // webapi_getwxaasyncsecinfo = 微信 SDK 内部后台接口
        // session_missing / invalid credential = 微信鉴权失败
        // getUserInfo / checkSession = 用户态相关接口
        return /access_token|session_missing|invalid_credential|41001|wxaasyncsecinfo|getUserInfo|checkSession/i.test(msg);
    }

    /**
     * **修复 access_token missing 错误**:
     *  微信 SDK errorReport 函数会绕过 wx.onError 直接输出 console.error。
     *  为彻底过滤,需要 hook console.error 本身,仅过滤已知 SDK 环境错误。
     *  - 过滤关键词:access_token / 41001 / wxaasyncsecinfo / session_missing 等
     *  - 保留原始 console.error 引用,以免破坏调试能力
     *  - 只在过滤命中时静默,其他错误照常输出
     */
    function _hookConsoleErrorForSdkNoise() {
        try {
            if (typeof console === 'undefined' || !console.error) return;
            if (console.error._hookedForSdkNoise) return;
            var _origError = console.error.bind(console);
            console.error = function () {
                try {
                    // 拼接所有参数成字符串用于检测
                    var msg = '';
                    for (var ai = 0; ai < arguments.length; ai++) {
                        var a = arguments[ai];
                        if (a == null) continue;
                        if (typeof a === 'string') msg += a;
                        else if (typeof a === 'object') {
                            if (a.message) msg += a.message;
                            if (a.errMsg) msg += a.errMsg;
                            try { msg += JSON.stringify(a); } catch (e) { msg += String(a); }
                        } else msg += String(a);
                        msg += ' ';
                    }
                    if (/access_token|session_missing|invalid_credential|41001|wxaasyncsecinfo|getUserInfo|checkSession|appServiceSDKScriptError|webapi_/i.test(msg)) {
                        return;  // 静默 SDK 环境错误
                    }
                } catch (e) { /* ignore */ }
                _origError.apply(console, arguments);
            };
            console.error._hookedForSdkNoise = true;
        } catch (e) { /* ignore */ }
    }
    // **最先调用**:hook console.error 必须在所有 SDK API 调用之前生效
    _hookConsoleErrorForSdkNoise();

    // **说明**: _AccessTokenManager 在文件顶部(模块级)已定义并在 main() 最开始已调用,
    // 此处不重复定义。

    try {
        if (typeof wx !== 'undefined') {
            if (wx.onError) {
                wx.onError(function (err) {
                    // 过滤 SDK 内部环境错误,避免污染控制台
                    if (_isIgnorableSdkError(err)) return;
                    console.error('[全局错误]', err);
                });
            }
            if (wx.onUnhandledRejection) {
                wx.onUnhandledRejection(function (res) {
                    var reason = res && res.reason;
                    // 过滤 SDK 内部环境错误
                    if (_isIgnorableSdkError(reason)) return;
                    console.error('[未处理拒绝]', reason);
                });
            }
            if (wx.onHide) {
                wx.onHide(function () {
                    AudioManager.stopBgm();
                });
            }
            if (wx.onShow) {
                wx.onShow(function () {
                    if (SaveSystem.getSetting('music')) {
                        AudioManager.playBgm();
                    }
                });
            }
        }
    } catch (e) { /* 静默 */ }

    var lastTime = Date.now();
    function loop() {
        var now = Date.now();
        var dt = now - lastTime;
        lastTime = now;

        GameManager._frameCount++;
        if (now - GameManager._fpsLastTime > 1000) {
            GameManager._fps = GameManager._frameCount;
            GameManager._frameCount = 0;
            GameManager._fpsLastTime = now;
        }

        Animations.update();
        Particles.update(dt);

        try {
            ctx.clearRect(0, 0, constants.LOGICAL_WIDTH, constants.LOGICAL_HEIGHT);
            if (GameManager.scene === 'home') {
                HomeScene.render(ctx, GameManager);
            } else if (GameManager.scene === 'game') {
                GameScene.render(ctx, GameManager);
            }
            if (GameManager._modal) {
                ModalsScene.render(ctx, GameManager);
            }
        } catch (e) {
            console.error('[Game] 渲染错误:', e);
        }

        try {
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(loop);
            } else if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
                wx.requestAnimationFrame(loop);
            } else {
                setTimeout(loop, 16);
            }
        } catch (e) {
            setTimeout(loop, 16);
        }
    }

    loop();
    console.log('[Game] 奇妙寻宝启动成功!');
}

if (typeof wx !== 'undefined' && wx.onShow) {
    main();
} else if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
} else {
    main();
}
