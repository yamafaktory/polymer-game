(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function (process,global){
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $getPrototypeOf = $Object.getPrototypeOf;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var types = {
    void: function voidType() {},
    any: function any() {},
    string: function string() {},
    number: function number() {},
    boolean: function boolean() {}
  };
  var method = nonEnum;
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var symbolInternalProperty = newUniqueString();
  var symbolDescriptionProperty = newUniqueString();
  var symbolDataProperty = newUniqueString();
  var symbolValues = $create(null);
  function isSymbol(symbol) {
    return typeof symbol === 'object' && symbol instanceof SymbolValue;
  }
  function typeOf(v) {
    if (isSymbol(v))
      return 'symbol';
    return typeof v;
  }
  function Symbol(description) {
    var value = new SymbolValue(description);
    if (!(this instanceof Symbol))
      return value;
    throw new TypeError('Symbol cannot be new\'ed');
  }
  $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(Symbol.prototype, 'toString', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    var desc = symbolValue[symbolDescriptionProperty];
    if (desc === undefined)
      desc = '';
    return 'Symbol(' + desc + ')';
  }));
  $defineProperty(Symbol.prototype, 'valueOf', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    return symbolValue;
  }));
  function SymbolValue(description) {
    var key = newUniqueString();
    $defineProperty(this, symbolDataProperty, {value: this});
    $defineProperty(this, symbolInternalProperty, {value: key});
    $defineProperty(this, symbolDescriptionProperty, {value: description});
    $freeze(this);
    symbolValues[key] = this;
  }
  $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(SymbolValue.prototype, 'toString', {
    value: Symbol.prototype.toString,
    enumerable: false
  });
  $defineProperty(SymbolValue.prototype, 'valueOf', {
    value: Symbol.prototype.valueOf,
    enumerable: false
  });
  $freeze(SymbolValue.prototype);
  Symbol.iterator = Symbol();
  function toProperty(name) {
    if (isSymbol(name))
      return name[symbolInternalProperty];
    return name;
  }
  function getOwnPropertyNames(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!symbolValues[name])
        rv.push(name);
    }
    return rv;
  }
  function getOwnPropertyDescriptor(object, name) {
    return $getOwnPropertyDescriptor(object, toProperty(name));
  }
  function getOwnPropertySymbols(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var symbol = symbolValues[names[i]];
      if (symbol)
        rv.push(symbol);
    }
    return rv;
  }
  function hasOwnProperty(name) {
    return $hasOwnProperty.call(this, toProperty(name));
  }
  function getOption(name) {
    return global.traceur && global.traceur.options[name];
  }
  function setProperty(object, name, value) {
    var sym,
        desc;
    if (isSymbol(name)) {
      sym = name;
      name = name[symbolInternalProperty];
    }
    object[name] = value;
    if (sym && (desc = $getOwnPropertyDescriptor(object, name)))
      $defineProperty(object, name, {enumerable: false});
    return value;
  }
  function defineProperty(object, name, descriptor) {
    if (isSymbol(name)) {
      if (descriptor.enumerable) {
        descriptor = $create(descriptor, {enumerable: {value: false}});
      }
      name = name[symbolInternalProperty];
    }
    $defineProperty(object, name, descriptor);
    return object;
  }
  function polyfillObject(Object) {
    $defineProperty(Object, 'defineProperty', {value: defineProperty});
    $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
    $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
    $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
    Object.getOwnPropertySymbols = getOwnPropertySymbols;
    function is(left, right) {
      if (left === right)
        return left !== 0 || 1 / left === 1 / right;
      return left !== left && right !== right;
    }
    $defineProperty(Object, 'is', method(is));
    function assign(target, source) {
      var props = $getOwnPropertyNames(source);
      var p,
          length = props.length;
      for (p = 0; p < length; p++) {
        target[props[p]] = source[props[p]];
      }
      return target;
    }
    $defineProperty(Object, 'assign', method(assign));
    function mixin(target, source) {
      var props = $getOwnPropertyNames(source);
      var p,
          descriptor,
          length = props.length;
      for (p = 0; p < length; p++) {
        descriptor = $getOwnPropertyDescriptor(source, props[p]);
        $defineProperty(target, props[p], descriptor);
      }
      return target;
    }
    $defineProperty(Object, 'mixin', method(mixin));
  }
  function exportStar(object) {
    for (var i = 1; i < arguments.length; i++) {
      var names = $getOwnPropertyNames(arguments[i]);
      for (var j = 0; j < names.length; j++) {
        (function(mod, name) {
          $defineProperty(object, name, {
            get: function() {
              return mod[name];
            },
            enumerable: true
          });
        })(arguments[i], names[j]);
      }
    }
    return object;
  }
  function toObject(value) {
    if (value == null)
      throw $TypeError();
    return $Object(value);
  }
  function spread() {
    var rv = [],
        k = 0;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = toObject(arguments[i]);
      for (var j = 0; j < valueToSpread.length; j++) {
        rv[k++] = valueToSpread[j];
      }
    }
    return rv;
  }
  function getPropertyDescriptor(object, name) {
    while (object !== null) {
      var result = $getOwnPropertyDescriptor(object, name);
      if (result)
        return result;
      object = $getPrototypeOf(object);
    }
    return undefined;
  }
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    if (!proto)
      throw $TypeError('super is null');
    return getPropertyDescriptor(proto, name);
  }
  function superCall(self, homeObject, name, args) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if ('value' in descriptor)
        return descriptor.value.apply(self, args);
      if (descriptor.get)
        return descriptor.get.call(self).apply(self, args);
    }
    throw $TypeError("super has no method '" + name + "'.");
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (descriptor.get)
        return descriptor.get.call(self);
      else if ('value' in descriptor)
        return descriptor.value;
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError("super has no setter '" + name + "'.");
  }
  function getDescriptors(object) {
    var descriptors = {},
        name,
        names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
    }
    if (superClass === null)
      return null;
    throw new TypeError();
  }
  function defaultSuperCall(self, homeObject, args) {
    if ($getPrototypeOf(homeObject) !== null)
      superCall(self, homeObject, 'constructor', args);
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function addIterator(object) {
    return defineProperty(object, Symbol.iterator, nonEnum(function() {
      return this;
    }));
  }
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    }
  };
  function getNextOrThrow(ctx, moveNext, action) {
    return function(x) {
      switch (ctx.GState) {
        case ST_EXECUTING:
          throw new Error(("\"" + action + "\" on executing generator"));
        case ST_CLOSED:
          throw new Error(("\"" + action + "\" on closed generator"));
        case ST_NEWBORN:
          if (action === 'throw') {
            ctx.GState = ST_CLOSED;
            throw x;
          }
          if (x !== undefined)
            throw $TypeError('Sent value to newborn generator');
        case ST_SUSPENDED:
          ctx.GState = ST_EXECUTING;
          ctx.action = action;
          ctx.sent = x;
          var value = moveNext(ctx);
          var done = value === ctx;
          if (done)
            value = ctx.returnValue;
          ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
          return {
            value: value,
            done: done
          };
      }
    };
  }
  function generatorWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    return addIterator({
      next: getNextOrThrow(ctx, moveNext, 'next'),
      throw: getNextOrThrow(ctx, moveNext, 'throw')
    });
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = Object.create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        return;
      case RETHROW_STATE:
        this.reject(this.storedException);
      default:
        this.reject(getInternalError(this.state));
    }
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.createErrback = function(newState) {
      return function(err) {
        ctx.state = newState;
        ctx.err = err;
        moveNext(ctx);
      };
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          ctx.storedException = ex;
          var last = ctx.tryStack_[ctx.tryStack_.length - 1];
          if (!last) {
            ctx.GState = ST_CLOSED;
            ctx.state = END_STATE;
            throw ex;
          }
          ctx.state = last.catch !== undefined ? last.catch : last.finally;
          if (last.finallyFallThrough !== undefined)
            ctx.finallyFallThrough = last.finallyFallThrough;
        }
      }
    };
  }
  function setupGlobals(global) {
    global.Symbol = Symbol;
    polyfillObject(global.Object);
  }
  setupGlobals(global);
  global.$traceurRuntime = {
    asyncWrap: asyncWrap,
    createClass: createClass,
    defaultSuperCall: defaultSuperCall,
    exportStar: exportStar,
    generatorWrap: generatorWrap,
    setProperty: setProperty,
    setupGlobals: setupGlobals,
    spread: spread,
    superCall: superCall,
    superGet: superGet,
    superSet: superSet,
    toObject: toObject,
    toProperty: toProperty,
    type: types,
    typeof: typeOf
  };
})(typeof global !== 'undefined' ? global : this);
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__2 = $traceurRuntime,
      canonicalizeUrl = $__2.canonicalizeUrl,
      resolveUrl = $__2.resolveUrl,
      isAbsolute = $__2.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  var UncoatedModuleEntry = function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  };
  ($traceurRuntime.createClass)(UncoatedModuleEntry, {}, {});
  var UncoatedModuleInstantiator = function UncoatedModuleInstantiator(url, func) {
    $traceurRuntime.superCall(this, $UncoatedModuleInstantiator.prototype, "constructor", [url, null]);
    this.func = func;
  };
  var $UncoatedModuleInstantiator = UncoatedModuleInstantiator;
  ($traceurRuntime.createClass)(UncoatedModuleInstantiator, {getUncoatedModule: function() {
      if (this.value_)
        return this.value_;
      return this.value_ = this.func.call(global);
    }}, {}, UncoatedModuleEntry);
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== "string")
        throw new TypeError("module name must be a string, not " + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length) {
        this.registerModule(name, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: func
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  ModuleStore.set('@traceur/src/runtime/ModuleStore', new Module({ModuleStore: ModuleStore}));
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof global !== 'undefined' ? global : this);
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/utils", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/utils";
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x | 0;
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    }
  };
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator", [], function() {
  "use strict";
  var $__4;
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator";
  var $__5 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/utils"),
      toObject = $__5.toObject,
      toUint32 = $__5.toUint32;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {};
  ($traceurRuntime.createClass)(ArrayIterator, ($__4 = {}, Object.defineProperty($__4, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__4, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__4), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.register("traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap";
  var $__default = function asap(callback, arg) {
    var length = queue.push([callback, arg]);
    if (length === 1) {
      scheduleFlush();
    }
  };
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = [];
  function flush() {
    for (var i = 0; i < queue.length; i++) {
      var tuple = queue[i];
      var callback = tuple[0],
          arg = tuple[1];
      callback(arg);
    }
    queue = [];
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/Promise", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/Promise";
  var async = System.get("traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap").default;
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : (function(x) {
      return x;
    });
    var onReject = arguments[2] !== (void 0) ? arguments[2] : (function(e) {
      throw e;
    });
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 'pending':
        promise.onResolve_.push([deferred, onResolve]);
        promise.onReject_.push([deferred, onReject]);
        break;
      case 'resolved':
        promiseReact(deferred, onResolve, promise.value_);
        break;
      case 'rejected':
        promiseReact(deferred, onReject, promise.value_);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    var result = {};
    result.promise = new C((function(resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    }));
    return result;
  }
  var Promise = function Promise(resolver) {
    var $__6 = this;
    this.status_ = 'pending';
    this.onResolve_ = [];
    this.onReject_ = [];
    resolver((function(x) {
      promiseResolve($__6, x);
    }), (function(r) {
      promiseReject($__6, r);
    }));
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function() {
      var onResolve = arguments[0] !== (void 0) ? arguments[0] : (function(x) {
        return x;
      });
      var onReject = arguments[1];
      var $__6 = this;
      var constructor = this.constructor;
      return chain(this, (function(x) {
        x = promiseCoerce(constructor, x);
        return x === $__6 ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }), onReject);
    }
  }, {
    resolve: function(x) {
      return new this((function(resolve, reject) {
        resolve(x);
      }));
    },
    reject: function(r) {
      return new this((function(resolve, reject) {
        reject(r);
      }));
    },
    cast: function(x) {
      if (x instanceof this)
        return x;
      if (isPromise(x)) {
        var result = getDeferred(this);
        chain(x, result.resolve, result.reject);
        return result.promise;
      }
      return this.resolve(x);
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var count = 0;
      var resolutions = [];
      try {
        for (var i = 0; i < values.length; i++) {
          ++count;
          this.cast(values[i]).then(function(i, x) {
            resolutions[i] = x;
            if (--count === 0)
              deferred.resolve(resolutions);
          }.bind(undefined, i), (function(r) {
            if (count > 0)
              count = 0;
            deferred.reject(r);
          }));
        }
        if (count === 0)
          deferred.resolve(resolutions);
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.cast(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  function promiseResolve(promise, x) {
    promiseDone(promise, 'resolved', x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, 'rejected', r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 'pending')
      return;
    for (var i = 0; i < reactions.length; i++) {
      promiseReact(reactions[i][0], reactions[i][1], value);
    }
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = promise.onReject_ = undefined;
  }
  function promiseReact(deferred, handler, x) {
    async((function() {
      try {
        var y = handler(x);
        if (y === deferred.promise)
          throw new TypeError;
        else if (isPromise(y))
          chain(y, deferred.resolve, deferred.reject);
        else
          deferred.resolve(y);
      } catch (e) {
        deferred.reject(e);
      }
    }));
  }
  var thenableSymbol = '@@thenable';
  function promiseCoerce(constructor, x) {
    if (isPromise(x)) {
      return x;
    } else if (x && typeof x.then === 'function') {
      var p = x[thenableSymbol];
      if (p) {
        return p;
      } else {
        var deferred = getDeferred(constructor);
        x[thenableSymbol] = deferred.promise;
        try {
          x.then(deferred.resolve, deferred.reject);
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }
    } else {
      return x;
    }
  }
  return {get Promise() {
      return Promise;
    }};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/String", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/String";
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function contains(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint() {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get contains() {
      return contains;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    }
  };
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/polyfills", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/polyfills";
  var Promise = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/Promise").Promise;
  var $__9 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/String"),
      codePointAt = $__9.codePointAt,
      contains = $__9.contains,
      endsWith = $__9.endsWith,
      fromCodePoint = $__9.fromCodePoint,
      repeat = $__9.repeat,
      raw = $__9.raw,
      startsWith = $__9.startsWith;
  var $__9 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator"),
      entries = $__9.entries,
      keys = $__9.keys,
      values = $__9.values;
  function maybeDefineMethod(object, name, value) {
    if (!(name in object)) {
      Object.defineProperty(object, name, {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  function polyfillString(String) {
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'contains', contains, 'endsWith', endsWith, 'startsWith', startsWith, 'repeat', repeat]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
  }
  function polyfillArray(Array, Symbol) {
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values]);
    if (Symbol && Symbol.iterator) {
      Object.defineProperty(Array.prototype, Symbol.iterator, {
        value: values,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  function polyfill(global) {
    polyfillPromise(global);
    polyfillString(global.String);
    polyfillArray(global.Array, global.Symbol);
  }
  polyfill(this);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfill(global);
  };
  return {};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfill-import", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfill-import";
  var $__11 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/polyfills");
  return {};
});
System.get("traceur-runtime@0.0.32/src/runtime/polyfill-import" + '');

}).call(this,require("FWaASH"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"FWaASH":1}],3:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/index";
module.exports = require('./src/PathFinding');


},{"./src/PathFinding":6}],4:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":5}],5:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;

  /* 
  Default comparison function to be used
  */


  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };

  /* 
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
  */


  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };

  /*
  Push item onto heap, maintaining the heap invariant.
  */


  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };

  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
  */


  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };

  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be 
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
  */


  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };

  /*
  Fast version of a heappush followed by a heappop.
  */


  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };

  /*
  Transform list into a heap, in-place, in O(array.length) time.
  */


  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };

  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
  */


  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };

  /*
  Find the n largest elements in a dataset.
  */


  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };

  /*
  Find the n smallest elements in a dataset.
  */


  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.remove = Heap.prototype.pop;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = Heap;
  } else {
    window.Heap = Heap;
  }

}).call(this);

},{}],6:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/PathFinding";
module.exports = {
  'Heap': require('heap'),
  'Node': require('./core/Node'),
  'Grid': require('./core/Grid'),
  'Util': require('./core/Util'),
  'Heuristic': require('./core/Heuristic'),
  'AStarFinder': require('./finders/AStarFinder'),
  'BestFirstFinder': require('./finders/BestFirstFinder'),
  'BreadthFirstFinder': require('./finders/BreadthFirstFinder'),
  'DijkstraFinder': require('./finders/DijkstraFinder'),
  'BiAStarFinder': require('./finders/BiAStarFinder'),
  'BiBestFirstFinder': require('./finders/BiBestFirstFinder'),
  'BiBreadthFirstFinder': require('./finders/BiBreadthFirstFinder'),
  'BiDijkstraFinder': require('./finders/BiDijkstraFinder'),
  'JumpPointFinder': require('./finders/JumpPointFinder'),
  'IDAStarFinder': require('./finders/IDAStarFinder')
};


},{"./core/Grid":7,"./core/Heuristic":8,"./core/Node":9,"./core/Util":10,"./finders/AStarFinder":11,"./finders/BestFirstFinder":12,"./finders/BiAStarFinder":13,"./finders/BiBestFirstFinder":14,"./finders/BiBreadthFirstFinder":15,"./finders/BiDijkstraFinder":16,"./finders/BreadthFirstFinder":17,"./finders/DijkstraFinder":18,"./finders/IDAStarFinder":19,"./finders/JumpPointFinder":20,"heap":4}],7:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Grid";
var Node = require('./Node');
function Grid(width, height, matrix) {
  this.width = width;
  this.height = height;
  this.nodes = this._buildNodes(width, height, matrix);
}
Grid.prototype._buildNodes = function(width, height, matrix) {
  var i,
      j,
      nodes = new Array(height),
      row;
  for (i = 0; i < height; ++i) {
    nodes[i] = new Array(width);
    for (j = 0; j < width; ++j) {
      nodes[i][j] = new Node(j, i);
    }
  }
  if (matrix === undefined) {
    return nodes;
  }
  if (matrix.length !== height || matrix[0].length !== width) {
    throw new Error('Matrix size does not fit');
  }
  for (i = 0; i < height; ++i) {
    for (j = 0; j < width; ++j) {
      if (matrix[i][j]) {
        nodes[i][j].walkable = false;
      }
    }
  }
  return nodes;
};
Grid.prototype.getNodeAt = function(x, y) {
  return this.nodes[y][x];
};
Grid.prototype.isWalkableAt = function(x, y) {
  return this.isInside(x, y) && this.nodes[y][x].walkable;
};
Grid.prototype.isInside = function(x, y) {
  return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};
Grid.prototype.setWalkableAt = function(x, y, walkable) {
  this.nodes[y][x].walkable = walkable;
};
Grid.prototype.getNeighbors = function(node, allowDiagonal, dontCrossCorners) {
  var x = node.x,
      y = node.y,
      neighbors = [],
      s0 = false,
      d0 = false,
      s1 = false,
      d1 = false,
      s2 = false,
      d2 = false,
      s3 = false,
      d3 = false,
      nodes = this.nodes;
  if (this.isWalkableAt(x, y - 1)) {
    neighbors.push(nodes[y - 1][x]);
    s0 = true;
  }
  if (this.isWalkableAt(x + 1, y)) {
    neighbors.push(nodes[y][x + 1]);
    s1 = true;
  }
  if (this.isWalkableAt(x, y + 1)) {
    neighbors.push(nodes[y + 1][x]);
    s2 = true;
  }
  if (this.isWalkableAt(x - 1, y)) {
    neighbors.push(nodes[y][x - 1]);
    s3 = true;
  }
  if (!allowDiagonal) {
    return neighbors;
  }
  if (dontCrossCorners) {
    d0 = s3 && s0;
    d1 = s0 && s1;
    d2 = s1 && s2;
    d3 = s2 && s3;
  } else {
    d0 = s3 || s0;
    d1 = s0 || s1;
    d2 = s1 || s2;
    d3 = s2 || s3;
  }
  if (d0 && this.isWalkableAt(x - 1, y - 1)) {
    neighbors.push(nodes[y - 1][x - 1]);
  }
  if (d1 && this.isWalkableAt(x + 1, y - 1)) {
    neighbors.push(nodes[y - 1][x + 1]);
  }
  if (d2 && this.isWalkableAt(x + 1, y + 1)) {
    neighbors.push(nodes[y + 1][x + 1]);
  }
  if (d3 && this.isWalkableAt(x - 1, y + 1)) {
    neighbors.push(nodes[y + 1][x - 1]);
  }
  return neighbors;
};
Grid.prototype.clone = function() {
  var i,
      j,
      width = this.width,
      height = this.height,
      thisNodes = this.nodes,
      newGrid = new Grid(width, height),
      newNodes = new Array(height),
      row;
  for (i = 0; i < height; ++i) {
    newNodes[i] = new Array(width);
    for (j = 0; j < width; ++j) {
      newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
    }
  }
  newGrid.nodes = newNodes;
  return newGrid;
};
module.exports = Grid;


},{"./Node":9}],8:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Heuristic";
module.exports = {
  manhattan: function(dx, dy) {
    return dx + dy;
  },
  euclidean: function(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
  },
  chebyshev: function(dx, dy) {
    return Math.max(dx, dy);
  }
};


},{}],9:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Node";
function Node(x, y, walkable) {
  this.x = x;
  this.y = y;
  this.walkable = (walkable === undefined ? true : walkable);
}
;
module.exports = Node;


},{}],10:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Util";
function backtrace(node) {
  var path = [[node.x, node.y]];
  while (node.parent) {
    node = node.parent;
    path.push([node.x, node.y]);
  }
  return path.reverse();
}
exports.backtrace = backtrace;
function biBacktrace(nodeA, nodeB) {
  var pathA = backtrace(nodeA),
      pathB = backtrace(nodeB);
  return pathA.concat(pathB.reverse());
}
exports.biBacktrace = biBacktrace;
function pathLength(path) {
  var i,
      sum = 0,
      a,
      b,
      dx,
      dy;
  for (i = 1; i < path.length; ++i) {
    a = path[i - 1];
    b = path[i];
    dx = a[0] - b[0];
    dy = a[1] - b[1];
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum;
}
exports.pathLength = pathLength;
function interpolate(x0, y0, x1, y1) {
  var abs = Math.abs,
      line = [],
      sx,
      sy,
      dx,
      dy,
      err,
      e2;
  dx = abs(x1 - x0);
  dy = abs(y1 - y0);
  sx = (x0 < x1) ? 1 : -1;
  sy = (y0 < y1) ? 1 : -1;
  err = dx - dy;
  while (true) {
    line.push([x0, y0]);
    if (x0 === x1 && y0 === y1) {
      break;
    }
    e2 = 2 * err;
    if (e2 > -dy) {
      err = err - dy;
      x0 = x0 + sx;
    }
    if (e2 < dx) {
      err = err + dx;
      y0 = y0 + sy;
    }
  }
  return line;
}
exports.interpolate = interpolate;
function expandPath(path) {
  var expanded = [],
      len = path.length,
      coord0,
      coord1,
      interpolated,
      interpolatedLen,
      i,
      j;
  if (len < 2) {
    return expanded;
  }
  for (i = 0; i < len - 1; ++i) {
    coord0 = path[i];
    coord1 = path[i + 1];
    interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
    interpolatedLen = interpolated.length;
    for (j = 0; j < interpolatedLen - 1; ++j) {
      expanded.push(interpolated[j]);
    }
  }
  expanded.push(path[len - 1]);
  return expanded;
}
exports.expandPath = expandPath;
function smoothenPath(grid, path) {
  var len = path.length,
      x0 = path[0][0],
      y0 = path[0][1],
      x1 = path[len - 1][0],
      y1 = path[len - 1][1],
      sx,
      sy,
      ex,
      ey,
      lx,
      ly,
      newPath,
      i,
      j,
      coord,
      line,
      testCoord,
      blocked;
  sx = x0;
  sy = y0;
  lx = path[1][0];
  ly = path[1][1];
  newPath = [[sx, sy]];
  for (i = 2; i < len; ++i) {
    coord = path[i];
    ex = coord[0];
    ey = coord[1];
    line = interpolate(sx, sy, ex, ey);
    blocked = false;
    for (j = 1; j < line.length; ++j) {
      testCoord = line[j];
      if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
        blocked = true;
        newPath.push([lx, ly]);
        sx = lx;
        sy = ly;
        break;
      }
    }
    if (!blocked) {
      lx = ex;
      ly = ey;
    }
  }
  newPath.push([x1, y1]);
  return newPath;
}
exports.smoothenPath = smoothenPath;


},{}],11:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/AStarFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function AStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
}
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = new Heap(function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  }),
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      heuristic = this.heuristic,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      weight = this.weight,
      abs = Math.abs,
      SQRT2 = Math.SQRT2,
      node,
      neighbors,
      neighbor,
      i,
      l,
      x,
      y,
      ng;
  startNode.g = 0;
  startNode.f = 0;
  openList.push(startNode);
  startNode.opened = true;
  while (!openList.empty()) {
    node = openList.pop();
    node.closed = true;
    if (node === endNode) {
      return Util.backtrace(endNode);
    }
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          openList.push(neighbor);
          neighbor.opened = true;
        } else {
          openList.updateItem(neighbor);
        }
      }
    }
  }
  return [];
};
module.exports = AStarFinder;


},{"../core/Heuristic":8,"../core/Util":10,"heap":4}],12:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BestFirstFinder";
var AStarFinder = require('./AStarFinder');
function BestFirstFinder(opt) {
  AStarFinder.call(this, opt);
  var orig = this.heuristic;
  this.heuristic = function(dx, dy) {
    return orig(dx, dy) * 1000000;
  };
}
;
BestFirstFinder.prototype = new AStarFinder();
BestFirstFinder.prototype.constructor = BestFirstFinder;
module.exports = BestFirstFinder;


},{"./AStarFinder":11}],13:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiAStarFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function BiAStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
}
BiAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var cmp = function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  },
      startOpenList = new Heap(cmp),
      endOpenList = new Heap(cmp),
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      heuristic = this.heuristic,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      weight = this.weight,
      abs = Math.abs,
      SQRT2 = Math.SQRT2,
      node,
      neighbors,
      neighbor,
      i,
      l,
      x,
      y,
      ng,
      BY_START = 1,
      BY_END = 2;
  startNode.g = 0;
  startNode.f = 0;
  startOpenList.push(startNode);
  startNode.opened = BY_START;
  endNode.g = 0;
  endNode.f = 0;
  endOpenList.push(endNode);
  endNode.opened = BY_END;
  while (!startOpenList.empty() && !endOpenList.empty()) {
    node = startOpenList.pop();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened === BY_END) {
        return Util.biBacktrace(node, neighbor);
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          startOpenList.push(neighbor);
          neighbor.opened = BY_START;
        } else {
          startOpenList.updateItem(neighbor);
        }
      }
    }
    node = endOpenList.pop();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened === BY_START) {
        return Util.biBacktrace(neighbor, node);
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - startX), abs(y - startY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          endOpenList.push(neighbor);
          neighbor.opened = BY_END;
        } else {
          endOpenList.updateItem(neighbor);
        }
      }
    }
  }
  return [];
};
module.exports = BiAStarFinder;


},{"../core/Heuristic":8,"../core/Util":10,"heap":4}],14:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiBestFirstFinder";
var BiAStarFinder = require('./BiAStarFinder');
function BiBestFirstFinder(opt) {
  BiAStarFinder.call(this, opt);
  var orig = this.heuristic;
  this.heuristic = function(dx, dy) {
    return orig(dx, dy) * 1000000;
  };
}
BiBestFirstFinder.prototype = new BiAStarFinder();
BiBestFirstFinder.prototype.constructor = BiBestFirstFinder;
module.exports = BiBestFirstFinder;


},{"./BiAStarFinder":13}],15:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiBreadthFirstFinder";
var Util = require('../core/Util');
function BiBreadthFirstFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
}
BiBreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      startOpenList = [],
      endOpenList = [],
      neighbors,
      neighbor,
      node,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      BY_START = 0,
      BY_END = 1,
      i,
      l;
  startOpenList.push(startNode);
  startNode.opened = true;
  startNode.by = BY_START;
  endOpenList.push(endNode);
  endNode.opened = true;
  endNode.by = BY_END;
  while (startOpenList.length && endOpenList.length) {
    node = startOpenList.shift();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened) {
        if (neighbor.by === BY_END) {
          return Util.biBacktrace(node, neighbor);
        }
        continue;
      }
      startOpenList.push(neighbor);
      neighbor.parent = node;
      neighbor.opened = true;
      neighbor.by = BY_START;
    }
    node = endOpenList.shift();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened) {
        if (neighbor.by === BY_START) {
          return Util.biBacktrace(neighbor, node);
        }
        continue;
      }
      endOpenList.push(neighbor);
      neighbor.parent = node;
      neighbor.opened = true;
      neighbor.by = BY_END;
    }
  }
  return [];
};
module.exports = BiBreadthFirstFinder;


},{"../core/Util":10}],16:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiDijkstraFinder";
var BiAStarFinder = require('./BiAStarFinder');
function BiDijkstraFinder(opt) {
  BiAStarFinder.call(this, opt);
  this.heuristic = function(dx, dy) {
    return 0;
  };
}
BiDijkstraFinder.prototype = new BiAStarFinder();
BiDijkstraFinder.prototype.constructor = BiDijkstraFinder;
module.exports = BiDijkstraFinder;


},{"./BiAStarFinder":13}],17:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BreadthFirstFinder";
var Util = require('../core/Util');
function BreadthFirstFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
}
BreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = [],
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      neighbors,
      neighbor,
      node,
      i,
      l;
  openList.push(startNode);
  startNode.opened = true;
  while (openList.length) {
    node = openList.shift();
    node.closed = true;
    if (node === endNode) {
      return Util.backtrace(endNode);
    }
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed || neighbor.opened) {
        continue;
      }
      openList.push(neighbor);
      neighbor.opened = true;
      neighbor.parent = node;
    }
  }
  return [];
};
module.exports = BreadthFirstFinder;


},{"../core/Util":10}],18:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/DijkstraFinder";
var AStarFinder = require('./AStarFinder');
function DijkstraFinder(opt) {
  AStarFinder.call(this, opt);
  this.heuristic = function(dx, dy) {
    return 0;
  };
}
DijkstraFinder.prototype = new AStarFinder();
DijkstraFinder.prototype.constructor = DijkstraFinder;
module.exports = DijkstraFinder;


},{"./AStarFinder":11}],19:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/IDAStarFinder";
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
var Node = require('../core/Node');
function IDAStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
  this.trackRecursion = opt.trackRecursion || false;
  this.timeLimit = opt.timeLimit || Infinity;
}
IDAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var nodesVisited = 0;
  var startTime = new Date().getTime();
  var h = function(a, b) {
    return this.heuristic(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  }.bind(this);
  var cost = function(a, b) {
    return (a.x === b.x || a.y === b.y) ? 1 : Math.SQRT2;
  };
  var search = function(node, g, cutoff, route, depth) {
    nodesVisited++;
    if (this.timeLimit > 0 && new Date().getTime() - startTime > this.timeLimit * 1000) {
      return Infinity;
    }
    var f = g + h(node, end) * this.weight;
    if (f > cutoff) {
      return f;
    }
    if (node == end) {
      route[depth] = [node.x, node.y];
      return node;
    }
    var min,
        t,
        k,
        neighbour;
    var neighbours = grid.getNeighbors(node, this.allowDiagonal, this.dontCrossCorners);
    for (k = 0, min = Infinity; neighbour = neighbours[k]; ++k) {
      if (this.trackRecursion) {
        neighbour.retainCount = neighbour.retainCount + 1 || 1;
        if (neighbour.tested !== true) {
          neighbour.tested = true;
        }
      }
      t = search(neighbour, g + cost(node, neighbour), cutoff, route, depth + 1);
      if (t instanceof Node) {
        route[depth] = [node.x, node.y];
        return t;
      }
      if (this.trackRecursion && (--neighbour.retainCount) === 0) {
        neighbour.tested = false;
      }
      if (t < min) {
        min = t;
      }
    }
    return min;
  }.bind(this);
  var start = grid.getNodeAt(startX, startY);
  var end = grid.getNodeAt(endX, endY);
  var cutOff = h(start, end);
  var j,
      route,
      t;
  for (j = 0; true; ++j) {
    route = [];
    t = search(start, 0, cutOff, route, 0);
    if (t === Infinity) {
      return [];
    }
    if (t instanceof Node) {
      return route;
    }
    cutOff = t;
  }
  return [];
};
module.exports = IDAStarFinder;


},{"../core/Heuristic":8,"../core/Node":9,"../core/Util":10}],20:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/JumpPointFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function JumpPointFinder(opt) {
  opt = opt || {};
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.trackJumpRecursion = opt.trackJumpRecursion || false;
}
JumpPointFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = this.openList = new Heap(function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  }),
      startNode = this.startNode = grid.getNodeAt(startX, startY),
      endNode = this.endNode = grid.getNodeAt(endX, endY),
      node;
  this.grid = grid;
  startNode.g = 0;
  startNode.f = 0;
  openList.push(startNode);
  startNode.opened = true;
  while (!openList.empty()) {
    node = openList.pop();
    node.closed = true;
    if (node === endNode) {
      return Util.expandPath(Util.backtrace(endNode));
    }
    this._identifySuccessors(node);
  }
  return [];
};
JumpPointFinder.prototype._identifySuccessors = function(node) {
  var grid = this.grid,
      heuristic = this.heuristic,
      openList = this.openList,
      endX = this.endNode.x,
      endY = this.endNode.y,
      neighbors,
      neighbor,
      jumpPoint,
      i,
      l,
      x = node.x,
      y = node.y,
      jx,
      jy,
      dx,
      dy,
      d,
      ng,
      jumpNode,
      abs = Math.abs,
      max = Math.max;
  neighbors = this._findNeighbors(node);
  for (i = 0, l = neighbors.length; i < l; ++i) {
    neighbor = neighbors[i];
    jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
    if (jumpPoint) {
      jx = jumpPoint[0];
      jy = jumpPoint[1];
      jumpNode = grid.getNodeAt(jx, jy);
      if (jumpNode.closed) {
        continue;
      }
      d = Heuristic.euclidean(abs(jx - x), abs(jy - y));
      ng = node.g + d;
      if (!jumpNode.opened || ng < jumpNode.g) {
        jumpNode.g = ng;
        jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
        jumpNode.f = jumpNode.g + jumpNode.h;
        jumpNode.parent = node;
        if (!jumpNode.opened) {
          openList.push(jumpNode);
          jumpNode.opened = true;
        } else {
          openList.updateItem(jumpNode);
        }
      }
    }
  }
};
JumpPointFinder.prototype._jump = function(x, y, px, py) {
  var grid = this.grid,
      dx = x - px,
      dy = y - py,
      jx,
      jy;
  if (!grid.isWalkableAt(x, y)) {
    return null;
  }
  if (this.trackJumpRecursion === true) {
    grid.getNodeAt(x, y).tested = true;
  }
  if (grid.getNodeAt(x, y) === this.endNode) {
    return [x, y];
  }
  if (dx !== 0 && dy !== 0) {
    if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) || (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
      return [x, y];
    }
  } else {
    if (dx !== 0) {
      if ((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) || (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
        return [x, y];
      }
    } else {
      if ((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) || (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
        return [x, y];
      }
    }
  }
  if (dx !== 0 && dy !== 0) {
    jx = this._jump(x + dx, y, x, y);
    jy = this._jump(x, y + dy, x, y);
    if (jx || jy) {
      return [x, y];
    }
  }
  if (grid.isWalkableAt(x + dx, y) || grid.isWalkableAt(x, y + dy)) {
    return this._jump(x + dx, y + dy, x, y);
  } else {
    return null;
  }
};
JumpPointFinder.prototype._findNeighbors = function(node) {
  var parent = node.parent,
      x = node.x,
      y = node.y,
      grid = this.grid,
      px,
      py,
      nx,
      ny,
      dx,
      dy,
      neighbors = [],
      neighborNodes,
      neighborNode,
      i,
      l;
  if (parent) {
    px = parent.x;
    py = parent.y;
    dx = (x - px) / Math.max(Math.abs(x - px), 1);
    dy = (y - py) / Math.max(Math.abs(y - py), 1);
    if (dx !== 0 && dy !== 0) {
      if (grid.isWalkableAt(x, y + dy)) {
        neighbors.push([x, y + dy]);
      }
      if (grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y]);
      }
      if (grid.isWalkableAt(x, y + dy) || grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y + dy]);
      }
      if (!grid.isWalkableAt(x - dx, y) && grid.isWalkableAt(x, y + dy)) {
        neighbors.push([x - dx, y + dy]);
      }
      if (!grid.isWalkableAt(x, y - dy) && grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y - dy]);
      }
    } else {
      if (dx === 0) {
        if (grid.isWalkableAt(x, y + dy)) {
          if (grid.isWalkableAt(x, y + dy)) {
            neighbors.push([x, y + dy]);
          }
          if (!grid.isWalkableAt(x + 1, y)) {
            neighbors.push([x + 1, y + dy]);
          }
          if (!grid.isWalkableAt(x - 1, y)) {
            neighbors.push([x - 1, y + dy]);
          }
        }
      } else {
        if (grid.isWalkableAt(x + dx, y)) {
          if (grid.isWalkableAt(x + dx, y)) {
            neighbors.push([x + dx, y]);
          }
          if (!grid.isWalkableAt(x, y + 1)) {
            neighbors.push([x + dx, y + 1]);
          }
          if (!grid.isWalkableAt(x, y - 1)) {
            neighbors.push([x + dx, y - 1]);
          }
        }
      }
    }
  } else {
    neighborNodes = grid.getNeighbors(node, true);
    for (i = 0, l = neighborNodes.length; i < l; ++i) {
      neighborNode = neighborNodes[i];
      neighbors.push([neighborNode.x, neighborNode.y]);
    }
  }
  return neighbors;
};
module.exports = JumpPointFinder;


},{"../core/Heuristic":8,"../core/Util":10,"heap":4}],21:[function(require,module,exports){
"use strict";
var __moduleName = "src/js/game";
var pathFinding = require('pathfinding');
var World = require('./world').World;
var polyworld = new World();
polyworld.toBinaryMatrix();
window.addEventListener('polymer-ready', (function(event) {
  var gameStage = document.querySelector('game-stage');
  gameStage.pathFinding = pathFinding;
  gameStage.world = polyworld.map;
  gameStage.binaryMap = polyworld.binaryMap;
}));


},{"./world":22,"pathfinding":3}],22:[function(require,module,exports){
"use strict";
var __moduleName = "src/js/world";
var World = function World(map) {
  this.map = [[0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0, 3, 0, 4, 0, 3, 5, 0, 3, 0, 0, 0], [0, 0, 0, 0, 0, 4, 2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 3, 0, 3, 1, 1, 0, 4, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  this.crossableSprites = [0, 3];
};
($traceurRuntime.createClass)(World, {
  isCrossable: function(type) {
    return this.crossableSprites.indexOf(type) !== -1 ? true : false;
  },
  toBinaryMatrix: function() {
    var $__0 = this;
    this.binaryMap = [];
    var toBinary = (function(value) {
      return $__0.isCrossable(value) ? 0 : 1;
    });
    this.map.forEach((function(row) {
      return $__0.binaryMap.push(row.map(toBinary));
    }));
  }
}, {});
module.exports = {
  get World() {
    return World;
  },
  __esModule: true
};


},{}]},{},[2,21])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9lczZpZnkvbm9kZV9tb2R1bGVzL3RyYWNldXIvYmluL3RyYWNldXItcnVudGltZS5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvbm9kZV9tb2R1bGVzL2hlYXAvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9ub2RlX21vZHVsZXMvaGVhcC9saWIvaGVhcC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9QYXRoRmluZGluZy5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9jb3JlL0dyaWQuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvY29yZS9IZXVyaXN0aWMuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvY29yZS9Ob2RlLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2NvcmUvVXRpbC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0FTdGFyRmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQmVzdEZpcnN0RmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQmlBU3RhckZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0JpQmVzdEZpcnN0RmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQmlCcmVhZHRoRmlyc3RGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CaURpamtzdHJhRmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQnJlYWR0aEZpcnN0RmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvRGlqa3N0cmFGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9JREFTdGFyRmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvSnVtcFBvaW50RmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9zcmMvanMvZ2FtZS5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvc3JjL2pzL3dvcmxkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXpDQTs7QUFBQSxDQUFBLEtBQU0sUUFBUSxFQUFHLENBQUEsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Q0FDOUM7OztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUEsWUFBUyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUEsS0FBRSxFQUFHLEtBQUksQ0FBQztHQUNiO0FBRUQsQ0FGQyxLQUVHLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUUsRUFBQyxDQUFDLENBQUU7QUFDN0IsQ0FBQSxZQUFTLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQSxLQUFFLEVBQUcsS0FBSSxDQUFDO0dBQ2I7QUFFRCxDQUZDLEtBRUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFFO0FBQzdCLENBQUEsWUFBUyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUEsS0FBRSxFQUFHLEtBQUksQ0FBQztHQUNiO0FBRUQsQ0FGQyxLQUVHLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUUsRUFBQyxDQUFDLENBQUU7QUFDN0IsQ0FBQSxZQUFTLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQSxLQUFFLEVBQUcsS0FBSSxDQUFDO0dBQ2I7QUFFRCxDQUZDLEtBRUcsQ0FBQyxhQUFhLENBQUU7Q0FDaEIsU0FBTyxVQUFTLENBQUM7R0FDcEI7QUFFRCxDQUZDLEtBRUcsZ0JBQWdCLENBQUU7QUFDbEIsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0dBQ2pCLEtBQU07QUFDSCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7R0FDakI7QUFHRCxDQUhDLEtBR0csRUFBRSxHQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBRTtBQUN2QyxDQUFBLFlBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7R0FDdkM7QUFFRCxDQUZDLEtBRUcsRUFBRSxHQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBRTtBQUN2QyxDQUFBLFlBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7R0FDdkM7QUFFRCxDQUZDLEtBRUcsRUFBRSxHQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBRTtBQUN2QyxDQUFBLFlBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7R0FDdkM7QUFFRCxDQUZDLEtBRUcsRUFBRSxHQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBRTtBQUN2QyxD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Q0FBRSxFQUFDLENBQUMsQ0FBRTtBQUM5RCxDQUFBLGdCQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRyxHQUFFLENBQUUsQ0FBQSxDQUFDLEVBQUcsR0FBRSxDQUFDLENBQUMsQ0FBQztPQUNwQztBQUNELENBREMsU0FDRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRyxHQUFFLENBQUUsRUFBQyxDQUFDLENBQUEsRUFBSSxDQUFBLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxHQUFFLENBQUMsQ0FBRTtBQUMvRCxDQUFBLGdCQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRyxHQUFFLENBQUUsQ0FBQSxDQUFDLEVBQUcsR0FBRSxDQUFDLENBQUMsQ0FBQztPQUNwQztBQUNELENBREMsU0FDRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxHQUFFLENBQUMsQ0FBQSxFQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEdBQUUsQ0FBRSxFQUFDLENBQUMsQ0FBRTtBQUMvRCxDQUFBLGdCQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRyxHQUFFLENBQUUsQ0FBQSxDQUFDLEVBQUcsR0FBRSxDQUFDLENBQUMsQ0FBQztPQUNwQztDQUFBLElBQ0osS0FFSTtDQUNELFNBQUcsRUFBRSxJQUFLLEVBQUMsQ0FBRTtDQUNULFdBQUksSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEdBQUUsQ0FBQyxDQUFFO0NBQzlCLGFBQUksSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEdBQUUsQ0FBQyxDQUFFO0FBQzlCLENBQUEsb0JBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEdBQUUsQ0FBQyxDQUFDLENBQUM7V0FDL0I7QUFDRCxDQURDLGFBQ0csQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUFFO0FB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QUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzdELENBQUM7QUFFRixDQUFBLEtBQUksaUJBQWlCLEVBQUcsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFDLENBQUM7Q0FDaEM7O0NBR0QsWUFBVyxDQUFYLFVBQVksSUFBSSxDQUFFO0NBQ2hCLFNBQU8sQ0FBQSxJQUFJLGlCQUFpQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsR0FBSyxFQUFDLENBQUMsQ0FBQSxDQUFHLEtBQUksRUFBRyxNQUFLLENBQUM7R0FDbEU7Q0FHRCxlQUFjLENBQWQsVUFBZTs7QUFDYixDQUFBLE9BQUksVUFBVSxFQUFHLEdBQUUsQ0FBQztBQUNoQixDQUFKLE1BQUksQ0FBQSxRQUFRLGFBQUcsS0FBSztZQUFJLENBQUEsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBRyxFQUFDLEVBQUcsRUFBQztNQUFBLENBQUM7QUFDeEQsQ0FBQSxPQUFJLElBQUksUUFBUSxXQUFDLEdBQUc7WUFBSSxDQUFBLGNBQWMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQUMsQ0FBQztHQUNqRTs7Ozs7Ozs7Q0FHSCIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBpZiAoZ2xvYmFsLiR0cmFjZXVyUnVudGltZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIHZhciAkY3JlYXRlID0gJE9iamVjdC5jcmVhdGU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICRPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbiAgdmFyICRkZWZpbmVQcm9wZXJ0eSA9ICRPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkZnJlZXplID0gJE9iamVjdC5mcmVlemU7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgdmFyICRnZXRQcm90b3R5cGVPZiA9ICRPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG4gIHZhciAkaGFzT3duUHJvcGVydHkgPSAkT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyICR0b1N0cmluZyA9ICRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBub25FbnVtKHZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9O1xuICB9XG4gIHZhciB0eXBlcyA9IHtcbiAgICB2b2lkOiBmdW5jdGlvbiB2b2lkVHlwZSgpIHt9LFxuICAgIGFueTogZnVuY3Rpb24gYW55KCkge30sXG4gICAgc3RyaW5nOiBmdW5jdGlvbiBzdHJpbmcoKSB7fSxcbiAgICBudW1iZXI6IGZ1bmN0aW9uIG51bWJlcigpIHt9LFxuICAgIGJvb2xlYW46IGZ1bmN0aW9uIGJvb2xlYW4oKSB7fVxuICB9O1xuICB2YXIgbWV0aG9kID0gbm9uRW51bTtcbiAgdmFyIGNvdW50ZXIgPSAwO1xuICBmdW5jdGlvbiBuZXdVbmlxdWVTdHJpbmcoKSB7XG4gICAgcmV0dXJuICdfXyQnICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU5KSArICckJyArICsrY291bnRlciArICckX18nO1xuICB9XG4gIHZhciBzeW1ib2xJbnRlcm5hbFByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEYXRhUHJvcGVydHkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgdmFyIHN5bWJvbFZhbHVlcyA9ICRjcmVhdGUobnVsbCk7XG4gIGZ1bmN0aW9uIGlzU3ltYm9sKHN5bWJvbCkge1xuICAgIHJldHVybiB0eXBlb2Ygc3ltYm9sID09PSAnb2JqZWN0JyAmJiBzeW1ib2wgaW5zdGFuY2VvZiBTeW1ib2xWYWx1ZTtcbiAgfVxuICBmdW5jdGlvbiB0eXBlT2Yodikge1xuICAgIGlmIChpc1N5bWJvbCh2KSlcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICByZXR1cm4gdHlwZW9mIHY7XG4gIH1cbiAgZnVuY3Rpb24gU3ltYm9sKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHZhbHVlID0gbmV3IFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKTtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSlcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTeW1ib2wgY2Fubm90IGJlIG5ld1xcJ2VkJyk7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndG9TdHJpbmcnLCBtZXRob2QoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN5bWJvbFZhbHVlID0gdGhpc1tzeW1ib2xEYXRhUHJvcGVydHldO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICB2YXIgZGVzYyA9IHN5bWJvbFZhbHVlW3N5bWJvbERlc2NyaXB0aW9uUHJvcGVydHldO1xuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpXG4gICAgICBkZXNjID0gJyc7XG4gICAgcmV0dXJuICdTeW1ib2woJyArIGRlc2MgKyAnKSc7XG4gIH0pKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICd2YWx1ZU9mJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIXN5bWJvbFZhbHVlKVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdDb252ZXJzaW9uIGZyb20gc3ltYm9sIHRvIHN0cmluZycpO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIHN5bWJvbFZhbHVlO1xuICB9KSk7XG4gIGZ1bmN0aW9uIFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGtleSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEYXRhUHJvcGVydHksIHt2YWx1ZTogdGhpc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xJbnRlcm5hbFByb3BlcnR5LCB7dmFsdWU6IGtleX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5LCB7dmFsdWU6IGRlc2NyaXB0aW9ufSk7XG4gICAgJGZyZWV6ZSh0aGlzKTtcbiAgICBzeW1ib2xWYWx1ZXNba2V5XSA9IHRoaXM7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShTeW1ib2wpKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywge1xuICAgIHZhbHVlOiBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAndmFsdWVPZicsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS52YWx1ZU9mLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICAkZnJlZXplKFN5bWJvbFZhbHVlLnByb3RvdHlwZSk7XG4gIFN5bWJvbC5pdGVyYXRvciA9IFN5bWJvbCgpO1xuICBmdW5jdGlvbiB0b1Byb3BlcnR5KG5hbWUpIHtcbiAgICBpZiAoaXNTeW1ib2wobmFtZSkpXG4gICAgICByZXR1cm4gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkge1xuICAgIHZhciBydiA9IFtdO1xuICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIGlmICghc3ltYm9sVmFsdWVzW25hbWVdKVxuICAgICAgICBydi5wdXNoKG5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSkge1xuICAgIHJldHVybiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgdG9Qcm9wZXJ0eShuYW1lKSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCkge1xuICAgIHZhciBydiA9IFtdO1xuICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHN5bWJvbCA9IHN5bWJvbFZhbHVlc1tuYW1lc1tpXV07XG4gICAgICBpZiAoc3ltYm9sKVxuICAgICAgICBydi5wdXNoKHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShuYW1lKSB7XG4gICAgcmV0dXJuICRoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldE9wdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIGdsb2JhbC50cmFjZXVyICYmIGdsb2JhbC50cmFjZXVyLm9wdGlvbnNbbmFtZV07XG4gIH1cbiAgZnVuY3Rpb24gc2V0UHJvcGVydHkob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIHZhciBzeW0sXG4gICAgICAgIGRlc2M7XG4gICAgaWYgKGlzU3ltYm9sKG5hbWUpKSB7XG4gICAgICBzeW0gPSBuYW1lO1xuICAgICAgbmFtZSA9IG5hbWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgfVxuICAgIG9iamVjdFtuYW1lXSA9IHZhbHVlO1xuICAgIGlmIChzeW0gJiYgKGRlc2MgPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSkpKVxuICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge2VudW1lcmFibGU6IGZhbHNlfSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcikge1xuICAgIGlmIChpc1N5bWJvbChuYW1lKSkge1xuICAgICAgaWYgKGRlc2NyaXB0b3IuZW51bWVyYWJsZSkge1xuICAgICAgICBkZXNjcmlwdG9yID0gJGNyZWF0ZShkZXNjcmlwdG9yLCB7ZW51bWVyYWJsZToge3ZhbHVlOiBmYWxzZX19KTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBkZXNjcmlwdG9yKTtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsT2JqZWN0KE9iamVjdCkge1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdkZWZpbmVQcm9wZXJ0eScsIHt2YWx1ZTogZGVmaW5lUHJvcGVydHl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlOYW1lcycsIHt2YWx1ZTogZ2V0T3duUHJvcGVydHlOYW1lc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3InLCB7dmFsdWU6IGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnaGFzT3duUHJvcGVydHknLCB7dmFsdWU6IGhhc093blByb3BlcnR5fSk7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scztcbiAgICBmdW5jdGlvbiBpcyhsZWZ0LCByaWdodCkge1xuICAgICAgaWYgKGxlZnQgPT09IHJpZ2h0KVxuICAgICAgICByZXR1cm4gbGVmdCAhPT0gMCB8fCAxIC8gbGVmdCA9PT0gMSAvIHJpZ2h0O1xuICAgICAgcmV0dXJuIGxlZnQgIT09IGxlZnQgJiYgcmlnaHQgIT09IHJpZ2h0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnaXMnLCBtZXRob2QoaXMpKTtcbiAgICBmdW5jdGlvbiBhc3NpZ24odGFyZ2V0LCBzb3VyY2UpIHtcbiAgICAgIHZhciBwcm9wcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSk7XG4gICAgICB2YXIgcCxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgICBmb3IgKHAgPSAwOyBwIDwgbGVuZ3RoOyBwKyspIHtcbiAgICAgICAgdGFyZ2V0W3Byb3BzW3BdXSA9IHNvdXJjZVtwcm9wc1twXV07XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnYXNzaWduJywgbWV0aG9kKGFzc2lnbikpO1xuICAgIGZ1bmN0aW9uIG1peGluKHRhcmdldCwgc291cmNlKSB7XG4gICAgICB2YXIgcHJvcHMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpO1xuICAgICAgdmFyIHAsXG4gICAgICAgICAgZGVzY3JpcHRvcixcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgICBmb3IgKHAgPSAwOyBwIDwgbGVuZ3RoOyBwKyspIHtcbiAgICAgICAgZGVzY3JpcHRvciA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBwcm9wc1twXSk7XG4gICAgICAgICRkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BzW3BdLCBkZXNjcmlwdG9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdtaXhpbicsIG1ldGhvZChtaXhpbikpO1xuICB9XG4gIGZ1bmN0aW9uIGV4cG9ydFN0YXIob2JqZWN0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKGFyZ3VtZW50c1tpXSk7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5hbWVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIChmdW5jdGlvbihtb2QsIG5hbWUpIHtcbiAgICAgICAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kW25hbWVdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoYXJndW1lbnRzW2ldLCBuYW1lc1tqXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gdG9PYmplY3QodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbClcbiAgICAgIHRocm93ICRUeXBlRXJyb3IoKTtcbiAgICByZXR1cm4gJE9iamVjdCh2YWx1ZSk7XG4gIH1cbiAgZnVuY3Rpb24gc3ByZWFkKCkge1xuICAgIHZhciBydiA9IFtdLFxuICAgICAgICBrID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlVG9TcHJlYWQgPSB0b09iamVjdChhcmd1bWVudHNbaV0pO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWx1ZVRvU3ByZWFkLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHJ2W2srK10gPSB2YWx1ZVRvU3ByZWFkW2pdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0UHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSkge1xuICAgIHdoaWxlIChvYmplY3QgIT09IG51bGwpIHtcbiAgICAgIHZhciByZXN1bHQgPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSk7XG4gICAgICBpZiAocmVzdWx0KVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgb2JqZWN0ID0gJGdldFByb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpIHtcbiAgICB2YXIgcHJvdG8gPSAkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCk7XG4gICAgaWYgKCFwcm90bylcbiAgICAgIHRocm93ICRUeXBlRXJyb3IoJ3N1cGVyIGlzIG51bGwnKTtcbiAgICByZXR1cm4gZ2V0UHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBuYW1lKTtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHZhciBkZXNjcmlwdG9yID0gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpO1xuICAgIGlmIChkZXNjcmlwdG9yKSB7XG4gICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKVxuICAgICAgICByZXR1cm4gZGVzY3JpcHRvci52YWx1ZS5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgIGlmIChkZXNjcmlwdG9yLmdldClcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IuZ2V0LmNhbGwoc2VsZikuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgfVxuICAgIHRocm93ICRUeXBlRXJyb3IoXCJzdXBlciBoYXMgbm8gbWV0aG9kICdcIiArIG5hbWUgKyBcIicuXCIpO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyR2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgaWYgKGRlc2NyaXB0b3IuZ2V0KVxuICAgICAgICByZXR1cm4gZGVzY3JpcHRvci5nZXQuY2FsbChzZWxmKTtcbiAgICAgIGVsc2UgaWYgKCd2YWx1ZScgaW4gZGVzY3JpcHRvcilcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IudmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJTZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLnNldCkge1xuICAgICAgZGVzY3JpcHRvci5zZXQuY2FsbChzZWxmLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93ICRUeXBlRXJyb3IoXCJzdXBlciBoYXMgbm8gc2V0dGVyICdcIiArIG5hbWUgKyBcIicuXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGdldERlc2NyaXB0b3JzKG9iamVjdCkge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9LFxuICAgICAgICBuYW1lLFxuICAgICAgICBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIGRlc2NyaXB0b3JzW25hbWVdID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gZGVzY3JpcHRvcnM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlQ2xhc3MoY3Rvciwgb2JqZWN0LCBzdGF0aWNPYmplY3QsIHN1cGVyQ2xhc3MpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnY29uc3RydWN0b3InLCB7XG4gICAgICB2YWx1ZTogY3RvcixcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgY3Rvci5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSAkY3JlYXRlKGdldFByb3RvUGFyZW50KHN1cGVyQ2xhc3MpLCBnZXREZXNjcmlwdG9ycyhvYmplY3QpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBvYmplY3Q7XG4gICAgfVxuICAgICRkZWZpbmVQcm9wZXJ0eShjdG9yLCAncHJvdG90eXBlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiAkZGVmaW5lUHJvcGVydGllcyhjdG9yLCBnZXREZXNjcmlwdG9ycyhzdGF0aWNPYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSB7XG4gICAgaWYgKHR5cGVvZiBzdXBlckNsYXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgcHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgICBpZiAoJE9iamVjdChwcm90b3R5cGUpID09PSBwcm90b3R5cGUgfHwgcHJvdG90eXBlID09PSBudWxsKVxuICAgICAgICByZXR1cm4gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGlmIChzdXBlckNsYXNzID09PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmF1bHRTdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgYXJncykge1xuICAgIGlmICgkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCkgIT09IG51bGwpXG4gICAgICBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgJ2NvbnN0cnVjdG9yJywgYXJncyk7XG4gIH1cbiAgdmFyIFNUX05FV0JPUk4gPSAwO1xuICB2YXIgU1RfRVhFQ1VUSU5HID0gMTtcbiAgdmFyIFNUX1NVU1BFTkRFRCA9IDI7XG4gIHZhciBTVF9DTE9TRUQgPSAzO1xuICB2YXIgRU5EX1NUQVRFID0gLTI7XG4gIHZhciBSRVRIUk9XX1NUQVRFID0gLTM7XG4gIGZ1bmN0aW9uIGFkZEl0ZXJhdG9yKG9iamVjdCkge1xuICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN5bWJvbC5pdGVyYXRvciwgbm9uRW51bShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRJbnRlcm5hbEVycm9yKHN0YXRlKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignVHJhY2V1ciBjb21waWxlciBidWc6IGludmFsaWQgc3RhdGUgaW4gc3RhdGUgbWFjaGluZTogJyArIHN0YXRlKTtcbiAgfVxuICBmdW5jdGlvbiBHZW5lcmF0b3JDb250ZXh0KCkge1xuICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgIHRoaXMuR1N0YXRlID0gU1RfTkVXQk9STjtcbiAgICB0aGlzLnN0b3JlZEV4Y2VwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmZpbmFsbHlGYWxsVGhyb3VnaCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnNlbnRfID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy50cnlTdGFja18gPSBbXTtcbiAgfVxuICBHZW5lcmF0b3JDb250ZXh0LnByb3RvdHlwZSA9IHtcbiAgICBwdXNoVHJ5OiBmdW5jdGlvbihjYXRjaFN0YXRlLCBmaW5hbGx5U3RhdGUpIHtcbiAgICAgIGlmIChmaW5hbGx5U3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGZpbmFsbHlGYWxsVGhyb3VnaCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeVN0YWNrXy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGlmICh0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSB0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxseUZhbGxUaHJvdWdoID09PSBudWxsKVxuICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaCA9IFJFVEhST1dfU1RBVEU7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe1xuICAgICAgICAgIGZpbmFsbHk6IGZpbmFsbHlTdGF0ZSxcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2g6IGZpbmFsbHlGYWxsVGhyb3VnaFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYXRjaFN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe2NhdGNoOiBjYXRjaFN0YXRlfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwb3BUcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50cnlTdGFja18ucG9wKCk7XG4gICAgfSxcbiAgICBnZXQgc2VudCgpIHtcbiAgICAgIHRoaXMubWF5YmVUaHJvdygpO1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBzZXQgc2VudCh2KSB7XG4gICAgICB0aGlzLnNlbnRfID0gdjtcbiAgICB9LFxuICAgIGdldCBzZW50SWdub3JlVGhyb3coKSB7XG4gICAgICByZXR1cm4gdGhpcy5zZW50XztcbiAgICB9LFxuICAgIG1heWJlVGhyb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuYWN0aW9uID09PSAndGhyb3cnKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uID0gJ25leHQnO1xuICAgICAgICB0aHJvdyB0aGlzLnNlbnRfO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICAgIHRocm93IHRoaXMuc3RvcmVkRXhjZXB0aW9uO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBnZXROZXh0T3JUaHJvdyhjdHgsIG1vdmVOZXh0LCBhY3Rpb24pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgc3dpdGNoIChjdHguR1N0YXRlKSB7XG4gICAgICAgIGNhc2UgU1RfRVhFQ1VUSU5HOlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigoXCJcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCIgb24gZXhlY3V0aW5nIGdlbmVyYXRvclwiKSk7XG4gICAgICAgIGNhc2UgU1RfQ0xPU0VEOlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigoXCJcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCIgb24gY2xvc2VkIGdlbmVyYXRvclwiKSk7XG4gICAgICAgIGNhc2UgU1RfTkVXQk9STjpcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAndGhyb3cnKSB7XG4gICAgICAgICAgICBjdHguR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgICAgICAgdGhyb3cgeDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHggIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93ICRUeXBlRXJyb3IoJ1NlbnQgdmFsdWUgdG8gbmV3Ym9ybiBnZW5lcmF0b3InKTtcbiAgICAgICAgY2FzZSBTVF9TVVNQRU5ERUQ6XG4gICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0VYRUNVVElORztcbiAgICAgICAgICBjdHguYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICAgIGN0eC5zZW50ID0geDtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBtb3ZlTmV4dChjdHgpO1xuICAgICAgICAgIHZhciBkb25lID0gdmFsdWUgPT09IGN0eDtcbiAgICAgICAgICBpZiAoZG9uZSlcbiAgICAgICAgICAgIHZhbHVlID0gY3R4LnJldHVyblZhbHVlO1xuICAgICAgICAgIGN0eC5HU3RhdGUgPSBkb25lID8gU1RfQ0xPU0VEIDogU1RfU1VTUEVOREVEO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBkb25lOiBkb25lXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGdlbmVyYXRvcldyYXAoaW5uZXJGdW5jdGlvbiwgc2VsZikge1xuICAgIHZhciBtb3ZlTmV4dCA9IGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpO1xuICAgIHZhciBjdHggPSBuZXcgR2VuZXJhdG9yQ29udGV4dCgpO1xuICAgIHJldHVybiBhZGRJdGVyYXRvcih7XG4gICAgICBuZXh0OiBnZXROZXh0T3JUaHJvdyhjdHgsIG1vdmVOZXh0LCAnbmV4dCcpLFxuICAgICAgdGhyb3c6IGdldE5leHRPclRocm93KGN0eCwgbW92ZU5leHQsICd0aHJvdycpXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gQXN5bmNGdW5jdGlvbkNvbnRleHQoKSB7XG4gICAgR2VuZXJhdG9yQ29udGV4dC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZXJyID0gdW5kZWZpbmVkO1xuICAgIHZhciBjdHggPSB0aGlzO1xuICAgIGN0eC5yZXN1bHQgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGN0eC5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIGN0eC5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShHZW5lcmF0b3JDb250ZXh0LnByb3RvdHlwZSk7XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgIGNhc2UgRU5EX1NUQVRFOlxuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIFJFVEhST1dfU1RBVEU6XG4gICAgICAgIHRoaXMucmVqZWN0KHRoaXMuc3RvcmVkRXhjZXB0aW9uKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMucmVqZWN0KGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSkpO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gYXN5bmNXcmFwKGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEFzeW5jRnVuY3Rpb25Db250ZXh0KCk7XG4gICAgY3R4LmNyZWF0ZUNhbGxiYWNrID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjdHguc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgY3R4LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgY3R4LmNyZWF0ZUVycmJhY2sgPSBmdW5jdGlvbihuZXdTdGF0ZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjdHguc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgY3R4LmVyciA9IGVycjtcbiAgICAgICAgbW92ZU5leHQoY3R4KTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBtb3ZlTmV4dChjdHgpO1xuICAgIHJldHVybiBjdHgucmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY3R4KSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBpbm5lckZ1bmN0aW9uLmNhbGwoc2VsZiwgY3R4KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBjdHguc3RvcmVkRXhjZXB0aW9uID0gZXg7XG4gICAgICAgICAgdmFyIGxhc3QgPSBjdHgudHJ5U3RhY2tfW2N0eC50cnlTdGFja18ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICBjdHguR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgICAgICAgY3R4LnN0YXRlID0gRU5EX1NUQVRFO1xuICAgICAgICAgICAgdGhyb3cgZXg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN0eC5zdGF0ZSA9IGxhc3QuY2F0Y2ggIT09IHVuZGVmaW5lZCA/IGxhc3QuY2F0Y2ggOiBsYXN0LmZpbmFsbHk7XG4gICAgICAgICAgaWYgKGxhc3QuZmluYWxseUZhbGxUaHJvdWdoICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBjdHguZmluYWxseUZhbGxUaHJvdWdoID0gbGFzdC5maW5hbGx5RmFsbFRocm91Z2g7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHNldHVwR2xvYmFscyhnbG9iYWwpIHtcbiAgICBnbG9iYWwuU3ltYm9sID0gU3ltYm9sO1xuICAgIHBvbHlmaWxsT2JqZWN0KGdsb2JhbC5PYmplY3QpO1xuICB9XG4gIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICBnbG9iYWwuJHRyYWNldXJSdW50aW1lID0ge1xuICAgIGFzeW5jV3JhcDogYXN5bmNXcmFwLFxuICAgIGNyZWF0ZUNsYXNzOiBjcmVhdGVDbGFzcyxcbiAgICBkZWZhdWx0U3VwZXJDYWxsOiBkZWZhdWx0U3VwZXJDYWxsLFxuICAgIGV4cG9ydFN0YXI6IGV4cG9ydFN0YXIsXG4gICAgZ2VuZXJhdG9yV3JhcDogZ2VuZXJhdG9yV3JhcCxcbiAgICBzZXRQcm9wZXJ0eTogc2V0UHJvcGVydHksXG4gICAgc2V0dXBHbG9iYWxzOiBzZXR1cEdsb2JhbHMsXG4gICAgc3ByZWFkOiBzcHJlYWQsXG4gICAgc3VwZXJDYWxsOiBzdXBlckNhbGwsXG4gICAgc3VwZXJHZXQ6IHN1cGVyR2V0LFxuICAgIHN1cGVyU2V0OiBzdXBlclNldCxcbiAgICB0b09iamVjdDogdG9PYmplY3QsXG4gICAgdG9Qcm9wZXJ0eTogdG9Qcm9wZXJ0eSxcbiAgICB0eXBlOiB0eXBlcyxcbiAgICB0eXBlb2Y6IHR5cGVPZlxuICB9O1xufSkodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzKTtcbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKG9wdF9zY2hlbWUsIG9wdF91c2VySW5mbywgb3B0X2RvbWFpbiwgb3B0X3BvcnQsIG9wdF9wYXRoLCBvcHRfcXVlcnlEYXRhLCBvcHRfZnJhZ21lbnQpIHtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgaWYgKG9wdF9zY2hlbWUpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9zY2hlbWUsICc6Jyk7XG4gICAgfVxuICAgIGlmIChvcHRfZG9tYWluKSB7XG4gICAgICBvdXQucHVzaCgnLy8nKTtcbiAgICAgIGlmIChvcHRfdXNlckluZm8pIHtcbiAgICAgICAgb3V0LnB1c2gob3B0X3VzZXJJbmZvLCAnQCcpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2gob3B0X2RvbWFpbik7XG4gICAgICBpZiAob3B0X3BvcnQpIHtcbiAgICAgICAgb3V0LnB1c2goJzonLCBvcHRfcG9ydCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHRfcGF0aCkge1xuICAgICAgb3V0LnB1c2gob3B0X3BhdGgpO1xuICAgIH1cbiAgICBpZiAob3B0X3F1ZXJ5RGF0YSkge1xuICAgICAgb3V0LnB1c2goJz8nLCBvcHRfcXVlcnlEYXRhKTtcbiAgICB9XG4gICAgaWYgKG9wdF9mcmFnbWVudCkge1xuICAgICAgb3V0LnB1c2goJyMnLCBvcHRfZnJhZ21lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9XG4gIDtcbiAgdmFyIHNwbGl0UmUgPSBuZXcgUmVnRXhwKCdeJyArICcoPzonICsgJyhbXjovPyMuXSspJyArICc6KT8nICsgJyg/Oi8vJyArICcoPzooW14vPyNdKilAKT8nICsgJyhbXFxcXHdcXFxcZFxcXFwtXFxcXHUwMTAwLVxcXFx1ZmZmZi4lXSopJyArICcoPzo6KFswLTldKykpPycgKyAnKT8nICsgJyhbXj8jXSspPycgKyAnKD86XFxcXD8oW14jXSopKT8nICsgJyg/OiMoLiopKT8nICsgJyQnKTtcbiAgdmFyIENvbXBvbmVudEluZGV4ID0ge1xuICAgIFNDSEVNRTogMSxcbiAgICBVU0VSX0lORk86IDIsXG4gICAgRE9NQUlOOiAzLFxuICAgIFBPUlQ6IDQsXG4gICAgUEFUSDogNSxcbiAgICBRVUVSWV9EQVRBOiA2LFxuICAgIEZSQUdNRU5UOiA3XG4gIH07XG4gIGZ1bmN0aW9uIHNwbGl0KHVyaSkge1xuICAgIHJldHVybiAodXJpLm1hdGNoKHNwbGl0UmUpKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVEb3RTZWdtZW50cyhwYXRoKSB7XG4gICAgaWYgKHBhdGggPT09ICcvJylcbiAgICAgIHJldHVybiAnLyc7XG4gICAgdmFyIGxlYWRpbmdTbGFzaCA9IHBhdGhbMF0gPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciB0cmFpbGluZ1NsYXNoID0gcGF0aC5zbGljZSgtMSkgPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciBzZWdtZW50cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIHVwID0gMDtcbiAgICBmb3IgKHZhciBwb3MgPSAwOyBwb3MgPCBzZWdtZW50cy5sZW5ndGg7IHBvcysrKSB7XG4gICAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRzW3Bvc107XG4gICAgICBzd2l0Y2ggKHNlZ21lbnQpIHtcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAnLic6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJy4uJzpcbiAgICAgICAgICBpZiAob3V0Lmxlbmd0aClcbiAgICAgICAgICAgIG91dC5wb3AoKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB1cCsrO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIG91dC5wdXNoKHNlZ21lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWxlYWRpbmdTbGFzaCkge1xuICAgICAgd2hpbGUgKHVwLS0gPiAwKSB7XG4gICAgICAgIG91dC51bnNoaWZ0KCcuLicpO1xuICAgICAgfVxuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApXG4gICAgICAgIG91dC5wdXNoKCcuJyk7XG4gICAgfVxuICAgIHJldHVybiBsZWFkaW5nU2xhc2ggKyBvdXQuam9pbignLycpICsgdHJhaWxpbmdTbGFzaDtcbiAgfVxuICBmdW5jdGlvbiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cykge1xuICAgIHZhciBwYXRoID0gcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gfHwgJyc7XG4gICAgcGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHBhdGgpO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlVTRVJfSU5GT10sIHBhcnRzW0NvbXBvbmVudEluZGV4LkRPTUFJTl0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlBPUlRdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUVVFUllfREFUQV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LkZSQUdNRU5UXSk7XG4gIH1cbiAgZnVuY3Rpb24gY2Fub25pY2FsaXplVXJsKHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiByZXNvbHZlVXJsKGJhc2UsIHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgdmFyIGJhc2VQYXJ0cyA9IHNwbGl0KGJhc2UpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdID0gYmFzZVBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSBDb21wb25lbnRJbmRleC5TQ0hFTUU7IGkgPD0gQ29tcG9uZW50SW5kZXguUE9SVDsgaSsrKSB7XG4gICAgICBpZiAoIXBhcnRzW2ldKSB7XG4gICAgICAgIHBhcnRzW2ldID0gYmFzZVBhcnRzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF1bMF0gPT0gJy8nKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICB2YXIgaW5kZXggPSBwYXRoLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMCwgaW5kZXggKyAxKSArIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICB9XG4gIGZ1bmN0aW9uIGlzQWJzb2x1dGUobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmFtZVswXSA9PT0gJy8nKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQobmFtZSk7XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0pXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmNhbm9uaWNhbGl6ZVVybCA9IGNhbm9uaWNhbGl6ZVVybDtcbiAgJHRyYWNldXJSdW50aW1lLmlzQWJzb2x1dGUgPSBpc0Fic29sdXRlO1xuICAkdHJhY2V1clJ1bnRpbWUucmVtb3ZlRG90U2VnbWVudHMgPSByZW1vdmVEb3RTZWdtZW50cztcbiAgJHRyYWNldXJSdW50aW1lLnJlc29sdmVVcmwgPSByZXNvbHZlVXJsO1xufSkoKTtcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgJF9fMiA9ICR0cmFjZXVyUnVudGltZSxcbiAgICAgIGNhbm9uaWNhbGl6ZVVybCA9ICRfXzIuY2Fub25pY2FsaXplVXJsLFxuICAgICAgcmVzb2x2ZVVybCA9ICRfXzIucmVzb2x2ZVVybCxcbiAgICAgIGlzQWJzb2x1dGUgPSAkX18yLmlzQWJzb2x1dGU7XG4gIHZhciBtb2R1bGVJbnN0YW50aWF0b3JzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGJhc2VVUkw7XG4gIGlmIChnbG9iYWwubG9jYXRpb24gJiYgZ2xvYmFsLmxvY2F0aW9uLmhyZWYpXG4gICAgYmFzZVVSTCA9IHJlc29sdmVVcmwoZ2xvYmFsLmxvY2F0aW9uLmhyZWYsICcuLycpO1xuICBlbHNlXG4gICAgYmFzZVVSTCA9ICcnO1xuICB2YXIgVW5jb2F0ZWRNb2R1bGVFbnRyeSA9IGZ1bmN0aW9uIFVuY29hdGVkTW9kdWxlRW50cnkodXJsLCB1bmNvYXRlZE1vZHVsZSkge1xuICAgIHRoaXMudXJsID0gdXJsO1xuICAgIHRoaXMudmFsdWVfID0gdW5jb2F0ZWRNb2R1bGU7XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFVuY29hdGVkTW9kdWxlRW50cnksIHt9LCB7fSk7XG4gIHZhciBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciA9IGZ1bmN0aW9uIFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKHVybCwgZnVuYykge1xuICAgICR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwodGhpcywgJFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yLnByb3RvdHlwZSwgXCJjb25zdHJ1Y3RvclwiLCBbdXJsLCBudWxsXSk7XG4gICAgdGhpcy5mdW5jID0gZnVuYztcbiAgfTtcbiAgdmFyICRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciA9IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yO1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciwge2dldFVuY29hdGVkTW9kdWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnZhbHVlXylcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVfO1xuICAgICAgcmV0dXJuIHRoaXMudmFsdWVfID0gdGhpcy5mdW5jLmNhbGwoZ2xvYmFsKTtcbiAgICB9fSwge30sIFVuY29hdGVkTW9kdWxlRW50cnkpO1xuICBmdW5jdGlvbiBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihuYW1lKSB7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuO1xuICAgIHZhciB1cmwgPSBNb2R1bGVTdG9yZS5ub3JtYWxpemUobmFtZSk7XG4gICAgcmV0dXJuIG1vZHVsZUluc3RhbnRpYXRvcnNbdXJsXTtcbiAgfVxuICA7XG4gIHZhciBtb2R1bGVJbnN0YW5jZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgbGl2ZU1vZHVsZVNlbnRpbmVsID0ge307XG4gIGZ1bmN0aW9uIE1vZHVsZSh1bmNvYXRlZE1vZHVsZSkge1xuICAgIHZhciBpc0xpdmUgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGNvYXRlZE1vZHVsZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModW5jb2F0ZWRNb2R1bGUpLmZvckVhY2goKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBnZXR0ZXIsXG4gICAgICAgICAgdmFsdWU7XG4gICAgICBpZiAoaXNMaXZlID09PSBsaXZlTW9kdWxlU2VudGluZWwpIHtcbiAgICAgICAgdmFyIGRlc2NyID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih1bmNvYXRlZE1vZHVsZSwgbmFtZSk7XG4gICAgICAgIGlmIChkZXNjci5nZXQpXG4gICAgICAgICAgZ2V0dGVyID0gZGVzY3IuZ2V0O1xuICAgICAgfVxuICAgICAgaWYgKCFnZXR0ZXIpIHtcbiAgICAgICAgdmFsdWUgPSB1bmNvYXRlZE1vZHVsZVtuYW1lXTtcbiAgICAgICAgZ2V0dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvYXRlZE1vZHVsZSwgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSkpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhjb2F0ZWRNb2R1bGUpO1xuICAgIHJldHVybiBjb2F0ZWRNb2R1bGU7XG4gIH1cbiAgdmFyIE1vZHVsZVN0b3JlID0ge1xuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24obmFtZSwgcmVmZXJlck5hbWUsIHJlZmVyZXJBZGRyZXNzKSB7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJtb2R1bGUgbmFtZSBtdXN0IGJlIGEgc3RyaW5nLCBub3QgXCIgKyB0eXBlb2YgbmFtZSk7XG4gICAgICBpZiAoaXNBYnNvbHV0ZShuYW1lKSlcbiAgICAgICAgcmV0dXJuIGNhbm9uaWNhbGl6ZVVybChuYW1lKTtcbiAgICAgIGlmICgvW15cXC5dXFwvXFwuXFwuXFwvLy50ZXN0KG5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbW9kdWxlIG5hbWUgZW1iZWRzIC8uLi86ICcgKyBuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChuYW1lWzBdID09PSAnLicgJiYgcmVmZXJlck5hbWUpXG4gICAgICAgIHJldHVybiByZXNvbHZlVXJsKHJlZmVyZXJOYW1lLCBuYW1lKTtcbiAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKG5vcm1hbGl6ZWROYW1lKSB7XG4gICAgICB2YXIgbSA9IGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIGlmICghbSlcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIHZhciBtb2R1bGVJbnN0YW5jZSA9IG1vZHVsZUluc3RhbmNlc1ttLnVybF07XG4gICAgICBpZiAobW9kdWxlSW5zdGFuY2UpXG4gICAgICAgIHJldHVybiBtb2R1bGVJbnN0YW5jZTtcbiAgICAgIG1vZHVsZUluc3RhbmNlID0gTW9kdWxlKG0uZ2V0VW5jb2F0ZWRNb2R1bGUoKSwgbGl2ZU1vZHVsZVNlbnRpbmVsKTtcbiAgICAgIHJldHVybiBtb2R1bGVJbnN0YW5jZXNbbS51cmxdID0gbW9kdWxlSW5zdGFuY2U7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG5vcm1hbGl6ZWROYW1lLCBtb2R1bGUpIHtcbiAgICAgIG5vcm1hbGl6ZWROYW1lID0gU3RyaW5nKG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdID0gbmV3IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lLCAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICB9KSk7XG4gICAgICBtb2R1bGVJbnN0YW5jZXNbbm9ybWFsaXplZE5hbWVdID0gbW9kdWxlO1xuICAgIH0sXG4gICAgZ2V0IGJhc2VVUkwoKSB7XG4gICAgICByZXR1cm4gYmFzZVVSTDtcbiAgICB9LFxuICAgIHNldCBiYXNlVVJMKHYpIHtcbiAgICAgIGJhc2VVUkwgPSBTdHJpbmcodik7XG4gICAgfSxcbiAgICByZWdpc3Rlck1vZHVsZTogZnVuY3Rpb24obmFtZSwgZnVuYykge1xuICAgICAgdmFyIG5vcm1hbGl6ZWROYW1lID0gTW9kdWxlU3RvcmUubm9ybWFsaXplKG5hbWUpO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBtb2R1bGUgbmFtZWQgJyArIG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdID0gbmV3IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lLCBmdW5jKTtcbiAgICB9LFxuICAgIGJ1bmRsZVN0b3JlOiBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCBkZXBzLCBmdW5jKSB7XG4gICAgICBpZiAoIWRlcHMgfHwgIWRlcHMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJNb2R1bGUobmFtZSwgZnVuYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1bmRsZVN0b3JlW25hbWVdID0ge1xuICAgICAgICAgIGRlcHM6IGRlcHMsXG4gICAgICAgICAgZXhlY3V0ZTogZnVuY1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgZ2V0QW5vbnltb3VzTW9kdWxlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICByZXR1cm4gbmV3IE1vZHVsZShmdW5jLmNhbGwoZ2xvYmFsKSwgbGl2ZU1vZHVsZVNlbnRpbmVsKTtcbiAgICB9LFxuICAgIGdldEZvclRlc3Rpbmc6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciAkX18wID0gdGhpcztcbiAgICAgIGlmICghdGhpcy50ZXN0aW5nUHJlZml4Xykge1xuICAgICAgICBPYmplY3Qua2V5cyhtb2R1bGVJbnN0YW5jZXMpLnNvbWUoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHZhciBtID0gLyh0cmFjZXVyQFteXFwvXSpcXC8pLy5leGVjKGtleSk7XG4gICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICRfXzAudGVzdGluZ1ByZWZpeF8gPSBtWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXQodGhpcy50ZXN0aW5nUHJlZml4XyArIG5hbWUpO1xuICAgIH1cbiAgfTtcbiAgTW9kdWxlU3RvcmUuc2V0KCdAdHJhY2V1ci9zcmMvcnVudGltZS9Nb2R1bGVTdG9yZScsIG5ldyBNb2R1bGUoe01vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZX0pKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgfTtcbiAgJHRyYWNldXJSdW50aW1lLk1vZHVsZVN0b3JlID0gTW9kdWxlU3RvcmU7XG4gIGdsb2JhbC5TeXN0ZW0gPSB7XG4gICAgcmVnaXN0ZXI6IE1vZHVsZVN0b3JlLnJlZ2lzdGVyLmJpbmQoTW9kdWxlU3RvcmUpLFxuICAgIGdldDogTW9kdWxlU3RvcmUuZ2V0LFxuICAgIHNldDogTW9kdWxlU3RvcmUuc2V0LFxuICAgIG5vcm1hbGl6ZTogTW9kdWxlU3RvcmUubm9ybWFsaXplXG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5nZXRNb2R1bGVJbXBsID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpbnN0YW50aWF0b3IgPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihuYW1lKTtcbiAgICByZXR1cm4gaW5zdGFudGlhdG9yICYmIGluc3RhbnRpYXRvci5nZXRVbmNvYXRlZE1vZHVsZSgpO1xuICB9O1xufSkodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzKTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzXCI7XG4gIHZhciB0b09iamVjdCA9ICR0cmFjZXVyUnVudGltZS50b09iamVjdDtcbiAgZnVuY3Rpb24gdG9VaW50MzIoeCkge1xuICAgIHJldHVybiB4IHwgMDtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCB0b09iamVjdCgpIHtcbiAgICAgIHJldHVybiB0b09iamVjdDtcbiAgICB9LFxuICAgIGdldCB0b1VpbnQzMigpIHtcbiAgICAgIHJldHVybiB0b1VpbnQzMjtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3JcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyICRfXzQ7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3JcIjtcbiAgdmFyICRfXzUgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHNcIiksXG4gICAgICB0b09iamVjdCA9ICRfXzUudG9PYmplY3QsXG4gICAgICB0b1VpbnQzMiA9ICRfXzUudG9VaW50MzI7XG4gIHZhciBBUlJBWV9JVEVSQVRPUl9LSU5EX0tFWVMgPSAxO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMgPSAyO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTID0gMztcbiAgdmFyIEFycmF5SXRlcmF0b3IgPSBmdW5jdGlvbiBBcnJheUl0ZXJhdG9yKCkge307XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEFycmF5SXRlcmF0b3IsICgkX180ID0ge30sIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX180LCBcIm5leHRcIiwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IHRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGFycmF5ID0gaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfO1xuICAgICAgaWYgKCFhcnJheSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QgaXMgbm90IGFuIEFycmF5SXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbmRleCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfO1xuICAgICAgdmFyIGl0ZW1LaW5kID0gaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXztcbiAgICAgIHZhciBsZW5ndGggPSB0b1VpbnQzMihhcnJheS5sZW5ndGgpO1xuICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IEluZmluaXR5O1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gaW5kZXggKyAxO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoYXJyYXlbaW5kZXhdLCBmYWxzZSk7XG4gICAgICBpZiAoaXRlbUtpbmQgPT0gQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoW2luZGV4LCBhcnJheVtpbmRleF1dLCBmYWxzZSk7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoaW5kZXgsIGZhbHNlKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fNCwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgJF9fNCksIHt9KTtcbiAgZnVuY3Rpb24gY3JlYXRlQXJyYXlJdGVyYXRvcihhcnJheSwga2luZCkge1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdChhcnJheSk7XG4gICAgdmFyIGl0ZXJhdG9yID0gbmV3IEFycmF5SXRlcmF0b3I7XG4gICAgaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfID0gb2JqZWN0O1xuICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gMDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdGlvbktpbmRfID0ga2luZDtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodmFsdWUsIGRvbmUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgZG9uZTogZG9uZVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcih0aGlzLCBBUlJBWV9JVEVSQVRPUl9LSU5EX0VOVFJJRVMpO1xuICB9XG4gIGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTKTtcbiAgfVxuICBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IGVudHJpZXMoKSB7XG4gICAgICByZXR1cm4gZW50cmllcztcbiAgICB9LFxuICAgIGdldCBrZXlzKCkge1xuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfSxcbiAgICBnZXQgdmFsdWVzKCkge1xuICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcFwiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXBcIjtcbiAgdmFyICRfX2RlZmF1bHQgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICB2YXIgbGVuZ3RoID0gcXVldWUucHVzaChbY2FsbGJhY2ssIGFyZ10pO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH07XG4gIHZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICB2YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuICBmdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7Y2hhcmFjdGVyRGF0YTogdHJ1ZX0pO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICAgIH07XG4gIH1cbiAgdmFyIHF1ZXVlID0gW107XG4gIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0dXBsZSA9IHF1ZXVlW2ldO1xuICAgICAgdmFyIGNhbGxiYWNrID0gdHVwbGVbMF0sXG4gICAgICAgICAgYXJnID0gdHVwbGVbMV07XG4gICAgICBjYWxsYmFjayhhcmcpO1xuICAgIH1cbiAgICBxdWV1ZSA9IFtdO1xuICB9XG4gIHZhciBzY2hlZHVsZUZsdXNoO1xuICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xuICB9IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgfSBlbHNlIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xuICB9XG4gIHJldHVybiB7Z2V0IGRlZmF1bHQoKSB7XG4gICAgICByZXR1cm4gJF9fZGVmYXVsdDtcbiAgICB9fTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyKFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZVwiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlXCI7XG4gIHZhciBhc3luYyA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXBcIikuZGVmYXVsdDtcbiAgZnVuY3Rpb24gaXNQcm9taXNlKHgpIHtcbiAgICByZXR1cm4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeC5zdGF0dXNfICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gY2hhaW4ocHJvbWlzZSkge1xuICAgIHZhciBvblJlc29sdmUgPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH0pO1xuICAgIHZhciBvblJlamVjdCA9IGFyZ3VtZW50c1syXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMl0gOiAoZnVuY3Rpb24oZSkge1xuICAgICAgdGhyb3cgZTtcbiAgICB9KTtcbiAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZChwcm9taXNlLmNvbnN0cnVjdG9yKTtcbiAgICBzd2l0Y2ggKHByb21pc2Uuc3RhdHVzXykge1xuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHRocm93IFR5cGVFcnJvcjtcbiAgICAgIGNhc2UgJ3BlbmRpbmcnOlxuICAgICAgICBwcm9taXNlLm9uUmVzb2x2ZV8ucHVzaChbZGVmZXJyZWQsIG9uUmVzb2x2ZV0pO1xuICAgICAgICBwcm9taXNlLm9uUmVqZWN0Xy5wdXNoKFtkZWZlcnJlZCwgb25SZWplY3RdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyZXNvbHZlZCc6XG4gICAgICAgIHByb21pc2VSZWFjdChkZWZlcnJlZCwgb25SZXNvbHZlLCBwcm9taXNlLnZhbHVlXyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncmVqZWN0ZWQnOlxuICAgICAgICBwcm9taXNlUmVhY3QoZGVmZXJyZWQsIG9uUmVqZWN0LCBwcm9taXNlLnZhbHVlXyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZWZlcnJlZChDKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHJlc3VsdC5wcm9taXNlID0gbmV3IEMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVzdWx0LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgcmVzdWx0LnJlamVjdCA9IHJlamVjdDtcbiAgICB9KSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB2YXIgUHJvbWlzZSA9IGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB2YXIgJF9fNiA9IHRoaXM7XG4gICAgdGhpcy5zdGF0dXNfID0gJ3BlbmRpbmcnO1xuICAgIHRoaXMub25SZXNvbHZlXyA9IFtdO1xuICAgIHRoaXMub25SZWplY3RfID0gW107XG4gICAgcmVzb2x2ZXIoKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHByb21pc2VSZXNvbHZlKCRfXzYsIHgpO1xuICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgcHJvbWlzZVJlamVjdCgkX182LCByKTtcbiAgICB9KSk7XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFByb21pc2UsIHtcbiAgICBjYXRjaDogZnVuY3Rpb24ob25SZWplY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvblJlamVjdCk7XG4gICAgfSxcbiAgICB0aGVuOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvblJlc29sdmUgPSBhcmd1bWVudHNbMF0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzBdIDogKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgICB9KTtcbiAgICAgIHZhciBvblJlamVjdCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIHZhciAkX182ID0gdGhpcztcbiAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXMuY29uc3RydWN0b3I7XG4gICAgICByZXR1cm4gY2hhaW4odGhpcywgKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpO1xuICAgICAgICByZXR1cm4geCA9PT0gJF9fNiA/IG9uUmVqZWN0KG5ldyBUeXBlRXJyb3IpIDogaXNQcm9taXNlKHgpID8geC50aGVuKG9uUmVzb2x2ZSwgb25SZWplY3QpIDogb25SZXNvbHZlKHgpO1xuICAgICAgfSksIG9uUmVqZWN0KTtcbiAgICB9XG4gIH0sIHtcbiAgICByZXNvbHZlOiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gbmV3IHRoaXMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZXNvbHZlKHgpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgcmVqZWN0OiBmdW5jdGlvbihyKSB7XG4gICAgICByZXR1cm4gbmV3IHRoaXMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3Qocik7XG4gICAgICB9KSk7XG4gICAgfSxcbiAgICBjYXN0OiBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoeCBpbnN0YW5jZW9mIHRoaXMpXG4gICAgICAgIHJldHVybiB4O1xuICAgICAgaWYgKGlzUHJvbWlzZSh4KSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICAgIGNoYWluKHgsIHJlc3VsdC5yZXNvbHZlLCByZXN1bHQucmVqZWN0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5wcm9taXNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZSh4KTtcbiAgICB9LFxuICAgIGFsbDogZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZCh0aGlzKTtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICB2YXIgcmVzb2x1dGlvbnMgPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgKytjb3VudDtcbiAgICAgICAgICB0aGlzLmNhc3QodmFsdWVzW2ldKS50aGVuKGZ1bmN0aW9uKGksIHgpIHtcbiAgICAgICAgICAgIHJlc29sdXRpb25zW2ldID0geDtcbiAgICAgICAgICAgIGlmICgtLWNvdW50ID09PSAwKVxuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgICAgICB9LmJpbmQodW5kZWZpbmVkLCBpKSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgIGlmIChjb3VudCA+IDApXG4gICAgICAgICAgICAgIGNvdW50ID0gMDtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID09PSAwKVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzb2x1dGlvbnMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9LFxuICAgIHJhY2U6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRoaXMuY2FzdCh2YWx1ZXNbaV0pLnRoZW4oKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoeCk7XG4gICAgICAgICAgfSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgfSk7XG4gIGZ1bmN0aW9uIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCAncmVzb2x2ZWQnLCB4LCBwcm9taXNlLm9uUmVzb2x2ZV8pO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VSZWplY3QocHJvbWlzZSwgcikge1xuICAgIHByb21pc2VEb25lKHByb21pc2UsICdyZWplY3RlZCcsIHIsIHByb21pc2Uub25SZWplY3RfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlRG9uZShwcm9taXNlLCBzdGF0dXMsIHZhbHVlLCByZWFjdGlvbnMpIHtcbiAgICBpZiAocHJvbWlzZS5zdGF0dXNfICE9PSAncGVuZGluZycpXG4gICAgICByZXR1cm47XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWFjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb21pc2VSZWFjdChyZWFjdGlvbnNbaV1bMF0sIHJlYWN0aW9uc1tpXVsxXSwgdmFsdWUpO1xuICAgIH1cbiAgICBwcm9taXNlLnN0YXR1c18gPSBzdGF0dXM7XG4gICAgcHJvbWlzZS52YWx1ZV8gPSB2YWx1ZTtcbiAgICBwcm9taXNlLm9uUmVzb2x2ZV8gPSBwcm9taXNlLm9uUmVqZWN0XyA9IHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlUmVhY3QoZGVmZXJyZWQsIGhhbmRsZXIsIHgpIHtcbiAgICBhc3luYygoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgeSA9IGhhbmRsZXIoeCk7XG4gICAgICAgIGlmICh5ID09PSBkZWZlcnJlZC5wcm9taXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICAgIGVsc2UgaWYgKGlzUHJvbWlzZSh5KSlcbiAgICAgICAgICBjaGFpbih5LCBkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh5KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICB2YXIgdGhlbmFibGVTeW1ib2wgPSAnQEB0aGVuYWJsZSc7XG4gIGZ1bmN0aW9uIHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpIHtcbiAgICBpZiAoaXNQcm9taXNlKHgpKSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9IGVsc2UgaWYgKHggJiYgdHlwZW9mIHgudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIHAgPSB4W3RoZW5hYmxlU3ltYm9sXTtcbiAgICAgIGlmIChwKSB7XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQoY29uc3RydWN0b3IpO1xuICAgICAgICB4W3RoZW5hYmxlU3ltYm9sXSA9IGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgeC50aGVuKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfVxuICByZXR1cm4ge2dldCBQcm9taXNlKCkge1xuICAgICAgcmV0dXJuIFByb21pc2U7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdcIjtcbiAgdmFyICR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciAkaW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZjtcbiAgdmFyICRsYXN0SW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUubGFzdEluZGV4T2Y7XG4gIGZ1bmN0aW9uIHN0YXJ0c1dpdGgoc2VhcmNoKSB7XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICBpZiAodGhpcyA9PSBudWxsIHx8ICR0b1N0cmluZy5jYWxsKHNlYXJjaCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQ7XG4gICAgdmFyIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKHBvcykpIHtcbiAgICAgIHBvcyA9IDA7XG4gICAgfVxuICAgIHZhciBzdGFydCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgcmV0dXJuICRpbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHBvcykgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gZW5kc1dpdGgoc2VhcmNoKSB7XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICBpZiAodGhpcyA9PSBudWxsIHx8ICR0b1N0cmluZy5jYWxsKHNlYXJjaCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvcyA9IHN0cmluZ0xlbmd0aDtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZW5kID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICB2YXIgc3RhcnQgPSBlbmQgLSBzZWFyY2hMZW5ndGg7XG4gICAgaWYgKHN0YXJ0IDwgMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gJGxhc3RJbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHN0YXJ0KSA9PSBzdGFydDtcbiAgfVxuICBmdW5jdGlvbiBjb250YWlucyhzZWFyY2gpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQ7XG4gICAgdmFyIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKHBvcykpIHtcbiAgICAgIHBvcyA9IDA7XG4gICAgfVxuICAgIHZhciBzdGFydCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgcmV0dXJuICRpbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHBvcykgIT0gLTE7XG4gIH1cbiAgZnVuY3Rpb24gcmVwZWF0KGNvdW50KSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuICAgIGlmIChpc05hTihuKSkge1xuICAgICAgbiA9IDA7XG4gICAgfVxuICAgIGlmIChuIDwgMCB8fCBuID09IEluZmluaXR5KSB7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKCk7XG4gICAgfVxuICAgIGlmIChuID09IDApIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIHdoaWxlIChuLS0pIHtcbiAgICAgIHJlc3VsdCArPSBzdHJpbmc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29kZVBvaW50QXQocG9zaXRpb24pIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgc2l6ZSA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIGluZGV4ID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICBpbmRleCA9IDA7XG4gICAgfVxuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gc2l6ZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgIHZhciBzZWNvbmQ7XG4gICAgaWYgKGZpcnN0ID49IDB4RDgwMCAmJiBmaXJzdCA8PSAweERCRkYgJiYgc2l6ZSA+IGluZGV4ICsgMSkge1xuICAgICAgc2Vjb25kID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXggKyAxKTtcbiAgICAgIGlmIChzZWNvbmQgPj0gMHhEQzAwICYmIHNlY29uZCA8PSAweERGRkYpIHtcbiAgICAgICAgcmV0dXJuIChmaXJzdCAtIDB4RDgwMCkgKiAweDQwMCArIHNlY29uZCAtIDB4REMwMCArIDB4MTAwMDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaXJzdDtcbiAgfVxuICBmdW5jdGlvbiByYXcoY2FsbHNpdGUpIHtcbiAgICB2YXIgcmF3ID0gY2FsbHNpdGUucmF3O1xuICAgIHZhciBsZW4gPSByYXcubGVuZ3RoID4+PiAwO1xuICAgIGlmIChsZW4gPT09IDApXG4gICAgICByZXR1cm4gJyc7XG4gICAgdmFyIHMgPSAnJztcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHMgKz0gcmF3W2ldO1xuICAgICAgaWYgKGkgKyAxID09PSBsZW4pXG4gICAgICAgIHJldHVybiBzO1xuICAgICAgcyArPSBhcmd1bWVudHNbKytpXTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZnJvbUNvZGVQb2ludCgpIHtcbiAgICB2YXIgY29kZVVuaXRzID0gW107XG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICB2YXIgaGlnaFN1cnJvZ2F0ZTtcbiAgICB2YXIgbG93U3Vycm9nYXRlO1xuICAgIHZhciBpbmRleCA9IC0xO1xuICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgY29kZVBvaW50ID0gTnVtYmVyKGFyZ3VtZW50c1tpbmRleF0pO1xuICAgICAgaWYgKCFpc0Zpbml0ZShjb2RlUG9pbnQpIHx8IGNvZGVQb2ludCA8IDAgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYgfHwgZmxvb3IoY29kZVBvaW50KSAhPSBjb2RlUG9pbnQpIHtcbiAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignSW52YWxpZCBjb2RlIHBvaW50OiAnICsgY29kZVBvaW50KTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlUG9pbnQgPD0gMHhGRkZGKSB7XG4gICAgICAgIGNvZGVVbml0cy5wdXNoKGNvZGVQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMDtcbiAgICAgICAgaGlnaFN1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgPj4gMTApICsgMHhEODAwO1xuICAgICAgICBsb3dTdXJyb2dhdGUgPSAoY29kZVBvaW50ICUgMHg0MDApICsgMHhEQzAwO1xuICAgICAgICBjb2RlVW5pdHMucHVzaChoaWdoU3Vycm9nYXRlLCBsb3dTdXJyb2dhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBjb2RlVW5pdHMpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IHN0YXJ0c1dpdGgoKSB7XG4gICAgICByZXR1cm4gc3RhcnRzV2l0aDtcbiAgICB9LFxuICAgIGdldCBlbmRzV2l0aCgpIHtcbiAgICAgIHJldHVybiBlbmRzV2l0aDtcbiAgICB9LFxuICAgIGdldCBjb250YWlucygpIHtcbiAgICAgIHJldHVybiBjb250YWlucztcbiAgICB9LFxuICAgIGdldCByZXBlYXQoKSB7XG4gICAgICByZXR1cm4gcmVwZWF0O1xuICAgIH0sXG4gICAgZ2V0IGNvZGVQb2ludEF0KCkge1xuICAgICAgcmV0dXJuIGNvZGVQb2ludEF0O1xuICAgIH0sXG4gICAgZ2V0IHJhdygpIHtcbiAgICAgIHJldHVybiByYXc7XG4gICAgfSxcbiAgICBnZXQgZnJvbUNvZGVQb2ludCgpIHtcbiAgICAgIHJldHVybiBmcm9tQ29kZVBvaW50O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyKFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxsc1wiO1xuICB2YXIgUHJvbWlzZSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlXCIpLlByb21pc2U7XG4gIHZhciAkX185ID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ1wiKSxcbiAgICAgIGNvZGVQb2ludEF0ID0gJF9fOS5jb2RlUG9pbnRBdCxcbiAgICAgIGNvbnRhaW5zID0gJF9fOS5jb250YWlucyxcbiAgICAgIGVuZHNXaXRoID0gJF9fOS5lbmRzV2l0aCxcbiAgICAgIGZyb21Db2RlUG9pbnQgPSAkX185LmZyb21Db2RlUG9pbnQsXG4gICAgICByZXBlYXQgPSAkX185LnJlcGVhdCxcbiAgICAgIHJhdyA9ICRfXzkucmF3LFxuICAgICAgc3RhcnRzV2l0aCA9ICRfXzkuc3RhcnRzV2l0aDtcbiAgdmFyICRfXzkgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXlJdGVyYXRvclwiKSxcbiAgICAgIGVudHJpZXMgPSAkX185LmVudHJpZXMsXG4gICAgICBrZXlzID0gJF9fOS5rZXlzLFxuICAgICAgdmFsdWVzID0gJF9fOS52YWx1ZXM7XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lTWV0aG9kKG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoIShuYW1lIGluIG9iamVjdCkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkRnVuY3Rpb25zKG9iamVjdCwgZnVuY3Rpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmdW5jdGlvbnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgIHZhciBuYW1lID0gZnVuY3Rpb25zW2ldO1xuICAgICAgdmFyIHZhbHVlID0gZnVuY3Rpb25zW2kgKyAxXTtcbiAgICAgIG1heWJlRGVmaW5lTWV0aG9kKG9iamVjdCwgbmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFByb21pc2UoZ2xvYmFsKSB7XG4gICAgaWYgKCFnbG9iYWwuUHJvbWlzZSlcbiAgICAgIGdsb2JhbC5Qcm9taXNlID0gUHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFN0cmluZyhTdHJpbmcpIHtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhTdHJpbmcucHJvdG90eXBlLCBbJ2NvZGVQb2ludEF0JywgY29kZVBvaW50QXQsICdjb250YWlucycsIGNvbnRhaW5zLCAnZW5kc1dpdGgnLCBlbmRzV2l0aCwgJ3N0YXJ0c1dpdGgnLCBzdGFydHNXaXRoLCAncmVwZWF0JywgcmVwZWF0XSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLCBbJ2Zyb21Db2RlUG9pbnQnLCBmcm9tQ29kZVBvaW50LCAncmF3JywgcmF3XSk7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxBcnJheShBcnJheSwgU3ltYm9sKSB7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoQXJyYXkucHJvdG90eXBlLCBbJ2VudHJpZXMnLCBlbnRyaWVzLCAna2V5cycsIGtleXMsICd2YWx1ZXMnLCB2YWx1ZXNdKTtcbiAgICBpZiAoU3ltYm9sICYmIFN5bWJvbC5pdGVyYXRvcikge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZXMsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGwoZ2xvYmFsKSB7XG4gICAgcG9seWZpbGxQcm9taXNlKGdsb2JhbCk7XG4gICAgcG9seWZpbGxTdHJpbmcoZ2xvYmFsLlN0cmluZyk7XG4gICAgcG9seWZpbGxBcnJheShnbG9iYWwuQXJyYXksIGdsb2JhbC5TeW1ib2wpO1xuICB9XG4gIHBvbHlmaWxsKHRoaXMpO1xuICB2YXIgc2V0dXBHbG9iYWxzID0gJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscztcbiAgJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscyA9IGZ1bmN0aW9uKGdsb2JhbCkge1xuICAgIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICAgIHBvbHlmaWxsKGdsb2JhbCk7XG4gIH07XG4gIHJldHVybiB7fTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyKFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbC1pbXBvcnRcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbC1pbXBvcnRcIjtcbiAgdmFyICRfXzExID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxsc1wiKTtcbiAgcmV0dXJuIHt9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbC1pbXBvcnRcIiArICcnKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvUGF0aEZpbmRpbmcnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaGVhcCcpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgSGVhcCwgZGVmYXVsdENtcCwgZmxvb3IsIGhlYXBpZnksIGhlYXBwb3AsIGhlYXBwdXNoLCBoZWFwcHVzaHBvcCwgaGVhcHJlcGxhY2UsIGluc29ydCwgbWluLCBubGFyZ2VzdCwgbnNtYWxsZXN0LCB1cGRhdGVJdGVtLCBfc2lmdGRvd24sIF9zaWZ0dXA7XG5cbiAgZmxvb3IgPSBNYXRoLmZsb29yLCBtaW4gPSBNYXRoLm1pbjtcblxuICAvKiBcbiAgRGVmYXVsdCBjb21wYXJpc29uIGZ1bmN0aW9uIHRvIGJlIHVzZWRcbiAgKi9cblxuXG4gIGRlZmF1bHRDbXAgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHggPCB5KSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGlmICh4ID4geSkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9O1xuXG4gIC8qIFxuICBJbnNlcnQgaXRlbSB4IGluIGxpc3QgYSwgYW5kIGtlZXAgaXQgc29ydGVkIGFzc3VtaW5nIGEgaXMgc29ydGVkLlxuICBcbiAgSWYgeCBpcyBhbHJlYWR5IGluIGEsIGluc2VydCBpdCB0byB0aGUgcmlnaHQgb2YgdGhlIHJpZ2h0bW9zdCB4LlxuICBcbiAgT3B0aW9uYWwgYXJncyBsbyAoZGVmYXVsdCAwKSBhbmQgaGkgKGRlZmF1bHQgYS5sZW5ndGgpIGJvdW5kIHRoZSBzbGljZVxuICBvZiBhIHRvIGJlIHNlYXJjaGVkLlxuICAqL1xuXG5cbiAgaW5zb3J0ID0gZnVuY3Rpb24oYSwgeCwgbG8sIGhpLCBjbXApIHtcbiAgICB2YXIgbWlkO1xuICAgIGlmIChsbyA9PSBudWxsKSB7XG4gICAgICBsbyA9IDA7XG4gICAgfVxuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKGxvIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsbyBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xuICAgIH1cbiAgICBpZiAoaGkgPT0gbnVsbCkge1xuICAgICAgaGkgPSBhLmxlbmd0aDtcbiAgICB9XG4gICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgIG1pZCA9IGZsb29yKChsbyArIGhpKSAvIDIpO1xuICAgICAgaWYgKGNtcCh4LCBhW21pZF0pIDwgMCkge1xuICAgICAgICBoaSA9IG1pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvID0gbWlkICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChbXS5zcGxpY2UuYXBwbHkoYSwgW2xvLCBsbyAtIGxvXS5jb25jYXQoeCkpLCB4KTtcbiAgfTtcblxuICAvKlxuICBQdXNoIGl0ZW0gb250byBoZWFwLCBtYWludGFpbmluZyB0aGUgaGVhcCBpbnZhcmlhbnQuXG4gICovXG5cblxuICBoZWFwcHVzaCA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBjbXApIHtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGFycmF5LnB1c2goaXRlbSk7XG4gICAgcmV0dXJuIF9zaWZ0ZG93bihhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gMSwgY21wKTtcbiAgfTtcblxuICAvKlxuICBQb3AgdGhlIHNtYWxsZXN0IGl0ZW0gb2ZmIHRoZSBoZWFwLCBtYWludGFpbmluZyB0aGUgaGVhcCBpbnZhcmlhbnQuXG4gICovXG5cblxuICBoZWFwcG9wID0gZnVuY3Rpb24oYXJyYXksIGNtcCkge1xuICAgIHZhciBsYXN0ZWx0LCByZXR1cm5pdGVtO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgbGFzdGVsdCA9IGFycmF5LnBvcCgpO1xuICAgIGlmIChhcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybml0ZW0gPSBhcnJheVswXTtcbiAgICAgIGFycmF5WzBdID0gbGFzdGVsdDtcbiAgICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybml0ZW0gPSBsYXN0ZWx0O1xuICAgIH1cbiAgICByZXR1cm4gcmV0dXJuaXRlbTtcbiAgfTtcblxuICAvKlxuICBQb3AgYW5kIHJldHVybiB0aGUgY3VycmVudCBzbWFsbGVzdCB2YWx1ZSwgYW5kIGFkZCB0aGUgbmV3IGl0ZW0uXG4gIFxuICBUaGlzIGlzIG1vcmUgZWZmaWNpZW50IHRoYW4gaGVhcHBvcCgpIGZvbGxvd2VkIGJ5IGhlYXBwdXNoKCksIGFuZCBjYW4gYmUgXG4gIG1vcmUgYXBwcm9wcmlhdGUgd2hlbiB1c2luZyBhIGZpeGVkIHNpemUgaGVhcC4gTm90ZSB0aGF0IHRoZSB2YWx1ZVxuICByZXR1cm5lZCBtYXkgYmUgbGFyZ2VyIHRoYW4gaXRlbSEgVGhhdCBjb25zdHJhaW5zIHJlYXNvbmFibGUgdXNlIG9mXG4gIHRoaXMgcm91dGluZSB1bmxlc3Mgd3JpdHRlbiBhcyBwYXJ0IG9mIGEgY29uZGl0aW9uYWwgcmVwbGFjZW1lbnQ6XG4gICAgICBpZiBpdGVtID4gYXJyYXlbMF1cbiAgICAgICAgaXRlbSA9IGhlYXByZXBsYWNlKGFycmF5LCBpdGVtKVxuICAqL1xuXG5cbiAgaGVhcHJlcGxhY2UgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIHJldHVybml0ZW07XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICByZXR1cm5pdGVtID0gYXJyYXlbMF07XG4gICAgYXJyYXlbMF0gPSBpdGVtO1xuICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgcmV0dXJuIHJldHVybml0ZW07XG4gIH07XG5cbiAgLypcbiAgRmFzdCB2ZXJzaW9uIG9mIGEgaGVhcHB1c2ggZm9sbG93ZWQgYnkgYSBoZWFwcG9wLlxuICAqL1xuXG5cbiAgaGVhcHB1c2hwb3AgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIF9yZWY7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBpZiAoYXJyYXkubGVuZ3RoICYmIGNtcChhcnJheVswXSwgaXRlbSkgPCAwKSB7XG4gICAgICBfcmVmID0gW2FycmF5WzBdLCBpdGVtXSwgaXRlbSA9IF9yZWZbMF0sIGFycmF5WzBdID0gX3JlZlsxXTtcbiAgICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiBpdGVtO1xuICB9O1xuXG4gIC8qXG4gIFRyYW5zZm9ybSBsaXN0IGludG8gYSBoZWFwLCBpbi1wbGFjZSwgaW4gTyhhcnJheS5sZW5ndGgpIHRpbWUuXG4gICovXG5cblxuICBoZWFwaWZ5ID0gZnVuY3Rpb24oYXJyYXksIGNtcCkge1xuICAgIHZhciBpLCBfaSwgX2osIF9sZW4sIF9yZWYsIF9yZWYxLCBfcmVzdWx0cywgX3Jlc3VsdHMxO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgX3JlZjEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICBfcmVzdWx0czEgPSBbXTtcbiAgICAgIGZvciAodmFyIF9qID0gMCwgX3JlZiA9IGZsb29yKGFycmF5Lmxlbmd0aCAvIDIpOyAwIDw9IF9yZWYgPyBfaiA8IF9yZWYgOiBfaiA+IF9yZWY7IDAgPD0gX3JlZiA/IF9qKysgOiBfai0tKXsgX3Jlc3VsdHMxLnB1c2goX2opOyB9XG4gICAgICByZXR1cm4gX3Jlc3VsdHMxO1xuICAgIH0pLmFwcGx5KHRoaXMpLnJldmVyc2UoKTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZjEubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIGkgPSBfcmVmMVtfaV07XG4gICAgICBfcmVzdWx0cy5wdXNoKF9zaWZ0dXAoYXJyYXksIGksIGNtcCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH07XG5cbiAgLypcbiAgVXBkYXRlIHRoZSBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gaXRlbSBpbiB0aGUgaGVhcC5cbiAgVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgY2FsbGVkIGV2ZXJ5IHRpbWUgdGhlIGl0ZW0gaXMgYmVpbmcgbW9kaWZpZWQuXG4gICovXG5cblxuICB1cGRhdGVJdGVtID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGNtcCkge1xuICAgIHZhciBwb3M7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBwb3MgPSBhcnJheS5pbmRleE9mKGl0ZW0pO1xuICAgIGlmIChwb3MgPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zaWZ0ZG93bihhcnJheSwgMCwgcG9zLCBjbXApO1xuICAgIHJldHVybiBfc2lmdHVwKGFycmF5LCBwb3MsIGNtcCk7XG4gIH07XG5cbiAgLypcbiAgRmluZCB0aGUgbiBsYXJnZXN0IGVsZW1lbnRzIGluIGEgZGF0YXNldC5cbiAgKi9cblxuXG4gIG5sYXJnZXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGNtcCkge1xuICAgIHZhciBlbGVtLCByZXN1bHQsIF9pLCBfbGVuLCBfcmVmO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgcmVzdWx0ID0gYXJyYXkuc2xpY2UoMCwgbik7XG4gICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBoZWFwaWZ5KHJlc3VsdCwgY21wKTtcbiAgICBfcmVmID0gYXJyYXkuc2xpY2Uobik7XG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBfcmVmLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBlbGVtID0gX3JlZltfaV07XG4gICAgICBoZWFwcHVzaHBvcChyZXN1bHQsIGVsZW0sIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQuc29ydChjbXApLnJldmVyc2UoKTtcbiAgfTtcblxuICAvKlxuICBGaW5kIHRoZSBuIHNtYWxsZXN0IGVsZW1lbnRzIGluIGEgZGF0YXNldC5cbiAgKi9cblxuXG4gIG5zbWFsbGVzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBjbXApIHtcbiAgICB2YXIgZWxlbSwgaSwgbG9zLCByZXN1bHQsIF9pLCBfaiwgX2xlbiwgX3JlZiwgX3JlZjEsIF9yZXN1bHRzO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKG4gKiAxMCA8PSBhcnJheS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCA9IGFycmF5LnNsaWNlKDAsIG4pLnNvcnQoY21wKTtcbiAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgbG9zID0gcmVzdWx0W3Jlc3VsdC5sZW5ndGggLSAxXTtcbiAgICAgIF9yZWYgPSBhcnJheS5zbGljZShuKTtcbiAgICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZi5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgICBlbGVtID0gX3JlZltfaV07XG4gICAgICAgIGlmIChjbXAoZWxlbSwgbG9zKSA8IDApIHtcbiAgICAgICAgICBpbnNvcnQocmVzdWx0LCBlbGVtLCAwLCBudWxsLCBjbXApO1xuICAgICAgICAgIHJlc3VsdC5wb3AoKTtcbiAgICAgICAgICBsb3MgPSByZXN1bHRbcmVzdWx0Lmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBoZWFwaWZ5KGFycmF5LCBjbXApO1xuICAgIF9yZXN1bHRzID0gW107XG4gICAgZm9yIChpID0gX2ogPSAwLCBfcmVmMSA9IG1pbihuLCBhcnJheS5sZW5ndGgpOyAwIDw9IF9yZWYxID8gX2ogPCBfcmVmMSA6IF9qID4gX3JlZjE7IGkgPSAwIDw9IF9yZWYxID8gKytfaiA6IC0tX2opIHtcbiAgICAgIF9yZXN1bHRzLnB1c2goaGVhcHBvcChhcnJheSwgY21wKSk7XG4gICAgfVxuICAgIHJldHVybiBfcmVzdWx0cztcbiAgfTtcblxuICBfc2lmdGRvd24gPSBmdW5jdGlvbihhcnJheSwgc3RhcnRwb3MsIHBvcywgY21wKSB7XG4gICAgdmFyIG5ld2l0ZW0sIHBhcmVudCwgcGFyZW50cG9zO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgbmV3aXRlbSA9IGFycmF5W3Bvc107XG4gICAgd2hpbGUgKHBvcyA+IHN0YXJ0cG9zKSB7XG4gICAgICBwYXJlbnRwb3MgPSAocG9zIC0gMSkgPj4gMTtcbiAgICAgIHBhcmVudCA9IGFycmF5W3BhcmVudHBvc107XG4gICAgICBpZiAoY21wKG5ld2l0ZW0sIHBhcmVudCkgPCAwKSB7XG4gICAgICAgIGFycmF5W3Bvc10gPSBwYXJlbnQ7XG4gICAgICAgIHBvcyA9IHBhcmVudHBvcztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5W3Bvc10gPSBuZXdpdGVtO1xuICB9O1xuXG4gIF9zaWZ0dXAgPSBmdW5jdGlvbihhcnJheSwgcG9zLCBjbXApIHtcbiAgICB2YXIgY2hpbGRwb3MsIGVuZHBvcywgbmV3aXRlbSwgcmlnaHRwb3MsIHN0YXJ0cG9zO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgZW5kcG9zID0gYXJyYXkubGVuZ3RoO1xuICAgIHN0YXJ0cG9zID0gcG9zO1xuICAgIG5ld2l0ZW0gPSBhcnJheVtwb3NdO1xuICAgIGNoaWxkcG9zID0gMiAqIHBvcyArIDE7XG4gICAgd2hpbGUgKGNoaWxkcG9zIDwgZW5kcG9zKSB7XG4gICAgICByaWdodHBvcyA9IGNoaWxkcG9zICsgMTtcbiAgICAgIGlmIChyaWdodHBvcyA8IGVuZHBvcyAmJiAhKGNtcChhcnJheVtjaGlsZHBvc10sIGFycmF5W3JpZ2h0cG9zXSkgPCAwKSkge1xuICAgICAgICBjaGlsZHBvcyA9IHJpZ2h0cG9zO1xuICAgICAgfVxuICAgICAgYXJyYXlbcG9zXSA9IGFycmF5W2NoaWxkcG9zXTtcbiAgICAgIHBvcyA9IGNoaWxkcG9zO1xuICAgICAgY2hpbGRwb3MgPSAyICogcG9zICsgMTtcbiAgICB9XG4gICAgYXJyYXlbcG9zXSA9IG5ld2l0ZW07XG4gICAgcmV0dXJuIF9zaWZ0ZG93bihhcnJheSwgc3RhcnRwb3MsIHBvcywgY21wKTtcbiAgfTtcblxuICBIZWFwID0gKGZ1bmN0aW9uKCkge1xuICAgIEhlYXAucHVzaCA9IGhlYXBwdXNoO1xuXG4gICAgSGVhcC5wb3AgPSBoZWFwcG9wO1xuXG4gICAgSGVhcC5yZXBsYWNlID0gaGVhcHJlcGxhY2U7XG5cbiAgICBIZWFwLnB1c2hwb3AgPSBoZWFwcHVzaHBvcDtcblxuICAgIEhlYXAuaGVhcGlmeSA9IGhlYXBpZnk7XG5cbiAgICBIZWFwLm5sYXJnZXN0ID0gbmxhcmdlc3Q7XG5cbiAgICBIZWFwLm5zbWFsbGVzdCA9IG5zbWFsbGVzdDtcblxuICAgIGZ1bmN0aW9uIEhlYXAoY21wKSB7XG4gICAgICB0aGlzLmNtcCA9IGNtcCAhPSBudWxsID8gY21wIDogZGVmYXVsdENtcDtcbiAgICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICB9XG5cbiAgICBIZWFwLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGhlYXBwdXNoKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaGVhcHBvcCh0aGlzLm5vZGVzLCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzWzBdO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmluZGV4T2YoeCkgIT09IC0xO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGhlYXByZXBsYWNlKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucHVzaHBvcCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBoZWFwcHVzaHBvcCh0aGlzLm5vZGVzLCB4LCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmhlYXBpZnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoZWFwaWZ5KHRoaXMubm9kZXMsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUudXBkYXRlSXRlbSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB1cGRhdGVJdGVtKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzID0gW107XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5sZW5ndGggPT09IDA7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBoZWFwO1xuICAgICAgaGVhcCA9IG5ldyBIZWFwKCk7XG4gICAgICBoZWFwLm5vZGVzID0gdGhpcy5ub2Rlcy5zbGljZSgwKTtcbiAgICAgIHJldHVybiBoZWFwO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5zbGljZSgwKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuaW5zZXJ0ID0gSGVhcC5wcm90b3R5cGUucHVzaDtcblxuICAgIEhlYXAucHJvdG90eXBlLnJlbW92ZSA9IEhlYXAucHJvdG90eXBlLnBvcDtcblxuICAgIEhlYXAucHJvdG90eXBlLnRvcCA9IEhlYXAucHJvdG90eXBlLnBlZWs7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5mcm9udCA9IEhlYXAucHJvdG90eXBlLnBlZWs7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5oYXMgPSBIZWFwLnByb3RvdHlwZS5jb250YWlucztcblxuICAgIEhlYXAucHJvdG90eXBlLmNvcHkgPSBIZWFwLnByb3RvdHlwZS5jbG9uZTtcblxuICAgIHJldHVybiBIZWFwO1xuXG4gIH0pKCk7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlICE9PSBudWxsID8gbW9kdWxlLmV4cG9ydHMgOiB2b2lkIDApIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhlYXA7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LkhlYXAgPSBIZWFwO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnSGVhcCcgICAgICAgICAgICAgICAgIDogcmVxdWlyZSgnaGVhcCcpLFxuICAgICdOb2RlJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvTm9kZScpLFxuICAgICdHcmlkJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvR3JpZCcpLFxuICAgICdVdGlsJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvVXRpbCcpLFxuICAgICdIZXVyaXN0aWMnICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvSGV1cmlzdGljJyksXG4gICAgJ0FTdGFyRmluZGVyJyAgICAgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9BU3RhckZpbmRlcicpLFxuICAgICdCZXN0Rmlyc3RGaW5kZXInICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmVzdEZpcnN0RmluZGVyJyksXG4gICAgJ0JyZWFkdGhGaXJzdEZpbmRlcicgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CcmVhZHRoRmlyc3RGaW5kZXInKSxcbiAgICAnRGlqa3N0cmFGaW5kZXInICAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0RpamtzdHJhRmluZGVyJyksXG4gICAgJ0JpQVN0YXJGaW5kZXInICAgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CaUFTdGFyRmluZGVyJyksXG4gICAgJ0JpQmVzdEZpcnN0RmluZGVyJyAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CaUJlc3RGaXJzdEZpbmRlcicpLFxuICAgICdCaUJyZWFkdGhGaXJzdEZpbmRlcicgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmlCcmVhZHRoRmlyc3RGaW5kZXInKSxcbiAgICAnQmlEaWprc3RyYUZpbmRlcicgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0JpRGlqa3N0cmFGaW5kZXInKSxcbiAgICAnSnVtcFBvaW50RmluZGVyJyAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0p1bXBQb2ludEZpbmRlcicpLFxuICAgICdJREFTdGFyRmluZGVyJyAgICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvSURBU3RhckZpbmRlcicpXG59O1xuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL05vZGUnKTtcblxuLyoqXG4gKiBUaGUgR3JpZCBjbGFzcywgd2hpY2ggc2VydmVzIGFzIHRoZSBlbmNhcHN1bGF0aW9uIG9mIHRoZSBsYXlvdXQgb2YgdGhlIG5vZGVzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGggTnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IE51bWJlciBvZiByb3dzIG9mIHRoZSBncmlkLlxuICogQHBhcmFtIHtBcnJheS48QXJyYXkuPChudW1iZXJ8Ym9vbGVhbik+Pn0gW21hdHJpeF0gLSBBIDAtMSBtYXRyaXhcbiAqICAgICByZXByZXNlbnRpbmcgdGhlIHdhbGthYmxlIHN0YXR1cyBvZiB0aGUgbm9kZXMoMCBvciBmYWxzZSBmb3Igd2Fsa2FibGUpLlxuICogICAgIElmIHRoZSBtYXRyaXggaXMgbm90IHN1cHBsaWVkLCBhbGwgdGhlIG5vZGVzIHdpbGwgYmUgd2Fsa2FibGUuICAqL1xuZnVuY3Rpb24gR3JpZCh3aWR0aCwgaGVpZ2h0LCBtYXRyaXgpIHtcbiAgICAvKipcbiAgICAgKiBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgIC8qKlxuICAgICAqIFRoZSBudW1iZXIgb2Ygcm93cyBvZiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIEEgMkQgYXJyYXkgb2Ygbm9kZXMuXG4gICAgICovXG4gICAgdGhpcy5ub2RlcyA9IHRoaXMuX2J1aWxkTm9kZXMod2lkdGgsIGhlaWdodCwgbWF0cml4KTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhbmQgcmV0dXJuIHRoZSBub2Rlcy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXJ8Ym9vbGVhbj4+fSBbbWF0cml4XSAtIEEgMC0xIG1hdHJpeCByZXByZXNlbnRpbmdcbiAqICAgICB0aGUgd2Fsa2FibGUgc3RhdHVzIG9mIHRoZSBub2Rlcy5cbiAqIEBzZWUgR3JpZFxuICovXG5HcmlkLnByb3RvdHlwZS5fYnVpbGROb2RlcyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQsIG1hdHJpeCkge1xuICAgIHZhciBpLCBqLFxuICAgICAgICBub2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKG1hdHJpeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBub2RlcztcbiAgICB9XG5cbiAgICBpZiAobWF0cml4Lmxlbmd0aCAhPT0gaGVpZ2h0IHx8IG1hdHJpeFswXS5sZW5ndGggIT09IHdpZHRoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWF0cml4IHNpemUgZG9lcyBub3QgZml0Jyk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGhlaWdodDsgKytpKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB3aWR0aDsgKytqKSB7XG4gICAgICAgICAgICBpZiAobWF0cml4W2ldW2pdKSB7XG4gICAgICAgICAgICAgICAgLy8gMCwgZmFsc2UsIG51bGwgd2lsbCBiZSB3YWxrYWJsZVxuICAgICAgICAgICAgICAgIC8vIHdoaWxlIG90aGVycyB3aWxsIGJlIHVuLXdhbGthYmxlXG4gICAgICAgICAgICAgICAgbm9kZXNbaV1bal0ud2Fsa2FibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlcztcbn07XG5cblxuR3JpZC5wcm90b3R5cGUuZ2V0Tm9kZUF0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzW3ldW3hdO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBub2RlIGF0IHRoZSBnaXZlbiBwb3NpdGlvbiBpcyB3YWxrYWJsZS5cbiAqIChBbHNvIHJldHVybnMgZmFsc2UgaWYgdGhlIHBvc2l0aW9uIGlzIG91dHNpZGUgdGhlIGdyaWQuKVxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gLSBUaGUgd2Fsa2FiaWxpdHkgb2YgdGhlIG5vZGUuXG4gKi9cbkdyaWQucHJvdG90eXBlLmlzV2Fsa2FibGVBdCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5pc0luc2lkZSh4LCB5KSAmJiB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBwb3NpdGlvbiBpcyBpbnNpZGUgdGhlIGdyaWQuXG4gKiBYWFg6IGBncmlkLmlzSW5zaWRlKHgsIHkpYCBpcyB3aWVyZCB0byByZWFkLlxuICogSXQgc2hvdWxkIGJlIGAoeCwgeSkgaXMgaW5zaWRlIGdyaWRgLCBidXQgSSBmYWlsZWQgdG8gZmluZCBhIGJldHRlclxuICogbmFtZSBmb3IgdGhpcyBtZXRob2QuXG4gKiBAcGFyYW0ge251bWJlcn0geFxuICogQHBhcmFtIHtudW1iZXJ9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbkdyaWQucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiAoeCA+PSAwICYmIHggPCB0aGlzLndpZHRoKSAmJiAoeSA+PSAwICYmIHkgPCB0aGlzLmhlaWdodCk7XG59O1xuXG5cbi8qKlxuICogU2V0IHdoZXRoZXIgdGhlIG5vZGUgb24gdGhlIGdpdmVuIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICogTk9URTogdGhyb3dzIGV4Y2VwdGlvbiBpZiB0aGUgY29vcmRpbmF0ZSBpcyBub3QgaW5zaWRlIHRoZSBncmlkLlxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtib29sZWFufSB3YWxrYWJsZSAtIFdoZXRoZXIgdGhlIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICovXG5HcmlkLnByb3RvdHlwZS5zZXRXYWxrYWJsZUF0ID0gZnVuY3Rpb24oeCwgeSwgd2Fsa2FibGUpIHtcbiAgICB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlID0gd2Fsa2FibGU7XG59O1xuXG5cbi8qKlxuICogR2V0IHRoZSBuZWlnaGJvcnMgb2YgdGhlIGdpdmVuIG5vZGUuXG4gKlxuICogICAgIG9mZnNldHMgICAgICBkaWFnb25hbE9mZnNldHM6XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMCB8ICAgfCAgICB8IDAgfCAgIHwgMSB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAzIHwgICB8IDEgfCAgICB8ICAgfCAgIHwgICB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMiB8ICAgfCAgICB8IDMgfCAgIHwgMiB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKlxuICogIFdoZW4gYWxsb3dEaWFnb25hbCBpcyB0cnVlLCBpZiBvZmZzZXRzW2ldIGlzIHZhbGlkLCB0aGVuXG4gKiAgZGlhZ29uYWxPZmZzZXRzW2ldIGFuZFxuICogIGRpYWdvbmFsT2Zmc2V0c1soaSArIDEpICUgNF0gaXMgdmFsaWQuXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWxsb3dEaWFnb25hbFxuICogQHBhcmFtIHtib29sZWFufSBkb250Q3Jvc3NDb3JuZXJzXG4gKi9cbkdyaWQucHJvdG90eXBlLmdldE5laWdoYm9ycyA9IGZ1bmN0aW9uKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpIHtcbiAgICB2YXIgeCA9IG5vZGUueCxcbiAgICAgICAgeSA9IG5vZGUueSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sXG4gICAgICAgIHMwID0gZmFsc2UsIGQwID0gZmFsc2UsXG4gICAgICAgIHMxID0gZmFsc2UsIGQxID0gZmFsc2UsXG4gICAgICAgIHMyID0gZmFsc2UsIGQyID0gZmFsc2UsXG4gICAgICAgIHMzID0gZmFsc2UsIGQzID0gZmFsc2UsXG4gICAgICAgIG5vZGVzID0gdGhpcy5ub2RlcztcblxuICAgIC8vIOKGkVxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4LCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3hdKTtcbiAgICAgICAgczAgPSB0cnVlO1xuICAgIH1cbiAgICAvLyDihpJcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlQXQoeCArIDEsIHkpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3ldW3ggKyAxXSk7XG4gICAgICAgIHMxID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8g4oaTXG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beF0pO1xuICAgICAgICBzMiA9IHRydWU7XG4gICAgfVxuICAgIC8vIOKGkFxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeV1beCAtIDFdKTtcbiAgICAgICAgczMgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYWxsb3dEaWFnb25hbCkge1xuICAgICAgICByZXR1cm4gbmVpZ2hib3JzO1xuICAgIH1cblxuICAgIGlmIChkb250Q3Jvc3NDb3JuZXJzKSB7XG4gICAgICAgIGQwID0gczMgJiYgczA7XG4gICAgICAgIGQxID0gczAgJiYgczE7XG4gICAgICAgIGQyID0gczEgJiYgczI7XG4gICAgICAgIGQzID0gczIgJiYgczM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZDAgPSBzMyB8fCBzMDtcbiAgICAgICAgZDEgPSBzMCB8fCBzMTtcbiAgICAgICAgZDIgPSBzMSB8fCBzMjtcbiAgICAgICAgZDMgPSBzMiB8fCBzMztcbiAgICB9XG5cbiAgICAvLyDihpZcbiAgICBpZiAoZDAgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgLSAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5IC0gMV1beCAtIDFdKTtcbiAgICB9XG4gICAgLy8g4oaXXG4gICAgaWYgKGQxICYmIHRoaXMuaXNXYWxrYWJsZUF0KHggKyAxLCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3ggKyAxXSk7XG4gICAgfVxuICAgIC8vIOKGmFxuICAgIGlmIChkMiAmJiB0aGlzLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSArIDEpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3kgKyAxXVt4ICsgMV0pO1xuICAgIH1cbiAgICAvLyDihplcbiAgICBpZiAoZDMgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beCAtIDFdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxuXG4vKipcbiAqIEdldCBhIGNsb25lIG9mIHRoaXMgZ3JpZC5cbiAqIEByZXR1cm4ge0dyaWR9IENsb25lZCBncmlkLlxuICovXG5HcmlkLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBqLFxuXG4gICAgICAgIHdpZHRoID0gdGhpcy53aWR0aCxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5oZWlnaHQsXG4gICAgICAgIHRoaXNOb2RlcyA9IHRoaXMubm9kZXMsXG5cbiAgICAgICAgbmV3R3JpZCA9IG5ldyBHcmlkKHdpZHRoLCBoZWlnaHQpLFxuICAgICAgICBuZXdOb2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbmV3Tm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbmV3Tm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpLCB0aGlzTm9kZXNbaV1bal0ud2Fsa2FibGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV3R3JpZC5ub2RlcyA9IG5ld05vZGVzO1xuXG4gICAgcmV0dXJuIG5ld0dyaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWQ7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgUEYuSGV1cmlzdGljXG4gKiBAZGVzY3JpcHRpb24gQSBjb2xsZWN0aW9uIG9mIGhldXJpc3RpYyBmdW5jdGlvbnMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBNYW5oYXR0YW4gZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IGR4ICsgZHlcbiAgICovXG4gIG1hbmhhdHRhbjogZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICByZXR1cm4gZHggKyBkeTtcbiAgfSxcblxuICAvKipcbiAgICogRXVjbGlkZWFuIGRpc3RhbmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZHggLSBEaWZmZXJlbmNlIGluIHguXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeSAtIERpZmZlcmVuY2UgaW4geS5cbiAgICogQHJldHVybiB7bnVtYmVyfSBzcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxuICAgKi9cbiAgZXVjbGlkZWFuOiBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVieXNoZXYgZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IG1heChkeCwgZHkpXG4gICAqL1xuICBjaGVieXNoZXY6IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KGR4LCBkeSk7XG4gIH1cblxufTtcbiIsIi8qKlxuICogQSBub2RlIGluIGdyaWQuIFxuICogVGhpcyBjbGFzcyBob2xkcyBzb21lIGJhc2ljIGluZm9ybWF0aW9uIGFib3V0IGEgbm9kZSBhbmQgY3VzdG9tIFxuICogYXR0cmlidXRlcyBtYXkgYmUgYWRkZWQsIGRlcGVuZGluZyBvbiB0aGUgYWxnb3JpdGhtcycgbmVlZHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gVGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3dhbGthYmxlXSAtIFdoZXRoZXIgdGhpcyBub2RlIGlzIHdhbGthYmxlLlxuICovXG5mdW5jdGlvbiBOb2RlKHgsIHksIHdhbGthYmxlKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnggPSB4O1xuICAgIC8qKlxuICAgICAqIFRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGUgb24gdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy55ID0geTtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoaXMgbm9kZSBjYW4gYmUgd2Fsa2VkIHRocm91Z2guXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMud2Fsa2FibGUgPSAod2Fsa2FibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiB3YWxrYWJsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG4iLCIvKipcbiAqIEJhY2t0cmFjZSBhY2NvcmRpbmcgdG8gdGhlIHBhcmVudCByZWNvcmRzIGFuZCByZXR1cm4gdGhlIHBhdGguXG4gKiAoaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kIGVuZCBub2RlcylcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBFbmQgbm9kZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gdGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gYmFja3RyYWNlKG5vZGUpIHtcbiAgICB2YXIgcGF0aCA9IFtbbm9kZS54LCBub2RlLnldXTtcbiAgICB3aGlsZSAobm9kZS5wYXJlbnQpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICBwYXRoLnB1c2goW25vZGUueCwgbm9kZS55XSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJldmVyc2UoKTtcbn1cbmV4cG9ydHMuYmFja3RyYWNlID0gYmFja3RyYWNlO1xuXG4vKipcbiAqIEJhY2t0cmFjZSBmcm9tIHN0YXJ0IGFuZCBlbmQgbm9kZSwgYW5kIHJldHVybiB0aGUgcGF0aC5cbiAqIChpbmNsdWRpbmcgYm90aCBzdGFydCBhbmQgZW5kIG5vZGVzKVxuICogQHBhcmFtIHtOb2RlfVxuICogQHBhcmFtIHtOb2RlfVxuICovXG5mdW5jdGlvbiBiaUJhY2t0cmFjZShub2RlQSwgbm9kZUIpIHtcbiAgICB2YXIgcGF0aEEgPSBiYWNrdHJhY2Uobm9kZUEpLFxuICAgICAgICBwYXRoQiA9IGJhY2t0cmFjZShub2RlQik7XG4gICAgcmV0dXJuIHBhdGhBLmNvbmNhdChwYXRoQi5yZXZlcnNlKCkpO1xufVxuZXhwb3J0cy5iaUJhY2t0cmFjZSA9IGJpQmFja3RyYWNlO1xuXG4vKipcbiAqIENvbXB1dGUgdGhlIGxlbmd0aCBvZiB0aGUgcGF0aC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7bnVtYmVyfSBUaGUgbGVuZ3RoIG9mIHRoZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIHBhdGhMZW5ndGgocGF0aCkge1xuICAgIHZhciBpLCBzdW0gPSAwLCBhLCBiLCBkeCwgZHk7XG4gICAgZm9yIChpID0gMTsgaSA8IHBhdGgubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYSA9IHBhdGhbaSAtIDFdO1xuICAgICAgICBiID0gcGF0aFtpXTtcbiAgICAgICAgZHggPSBhWzBdIC0gYlswXTtcbiAgICAgICAgZHkgPSBhWzFdIC0gYlsxXTtcbiAgICAgICAgc3VtICs9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgfVxuICAgIHJldHVybiBzdW07XG59XG5leHBvcnRzLnBhdGhMZW5ndGggPSBwYXRoTGVuZ3RoO1xuXG5cbi8qKlxuICogR2l2ZW4gdGhlIHN0YXJ0IGFuZCBlbmQgY29vcmRpbmF0ZXMsIHJldHVybiBhbGwgdGhlIGNvb3JkaW5hdGVzIGx5aW5nXG4gKiBvbiB0aGUgbGluZSBmb3JtZWQgYnkgdGhlc2UgY29vcmRpbmF0ZXMsIGJhc2VkIG9uIEJyZXNlbmhhbSdzIGFsZ29yaXRobS5cbiAqIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQnJlc2VuaGFtJ3NfbGluZV9hbGdvcml0aG0jU2ltcGxpZmljYXRpb25cbiAqIEBwYXJhbSB7bnVtYmVyfSB4MCBTdGFydCB4IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB5MCBTdGFydCB5IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB4MSBFbmQgeCBjb29yZGluYXRlXG4gKiBAcGFyYW0ge251bWJlcn0geTEgRW5kIHkgY29vcmRpbmF0ZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gVGhlIGNvb3JkaW5hdGVzIG9uIHRoZSBsaW5lXG4gKi9cbmZ1bmN0aW9uIGludGVycG9sYXRlKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzLFxuICAgICAgICBsaW5lID0gW10sXG4gICAgICAgIHN4LCBzeSwgZHgsIGR5LCBlcnIsIGUyO1xuXG4gICAgZHggPSBhYnMoeDEgLSB4MCk7XG4gICAgZHkgPSBhYnMoeTEgLSB5MCk7XG5cbiAgICBzeCA9ICh4MCA8IHgxKSA/IDEgOiAtMTtcbiAgICBzeSA9ICh5MCA8IHkxKSA/IDEgOiAtMTtcblxuICAgIGVyciA9IGR4IC0gZHk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBsaW5lLnB1c2goW3gwLCB5MF0pO1xuXG4gICAgICAgIGlmICh4MCA9PT0geDEgJiYgeTAgPT09IHkxKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZTIgPSAyICogZXJyO1xuICAgICAgICBpZiAoZTIgPiAtZHkpIHtcbiAgICAgICAgICAgIGVyciA9IGVyciAtIGR5O1xuICAgICAgICAgICAgeDAgPSB4MCArIHN4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChlMiA8IGR4KSB7XG4gICAgICAgICAgICBlcnIgPSBlcnIgKyBkeDtcbiAgICAgICAgICAgIHkwID0geTAgKyBzeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaW5lO1xufVxuZXhwb3J0cy5pbnRlcnBvbGF0ZSA9IGludGVycG9sYXRlO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjb21wcmVzc2VkIHBhdGgsIHJldHVybiBhIG5ldyBwYXRoIHRoYXQgaGFzIGFsbCB0aGUgc2VnbWVudHNcbiAqIGluIGl0IGludGVycG9sYXRlZC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gZXhwYW5kZWQgcGF0aFxuICovXG5mdW5jdGlvbiBleHBhbmRQYXRoKHBhdGgpIHtcbiAgICB2YXIgZXhwYW5kZWQgPSBbXSxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGNvb3JkMCwgY29vcmQxLFxuICAgICAgICBpbnRlcnBvbGF0ZWQsXG4gICAgICAgIGludGVycG9sYXRlZExlbixcbiAgICAgICAgaSwgajtcblxuICAgIGlmIChsZW4gPCAyKSB7XG4gICAgICAgIHJldHVybiBleHBhbmRlZDtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgIGNvb3JkMCA9IHBhdGhbaV07XG4gICAgICAgIGNvb3JkMSA9IHBhdGhbaSArIDFdO1xuXG4gICAgICAgIGludGVycG9sYXRlZCA9IGludGVycG9sYXRlKGNvb3JkMFswXSwgY29vcmQwWzFdLCBjb29yZDFbMF0sIGNvb3JkMVsxXSk7XG4gICAgICAgIGludGVycG9sYXRlZExlbiA9IGludGVycG9sYXRlZC5sZW5ndGg7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBpbnRlcnBvbGF0ZWRMZW4gLSAxOyArK2opIHtcbiAgICAgICAgICAgIGV4cGFuZGVkLnB1c2goaW50ZXJwb2xhdGVkW2pdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBleHBhbmRlZC5wdXNoKHBhdGhbbGVuIC0gMV0pO1xuXG4gICAgcmV0dXJuIGV4cGFuZGVkO1xufVxuZXhwb3J0cy5leHBhbmRQYXRoID0gZXhwYW5kUGF0aDtcblxuXG4vKipcbiAqIFNtb290aGVuIHRoZSBnaXZlIHBhdGguXG4gKiBUaGUgb3JpZ2luYWwgcGF0aCB3aWxsIG5vdCBiZSBtb2RpZmllZDsgYSBuZXcgcGF0aCB3aWxsIGJlIHJldHVybmVkLlxuICogQHBhcmFtIHtQRi5HcmlkfSBncmlkXG4gKiBAcGFyYW0ge0FycmF5LjxBcnJheS48bnVtYmVyPj59IHBhdGggVGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gc21vb3RoZW5QYXRoKGdyaWQsIHBhdGgpIHtcbiAgICB2YXIgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHgwID0gcGF0aFswXVswXSwgICAgICAgIC8vIHBhdGggc3RhcnQgeFxuICAgICAgICB5MCA9IHBhdGhbMF1bMV0sICAgICAgICAvLyBwYXRoIHN0YXJ0IHlcbiAgICAgICAgeDEgPSBwYXRoW2xlbiAtIDFdWzBdLCAgLy8gcGF0aCBlbmQgeFxuICAgICAgICB5MSA9IHBhdGhbbGVuIC0gMV1bMV0sICAvLyBwYXRoIGVuZCB5XG4gICAgICAgIHN4LCBzeSwgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgc3RhcnQgY29vcmRpbmF0ZVxuICAgICAgICBleCwgZXksICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGVuZCBjb29yZGluYXRlXG4gICAgICAgIGx4LCBseSwgICAgICAgICAgICAgICAgIC8vIGxhc3QgdmFsaWQgZW5kIGNvb3JkaW5hdGVcbiAgICAgICAgbmV3UGF0aCxcbiAgICAgICAgaSwgaiwgY29vcmQsIGxpbmUsIHRlc3RDb29yZCwgYmxvY2tlZDtcblxuICAgIHN4ID0geDA7XG4gICAgc3kgPSB5MDtcbiAgICBseCA9IHBhdGhbMV1bMF07XG4gICAgbHkgPSBwYXRoWzFdWzFdO1xuICAgIG5ld1BhdGggPSBbW3N4LCBzeV1dO1xuXG4gICAgZm9yIChpID0gMjsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGNvb3JkID0gcGF0aFtpXTtcbiAgICAgICAgZXggPSBjb29yZFswXTtcbiAgICAgICAgZXkgPSBjb29yZFsxXTtcbiAgICAgICAgbGluZSA9IGludGVycG9sYXRlKHN4LCBzeSwgZXgsIGV5KTtcblxuICAgICAgICBibG9ja2VkID0gZmFsc2U7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBsaW5lLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICB0ZXN0Q29vcmQgPSBsaW5lW2pdO1xuXG4gICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHRlc3RDb29yZFswXSwgdGVzdENvb3JkWzFdKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG5ld1BhdGgucHVzaChbbHgsIGx5XSk7XG4gICAgICAgICAgICAgICAgc3ggPSBseDtcbiAgICAgICAgICAgICAgICBzeSA9IGx5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghYmxvY2tlZCkge1xuICAgICAgICAgICAgbHggPSBleDtcbiAgICAgICAgICAgIGx5ID0gZXk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbmV3UGF0aC5wdXNoKFt4MSwgeTFdKTtcblxuICAgIHJldHVybiBuZXdQYXRoO1xufVxuZXhwb3J0cy5zbW9vdGhlblBhdGggPSBzbW9vdGhlblBhdGg7XG4iLCJ2YXIgSGVhcCAgICAgICA9IHJlcXVpcmUoJ2hlYXAnKTtcbnZhciBVdGlsICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG52YXIgSGV1cmlzdGljICA9IHJlcXVpcmUoJy4uL2NvcmUvSGV1cmlzdGljJyk7XG5cbi8qKlxuICogQSogcGF0aC1maW5kZXIuXG4gKiBiYXNlZCB1cG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9iZ3JpbnMvamF2YXNjcmlwdC1hc3RhclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHQud2VpZ2h0IFdlaWdodCB0byBhcHBseSB0byB0aGUgaGV1cmlzdGljIHRvIGFsbG93IGZvciBzdWJvcHRpbWFsIHBhdGhzLCBcbiAqICAgICBpbiBvcmRlciB0byBzcGVlZCB1cCB0aGUgc2VhcmNoLlxuICovXG5mdW5jdGlvbiBBU3RhckZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy53ZWlnaHQgPSBvcHQud2VpZ2h0IHx8IDE7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkFTdGFyRmluZGVyLnByb3RvdHlwZS5maW5kUGF0aCA9IGZ1bmN0aW9uKHN0YXJ0WCwgc3RhcnRZLCBlbmRYLCBlbmRZLCBncmlkKSB7XG4gICAgdmFyIG9wZW5MaXN0ID0gbmV3IEhlYXAoZnVuY3Rpb24obm9kZUEsIG5vZGVCKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUEuZiAtIG5vZGVCLmY7XG4gICAgICAgIH0pLFxuICAgICAgICBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgaGV1cmlzdGljID0gdGhpcy5oZXVyaXN0aWMsXG4gICAgICAgIGFsbG93RGlhZ29uYWwgPSB0aGlzLmFsbG93RGlhZ29uYWwsXG4gICAgICAgIGRvbnRDcm9zc0Nvcm5lcnMgPSB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMsXG4gICAgICAgIHdlaWdodCA9IHRoaXMud2VpZ2h0LFxuICAgICAgICBhYnMgPSBNYXRoLmFicywgU1FSVDIgPSBNYXRoLlNRUlQyLFxuICAgICAgICBub2RlLCBuZWlnaGJvcnMsIG5laWdoYm9yLCBpLCBsLCB4LCB5LCBuZztcblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIHN0YXJ0IG5vZGUgdG8gYmUgMFxuICAgIHN0YXJ0Tm9kZS5nID0gMDtcbiAgICBzdGFydE5vZGUuZiA9IDA7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBub2RlIGludG8gdGhlIG9wZW4gbGlzdFxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBvcGVuIGxpc3QgaXMgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFvcGVuTGlzdC5lbXB0eSgpKSB7XG4gICAgICAgIC8vIHBvcCB0aGUgcG9zaXRpb24gb2Ygbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gb3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBpZiByZWFjaGVkIHRoZSBlbmQgcG9zaXRpb24sIGNvbnN0cnVjdCB0aGUgcGF0aCBhbmQgcmV0dXJuIGl0XG4gICAgICAgIGlmIChub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbC5iYWNrdHJhY2UoZW5kTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4ID0gbmVpZ2hib3IueDtcbiAgICAgICAgICAgIHkgPSBuZWlnaGJvci55O1xuXG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRpc3RhbmNlIGJldHdlZW4gY3VycmVudCBub2RlIGFuZCB0aGUgbmVpZ2hib3JcbiAgICAgICAgICAgIC8vIGFuZCBjYWxjdWxhdGUgdGhlIG5leHQgZyBzY29yZVxuICAgICAgICAgICAgbmcgPSBub2RlLmcgKyAoKHggLSBub2RlLnggPT09IDAgfHwgeSAtIG5vZGUueSA9PT0gMCkgPyAxIDogU1FSVDIpO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbmVpZ2hib3IgaGFzIG5vdCBiZWVuIGluc3BlY3RlZCB5ZXQsIG9yXG4gICAgICAgICAgICAvLyBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdCBmcm9tIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgICAgIGlmICghbmVpZ2hib3Iub3BlbmVkIHx8IG5nIDwgbmVpZ2hib3IuZykge1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBuZztcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5oID0gbmVpZ2hib3IuaCB8fCB3ZWlnaHQgKiBoZXVyaXN0aWMoYWJzKHggLSBlbmRYKSwgYWJzKHkgLSBlbmRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmVpZ2hib3IgY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGl0cyBmIHZhbHVlIGhhcyBiZWVuIHVwZGF0ZWQsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGl0cyBwb3NpdGlvbiBpbiB0aGUgb3BlbiBsaXN0XG4gICAgICAgICAgICAgICAgICAgIG9wZW5MaXN0LnVwZGF0ZUl0ZW0obmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBlbmQgZm9yIGVhY2ggbmVpZ2hib3JcbiAgICB9IC8vIGVuZCB3aGlsZSBub3Qgb3BlbiBsaXN0IGVtcHR5XG5cbiAgICAvLyBmYWlsIHRvIGZpbmQgdGhlIHBhdGhcbiAgICByZXR1cm4gW107XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFTdGFyRmluZGVyO1xuIiwidmFyIEFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9BU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIEJlc3QtRmlyc3QtU2VhcmNoIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBBU3RhckZpbmRlclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gQmVzdEZpcnN0RmluZGVyKG9wdCkge1xuICAgIEFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcblxuICAgIHZhciBvcmlnID0gdGhpcy5oZXVyaXN0aWM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgcmV0dXJuIG9yaWcoZHgsIGR5KSAqIDEwMDAwMDA7XG4gICAgfTtcbn07XG5cbkJlc3RGaXJzdEZpbmRlci5wcm90b3R5cGUgPSBuZXcgQVN0YXJGaW5kZXIoKTtcbkJlc3RGaXJzdEZpbmRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCZXN0Rmlyc3RGaW5kZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gQmVzdEZpcnN0RmluZGVyO1xuIiwidmFyIEhlYXAgICAgICAgPSByZXF1aXJlKCdoZWFwJyk7XG52YXIgVXRpbCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvVXRpbCcpO1xudmFyIEhldXJpc3RpYyAgPSByZXF1aXJlKCcuLi9jb3JlL0hldXJpc3RpYycpO1xuXG4vKipcbiAqIEEqIHBhdGgtZmluZGVyLlxuICogYmFzZWQgdXBvbiBodHRwczovL2dpdGh1Yi5jb20vYmdyaW5zL2phdmFzY3JpcHQtYXN0YXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0LndlaWdodCBXZWlnaHQgdG8gYXBwbHkgdG8gdGhlIGhldXJpc3RpYyB0byBhbGxvdyBmb3Igc3Vib3B0aW1hbCBwYXRocywgXG4gKiAgICAgaW4gb3JkZXIgdG8gc3BlZWQgdXAgdGhlIHNlYXJjaC5cbiAqL1xuZnVuY3Rpb24gQmlBU3RhckZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy53ZWlnaHQgPSBvcHQud2VpZ2h0IHx8IDE7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkJpQVN0YXJGaW5kZXIucHJvdG90eXBlLmZpbmRQYXRoID0gZnVuY3Rpb24oc3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFksIGdyaWQpIHtcbiAgICB2YXIgY21wID0gZnVuY3Rpb24obm9kZUEsIG5vZGVCKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUEuZiAtIG5vZGVCLmY7XG4gICAgICAgIH0sXG4gICAgICAgIHN0YXJ0T3Blbkxpc3QgPSBuZXcgSGVhcChjbXApLFxuICAgICAgICBlbmRPcGVuTGlzdCA9IG5ldyBIZWFwKGNtcCksXG4gICAgICAgIHN0YXJ0Tm9kZSA9IGdyaWQuZ2V0Tm9kZUF0KHN0YXJ0WCwgc3RhcnRZKSxcbiAgICAgICAgZW5kTm9kZSA9IGdyaWQuZ2V0Tm9kZUF0KGVuZFgsIGVuZFkpLFxuICAgICAgICBoZXVyaXN0aWMgPSB0aGlzLmhldXJpc3RpYyxcbiAgICAgICAgYWxsb3dEaWFnb25hbCA9IHRoaXMuYWxsb3dEaWFnb25hbCxcbiAgICAgICAgZG9udENyb3NzQ29ybmVycyA9IHRoaXMuZG9udENyb3NzQ29ybmVycyxcbiAgICAgICAgd2VpZ2h0ID0gdGhpcy53ZWlnaHQsXG4gICAgICAgIGFicyA9IE1hdGguYWJzLCBTUVJUMiA9IE1hdGguU1FSVDIsXG4gICAgICAgIG5vZGUsIG5laWdoYm9ycywgbmVpZ2hib3IsIGksIGwsIHgsIHksIG5nLFxuICAgICAgICBCWV9TVEFSVCA9IDEsIEJZX0VORCA9IDI7XG5cbiAgICAvLyBzZXQgdGhlIGBnYCBhbmQgYGZgIHZhbHVlIG9mIHRoZSBzdGFydCBub2RlIHRvIGJlIDBcbiAgICAvLyBhbmQgcHVzaCBpdCBpbnRvIHRoZSBzdGFydCBvcGVuIGxpc3RcbiAgICBzdGFydE5vZGUuZyA9IDA7XG4gICAgc3RhcnROb2RlLmYgPSAwO1xuICAgIHN0YXJ0T3Blbkxpc3QucHVzaChzdGFydE5vZGUpO1xuICAgIHN0YXJ0Tm9kZS5vcGVuZWQgPSBCWV9TVEFSVDtcblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIGVuZCBub2RlIHRvIGJlIDBcbiAgICAvLyBhbmQgcHVzaCBpdCBpbnRvIHRoZSBvcGVuIG9wZW4gbGlzdFxuICAgIGVuZE5vZGUuZyA9IDA7XG4gICAgZW5kTm9kZS5mID0gMDtcbiAgICBlbmRPcGVuTGlzdC5wdXNoKGVuZE5vZGUpO1xuICAgIGVuZE5vZGUub3BlbmVkID0gQllfRU5EO1xuXG4gICAgLy8gd2hpbGUgYm90aCB0aGUgb3BlbiBsaXN0cyBhcmUgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFzdGFydE9wZW5MaXN0LmVtcHR5KCkgJiYgIWVuZE9wZW5MaXN0LmVtcHR5KCkpIHtcblxuICAgICAgICAvLyBwb3AgdGhlIHBvc2l0aW9uIG9mIHN0YXJ0IG5vZGUgd2hpY2ggaGFzIHRoZSBtaW5pbXVtIGBmYCB2YWx1ZS5cbiAgICAgICAgbm9kZSA9IHN0YXJ0T3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCA9PT0gQllfRU5EKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmlCYWNrdHJhY2Uobm9kZSwgbmVpZ2hib3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4ID0gbmVpZ2hib3IueDtcbiAgICAgICAgICAgIHkgPSBuZWlnaGJvci55O1xuXG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRpc3RhbmNlIGJldHdlZW4gY3VycmVudCBub2RlIGFuZCB0aGUgbmVpZ2hib3JcbiAgICAgICAgICAgIC8vIGFuZCBjYWxjdWxhdGUgdGhlIG5leHQgZyBzY29yZVxuICAgICAgICAgICAgbmcgPSBub2RlLmcgKyAoKHggLSBub2RlLnggPT09IDAgfHwgeSAtIG5vZGUueSA9PT0gMCkgPyAxIDogU1FSVDIpO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbmVpZ2hib3IgaGFzIG5vdCBiZWVuIGluc3BlY3RlZCB5ZXQsIG9yXG4gICAgICAgICAgICAvLyBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdCBmcm9tIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgICAgIGlmICghbmVpZ2hib3Iub3BlbmVkIHx8IG5nIDwgbmVpZ2hib3IuZykge1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBuZztcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5oID0gbmVpZ2hib3IuaCB8fCB3ZWlnaHQgKiBoZXVyaXN0aWMoYWJzKHggLSBlbmRYKSwgYWJzKHkgLSBlbmRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydE9wZW5MaXN0LnB1c2gobmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgICAgICBuZWlnaGJvci5vcGVuZWQgPSBCWV9TVEFSVDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmVpZ2hib3IgY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGl0cyBmIHZhbHVlIGhhcyBiZWVuIHVwZGF0ZWQsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGl0cyBwb3NpdGlvbiBpbiB0aGUgb3BlbiBsaXN0XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0T3Blbkxpc3QudXBkYXRlSXRlbShuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IC8vIGVuZCBmb3IgZWFjaCBuZWlnaGJvclxuXG5cbiAgICAgICAgLy8gcG9wIHRoZSBwb3NpdGlvbiBvZiBlbmQgbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gZW5kT3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCA9PT0gQllfU1RBUlQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShuZWlnaGJvciwgbm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHggPSBuZWlnaGJvci54O1xuICAgICAgICAgICAgeSA9IG5laWdoYm9yLnk7XG5cbiAgICAgICAgICAgIC8vIGdldCB0aGUgZGlzdGFuY2UgYmV0d2VlbiBjdXJyZW50IG5vZGUgYW5kIHRoZSBuZWlnaGJvclxuICAgICAgICAgICAgLy8gYW5kIGNhbGN1bGF0ZSB0aGUgbmV4dCBnIHNjb3JlXG4gICAgICAgICAgICBuZyA9IG5vZGUuZyArICgoeCAtIG5vZGUueCA9PT0gMCB8fCB5IC0gbm9kZS55ID09PSAwKSA/IDEgOiBTUVJUMik7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBuZWlnaGJvciBoYXMgbm90IGJlZW4gaW5zcGVjdGVkIHlldCwgb3JcbiAgICAgICAgICAgIC8vIGNhbiBiZSByZWFjaGVkIHdpdGggc21hbGxlciBjb3N0IGZyb20gdGhlIGN1cnJlbnQgbm9kZVxuICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5vcGVuZWQgfHwgbmcgPCBuZWlnaGJvci5nKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZyA9IG5nO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmggPSBuZWlnaGJvci5oIHx8IHdlaWdodCAqIGhldXJpc3RpYyhhYnMoeCAtIHN0YXJ0WCksIGFicyh5IC0gc3RhcnRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBlbmRPcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gQllfRU5EO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuZWlnaGJvciBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdC5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgaXRzIGYgdmFsdWUgaGFzIGJlZW4gdXBkYXRlZCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaXRzIHBvc2l0aW9uIGluIHRoZSBvcGVuIGxpc3RcbiAgICAgICAgICAgICAgICAgICAgZW5kT3Blbkxpc3QudXBkYXRlSXRlbShuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IC8vIGVuZCBmb3IgZWFjaCBuZWlnaGJvclxuICAgIH0gLy8gZW5kIHdoaWxlIG5vdCBvcGVuIGxpc3QgZW1wdHlcblxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmlBU3RhckZpbmRlcjtcbiIsInZhciBCaUFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9CaUFTdGFyRmluZGVyJyk7XG5cbi8qKlxuICogQmktZGlyZWNpdGlvbmFsIEJlc3QtRmlyc3QtU2VhcmNoIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBCaUFTdGFyRmluZGVyXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICovXG5mdW5jdGlvbiBCaUJlc3RGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBCaUFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcblxuICAgIHZhciBvcmlnID0gdGhpcy5oZXVyaXN0aWM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgcmV0dXJuIG9yaWcoZHgsIGR5KSAqIDEwMDAwMDA7XG4gICAgfTtcbn1cblxuQmlCZXN0Rmlyc3RGaW5kZXIucHJvdG90eXBlID0gbmV3IEJpQVN0YXJGaW5kZXIoKTtcbkJpQmVzdEZpcnN0RmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJpQmVzdEZpcnN0RmluZGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJpQmVzdEZpcnN0RmluZGVyO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcblxuLyoqXG4gKiBCaS1kaXJlY3Rpb25hbCBCcmVhZHRoLUZpcnN0LVNlYXJjaCBwYXRoIGZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIEJpQnJlYWR0aEZpcnN0RmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmFsbG93RGlhZ29uYWwgPSBvcHQuYWxsb3dEaWFnb25hbDtcbiAgICB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMgPSBvcHQuZG9udENyb3NzQ29ybmVycztcbn1cblxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgdGhlIHBhdGguXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBwYXRoLCBpbmNsdWRpbmcgYm90aCBzdGFydCBhbmRcbiAqICAgICBlbmQgcG9zaXRpb25zLlxuICovXG5CaUJyZWFkdGhGaXJzdEZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgc3RhcnRPcGVuTGlzdCA9IFtdLCBlbmRPcGVuTGlzdCA9IFtdLFxuICAgICAgICBuZWlnaGJvcnMsIG5laWdoYm9yLCBub2RlLFxuICAgICAgICBhbGxvd0RpYWdvbmFsID0gdGhpcy5hbGxvd0RpYWdvbmFsLFxuICAgICAgICBkb250Q3Jvc3NDb3JuZXJzID0gdGhpcy5kb250Q3Jvc3NDb3JuZXJzLFxuICAgICAgICBCWV9TVEFSVCA9IDAsIEJZX0VORCA9IDEsXG4gICAgICAgIGksIGw7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBhbmQgZW5kIG5vZGVzIGludG8gdGhlIHF1ZXVlc1xuICAgIHN0YXJ0T3Blbkxpc3QucHVzaChzdGFydE5vZGUpO1xuICAgIHN0YXJ0Tm9kZS5vcGVuZWQgPSB0cnVlO1xuICAgIHN0YXJ0Tm9kZS5ieSA9IEJZX1NUQVJUO1xuXG4gICAgZW5kT3Blbkxpc3QucHVzaChlbmROb2RlKTtcbiAgICBlbmROb2RlLm9wZW5lZCA9IHRydWU7XG4gICAgZW5kTm9kZS5ieSA9IEJZX0VORDtcblxuICAgIC8vIHdoaWxlIGJvdGggdGhlIHF1ZXVlcyBhcmUgbm90IGVtcHR5XG4gICAgd2hpbGUgKHN0YXJ0T3Blbkxpc3QubGVuZ3RoICYmIGVuZE9wZW5MaXN0Lmxlbmd0aCkge1xuXG4gICAgICAgIC8vIGV4cGFuZCBzdGFydCBvcGVuIGxpc3RcblxuICAgICAgICBub2RlID0gc3RhcnRPcGVuTGlzdC5zaGlmdCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgbm9kZSBoYXMgYmVlbiBpbnNwZWN0ZWQgYnkgdGhlIHJldmVyc2VkIHNlYXJjaCxcbiAgICAgICAgICAgICAgICAvLyB0aGVuIGEgcGF0aCBpcyBmb3VuZC5cbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IuYnkgPT09IEJZX0VORCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShub2RlLCBuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnRPcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgICBuZWlnaGJvci5vcGVuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbmVpZ2hib3IuYnkgPSBCWV9TVEFSVDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGV4cGFuZCBlbmQgb3BlbiBsaXN0XG5cbiAgICAgICAgbm9kZSA9IGVuZE9wZW5MaXN0LnNoaWZ0KCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICBuZWlnaGJvcnMgPSBncmlkLmdldE5laWdoYm9ycyhub2RlLCBhbGxvd0RpYWdvbmFsLCBkb250Q3Jvc3NDb3JuZXJzKTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIG5laWdoYm9yID0gbmVpZ2hib3JzW2ldO1xuXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmVpZ2hib3Iub3BlbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yLmJ5ID09PSBCWV9TVEFSVCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShuZWlnaGJvciwgbm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5kT3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG5laWdoYm9yLmJ5ID0gQllfRU5EO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmFpbCB0byBmaW5kIHRoZSBwYXRoXG4gICAgcmV0dXJuIFtdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCaUJyZWFkdGhGaXJzdEZpbmRlcjtcbiIsInZhciBCaUFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9CaUFTdGFyRmluZGVyJyk7XG5cbi8qKlxuICogQmktZGlyZWN0aW9uYWwgRGlqa3N0cmEgcGF0aC1maW5kZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIEJpQVN0YXJGaW5kZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICovXG5mdW5jdGlvbiBCaURpamtzdHJhRmluZGVyKG9wdCkge1xuICAgIEJpQVN0YXJGaW5kZXIuY2FsbCh0aGlzLCBvcHQpO1xuICAgIHRoaXMuaGV1cmlzdGljID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH07XG59XG5cbkJpRGlqa3N0cmFGaW5kZXIucHJvdG90eXBlID0gbmV3IEJpQVN0YXJGaW5kZXIoKTtcbkJpRGlqa3N0cmFGaW5kZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQmlEaWprc3RyYUZpbmRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBCaURpamtzdHJhRmluZGVyO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcblxuLyoqXG4gKiBCcmVhZHRoLUZpcnN0LVNlYXJjaCBwYXRoIGZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIEJyZWFkdGhGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkJyZWFkdGhGaXJzdEZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBvcGVuTGlzdCA9IFtdLFxuICAgICAgICBhbGxvd0RpYWdvbmFsID0gdGhpcy5hbGxvd0RpYWdvbmFsLFxuICAgICAgICBkb250Q3Jvc3NDb3JuZXJzID0gdGhpcy5kb250Q3Jvc3NDb3JuZXJzLFxuICAgICAgICBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgbmVpZ2hib3JzLCBuZWlnaGJvciwgbm9kZSwgaSwgbDtcblxuICAgIC8vIHB1c2ggdGhlIHN0YXJ0IHBvcyBpbnRvIHRoZSBxdWV1ZVxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBxdWV1ZSBpcyBub3QgZW1wdHlcbiAgICB3aGlsZSAob3Blbkxpc3QubGVuZ3RoKSB7XG4gICAgICAgIC8vIHRha2UgdGhlIGZyb250IG5vZGUgZnJvbSB0aGUgcXVldWVcbiAgICAgICAgbm9kZSA9IG9wZW5MaXN0LnNoaWZ0KCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyByZWFjaGVkIHRoZSBlbmQgcG9zaXRpb25cbiAgICAgICAgaWYgKG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLmJhY2t0cmFjZShlbmROb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIC8vIHNraXAgdGhpcyBuZWlnaGJvciBpZiBpdCBoYXMgYmVlbiBpbnNwZWN0ZWQgYmVmb3JlXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IuY2xvc2VkIHx8IG5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgIG5laWdoYm9yLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnJlYWR0aEZpcnN0RmluZGVyO1xuIiwidmFyIEFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9BU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIERpamtzdHJhIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBBU3RhckZpbmRlclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIERpamtzdHJhRmluZGVyKG9wdCkge1xuICAgIEFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9O1xufVxuXG5EaWprc3RyYUZpbmRlci5wcm90b3R5cGUgPSBuZXcgQVN0YXJGaW5kZXIoKTtcbkRpamtzdHJhRmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERpamtzdHJhRmluZGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpamtzdHJhRmluZGVyO1xuIiwidmFyIFV0aWwgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcbnZhciBOb2RlICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9Ob2RlJyk7XG5cbi8qKlxuICogSXRlcmF0aXZlIERlZXBpbmcgQSBTdGFyIChJREEqKSBwYXRoLWZpbmRlci5cbiAqXG4gKiBSZWN1cnNpb24gYmFzZWQgb246XG4gKiAgIGh0dHA6Ly93d3cuYXBsLmpodS5lZHUvfmhhbGwvQUktUHJvZ3JhbW1pbmcvSURBLVN0YXIuaHRtbFxuICpcbiAqIFBhdGggcmV0cmFjaW5nIGJhc2VkIG9uOlxuICogIFYuIE5hZ2VzaHdhcmEgUmFvLCBWaXBpbiBLdW1hciBhbmQgSy4gUmFtZXNoXG4gKiAgXCJBIFBhcmFsbGVsIEltcGxlbWVudGF0aW9uIG9mIEl0ZXJhdGl2ZS1EZWVwaW5nLUEqXCIsIEphbnVhcnkgMTk4Ny5cbiAqICBmdHA6Ly9mdHAuY3MudXRleGFzLmVkdS8uc25hcHNob3QvaG91cmx5LjEvcHViL0FJLUxhYi90ZWNoLXJlcG9ydHMvVVQtQUktVFItODctNDYucGRmXG4gKlxuICogQGF1dGhvciBHZXJhcmQgTWVpZXIgKHd3dy5nZXJhcmRtZWllci5jb20pXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHQud2VpZ2h0IFdlaWdodCB0byBhcHBseSB0byB0aGUgaGV1cmlzdGljIHRvIGFsbG93IGZvciBzdWJvcHRpbWFsIHBhdGhzLFxuICogICAgIGluIG9yZGVyIHRvIHNwZWVkIHVwIHRoZSBzZWFyY2guXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0LnRyYWNrUmVjdXJzaW9uIFdoZXRoZXIgdG8gdHJhY2sgcmVjdXJzaW9uIGZvciBzdGF0aXN0aWNhbCBwdXJwb3Nlcy5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHQudGltZUxpbWl0IE1heGltdW0gZXhlY3V0aW9uIHRpbWUuIFVzZSA8PSAwIGZvciBpbmZpbml0ZS5cbiAqL1xuXG5mdW5jdGlvbiBJREFTdGFyRmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmFsbG93RGlhZ29uYWwgPSBvcHQuYWxsb3dEaWFnb25hbDtcbiAgICB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMgPSBvcHQuZG9udENyb3NzQ29ybmVycztcbiAgICB0aGlzLmhldXJpc3RpYyA9IG9wdC5oZXVyaXN0aWMgfHwgSGV1cmlzdGljLm1hbmhhdHRhbjtcbiAgICB0aGlzLndlaWdodCA9IG9wdC53ZWlnaHQgfHwgMTtcbiAgICB0aGlzLnRyYWNrUmVjdXJzaW9uID0gb3B0LnRyYWNrUmVjdXJzaW9uIHx8IGZhbHNlO1xuICAgIHRoaXMudGltZUxpbWl0ID0gb3B0LnRpbWVMaW1pdCB8fCBJbmZpbml0eTsgLy8gRGVmYXVsdDogbm8gdGltZSBsaW1pdC5cbn1cblxuLyoqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhlIHRoZSBwYXRoLiBXaGVuIGFuIGVtcHR5IGFycmF5IGlzIHJldHVybmVkLCBlaXRoZXJcbiAqIG5vIHBhdGggaXMgcG9zc2libGUsIG9yIHRoZSBtYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGlzIHJlYWNoZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgcGF0aCwgaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kXG4gKiAgICAgZW5kIHBvc2l0aW9ucy5cbiAqL1xuSURBU3RhckZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIC8vIFVzZWQgZm9yIHN0YXRpc3RpY3M6XG4gICAgdmFyIG5vZGVzVmlzaXRlZCA9IDA7XG5cbiAgICAvLyBFeGVjdXRpb24gdGltZSBsaW1pdGF0aW9uOlxuICAgIHZhciBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIC8vIEhldXJpc3RpYyBoZWxwZXI6XG4gICAgdmFyIGggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhldXJpc3RpYyhNYXRoLmFicyhiLnggLSBhLngpLCBNYXRoLmFicyhiLnkgLSBhLnkpKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAvLyBTdGVwIGNvc3QgZnJvbSBhIHRvIGI6XG4gICAgdmFyIGNvc3QgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiAoYS54ID09PSBiLnggfHwgYS55ID09PSBiLnkpID8gMSA6IE1hdGguU1FSVDI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIElEQSogc2VhcmNoIGltcGxlbWVudGF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOb2RlfSBUaGUgbm9kZSBjdXJyZW50bHkgZXhwYW5kaW5nIGZyb20uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IENvc3QgdG8gcmVhY2ggdGhlIGdpdmVuIG5vZGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IE1heGltdW0gc2VhcmNoIGRlcHRoIChjdXQtb2ZmIHZhbHVlKS5cbiAgICAgKiBAcGFyYW0ge3tBcnJheS48W251bWJlciwgbnVtYmVyXT59fSBUaGUgZm91bmQgcm91dGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFJlY3Vyc2lvbiBkZXB0aC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZWl0aGVyIGEgbnVtYmVyIHdpdGggdGhlIG5ldyBvcHRpbWFsIGN1dC1vZmYgZGVwdGgsXG4gICAgICogb3IgYSB2YWxpZCBub2RlIGluc3RhbmNlLCBpbiB3aGljaCBjYXNlIGEgcGF0aCB3YXMgZm91bmQuXG4gICAgICovXG4gICAgdmFyIHNlYXJjaCA9IGZ1bmN0aW9uKG5vZGUsIGcsIGN1dG9mZiwgcm91dGUsIGRlcHRoKSB7XG4gICAgICAgIG5vZGVzVmlzaXRlZCsrO1xuXG4gICAgICAgIC8vIEVuZm9yY2UgdGltZWxpbWl0OlxuICAgICAgICBpZih0aGlzLnRpbWVMaW1pdCA+IDAgJiYgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUgPiB0aGlzLnRpbWVMaW1pdCAqIDEwMDApIHtcbiAgICAgICAgICAgIC8vIEVuZm9yY2VkIGFzIFwicGF0aC1ub3QtZm91bmRcIi5cbiAgICAgICAgICAgIHJldHVybiBJbmZpbml0eTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmID0gZyArIGgobm9kZSwgZW5kKSAqIHRoaXMud2VpZ2h0O1xuXG4gICAgICAgIC8vIFdlJ3ZlIHNlYXJjaGVkIHRvbyBkZWVwIGZvciB0aGlzIGl0ZXJhdGlvbi5cbiAgICAgICAgaWYoZiA+IGN1dG9mZikge1xuICAgICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH1cblxuICAgICAgICBpZihub2RlID09IGVuZCkge1xuICAgICAgICAgICAgcm91dGVbZGVwdGhdID0gW25vZGUueCwgbm9kZS55XTtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1pbiwgdCwgaywgbmVpZ2hib3VyO1xuXG4gICAgICAgIHZhciBuZWlnaGJvdXJzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgdGhpcy5hbGxvd0RpYWdvbmFsLCB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMpO1xuXG4gICAgICAgIC8vIFNvcnQgdGhlIG5laWdoYm91cnMsIGdpdmVzIG5pY2VyIHBhdGhzLiBCdXQsIHRoaXMgZGV2aWF0ZXNcbiAgICAgICAgLy8gZnJvbSB0aGUgb3JpZ2luYWwgYWxnb3JpdGhtIC0gc28gSSBsZWZ0IGl0IG91dC5cbiAgICAgICAgLy9uZWlnaGJvdXJzLnNvcnQoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIC8vICAgIHJldHVybiBoKGEsIGVuZCkgLSBoKGIsIGVuZCk7XG4gICAgICAgIC8vfSk7XG5cbiAgICAgICAgZm9yKGsgPSAwLCBtaW4gPSBJbmZpbml0eTsgbmVpZ2hib3VyID0gbmVpZ2hib3Vyc1trXTsgKytrKSB7XG5cbiAgICAgICAgICAgIGlmKHRoaXMudHJhY2tSZWN1cnNpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBSZXRhaW4gYSBjb3B5IGZvciB2aXN1YWxpc2F0aW9uLiBEdWUgdG8gcmVjdXJzaW9uLCB0aGlzXG4gICAgICAgICAgICAgICAgLy8gbm9kZSBtYXkgYmUgcGFydCBvZiBvdGhlciBwYXRocyB0b28uXG4gICAgICAgICAgICAgICAgbmVpZ2hib3VyLnJldGFpbkNvdW50ID0gbmVpZ2hib3VyLnJldGFpbkNvdW50ICsgMSB8fCAxO1xuXG4gICAgICAgICAgICAgICAgaWYobmVpZ2hib3VyLnRlc3RlZCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBuZWlnaGJvdXIudGVzdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHQgPSBzZWFyY2gobmVpZ2hib3VyLCBnICsgY29zdChub2RlLCBuZWlnaGJvdXIpLCBjdXRvZmYsIHJvdXRlLCBkZXB0aCArIDEpO1xuXG4gICAgICAgICAgICBpZih0IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJvdXRlW2RlcHRoXSA9IFtub2RlLngsIG5vZGUueV07XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgYSB0eXBpY2FsIEEqIGxpbmtlZCBsaXN0LCB0aGlzIHdvdWxkIHdvcms6XG4gICAgICAgICAgICAgICAgLy8gbmVpZ2hib3VyLnBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlY3JlbWVudCBjb3VudCwgdGhlbiBkZXRlcm1pbmUgd2hldGhlciBpdCdzIGFjdHVhbGx5IGNsb3NlZC5cbiAgICAgICAgICAgIGlmKHRoaXMudHJhY2tSZWN1cnNpb24gJiYgKC0tbmVpZ2hib3VyLnJldGFpbkNvdW50KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG5laWdoYm91ci50ZXN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodCA8IG1pbikge1xuICAgICAgICAgICAgICAgIG1pbiA9IHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWluO1xuXG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgLy8gTm9kZSBpbnN0YW5jZSBsb29rdXBzOlxuICAgIHZhciBzdGFydCA9IGdyaWQuZ2V0Tm9kZUF0KHN0YXJ0WCwgc3RhcnRZKTtcbiAgICB2YXIgZW5kICAgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKTtcblxuICAgIC8vIEluaXRpYWwgc2VhcmNoIGRlcHRoLCBnaXZlbiB0aGUgdHlwaWNhbCBoZXVyaXN0aWMgY29udHJhaW50cyxcbiAgICAvLyB0aGVyZSBzaG91bGQgYmUgbm8gY2hlYXBlciByb3V0ZSBwb3NzaWJsZS5cbiAgICB2YXIgY3V0T2ZmID0gaChzdGFydCwgZW5kKTtcblxuICAgIHZhciBqLCByb3V0ZSwgdDtcblxuICAgIC8vIFdpdGggYW4gb3ZlcmZsb3cgcHJvdGVjdGlvbi5cbiAgICBmb3IoaiA9IDA7IHRydWU7ICsraikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmF0aW9uOiBcIiArIGogKyBcIiwgc2VhcmNoIGN1dC1vZmYgdmFsdWU6IFwiICsgY3V0T2ZmICsgXCIsIG5vZGVzIHZpc2l0ZWQgdGh1cyBmYXI6IFwiICsgbm9kZXNWaXNpdGVkICsgXCIuXCIpO1xuXG4gICAgICAgIHJvdXRlID0gW107XG5cbiAgICAgICAgLy8gU2VhcmNoIHRpbGwgY3V0LW9mZiBkZXB0aDpcbiAgICAgICAgdCA9IHNlYXJjaChzdGFydCwgMCwgY3V0T2ZmLCByb3V0ZSwgMCk7XG5cbiAgICAgICAgLy8gUm91dGUgbm90IHBvc3NpYmxlLCBvciBub3QgZm91bmQgaW4gdGltZSBsaW1pdC5cbiAgICAgICAgaWYodCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHQgaXMgYSBub2RlLCBpdCdzIGFsc28gdGhlIGVuZCBub2RlLiBSb3V0ZSBpcyBub3dcbiAgICAgICAgLy8gcG9wdWxhdGVkIHdpdGggYSB2YWxpZCBwYXRoIHRvIHRoZSBlbmQgbm9kZS5cbiAgICAgICAgaWYodCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGaW5pc2hlZCBhdCBpdGVyYXRpb246IFwiICsgaiArIFwiLCBzZWFyY2ggY3V0LW9mZiB2YWx1ZTogXCIgKyBjdXRPZmYgKyBcIiwgbm9kZXMgdmlzaXRlZDogXCIgKyBub2Rlc1Zpc2l0ZWQgKyBcIi5cIik7XG4gICAgICAgICAgICByZXR1cm4gcm91dGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcnkgYWdhaW4sIHRoaXMgdGltZSB3aXRoIGEgZGVlcGVyIGN1dC1vZmYuIFRoZSB0IHNjb3JlXG4gICAgICAgIC8vIGlzIHRoZSBjbG9zZXN0IHdlIGdvdCB0byB0aGUgZW5kIG5vZGUuXG4gICAgICAgIGN1dE9mZiA9IHQ7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBfc2hvdWxkXyBuZXZlciB0byBiZSByZWFjaGVkLlxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSURBU3RhckZpbmRlcjtcbiIsIi8qKlxuICogQGF1dGhvciBhbmllcm8gLyBodHRwczovL2dpdGh1Yi5jb20vYW5pZXJvXG4gKi9cbnZhciBIZWFwICAgICAgID0gcmVxdWlyZSgnaGVhcCcpO1xudmFyIFV0aWwgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcblxuLyoqXG4gKiBQYXRoIGZpbmRlciB1c2luZyB0aGUgSnVtcCBQb2ludCBTZWFyY2ggYWxnb3JpdGhtXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gSnVtcFBvaW50RmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IG9wdC5oZXVyaXN0aWMgfHwgSGV1cmlzdGljLm1hbmhhdHRhbjtcbiAgICB0aGlzLnRyYWNrSnVtcFJlY3Vyc2lvbiA9IG9wdC50cmFja0p1bXBSZWN1cnNpb24gfHwgZmFsc2U7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSBwYXRoLlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgcGF0aCwgaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kXG4gKiAgICAgZW5kIHBvc2l0aW9ucy5cbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5maW5kUGF0aCA9IGZ1bmN0aW9uKHN0YXJ0WCwgc3RhcnRZLCBlbmRYLCBlbmRZLCBncmlkKSB7XG4gICAgdmFyIG9wZW5MaXN0ID0gdGhpcy5vcGVuTGlzdCA9IG5ldyBIZWFwKGZ1bmN0aW9uKG5vZGVBLCBub2RlQikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVBLmYgLSBub2RlQi5mO1xuICAgICAgICB9KSxcbiAgICAgICAgc3RhcnROb2RlID0gdGhpcy5zdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSB0aGlzLmVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSwgbm9kZTtcblxuICAgIHRoaXMuZ3JpZCA9IGdyaWQ7XG5cblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIHN0YXJ0IG5vZGUgdG8gYmUgMFxuICAgIHN0YXJ0Tm9kZS5nID0gMDtcbiAgICBzdGFydE5vZGUuZiA9IDA7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBub2RlIGludG8gdGhlIG9wZW4gbGlzdFxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBvcGVuIGxpc3QgaXMgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFvcGVuTGlzdC5lbXB0eSgpKSB7XG4gICAgICAgIC8vIHBvcCB0aGUgcG9zaXRpb24gb2Ygbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gb3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICBpZiAobm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIFV0aWwuZXhwYW5kUGF0aChVdGlsLmJhY2t0cmFjZShlbmROb2RlKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pZGVudGlmeVN1Y2Nlc3NvcnMobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gZmFpbCB0byBmaW5kIHRoZSBwYXRoXG4gICAgcmV0dXJuIFtdO1xufTtcblxuLyoqXG4gKiBJZGVudGlmeSBzdWNjZXNzb3JzIGZvciB0aGUgZ2l2ZW4gbm9kZS4gUnVucyBhIGp1bXAgcG9pbnQgc2VhcmNoIGluIHRoZVxuICogZGlyZWN0aW9uIG9mIGVhY2ggYXZhaWxhYmxlIG5laWdoYm9yLCBhZGRpbmcgYW55IHBvaW50cyBmb3VuZCB0byB0aGUgb3BlblxuICogbGlzdC5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5faWRlbnRpZnlTdWNjZXNzb3JzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBncmlkID0gdGhpcy5ncmlkLFxuICAgICAgICBoZXVyaXN0aWMgPSB0aGlzLmhldXJpc3RpYyxcbiAgICAgICAgb3Blbkxpc3QgPSB0aGlzLm9wZW5MaXN0LFxuICAgICAgICBlbmRYID0gdGhpcy5lbmROb2RlLngsXG4gICAgICAgIGVuZFkgPSB0aGlzLmVuZE5vZGUueSxcbiAgICAgICAgbmVpZ2hib3JzLCBuZWlnaGJvcixcbiAgICAgICAganVtcFBvaW50LCBpLCBsLFxuICAgICAgICB4ID0gbm9kZS54LCB5ID0gbm9kZS55LFxuICAgICAgICBqeCwganksIGR4LCBkeSwgZCwgbmcsIGp1bXBOb2RlLFxuICAgICAgICBhYnMgPSBNYXRoLmFicywgbWF4ID0gTWF0aC5tYXg7XG5cbiAgICBuZWlnaGJvcnMgPSB0aGlzLl9maW5kTmVpZ2hib3JzKG5vZGUpO1xuICAgIGZvcihpID0gMCwgbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG4gICAgICAgIGp1bXBQb2ludCA9IHRoaXMuX2p1bXAobmVpZ2hib3JbMF0sIG5laWdoYm9yWzFdLCB4LCB5KTtcbiAgICAgICAgaWYgKGp1bXBQb2ludCkge1xuXG4gICAgICAgICAgICBqeCA9IGp1bXBQb2ludFswXTtcbiAgICAgICAgICAgIGp5ID0ganVtcFBvaW50WzFdO1xuICAgICAgICAgICAganVtcE5vZGUgPSBncmlkLmdldE5vZGVBdChqeCwgankpO1xuXG4gICAgICAgICAgICBpZiAoanVtcE5vZGUuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGluY2x1ZGUgZGlzdGFuY2UsIGFzIHBhcmVudCBtYXkgbm90IGJlIGltbWVkaWF0ZWx5IGFkamFjZW50OlxuICAgICAgICAgICAgZCA9IEhldXJpc3RpYy5ldWNsaWRlYW4oYWJzKGp4IC0geCksIGFicyhqeSAtIHkpKTtcbiAgICAgICAgICAgIG5nID0gbm9kZS5nICsgZDsgLy8gbmV4dCBgZ2AgdmFsdWVcblxuICAgICAgICAgICAgaWYgKCFqdW1wTm9kZS5vcGVuZWQgfHwgbmcgPCBqdW1wTm9kZS5nKSB7XG4gICAgICAgICAgICAgICAganVtcE5vZGUuZyA9IG5nO1xuICAgICAgICAgICAgICAgIGp1bXBOb2RlLmggPSBqdW1wTm9kZS5oIHx8IGhldXJpc3RpYyhhYnMoanggLSBlbmRYKSwgYWJzKGp5IC0gZW5kWSkpO1xuICAgICAgICAgICAgICAgIGp1bXBOb2RlLmYgPSBqdW1wTm9kZS5nICsganVtcE5vZGUuaDtcbiAgICAgICAgICAgICAgICBqdW1wTm9kZS5wYXJlbnQgPSBub2RlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFqdW1wTm9kZS5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blbkxpc3QucHVzaChqdW1wTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGp1bXBOb2RlLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blbkxpc3QudXBkYXRlSXRlbShqdW1wTm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZWFyY2ggcmVjdXJzaXZlbHkgaW4gdGhlIGRpcmVjdGlvbiAocGFyZW50IC0+IGNoaWxkKSwgc3RvcHBpbmcgb25seSB3aGVuIGFcbiAqIGp1bXAgcG9pbnQgaXMgZm91bmQuXG4gKiBAcHJvdGVjdGVkXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSB4LCB5IGNvb3JkaW5hdGUgb2YgdGhlIGp1bXAgcG9pbnRcbiAqICAgICBmb3VuZCwgb3IgbnVsbCBpZiBub3QgZm91bmRcbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5fanVtcCA9IGZ1bmN0aW9uKHgsIHksIHB4LCBweSkge1xuICAgIHZhciBncmlkID0gdGhpcy5ncmlkLFxuICAgICAgICBkeCA9IHggLSBweCwgZHkgPSB5IC0gcHksIGp4LCBqeTtcblxuICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmKHRoaXMudHJhY2tKdW1wUmVjdXJzaW9uID09PSB0cnVlKSB7XG4gICAgICAgIGdyaWQuZ2V0Tm9kZUF0KHgsIHkpLnRlc3RlZCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChncmlkLmdldE5vZGVBdCh4LCB5KSA9PT0gdGhpcy5lbmROb2RlKSB7XG4gICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGZvcmNlZCBuZWlnaGJvcnNcbiAgICAvLyBhbG9uZyB0aGUgZGlhZ29uYWxcbiAgICBpZiAoZHggIT09IDAgJiYgZHkgIT09IDApIHtcbiAgICAgICAgaWYgKChncmlkLmlzV2Fsa2FibGVBdCh4IC0gZHgsIHkgKyBkeSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggLSBkeCwgeSkpIHx8XG4gICAgICAgICAgICAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5IC0gZHkpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4LCB5IC0gZHkpKSkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBob3Jpem9udGFsbHkvdmVydGljYWxseVxuICAgIGVsc2Uge1xuICAgICAgICBpZiggZHggIT09IDAgKSB7IC8vIG1vdmluZyBhbG9uZyB4XG4gICAgICAgICAgICBpZigoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5ICsgMSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkgfHxcbiAgICAgICAgICAgICAgIChncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkgLSAxKSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIDEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZigoZ3JpZC5pc1dhbGthYmxlQXQoeCArIDEsIHkgKyBkeSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggKyAxLCB5KSkgfHxcbiAgICAgICAgICAgICAgIChncmlkLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSArIGR5KSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3aGVuIG1vdmluZyBkaWFnb25hbGx5LCBtdXN0IGNoZWNrIGZvciB2ZXJ0aWNhbC9ob3Jpem9udGFsIGp1bXAgcG9pbnRzXG4gICAgaWYgKGR4ICE9PSAwICYmIGR5ICE9PSAwKSB7XG4gICAgICAgIGp4ID0gdGhpcy5fanVtcCh4ICsgZHgsIHksIHgsIHkpO1xuICAgICAgICBqeSA9IHRoaXMuX2p1bXAoeCwgeSArIGR5LCB4LCB5KTtcbiAgICAgICAgaWYgKGp4IHx8IGp5KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gbW92aW5nIGRpYWdvbmFsbHksIG11c3QgbWFrZSBzdXJlIG9uZSBvZiB0aGUgdmVydGljYWwvaG9yaXpvbnRhbFxuICAgIC8vIG5laWdoYm9ycyBpcyBvcGVuIHRvIGFsbG93IHRoZSBwYXRoXG4gICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkgfHwgZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fanVtcCh4ICsgZHgsIHkgKyBkeSwgeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBuZWlnaGJvcnMgZm9yIHRoZSBnaXZlbiBub2RlLiBJZiB0aGUgbm9kZSBoYXMgYSBwYXJlbnQsXG4gKiBwcnVuZSB0aGUgbmVpZ2hib3JzIGJhc2VkIG9uIHRoZSBqdW1wIHBvaW50IHNlYXJjaCBhbGdvcml0aG0sIG90aGVyd2lzZVxuICogcmV0dXJuIGFsbCBhdmFpbGFibGUgbmVpZ2hib3JzLlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgbmVpZ2hib3JzIGZvdW5kLlxuICovXG5KdW1wUG9pbnRGaW5kZXIucHJvdG90eXBlLl9maW5kTmVpZ2hib3JzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCxcbiAgICAgICAgeCA9IG5vZGUueCwgeSA9IG5vZGUueSxcbiAgICAgICAgZ3JpZCA9IHRoaXMuZ3JpZCxcbiAgICAgICAgcHgsIHB5LCBueCwgbnksIGR4LCBkeSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sIG5laWdoYm9yTm9kZXMsIG5laWdoYm9yTm9kZSwgaSwgbDtcblxuICAgIC8vIGRpcmVjdGVkIHBydW5pbmc6IGNhbiBpZ25vcmUgbW9zdCBuZWlnaGJvcnMsIHVubGVzcyBmb3JjZWQuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBweCA9IHBhcmVudC54O1xuICAgICAgICBweSA9IHBhcmVudC55O1xuICAgICAgICAvLyBnZXQgdGhlIG5vcm1hbGl6ZWQgZGlyZWN0aW9uIG9mIHRyYXZlbFxuICAgICAgICBkeCA9ICh4IC0gcHgpIC8gTWF0aC5tYXgoTWF0aC5hYnMoeCAtIHB4KSwgMSk7XG4gICAgICAgIGR5ID0gKHkgLSBweSkgLyBNYXRoLm1heChNYXRoLmFicyh5IC0gcHkpLCAxKTtcblxuICAgICAgICAvLyBzZWFyY2ggZGlhZ29uYWxseVxuICAgICAgICBpZiAoZHggIT09IDAgJiYgZHkgIT09IDApIHtcbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3gsIHkgKyBkeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSB8fCBncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeSArIGR5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHggLSBkeCwgeSkgJiYgZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4IC0gZHgsIHkgKyBkeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4LCB5IC0gZHkpICYmIGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5IC0gZHldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBzZWFyY2ggaG9yaXpvbnRhbGx5L3ZlcnRpY2FsbHlcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZihkeCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4ICsgMSwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4IC0gMSwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5KSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5ICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5IC0gMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJldHVybiBhbGwgbmVpZ2hib3JzXG4gICAgZWxzZSB7XG4gICAgICAgIG5laWdoYm9yTm9kZXMgPSBncmlkLmdldE5laWdoYm9ycyhub2RlLCB0cnVlKTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IG5laWdoYm9yTm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvck5vZGUgPSBuZWlnaGJvck5vZGVzW2ldO1xuICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW25laWdoYm9yTm9kZS54LCBuZWlnaGJvck5vZGUueV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBuZWlnaGJvcnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEp1bXBQb2ludEZpbmRlcjtcbiIsIi8vICBJbmNsdWRlIG5wbSBwYXRoZmluZGluZyBsaWJyYXJ5XG52YXIgcGF0aEZpbmRpbmcgPSByZXF1aXJlKCdwYXRoZmluZGluZycpO1xuXG4vLyAgSW1wb3J0IGNsYXNzZXNcbmltcG9ydCB7V29ybGR9IGZyb20gJy4vd29ybGQnO1xuXG4vLyAgQ3JlYXRlIG5ldyBXb3JsZFxudmFyIHBvbHl3b3JsZCA9IG5ldyBXb3JsZCgpO1xuXG4vLyAgR2VuZXJhdGUgdGhlIGJpbmFyeSBtYXBcbnBvbHl3b3JsZC50b0JpbmFyeU1hdHJpeCgpO1xuXG4vLyAgQWRkIHBvbHltZXIgZXZlbnQgbGlzdGVuZXJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb2x5bWVyLXJlYWR5JyxcbiAgZXZlbnQgPT4ge1xuICAgIC8vICBTZWxlY3QgZ2FtZSBzdGFnZVxuICAgIHZhciBnYW1lU3RhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdnYW1lLXN0YWdlJyk7XG4gICAgLy9cbiAgICBnYW1lU3RhZ2UucGF0aEZpbmRpbmcgPSBwYXRoRmluZGluZztcbiAgICAvLyAgSW5pdCB3b3JsZCBwcm9wZXJ0eVxuICAgIGdhbWVTdGFnZS53b3JsZCA9IHBvbHl3b3JsZC5tYXA7XG4gICAgLy8gIEluaXQgYmluYXJ5IG1hcCBwcm9wZXJ0eVxuICAgIGdhbWVTdGFnZS5iaW5hcnlNYXAgPSBwb2x5d29ybGQuYmluYXJ5TWFwO1xuICB9KTtcbiIsImV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgY29uc3RydWN0b3IobWFwKSB7XG4gICAgLy8gIFRoZSB3b3JsZCBtYXBcbiAgICB0aGlzLm1hcCA9IFtcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAxLCAxLCAwLCAwLCAxLCAwLCAwLCAwLCAxLCAwLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAxLCAwLCAxLCAwLCAwLCAwLCAwLCAzLCAwLCA0LCAwLCAzLCA1LCAwLCAzLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCA0LCAyLCAwLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAzLCAwLCAzLCAxLCAxLCAwLCA0LCAwLCAzLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAxLCAwLCAxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXVxuICAgIF07XG4gICAgLy8gIERlZmluZSB3aGljaCBzcHJpdGVzIGFyZSBjcm9zc2FibGVcbiAgICB0aGlzLmNyb3NzYWJsZVNwcml0ZXMgPSBbMCwgM107XG4gIH1cblxuICAvLyAgTWV0aG9kIHRvIHRlc3QgaWYgYSBzcHJpdGUgaXMgY3Jvc3NhYmxlXG4gIGlzQ3Jvc3NhYmxlKHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5jcm9zc2FibGVTcHJpdGVzLmluZGV4T2YodHlwZSkgIT09IC0xID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG5cbiAgLy8gIE1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgYmluYXJ5IG1hcCBvZiBjcm9zc2FibGUgc3ByaXRlc1xuICB0b0JpbmFyeU1hdHJpeCgpIHtcbiAgICB0aGlzLmJpbmFyeU1hcCA9IFtdO1xuICAgIHZhciB0b0JpbmFyeSA9IHZhbHVlID0+IHRoaXMuaXNDcm9zc2FibGUodmFsdWUpID8gMCA6IDE7XG4gICAgdGhpcy5tYXAuZm9yRWFjaChyb3cgPT4gdGhpcy5iaW5hcnlNYXAucHVzaChyb3cubWFwKHRvQmluYXJ5KSkpO1xuICB9XG5cbn1cbiJdfQ==
