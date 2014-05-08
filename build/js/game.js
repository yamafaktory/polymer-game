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
process.once = noop;
process.off = noop;
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

}).call(this,require("/home/yamafaktory/Webdev/polymer-game/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"/home/yamafaktory/Webdev/polymer-game/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":1}],3:[function(require,module,exports){
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
  this.map = [[0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0], [0, 0, 0, 0, 0, 0, 2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 3, 0, 3, 1, 1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL2VzNmlmeS9ub2RlX21vZHVsZXMvdHJhY2V1ci9iaW4vdHJhY2V1ci1ydW50aW1lLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9ub2RlX21vZHVsZXMvaGVhcC9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL25vZGVfbW9kdWxlcy9oZWFwL2xpYi9oZWFwLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL1BhdGhGaW5kaW5nLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2NvcmUvR3JpZC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9jb3JlL0hldXJpc3RpYy5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9jb3JlL05vZGUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvY29yZS9VdGlsLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQVN0YXJGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CZXN0Rmlyc3RGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CaUFTdGFyRmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQmlCZXN0Rmlyc3RGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CaUJyZWFkdGhGaXJzdEZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0JpRGlqa3N0cmFGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CcmVhZHRoRmlyc3RGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9EaWprc3RyYUZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0lEQVN0YXJGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9KdW1wUG9pbnRGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL3NyYy9qcy9nYW1lLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9zcmMvanMvd29ybGQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5ekNBOztBQUFBLENBQUEsS0FBTSxRQUFRLEVBQUcsQ0FBQSxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztDQUM5Qzs7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7R0FDakIsS0FBTTtBQUNILENBQUEsS0FBRSxFQUFHLENBQUEsRUFBRSxHQUFJLEdBQUUsQ0FBQztBQUNkLENBQUEsS0FBRSxFQUFHLENBQUEsRUFBRSxHQUFJLEdBQUUsQ0FBQztBQUNkLENBQUEsS0FBRSxFQUFHLENBQUEsRUFBRSxHQUFJLEdBQUUsQ0FBQztBQUNkLENBQUEsS0FBRSxFQUFHLENBQUEsRUFBRSxHQUFJLEdBQUUsQ0FBQztHQUNqQjtBQUdELENBSEMsS0FHRyxFQUFFLEdBQUksQ0FBQSxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFFO0FBQ3ZDLENBQUEsWUFBUyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQztHQUN2QztBQUVELENBRkMsS0FFRyxFQUFFLEdBQUksQ0FBQSxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFFO0FBQ3ZDLENBQUEsWUFBUyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQztHQUN2QztBQUVELENBRkMsS0FFRyxFQUFFLEdBQUksQ0FBQSxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFFO0FBQ3ZDLENBQUEsWUFBUyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQztHQUN2QztBQUVELENBRkMsS0FFRyxFQUFFLEdBQUksQ0FBQSxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLEVB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QUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDN0QsQ0FBQztBQUVGLENBQUEsS0FBSSxpQkFBaUIsRUFBRyxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUMsQ0FBQztDQUNoQzs7Q0FHRCxZQUFXLENBQVgsVUFBWSxJQUFJLENBQUU7Q0FDaEIsU0FBTyxDQUFBLElBQUksaUJBQWlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxHQUFLLEVBQUMsQ0FBQyxDQUFBLENBQUcsS0FBSSxFQUFHLE1BQUssQ0FBQztHQUNsRTtDQUdELGVBQWMsQ0FBZCxVQUFlOztBQUNiLENBQUEsT0FBSSxVQUFVLEVBQUcsR0FBRSxDQUFDO0FBQ2hCLENBQUosTUFBSSxDQUFBLFFBQVEsYUFBRyxLQUFLO1lBQUksQ0FBQSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFHLEVBQUMsRUFBRyxFQUFDO01BQUEsQ0FBQztBQUN4RCxDQUFBLE9BQUksSUFBSSxRQUFRLFdBQUMsR0FBRztZQUFJLENBQUEsY0FBYyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7T0FBQyxDQUFDO0dBQ2pFOzs7Ozs7OztDQUVGIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICB2YXIgJGNyZWF0ZSA9ICRPYmplY3QuY3JlYXRlO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkT2JqZWN0LmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGZyZWV6ZSA9ICRPYmplY3QuZnJlZXplO1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICB2YXIgJGdldE93blByb3BlcnR5TmFtZXMgPSAkT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAkZ2V0UHJvdG90eXBlT2YgPSAkT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gJE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciAkdG9TdHJpbmcgPSAkT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gbm9uRW51bSh2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgfVxuICB2YXIgdHlwZXMgPSB7XG4gICAgdm9pZDogZnVuY3Rpb24gdm9pZFR5cGUoKSB7fSxcbiAgICBhbnk6IGZ1bmN0aW9uIGFueSgpIHt9LFxuICAgIHN0cmluZzogZnVuY3Rpb24gc3RyaW5nKCkge30sXG4gICAgbnVtYmVyOiBmdW5jdGlvbiBudW1iZXIoKSB7fSxcbiAgICBib29sZWFuOiBmdW5jdGlvbiBib29sZWFuKCkge31cbiAgfTtcbiAgdmFyIG1ldGhvZCA9IG5vbkVudW07XG4gIHZhciBjb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gbmV3VW5pcXVlU3RyaW5nKCkge1xuICAgIHJldHVybiAnX18kJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDFlOSkgKyAnJCcgKyArK2NvdW50ZXIgKyAnJF9fJztcbiAgfVxuICB2YXIgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGF0YVByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xWYWx1ZXMgPSAkY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBpc1N5bWJvbChzeW1ib2wpIHtcbiAgICByZXR1cm4gdHlwZW9mIHN5bWJvbCA9PT0gJ29iamVjdCcgJiYgc3ltYm9sIGluc3RhbmNlb2YgU3ltYm9sVmFsdWU7XG4gIH1cbiAgZnVuY3Rpb24gdHlwZU9mKHYpIHtcbiAgICBpZiAoaXNTeW1ib2wodikpXG4gICAgICByZXR1cm4gJ3N5bWJvbCc7XG4gICAgcmV0dXJuIHR5cGVvZiB2O1xuICB9XG4gIGZ1bmN0aW9uIFN5bWJvbChkZXNjcmlwdGlvbikge1xuICAgIHZhciB2YWx1ZSA9IG5ldyBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbik7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN5bWJvbCkpXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU3ltYm9sIGNhbm5vdCBiZSBuZXdcXCdlZCcpO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIGlmICghc3ltYm9sVmFsdWUpXG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ0NvbnZlcnNpb24gZnJvbSBzeW1ib2wgdG8gc3RyaW5nJyk7XG4gICAgdmFyIGRlc2MgPSBzeW1ib2xWYWx1ZVtzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5XTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZGVzYyA9ICcnO1xuICAgIHJldHVybiAnU3ltYm9sKCcgKyBkZXNjICsgJyknO1xuICB9KSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndmFsdWVPZicsIG1ldGhvZChmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ltYm9sVmFsdWUgPSB0aGlzW3N5bWJvbERhdGFQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZTtcbiAgfSkpO1xuICBmdW5jdGlvbiBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbikge1xuICAgIHZhciBrZXkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGF0YVByb3BlcnR5LCB7dmFsdWU6IHRoaXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSwge3ZhbHVlOiBrZXl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSwge3ZhbHVlOiBkZXNjcmlwdGlvbn0pO1xuICAgICRmcmVlemUodGhpcyk7XG4gICAgc3ltYm9sVmFsdWVzW2tleV0gPSB0aGlzO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICd0b1N0cmluZycsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3ZhbHVlT2YnLCB7XG4gICAgdmFsdWU6IFN5bWJvbC5wcm90b3R5cGUudmFsdWVPZixcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgJGZyZWV6ZShTeW1ib2xWYWx1ZS5wcm90b3R5cGUpO1xuICBTeW1ib2wuaXRlcmF0b3IgPSBTeW1ib2woKTtcbiAgZnVuY3Rpb24gdG9Qcm9wZXJ0eShuYW1lKSB7XG4gICAgaWYgKGlzU3ltYm9sKG5hbWUpKVxuICAgICAgcmV0dXJuIG5hbWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoIXN5bWJvbFZhbHVlc1tuYW1lXSlcbiAgICAgICAgcnYucHVzaChuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICByZXR1cm4gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xWYWx1ZXNbbmFtZXNbaV1dO1xuICAgICAgaWYgKHN5bWJvbClcbiAgICAgICAgcnYucHVzaChzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkobmFtZSkge1xuICAgIHJldHVybiAkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCB0b1Byb3BlcnR5KG5hbWUpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPcHRpb24obmFtZSkge1xuICAgIHJldHVybiBnbG9iYWwudHJhY2V1ciAmJiBnbG9iYWwudHJhY2V1ci5vcHRpb25zW25hbWVdO1xuICB9XG4gIGZ1bmN0aW9uIHNldFByb3BlcnR5KG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgc3ltLFxuICAgICAgICBkZXNjO1xuICAgIGlmIChpc1N5bWJvbChuYW1lKSkge1xuICAgICAgc3ltID0gbmFtZTtcbiAgICAgIG5hbWUgPSBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIH1cbiAgICBvYmplY3RbbmFtZV0gPSB2YWx1ZTtcbiAgICBpZiAoc3ltICYmIChkZXNjID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpKSlcbiAgICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtlbnVtZXJhYmxlOiBmYWxzZX0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICBpZiAoaXNTeW1ib2wobmFtZSkpIHtcbiAgICAgIGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUpIHtcbiAgICAgICAgZGVzY3JpcHRvciA9ICRjcmVhdGUoZGVzY3JpcHRvciwge2VudW1lcmFibGU6IHt2YWx1ZTogZmFsc2V9fSk7XG4gICAgICB9XG4gICAgICBuYW1lID0gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChPYmplY3QpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZGVmaW5lUHJvcGVydHknLCB7dmFsdWU6IGRlZmluZVByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2dldE93blByb3BlcnR5TmFtZXMnLCB7dmFsdWU6IGdldE93blByb3BlcnR5TmFtZXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJywge3ZhbHVlOiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ2hhc093blByb3BlcnR5Jywge3ZhbHVlOiBoYXNPd25Qcm9wZXJ0eX0pO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gICAgZnVuY3Rpb24gaXMobGVmdCwgcmlnaHQpIHtcbiAgICAgIGlmIChsZWZ0ID09PSByaWdodClcbiAgICAgICAgcmV0dXJuIGxlZnQgIT09IDAgfHwgMSAvIGxlZnQgPT09IDEgLyByaWdodDtcbiAgICAgIHJldHVybiBsZWZ0ICE9PSBsZWZ0ICYmIHJpZ2h0ICE9PSByaWdodDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2lzJywgbWV0aG9kKGlzKSk7XG4gICAgZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgc291cmNlKSB7XG4gICAgICB2YXIgcHJvcHMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpO1xuICAgICAgdmFyIHAsXG4gICAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICAgIHRhcmdldFtwcm9wc1twXV0gPSBzb3VyY2VbcHJvcHNbcF1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2Fzc2lnbicsIG1ldGhvZChhc3NpZ24pKTtcbiAgICBmdW5jdGlvbiBtaXhpbih0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgdmFyIHByb3BzID0gJGdldE93blByb3BlcnR5TmFtZXMoc291cmNlKTtcbiAgICAgIHZhciBwLFxuICAgICAgICAgIGRlc2NyaXB0b3IsXG4gICAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwgcHJvcHNbcF0pO1xuICAgICAgICAkZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wc1twXSwgZGVzY3JpcHRvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnbWl4aW4nLCBtZXRob2QobWl4aW4pKTtcbiAgfVxuICBmdW5jdGlvbiBleHBvcnRTdGFyKG9iamVjdCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhhcmd1bWVudHNbaV0pO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuYW1lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAoZnVuY3Rpb24obW9kLCBuYW1lKSB7XG4gICAgICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZFtuYW1lXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKGFyZ3VtZW50c1tpXSwgbmFtZXNbal0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCk7XG4gICAgcmV0dXJuICRPYmplY3QodmFsdWUpO1xuICB9XG4gIGZ1bmN0aW9uIHNwcmVhZCgpIHtcbiAgICB2YXIgcnYgPSBbXSxcbiAgICAgICAgayA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZVRvU3ByZWFkID0gdG9PYmplY3QoYXJndW1lbnRzW2ldKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWVUb1NwcmVhZC5sZW5ndGg7IGorKykge1xuICAgICAgICBydltrKytdID0gdmFsdWVUb1NwcmVhZFtqXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICB3aGlsZSAob2JqZWN0ICE9PSBudWxsKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuICAgICAgaWYgKHJlc3VsdClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIG9iamVjdCA9ICRnZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIHByb3RvID0gJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpO1xuICAgIGlmICghcHJvdG8pXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCdzdXBlciBpcyBudWxsJyk7XG4gICAgcmV0dXJuIGdldFByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgbmFtZSk7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzY3JpcHRvcilcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IudmFsdWUuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICBpZiAoZGVzY3JpcHRvci5nZXQpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLmdldC5jYWxsKHNlbGYpLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKFwic3VwZXIgaGFzIG5vIG1ldGhvZCAnXCIgKyBuYW1lICsgXCInLlwiKTtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IpIHtcbiAgICAgIGlmIChkZXNjcmlwdG9yLmdldClcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IuZ2V0LmNhbGwoc2VsZik7XG4gICAgICBlbHNlIGlmICgndmFsdWUnIGluIGRlc2NyaXB0b3IpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyU2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgIGRlc2NyaXB0b3Iuc2V0LmNhbGwoc2VsZiwgdmFsdWUpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKFwic3VwZXIgaGFzIG5vIHNldHRlciAnXCIgKyBuYW1lICsgXCInLlwiKTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZXNjcmlwdG9ycyhvYmplY3QpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlc2NyaXB0b3JzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzKGN0b3IsIG9iamVjdCwgc3RhdGljT2JqZWN0LCBzdXBlckNsYXNzKSB7XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2NvbnN0cnVjdG9yJywge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIGN0b3IuX19wcm90b19fID0gc3VwZXJDbGFzcztcbiAgICAgIGN0b3IucHJvdG90eXBlID0gJGNyZWF0ZShnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSwgZ2V0RGVzY3JpcHRvcnMob2JqZWN0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gb2JqZWN0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoY3RvciwgJ3Byb3RvdHlwZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gJGRlZmluZVByb3BlcnRpZXMoY3RvciwgZ2V0RGVzY3JpcHRvcnMoc3RhdGljT2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0UHJvdG9QYXJlbnQoc3VwZXJDbGFzcykge1xuICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIHByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgICAgaWYgKCRPYmplY3QocHJvdG90eXBlKSA9PT0gcHJvdG90eXBlIHx8IHByb3RvdHlwZSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgIH1cbiAgICBpZiAoc3VwZXJDbGFzcyA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgfVxuICBmdW5jdGlvbiBkZWZhdWx0U3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIGFyZ3MpIHtcbiAgICBpZiAoJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpICE9PSBudWxsKVxuICAgICAgc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsICdjb25zdHJ1Y3RvcicsIGFyZ3MpO1xuICB9XG4gIHZhciBTVF9ORVdCT1JOID0gMDtcbiAgdmFyIFNUX0VYRUNVVElORyA9IDE7XG4gIHZhciBTVF9TVVNQRU5ERUQgPSAyO1xuICB2YXIgU1RfQ0xPU0VEID0gMztcbiAgdmFyIEVORF9TVEFURSA9IC0yO1xuICB2YXIgUkVUSFJPV19TVEFURSA9IC0zO1xuICBmdW5jdGlvbiBhZGRJdGVyYXRvcihvYmplY3QpIHtcbiAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTeW1ib2wuaXRlcmF0b3IsIG5vbkVudW0oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0SW50ZXJuYWxFcnJvcihzdGF0ZSkge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ1RyYWNldXIgY29tcGlsZXIgYnVnOiBpbnZhbGlkIHN0YXRlIGluIHN0YXRlIG1hY2hpbmU6ICcgKyBzdGF0ZSk7XG4gIH1cbiAgZnVuY3Rpb24gR2VuZXJhdG9yQ29udGV4dCgpIHtcbiAgICB0aGlzLnN0YXRlID0gMDtcbiAgICB0aGlzLkdTdGF0ZSA9IFNUX05FV0JPUk47XG4gICAgdGhpcy5zdG9yZWRFeGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5maW5hbGx5RmFsbFRocm91Z2ggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5zZW50XyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMudHJ5U3RhY2tfID0gW107XG4gIH1cbiAgR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gICAgcHVzaFRyeTogZnVuY3Rpb24oY2F0Y2hTdGF0ZSwgZmluYWxseVN0YXRlKSB7XG4gICAgICBpZiAoZmluYWxseVN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBmaW5hbGx5RmFsbFRocm91Z2ggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlTdGFja18ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAodGhpcy50cnlTdGFja19baV0uY2F0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoID0gdGhpcy50cnlTdGFja19baV0uY2F0Y2g7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsbHlGYWxsVGhyb3VnaCA9PT0gbnVsbClcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSBSRVRIUk9XX1NUQVRFO1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtcbiAgICAgICAgICBmaW5hbGx5OiBmaW5hbGx5U3RhdGUsXG4gICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoOiBmaW5hbGx5RmFsbFRocm91Z2hcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoY2F0Y2hTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtjYXRjaDogY2F0Y2hTdGF0ZX0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcG9wVHJ5OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHJ5U3RhY2tfLnBvcCgpO1xuICAgIH0sXG4gICAgZ2V0IHNlbnQoKSB7XG4gICAgICB0aGlzLm1heWJlVGhyb3coKTtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRfO1xuICAgIH0sXG4gICAgc2V0IHNlbnQodikge1xuICAgICAgdGhpcy5zZW50XyA9IHY7XG4gICAgfSxcbiAgICBnZXQgc2VudElnbm9yZVRocm93KCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBtYXliZVRocm93OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICB0aGlzLmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgdGhyb3cgdGhpcy5zZW50XztcbiAgICAgIH1cbiAgICB9LFxuICAgIGVuZDogZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBFTkRfU1RBVEU6XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGNhc2UgUkVUSFJPV19TVEFURTpcbiAgICAgICAgICB0aHJvdyB0aGlzLnN0b3JlZEV4Y2VwdGlvbjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZ2V0TmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgYWN0aW9uKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHN3aXRjaCAoY3R4LkdTdGF0ZSkge1xuICAgICAgICBjYXNlIFNUX0VYRUNVVElORzpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKFwiXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiIG9uIGV4ZWN1dGluZyBnZW5lcmF0b3JcIikpO1xuICAgICAgICBjYXNlIFNUX0NMT1NFRDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKFwiXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiIG9uIGNsb3NlZCBnZW5lcmF0b3JcIikpO1xuICAgICAgICBjYXNlIFNUX05FV0JPUk46XG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgICAgICAgIHRocm93IHg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh4ICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyAkVHlwZUVycm9yKCdTZW50IHZhbHVlIHRvIG5ld2Jvcm4gZ2VuZXJhdG9yJyk7XG4gICAgICAgIGNhc2UgU1RfU1VTUEVOREVEOlxuICAgICAgICAgIGN0eC5HU3RhdGUgPSBTVF9FWEVDVVRJTkc7XG4gICAgICAgICAgY3R4LmFjdGlvbiA9IGFjdGlvbjtcbiAgICAgICAgICBjdHguc2VudCA9IHg7XG4gICAgICAgICAgdmFyIHZhbHVlID0gbW92ZU5leHQoY3R4KTtcbiAgICAgICAgICB2YXIgZG9uZSA9IHZhbHVlID09PSBjdHg7XG4gICAgICAgICAgaWYgKGRvbmUpXG4gICAgICAgICAgICB2YWx1ZSA9IGN0eC5yZXR1cm5WYWx1ZTtcbiAgICAgICAgICBjdHguR1N0YXRlID0gZG9uZSA/IFNUX0NMT1NFRCA6IFNUX1NVU1BFTkRFRDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZG9uZTogZG9uZVxuICAgICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBnZW5lcmF0b3JXcmFwKGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEdlbmVyYXRvckNvbnRleHQoKTtcbiAgICByZXR1cm4gYWRkSXRlcmF0b3Ioe1xuICAgICAgbmV4dDogZ2V0TmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgJ25leHQnKSxcbiAgICAgIHRocm93OiBnZXROZXh0T3JUaHJvdyhjdHgsIG1vdmVOZXh0LCAndGhyb3cnKVxuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIEFzeW5jRnVuY3Rpb25Db250ZXh0KCkge1xuICAgIEdlbmVyYXRvckNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmVyciA9IHVuZGVmaW5lZDtcbiAgICB2YXIgY3R4ID0gdGhpcztcbiAgICBjdHgucmVzdWx0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjdHgucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBjdHgucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUpO1xuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICB0aGlzLnJlamVjdCh0aGlzLnN0b3JlZEV4Y2VwdGlvbik7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJlamVjdChnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpKTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGFzeW5jV3JhcChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgdmFyIG1vdmVOZXh0ID0gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZik7XG4gICAgdmFyIGN0eCA9IG5ldyBBc3luY0Z1bmN0aW9uQ29udGV4dCgpO1xuICAgIGN0eC5jcmVhdGVDYWxsYmFjayA9IGZ1bmN0aW9uKG5ld1N0YXRlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY3R4LnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIGN0eC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBtb3ZlTmV4dChjdHgpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGN0eC5jcmVhdGVFcnJiYWNrID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY3R4LnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIGN0eC5lcnIgPSBlcnI7XG4gICAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgbW92ZU5leHQoY3R4KTtcbiAgICByZXR1cm4gY3R4LnJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gaW5uZXJGdW5jdGlvbi5jYWxsKHNlbGYsIGN0eCk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgY3R4LnN0b3JlZEV4Y2VwdGlvbiA9IGV4O1xuICAgICAgICAgIHZhciBsYXN0ID0gY3R4LnRyeVN0YWNrX1tjdHgudHJ5U3RhY2tfLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgICAgICAgIGN0eC5zdGF0ZSA9IEVORF9TVEFURTtcbiAgICAgICAgICAgIHRocm93IGV4O1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHguc3RhdGUgPSBsYXN0LmNhdGNoICE9PSB1bmRlZmluZWQgPyBsYXN0LmNhdGNoIDogbGFzdC5maW5hbGx5O1xuICAgICAgICAgIGlmIChsYXN0LmZpbmFsbHlGYWxsVGhyb3VnaCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgY3R4LmZpbmFsbHlGYWxsVGhyb3VnaCA9IGxhc3QuZmluYWxseUZhbGxUaHJvdWdoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBzZXR1cEdsb2JhbHMoZ2xvYmFsKSB7XG4gICAgZ2xvYmFsLlN5bWJvbCA9IFN5bWJvbDtcbiAgICBwb2x5ZmlsbE9iamVjdChnbG9iYWwuT2JqZWN0KTtcbiAgfVxuICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgZ2xvYmFsLiR0cmFjZXVyUnVudGltZSA9IHtcbiAgICBhc3luY1dyYXA6IGFzeW5jV3JhcCxcbiAgICBjcmVhdGVDbGFzczogY3JlYXRlQ2xhc3MsXG4gICAgZGVmYXVsdFN1cGVyQ2FsbDogZGVmYXVsdFN1cGVyQ2FsbCxcbiAgICBleHBvcnRTdGFyOiBleHBvcnRTdGFyLFxuICAgIGdlbmVyYXRvcldyYXA6IGdlbmVyYXRvcldyYXAsXG4gICAgc2V0UHJvcGVydHk6IHNldFByb3BlcnR5LFxuICAgIHNldHVwR2xvYmFsczogc2V0dXBHbG9iYWxzLFxuICAgIHNwcmVhZDogc3ByZWFkLFxuICAgIHN1cGVyQ2FsbDogc3VwZXJDYWxsLFxuICAgIHN1cGVyR2V0OiBzdXBlckdldCxcbiAgICBzdXBlclNldDogc3VwZXJTZXQsXG4gICAgdG9PYmplY3Q6IHRvT2JqZWN0LFxuICAgIHRvUHJvcGVydHk6IHRvUHJvcGVydHksXG4gICAgdHlwZTogdHlwZXMsXG4gICAgdHlwZW9mOiB0eXBlT2ZcbiAgfTtcbn0pKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdGhpcyk7XG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhvcHRfc2NoZW1lLCBvcHRfdXNlckluZm8sIG9wdF9kb21haW4sIG9wdF9wb3J0LCBvcHRfcGF0aCwgb3B0X3F1ZXJ5RGF0YSwgb3B0X2ZyYWdtZW50KSB7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIGlmIChvcHRfc2NoZW1lKSB7XG4gICAgICBvdXQucHVzaChvcHRfc2NoZW1lLCAnOicpO1xuICAgIH1cbiAgICBpZiAob3B0X2RvbWFpbikge1xuICAgICAgb3V0LnB1c2goJy8vJyk7XG4gICAgICBpZiAob3B0X3VzZXJJbmZvKSB7XG4gICAgICAgIG91dC5wdXNoKG9wdF91c2VySW5mbywgJ0AnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKG9wdF9kb21haW4pO1xuICAgICAgaWYgKG9wdF9wb3J0KSB7XG4gICAgICAgIG91dC5wdXNoKCc6Jywgb3B0X3BvcnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0X3BhdGgpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9wYXRoKTtcbiAgICB9XG4gICAgaWYgKG9wdF9xdWVyeURhdGEpIHtcbiAgICAgIG91dC5wdXNoKCc/Jywgb3B0X3F1ZXJ5RGF0YSk7XG4gICAgfVxuICAgIGlmIChvcHRfZnJhZ21lbnQpIHtcbiAgICAgIG91dC5wdXNoKCcjJywgb3B0X2ZyYWdtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgfVxuICA7XG4gIHZhciBzcGxpdFJlID0gbmV3IFJlZ0V4cCgnXicgKyAnKD86JyArICcoW146Lz8jLl0rKScgKyAnOik/JyArICcoPzovLycgKyAnKD86KFteLz8jXSopQCk/JyArICcoW1xcXFx3XFxcXGRcXFxcLVxcXFx1MDEwMC1cXFxcdWZmZmYuJV0qKScgKyAnKD86OihbMC05XSspKT8nICsgJyk/JyArICcoW14/I10rKT8nICsgJyg/OlxcXFw/KFteI10qKSk/JyArICcoPzojKC4qKSk/JyArICckJyk7XG4gIHZhciBDb21wb25lbnRJbmRleCA9IHtcbiAgICBTQ0hFTUU6IDEsXG4gICAgVVNFUl9JTkZPOiAyLFxuICAgIERPTUFJTjogMyxcbiAgICBQT1JUOiA0LFxuICAgIFBBVEg6IDUsXG4gICAgUVVFUllfREFUQTogNixcbiAgICBGUkFHTUVOVDogN1xuICB9O1xuICBmdW5jdGlvbiBzcGxpdCh1cmkpIHtcbiAgICByZXR1cm4gKHVyaS5tYXRjaChzcGxpdFJlKSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlRG90U2VnbWVudHMocGF0aCkge1xuICAgIGlmIChwYXRoID09PSAnLycpXG4gICAgICByZXR1cm4gJy8nO1xuICAgIHZhciBsZWFkaW5nU2xhc2ggPSBwYXRoWzBdID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgdHJhaWxpbmdTbGFzaCA9IHBhdGguc2xpY2UoLTEpID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgc2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciB1cCA9IDA7XG4gICAgZm9yICh2YXIgcG9zID0gMDsgcG9zIDwgc2VnbWVudHMubGVuZ3RoOyBwb3MrKykge1xuICAgICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1twb3NdO1xuICAgICAgc3dpdGNoIChzZWdtZW50KSB7XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgIGNhc2UgJy4nOlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcuLic6XG4gICAgICAgICAgaWYgKG91dC5sZW5ndGgpXG4gICAgICAgICAgICBvdXQucG9wKCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdXArKztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBvdXQucHVzaChzZWdtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFsZWFkaW5nU2xhc2gpIHtcbiAgICAgIHdoaWxlICh1cC0tID4gMCkge1xuICAgICAgICBvdXQudW5zaGlmdCgnLi4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvdXQubGVuZ3RoID09PSAwKVxuICAgICAgICBvdXQucHVzaCgnLicpO1xuICAgIH1cbiAgICByZXR1cm4gbGVhZGluZ1NsYXNoICsgb3V0LmpvaW4oJy8nKSArIHRyYWlsaW5nU2xhc2g7XG4gIH1cbiAgZnVuY3Rpb24gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpIHtcbiAgICB2YXIgcGF0aCA9IHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdIHx8ICcnO1xuICAgIHBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhwYXRoKTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5VU0VSX0lORk9dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5ET01BSU5dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QT1JUXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlFVRVJZX0RBVEFdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5GUkFHTUVOVF0pO1xuICB9XG4gIGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZVVybCh1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gIH1cbiAgZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlLCB1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHZhciBiYXNlUGFydHMgPSBzcGxpdChiYXNlKTtcbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSkge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gQ29tcG9uZW50SW5kZXguU0NIRU1FOyBpIDw9IENvbXBvbmVudEluZGV4LlBPUlQ7IGkrKykge1xuICAgICAgaWYgKCFwYXJ0c1tpXSkge1xuICAgICAgICBwYXJ0c1tpXSA9IGJhc2VQYXJ0c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdWzBdID09ICcvJykge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9XG4gICAgdmFyIHBhdGggPSBiYXNlUGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF07XG4gICAgdmFyIGluZGV4ID0gcGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKDAsIGluZGV4ICsgMSkgKyBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiBpc0Fic29sdXRlKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hbWVbMF0gPT09ICcvJylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KG5hbWUpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5jYW5vbmljYWxpemVVcmwgPSBjYW5vbmljYWxpemVVcmw7XG4gICR0cmFjZXVyUnVudGltZS5pc0Fic29sdXRlID0gaXNBYnNvbHV0ZTtcbiAgJHRyYWNldXJSdW50aW1lLnJlbW92ZURvdFNlZ21lbnRzID0gcmVtb3ZlRG90U2VnbWVudHM7XG4gICR0cmFjZXVyUnVudGltZS5yZXNvbHZlVXJsID0gcmVzb2x2ZVVybDtcbn0pKCk7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyICRfXzIgPSAkdHJhY2V1clJ1bnRpbWUsXG4gICAgICBjYW5vbmljYWxpemVVcmwgPSAkX18yLmNhbm9uaWNhbGl6ZVVybCxcbiAgICAgIHJlc29sdmVVcmwgPSAkX18yLnJlc29sdmVVcmwsXG4gICAgICBpc0Fic29sdXRlID0gJF9fMi5pc0Fic29sdXRlO1xuICB2YXIgbW9kdWxlSW5zdGFudGlhdG9ycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBiYXNlVVJMO1xuICBpZiAoZ2xvYmFsLmxvY2F0aW9uICYmIGdsb2JhbC5sb2NhdGlvbi5ocmVmKVxuICAgIGJhc2VVUkwgPSByZXNvbHZlVXJsKGdsb2JhbC5sb2NhdGlvbi5ocmVmLCAnLi8nKTtcbiAgZWxzZVxuICAgIGJhc2VVUkwgPSAnJztcbiAgdmFyIFVuY29hdGVkTW9kdWxlRW50cnkgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUVudHJ5KHVybCwgdW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLnZhbHVlXyA9IHVuY29hdGVkTW9kdWxlO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUVudHJ5LCB7fSwge30pO1xuICB2YXIgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcih1cmwsIGZ1bmMpIHtcbiAgICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsKHRoaXMsICRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci5wcm90b3R5cGUsIFwiY29uc3RydWN0b3JcIiwgW3VybCwgbnVsbF0pO1xuICAgIHRoaXMuZnVuYyA9IGZ1bmM7XG4gIH07XG4gIHZhciAkVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcjtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IsIHtnZXRVbmNvYXRlZE1vZHVsZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy52YWx1ZV8pXG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlXztcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlXyA9IHRoaXMuZnVuYy5jYWxsKGdsb2JhbCk7XG4gICAgfX0sIHt9LCBVbmNvYXRlZE1vZHVsZUVudHJ5KTtcbiAgZnVuY3Rpb24gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybjtcbiAgICB2YXIgdXJsID0gTW9kdWxlU3RvcmUubm9ybWFsaXplKG5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVJbnN0YW50aWF0b3JzW3VybF07XG4gIH1cbiAgO1xuICB2YXIgbW9kdWxlSW5zdGFuY2VzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGxpdmVNb2R1bGVTZW50aW5lbCA9IHt9O1xuICBmdW5jdGlvbiBNb2R1bGUodW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB2YXIgaXNMaXZlID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb2F0ZWRNb2R1bGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHVuY29hdGVkTW9kdWxlKS5mb3JFYWNoKChmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZ2V0dGVyLFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgaWYgKGlzTGl2ZSA9PT0gbGl2ZU1vZHVsZVNlbnRpbmVsKSB7XG4gICAgICAgIHZhciBkZXNjciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodW5jb2F0ZWRNb2R1bGUsIG5hbWUpO1xuICAgICAgICBpZiAoZGVzY3IuZ2V0KVxuICAgICAgICAgIGdldHRlciA9IGRlc2NyLmdldDtcbiAgICAgIH1cbiAgICAgIGlmICghZ2V0dGVyKSB7XG4gICAgICAgIHZhbHVlID0gdW5jb2F0ZWRNb2R1bGVbbmFtZV07XG4gICAgICAgIGdldHRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb2F0ZWRNb2R1bGUsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnMoY29hdGVkTW9kdWxlKTtcbiAgICByZXR1cm4gY29hdGVkTW9kdWxlO1xuICB9XG4gIHZhciBNb2R1bGVTdG9yZSA9IHtcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKG5hbWUsIHJlZmVyZXJOYW1lLCByZWZlcmVyQWRkcmVzcykge1xuICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibW9kdWxlIG5hbWUgbXVzdCBiZSBhIHN0cmluZywgbm90IFwiICsgdHlwZW9mIG5hbWUpO1xuICAgICAgaWYgKGlzQWJzb2x1dGUobmFtZSkpXG4gICAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgICBpZiAoL1teXFwuXVxcL1xcLlxcLlxcLy8udGVzdChuYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21vZHVsZSBuYW1lIGVtYmVkcyAvLi4vOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobmFtZVswXSA9PT0gJy4nICYmIHJlZmVyZXJOYW1lKVxuICAgICAgICByZXR1cm4gcmVzb2x2ZVVybChyZWZlcmVyTmFtZSwgbmFtZSk7XG4gICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSkge1xuICAgICAgdmFyIG0gPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSk7XG4gICAgICBpZiAoIW0pXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB2YXIgbW9kdWxlSW5zdGFuY2UgPSBtb2R1bGVJbnN0YW5jZXNbbS51cmxdO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbmNlKVxuICAgICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2U7XG4gICAgICBtb2R1bGVJbnN0YW5jZSA9IE1vZHVsZShtLmdldFVuY29hdGVkTW9kdWxlKCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2VzW20udXJsXSA9IG1vZHVsZUluc3RhbmNlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSwgbW9kdWxlKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IFN0cmluZyhub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgfSkpO1xuICAgICAgbW9kdWxlSW5zdGFuY2VzW25vcm1hbGl6ZWROYW1lXSA9IG1vZHVsZTtcbiAgICB9LFxuICAgIGdldCBiYXNlVVJMKCkge1xuICAgICAgcmV0dXJuIGJhc2VVUkw7XG4gICAgfSxcbiAgICBzZXQgYmFzZVVSTCh2KSB7XG4gICAgICBiYXNlVVJMID0gU3RyaW5nKHYpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJNb2R1bGU6IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpIHtcbiAgICAgIHZhciBub3JtYWxpemVkTmFtZSA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgbW9kdWxlIG5hbWVkICcgKyBub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgZnVuYyk7XG4gICAgfSxcbiAgICBidW5kbGVTdG9yZTogT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZGVwcywgZnVuYykge1xuICAgICAgaWYgKCFkZXBzIHx8ICFkZXBzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnJlZ2lzdGVyTW9kdWxlKG5hbWUsIGZ1bmMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5idW5kbGVTdG9yZVtuYW1lXSA9IHtcbiAgICAgICAgICBkZXBzOiBkZXBzLFxuICAgICAgICAgIGV4ZWN1dGU6IGZ1bmNcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGdldEFub255bW91c01vZHVsZTogZnVuY3Rpb24oZnVuYykge1xuICAgICAgcmV0dXJuIG5ldyBNb2R1bGUoZnVuYy5jYWxsKGdsb2JhbCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgfSxcbiAgICBnZXRGb3JUZXN0aW5nOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgICBpZiAoIXRoaXMudGVzdGluZ1ByZWZpeF8pIHtcbiAgICAgICAgT2JqZWN0LmtleXMobW9kdWxlSW5zdGFuY2VzKS5zb21lKChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICB2YXIgbSA9IC8odHJhY2V1ckBbXlxcL10qXFwvKS8uZXhlYyhrZXkpO1xuICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAkX18wLnRlc3RpbmdQcmVmaXhfID0gbVsxXTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHRoaXMudGVzdGluZ1ByZWZpeF8gKyBuYW1lKTtcbiAgICB9XG4gIH07XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUnLCBuZXcgTW9kdWxlKHtNb2R1bGVTdG9yZTogTW9kdWxlU3RvcmV9KSk7XG4gIHZhciBzZXR1cEdsb2JhbHMgPSAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzO1xuICAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzID0gZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5Nb2R1bGVTdG9yZSA9IE1vZHVsZVN0b3JlO1xuICBnbG9iYWwuU3lzdGVtID0ge1xuICAgIHJlZ2lzdGVyOiBNb2R1bGVTdG9yZS5yZWdpc3Rlci5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICBnZXQ6IE1vZHVsZVN0b3JlLmdldCxcbiAgICBzZXQ6IE1vZHVsZVN0b3JlLnNldCxcbiAgICBub3JtYWxpemU6IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZVxuICB9O1xuICAkdHJhY2V1clJ1bnRpbWUuZ2V0TW9kdWxlSW1wbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaW5zdGFudGlhdG9yID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSk7XG4gICAgcmV0dXJuIGluc3RhbnRpYXRvciAmJiBpbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUoKTtcbiAgfTtcbn0pKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdGhpcyk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlsc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlsc1wiO1xuICB2YXIgdG9PYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUudG9PYmplY3Q7XG4gIGZ1bmN0aW9uIHRvVWludDMyKHgpIHtcbiAgICByZXR1cm4geCB8IDA7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQgdG9PYmplY3QoKSB7XG4gICAgICByZXR1cm4gdG9PYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgdG9VaW50MzIoKSB7XG4gICAgICByZXR1cm4gdG9VaW50MzI7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX180O1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yXCI7XG4gIHZhciAkX181ID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzXCIpLFxuICAgICAgdG9PYmplY3QgPSAkX181LnRvT2JqZWN0LFxuICAgICAgdG9VaW50MzIgPSAkX181LnRvVWludDMyO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTID0gMTtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTID0gMjtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUyA9IDM7XG4gIHZhciBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gQXJyYXlJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheUl0ZXJhdG9yLCAoJF9fNCA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fNCwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0b09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBhcnJheSA9IGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XztcbiAgICAgIGlmICghYXJyYXkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0IGlzIG5vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5kZXggPSBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XztcbiAgICAgIHZhciBpdGVtS2luZCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0aW9uS2luZF87XG4gICAgICB2YXIgbGVuZ3RoID0gdG9VaW50MzIoYXJyYXkubGVuZ3RoKTtcbiAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSBJbmZpbml0eTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IGluZGV4ICsgMTtcbiAgICAgIGlmIChpdGVtS2luZCA9PSBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGFycmF5W2luZGV4XSwgZmFsc2UpO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KFtpbmRleCwgYXJyYXlbaW5kZXhdXSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGluZGV4LCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzQsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzQpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5SXRlcmF0b3IoYXJyYXksIGtpbmQpIHtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QoYXJyYXkpO1xuICAgIHZhciBpdGVyYXRvciA9IG5ldyBBcnJheUl0ZXJhdG9yO1xuICAgIGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XyA9IG9iamVjdDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IDA7XG4gICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXyA9IGtpbmQ7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHZhbHVlLCBkb25lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGRvbmU6IGRvbmVcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKTtcbiAgfVxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfS0VZUyk7XG4gIH1cbiAgZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBlbnRyaWVzKCkge1xuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfSxcbiAgICBnZXQga2V5cygpIHtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgZ2V0IHZhbHVlcygpIHtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXBcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwXCI7XG4gIHZhciAkX19kZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgdmFyIGxlbmd0aCA9IHF1ZXVlLnB1c2goW2NhbGxiYWNrLCBhcmddKTtcbiAgICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9O1xuICB2YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgdmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbiAgZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICB9O1xuICB9XG4gIHZhciBxdWV1ZSA9IFtdO1xuICBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdHVwbGUgPSBxdWV1ZVtpXTtcbiAgICAgIHZhciBjYWxsYmFjayA9IHR1cGxlWzBdLFxuICAgICAgICAgIGFyZyA9IHR1cGxlWzFdO1xuICAgICAgY2FsbGJhY2soYXJnKTtcbiAgICB9XG4gICAgcXVldWUgPSBbXTtcbiAgfVxuICB2YXIgc2NoZWR1bGVGbHVzaDtcbiAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbiAgfSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gIH0gZWxzZSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgfVxuICByZXR1cm4ge2dldCBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuICRfX2RlZmF1bHQ7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2VcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZVwiO1xuICB2YXIgYXN5bmMgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwXCIpLmRlZmF1bHQ7XG4gIGZ1bmN0aW9uIGlzUHJvbWlzZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHguc3RhdHVzXyAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGNoYWluKHByb21pc2UpIHtcbiAgICB2YXIgb25SZXNvbHZlID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9KTtcbiAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMl0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzJdIDogKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfSk7XG4gICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQocHJvbWlzZS5jb25zdHJ1Y3Rvcik7XG4gICAgc3dpdGNoIChwcm9taXNlLnN0YXR1c18pIHtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICB0aHJvdyBUeXBlRXJyb3I7XG4gICAgICBjYXNlICdwZW5kaW5nJzpcbiAgICAgICAgcHJvbWlzZS5vblJlc29sdmVfLnB1c2goW2RlZmVycmVkLCBvblJlc29sdmVdKTtcbiAgICAgICAgcHJvbWlzZS5vblJlamVjdF8ucHVzaChbZGVmZXJyZWQsIG9uUmVqZWN0XSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncmVzb2x2ZWQnOlxuICAgICAgICBwcm9taXNlUmVhY3QoZGVmZXJyZWQsIG9uUmVzb2x2ZSwgcHJvbWlzZS52YWx1ZV8pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3JlamVjdGVkJzpcbiAgICAgICAgcHJvbWlzZVJlYWN0KGRlZmVycmVkLCBvblJlamVjdCwgcHJvbWlzZS52YWx1ZV8pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0RGVmZXJyZWQoQykge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQucHJvbWlzZSA9IG5ldyBDKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlc3VsdC5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHJlc3VsdC5yZWplY3QgPSByZWplY3Q7XG4gICAgfSkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdmFyIFByb21pc2UgPSBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgdmFyICRfXzYgPSB0aGlzO1xuICAgIHRoaXMuc3RhdHVzXyA9ICdwZW5kaW5nJztcbiAgICB0aGlzLm9uUmVzb2x2ZV8gPSBbXTtcbiAgICB0aGlzLm9uUmVqZWN0XyA9IFtdO1xuICAgIHJlc29sdmVyKChmdW5jdGlvbih4KSB7XG4gICAgICBwcm9taXNlUmVzb2x2ZSgkX182LCB4KTtcbiAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgIHByb21pc2VSZWplY3QoJF9fNiwgcik7XG4gICAgfSkpO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShQcm9taXNlLCB7XG4gICAgY2F0Y2g6IGZ1bmN0aW9uKG9uUmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25SZWplY3QpO1xuICAgIH0sXG4gICAgdGhlbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb25SZXNvbHZlID0gYXJndW1lbnRzWzBdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1swXSA6IChmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgICAgfSk7XG4gICAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICB2YXIgJF9fNiA9IHRoaXM7XG4gICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIGNoYWluKHRoaXMsIChmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KTtcbiAgICAgICAgcmV0dXJuIHggPT09ICRfXzYgPyBvblJlamVjdChuZXcgVHlwZUVycm9yKSA6IGlzUHJvbWlzZSh4KSA/IHgudGhlbihvblJlc29sdmUsIG9uUmVqZWN0KSA6IG9uUmVzb2x2ZSh4KTtcbiAgICAgIH0pLCBvblJlamVjdCk7XG4gICAgfVxuICB9LCB7XG4gICAgcmVzb2x2ZTogZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVzb2x2ZSh4KTtcbiAgICAgIH0pKTtcbiAgICB9LFxuICAgIHJlamVjdDogZnVuY3Rpb24ocikge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KHIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgY2FzdDogZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKHggaW5zdGFuY2VvZiB0aGlzKVxuICAgICAgICByZXR1cm4geDtcbiAgICAgIGlmIChpc1Byb21pc2UoeCkpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgICBjaGFpbih4LCByZXN1bHQucmVzb2x2ZSwgcmVzdWx0LnJlamVjdCk7XG4gICAgICAgIHJldHVybiByZXN1bHQucHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmUoeCk7XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgdmFyIHJlc29sdXRpb25zID0gW107XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICsrY291bnQ7XG4gICAgICAgICAgdGhpcy5jYXN0KHZhbHVlc1tpXSkudGhlbihmdW5jdGlvbihpLCB4KSB7XG4gICAgICAgICAgICByZXNvbHV0aW9uc1tpXSA9IHg7XG4gICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMClcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXNvbHV0aW9ucyk7XG4gICAgICAgICAgfS5iaW5kKHVuZGVmaW5lZCwgaSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICBpZiAoY291bnQgPiAwKVxuICAgICAgICAgICAgICBjb3VudCA9IDA7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMClcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSxcbiAgICByYWNlOiBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLmNhc3QodmFsdWVzW2ldKS50aGVuKChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHgpO1xuICAgICAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH0pO1xuICBmdW5jdGlvbiBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgJ3Jlc29sdmVkJywgeCwgcHJvbWlzZS5vblJlc29sdmVfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCAncmVqZWN0ZWQnLCByLCBwcm9taXNlLm9uUmVqZWN0Xyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZURvbmUocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSwgcmVhY3Rpb25zKSB7XG4gICAgaWYgKHByb21pc2Uuc3RhdHVzXyAhPT0gJ3BlbmRpbmcnKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9taXNlUmVhY3QocmVhY3Rpb25zW2ldWzBdLCByZWFjdGlvbnNbaV1bMV0sIHZhbHVlKTtcbiAgICB9XG4gICAgcHJvbWlzZS5zdGF0dXNfID0gc3RhdHVzO1xuICAgIHByb21pc2UudmFsdWVfID0gdmFsdWU7XG4gICAgcHJvbWlzZS5vblJlc29sdmVfID0gcHJvbWlzZS5vblJlamVjdF8gPSB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVJlYWN0KGRlZmVycmVkLCBoYW5kbGVyLCB4KSB7XG4gICAgYXN5bmMoKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHkgPSBoYW5kbGVyKHgpO1xuICAgICAgICBpZiAoeSA9PT0gZGVmZXJyZWQucHJvbWlzZSlcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgICBlbHNlIGlmIChpc1Byb21pc2UoeSkpXG4gICAgICAgICAgY2hhaW4oeSwgZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoeSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgdmFyIHRoZW5hYmxlU3ltYm9sID0gJ0BAdGhlbmFibGUnO1xuICBmdW5jdGlvbiBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KSB7XG4gICAgaWYgKGlzUHJvbWlzZSh4KSkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfSBlbHNlIGlmICh4ICYmIHR5cGVvZiB4LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBwID0geFt0aGVuYWJsZVN5bWJvbF07XG4gICAgICBpZiAocCkge1xuICAgICAgICByZXR1cm4gcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKGNvbnN0cnVjdG9yKTtcbiAgICAgICAgeFt0aGVuYWJsZVN5bWJvbF0gPSBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHgudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtnZXQgUHJvbWlzZSgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlO1xuICAgIH19O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nXCI7XG4gIHZhciAkdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgJGluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG4gIHZhciAkbGFzdEluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mO1xuICBmdW5jdGlvbiBzdGFydHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGVuZHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3MgPSBzdHJpbmdMZW5ndGg7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgICAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgdmFyIHN0YXJ0ID0gZW5kIC0gc2VhcmNoTGVuZ3RoO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRsYXN0SW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBzdGFydCkgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gY29udGFpbnMoc2VhcmNoKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpICE9IC0xO1xuICB9XG4gIGZ1bmN0aW9uIHJlcGVhdChjb3VudCkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIHZhciBuID0gY291bnQgPyBOdW1iZXIoY291bnQpIDogMDtcbiAgICBpZiAoaXNOYU4obikpIHtcbiAgICAgIG4gPSAwO1xuICAgIH1cbiAgICBpZiAobiA8IDAgfHwgbiA9PSBJbmZpbml0eSkge1xuICAgICAgdGhyb3cgUmFuZ2VFcnJvcigpO1xuICAgIH1cbiAgICBpZiAobiA9PSAwKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICB3aGlsZSAobi0tKSB7XG4gICAgICByZXN1bHQgKz0gc3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGNvZGVQb2ludEF0KHBvc2l0aW9uKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIHNpemUgPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBpbmRleCA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgaW5kZXggPSAwO1xuICAgIH1cbiAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHNpemUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBmaXJzdCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICB2YXIgc2Vjb25kO1xuICAgIGlmIChmaXJzdCA+PSAweEQ4MDAgJiYgZmlyc3QgPD0gMHhEQkZGICYmIHNpemUgPiBpbmRleCArIDEpIHtcbiAgICAgIHNlY29uZCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4ICsgMSk7XG4gICAgICBpZiAoc2Vjb25kID49IDB4REMwMCAmJiBzZWNvbmQgPD0gMHhERkZGKSB7XG4gICAgICAgIHJldHVybiAoZmlyc3QgLSAweEQ4MDApICogMHg0MDAgKyBzZWNvbmQgLSAweERDMDAgKyAweDEwMDAwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlyc3Q7XG4gIH1cbiAgZnVuY3Rpb24gcmF3KGNhbGxzaXRlKSB7XG4gICAgdmFyIHJhdyA9IGNhbGxzaXRlLnJhdztcbiAgICB2YXIgbGVuID0gcmF3Lmxlbmd0aCA+Pj4gMDtcbiAgICBpZiAobGVuID09PSAwKVxuICAgICAgcmV0dXJuICcnO1xuICAgIHZhciBzID0gJyc7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBzICs9IHJhd1tpXTtcbiAgICAgIGlmIChpICsgMSA9PT0gbGVuKVxuICAgICAgICByZXR1cm4gcztcbiAgICAgIHMgKz0gYXJndW1lbnRzWysraV07XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoKSB7XG4gICAgdmFyIGNvZGVVbml0cyA9IFtdO1xuICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgdmFyIGhpZ2hTdXJyb2dhdGU7XG4gICAgdmFyIGxvd1N1cnJvZ2F0ZTtcbiAgICB2YXIgaW5kZXggPSAtMTtcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIGNvZGVQb2ludCA9IE51bWJlcihhcmd1bWVudHNbaW5kZXhdKTtcbiAgICAgIGlmICghaXNGaW5pdGUoY29kZVBvaW50KSB8fCBjb2RlUG9pbnQgPCAwIHx8IGNvZGVQb2ludCA+IDB4MTBGRkZGIHx8IGZsb29yKGNvZGVQb2ludCkgIT0gY29kZVBvaW50KSB7XG4gICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludDogJyArIGNvZGVQb2ludCk7XG4gICAgICB9XG4gICAgICBpZiAoY29kZVBvaW50IDw9IDB4RkZGRikge1xuICAgICAgICBjb2RlVW5pdHMucHVzaChjb2RlUG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29kZVBvaW50IC09IDB4MTAwMDA7XG4gICAgICAgIGhpZ2hTdXJyb2dhdGUgPSAoY29kZVBvaW50ID4+IDEwKSArIDB4RDgwMDtcbiAgICAgICAgbG93U3Vycm9nYXRlID0gKGNvZGVQb2ludCAlIDB4NDAwKSArIDB4REMwMDtcbiAgICAgICAgY29kZVVuaXRzLnB1c2goaGlnaFN1cnJvZ2F0ZSwgbG93U3Vycm9nYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgY29kZVVuaXRzKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBzdGFydHNXaXRoKCkge1xuICAgICAgcmV0dXJuIHN0YXJ0c1dpdGg7XG4gICAgfSxcbiAgICBnZXQgZW5kc1dpdGgoKSB7XG4gICAgICByZXR1cm4gZW5kc1dpdGg7XG4gICAgfSxcbiAgICBnZXQgY29udGFpbnMoKSB7XG4gICAgICByZXR1cm4gY29udGFpbnM7XG4gICAgfSxcbiAgICBnZXQgcmVwZWF0KCkge1xuICAgICAgcmV0dXJuIHJlcGVhdDtcbiAgICB9LFxuICAgIGdldCBjb2RlUG9pbnRBdCgpIHtcbiAgICAgIHJldHVybiBjb2RlUG9pbnRBdDtcbiAgICB9LFxuICAgIGdldCByYXcoKSB7XG4gICAgICByZXR1cm4gcmF3O1xuICAgIH0sXG4gICAgZ2V0IGZyb21Db2RlUG9pbnQoKSB7XG4gICAgICByZXR1cm4gZnJvbUNvZGVQb2ludDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxsc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHNcIjtcbiAgdmFyIFByb21pc2UgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZVwiKS5Qcm9taXNlO1xuICB2YXIgJF9fOSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdcIiksXG4gICAgICBjb2RlUG9pbnRBdCA9ICRfXzkuY29kZVBvaW50QXQsXG4gICAgICBjb250YWlucyA9ICRfXzkuY29udGFpbnMsXG4gICAgICBlbmRzV2l0aCA9ICRfXzkuZW5kc1dpdGgsXG4gICAgICBmcm9tQ29kZVBvaW50ID0gJF9fOS5mcm9tQ29kZVBvaW50LFxuICAgICAgcmVwZWF0ID0gJF9fOS5yZXBlYXQsXG4gICAgICByYXcgPSAkX185LnJhdyxcbiAgICAgIHN0YXJ0c1dpdGggPSAkX185LnN0YXJ0c1dpdGg7XG4gIHZhciAkX185ID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3JcIiksXG4gICAgICBlbnRyaWVzID0gJF9fOS5lbnRyaWVzLFxuICAgICAga2V5cyA9ICRfXzkua2V5cyxcbiAgICAgIHZhbHVlcyA9ICRfXzkudmFsdWVzO1xuICBmdW5jdGlvbiBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKCEobmFtZSBpbiBvYmplY3QpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZEZ1bmN0aW9ucyhvYmplY3QsIGZ1bmN0aW9ucykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZnVuY3Rpb25zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICB2YXIgbmFtZSA9IGZ1bmN0aW9uc1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IGZ1bmN0aW9uc1tpICsgMV07XG4gICAgICBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxQcm9taXNlKGdsb2JhbCkge1xuICAgIGlmICghZ2xvYmFsLlByb21pc2UpXG4gICAgICBnbG9iYWwuUHJvbWlzZSA9IFByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxTdHJpbmcoU3RyaW5nKSB7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLnByb3RvdHlwZSwgWydjb2RlUG9pbnRBdCcsIGNvZGVQb2ludEF0LCAnY29udGFpbnMnLCBjb250YWlucywgJ2VuZHNXaXRoJywgZW5kc1dpdGgsICdzdGFydHNXaXRoJywgc3RhcnRzV2l0aCwgJ3JlcGVhdCcsIHJlcGVhdF0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKFN0cmluZywgWydmcm9tQ29kZVBvaW50JywgZnJvbUNvZGVQb2ludCwgJ3JhdycsIHJhd10pO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsQXJyYXkoQXJyYXksIFN5bWJvbCkge1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LnByb3RvdHlwZSwgWydlbnRyaWVzJywgZW50cmllcywgJ2tleXMnLCBrZXlzLCAndmFsdWVzJywgdmFsdWVzXSk7XG4gICAgaWYgKFN5bWJvbCAmJiBTeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgICAgICB2YWx1ZTogdmFsdWVzLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsKGdsb2JhbCkge1xuICAgIHBvbHlmaWxsUHJvbWlzZShnbG9iYWwpO1xuICAgIHBvbHlmaWxsU3RyaW5nKGdsb2JhbC5TdHJpbmcpO1xuICAgIHBvbHlmaWxsQXJyYXkoZ2xvYmFsLkFycmF5LCBnbG9iYWwuU3ltYm9sKTtcbiAgfVxuICBwb2x5ZmlsbCh0aGlzKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgICBwb2x5ZmlsbChnbG9iYWwpO1xuICB9O1xuICByZXR1cm4ge307XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCI7XG4gIHZhciAkX18xMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHNcIik7XG4gIHJldHVybiB7fTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCIgKyAnJyk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvUGF0aEZpbmRpbmcnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaGVhcCcpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgSGVhcCwgZGVmYXVsdENtcCwgZmxvb3IsIGhlYXBpZnksIGhlYXBwb3AsIGhlYXBwdXNoLCBoZWFwcHVzaHBvcCwgaGVhcHJlcGxhY2UsIGluc29ydCwgbWluLCBubGFyZ2VzdCwgbnNtYWxsZXN0LCB1cGRhdGVJdGVtLCBfc2lmdGRvd24sIF9zaWZ0dXA7XG5cbiAgZmxvb3IgPSBNYXRoLmZsb29yLCBtaW4gPSBNYXRoLm1pbjtcblxuICAvKiBcbiAgRGVmYXVsdCBjb21wYXJpc29uIGZ1bmN0aW9uIHRvIGJlIHVzZWRcbiAgKi9cblxuXG4gIGRlZmF1bHRDbXAgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHggPCB5KSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGlmICh4ID4geSkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9O1xuXG4gIC8qIFxuICBJbnNlcnQgaXRlbSB4IGluIGxpc3QgYSwgYW5kIGtlZXAgaXQgc29ydGVkIGFzc3VtaW5nIGEgaXMgc29ydGVkLlxuICBcbiAgSWYgeCBpcyBhbHJlYWR5IGluIGEsIGluc2VydCBpdCB0byB0aGUgcmlnaHQgb2YgdGhlIHJpZ2h0bW9zdCB4LlxuICBcbiAgT3B0aW9uYWwgYXJncyBsbyAoZGVmYXVsdCAwKSBhbmQgaGkgKGRlZmF1bHQgYS5sZW5ndGgpIGJvdW5kIHRoZSBzbGljZVxuICBvZiBhIHRvIGJlIHNlYXJjaGVkLlxuICAqL1xuXG5cbiAgaW5zb3J0ID0gZnVuY3Rpb24oYSwgeCwgbG8sIGhpLCBjbXApIHtcbiAgICB2YXIgbWlkO1xuICAgIGlmIChsbyA9PSBudWxsKSB7XG4gICAgICBsbyA9IDA7XG4gICAgfVxuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKGxvIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsbyBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xuICAgIH1cbiAgICBpZiAoaGkgPT0gbnVsbCkge1xuICAgICAgaGkgPSBhLmxlbmd0aDtcbiAgICB9XG4gICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgIG1pZCA9IGZsb29yKChsbyArIGhpKSAvIDIpO1xuICAgICAgaWYgKGNtcCh4LCBhW21pZF0pIDwgMCkge1xuICAgICAgICBoaSA9IG1pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvID0gbWlkICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChbXS5zcGxpY2UuYXBwbHkoYSwgW2xvLCBsbyAtIGxvXS5jb25jYXQoeCkpLCB4KTtcbiAgfTtcblxuICAvKlxuICBQdXNoIGl0ZW0gb250byBoZWFwLCBtYWludGFpbmluZyB0aGUgaGVhcCBpbnZhcmlhbnQuXG4gICovXG5cblxuICBoZWFwcHVzaCA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBjbXApIHtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGFycmF5LnB1c2goaXRlbSk7XG4gICAgcmV0dXJuIF9zaWZ0ZG93bihhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gMSwgY21wKTtcbiAgfTtcblxuICAvKlxuICBQb3AgdGhlIHNtYWxsZXN0IGl0ZW0gb2ZmIHRoZSBoZWFwLCBtYWludGFpbmluZyB0aGUgaGVhcCBpbnZhcmlhbnQuXG4gICovXG5cblxuICBoZWFwcG9wID0gZnVuY3Rpb24oYXJyYXksIGNtcCkge1xuICAgIHZhciBsYXN0ZWx0LCByZXR1cm5pdGVtO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgbGFzdGVsdCA9IGFycmF5LnBvcCgpO1xuICAgIGlmIChhcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybml0ZW0gPSBhcnJheVswXTtcbiAgICAgIGFycmF5WzBdID0gbGFzdGVsdDtcbiAgICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybml0ZW0gPSBsYXN0ZWx0O1xuICAgIH1cbiAgICByZXR1cm4gcmV0dXJuaXRlbTtcbiAgfTtcblxuICAvKlxuICBQb3AgYW5kIHJldHVybiB0aGUgY3VycmVudCBzbWFsbGVzdCB2YWx1ZSwgYW5kIGFkZCB0aGUgbmV3IGl0ZW0uXG4gIFxuICBUaGlzIGlzIG1vcmUgZWZmaWNpZW50IHRoYW4gaGVhcHBvcCgpIGZvbGxvd2VkIGJ5IGhlYXBwdXNoKCksIGFuZCBjYW4gYmUgXG4gIG1vcmUgYXBwcm9wcmlhdGUgd2hlbiB1c2luZyBhIGZpeGVkIHNpemUgaGVhcC4gTm90ZSB0aGF0IHRoZSB2YWx1ZVxuICByZXR1cm5lZCBtYXkgYmUgbGFyZ2VyIHRoYW4gaXRlbSEgVGhhdCBjb25zdHJhaW5zIHJlYXNvbmFibGUgdXNlIG9mXG4gIHRoaXMgcm91dGluZSB1bmxlc3Mgd3JpdHRlbiBhcyBwYXJ0IG9mIGEgY29uZGl0aW9uYWwgcmVwbGFjZW1lbnQ6XG4gICAgICBpZiBpdGVtID4gYXJyYXlbMF1cbiAgICAgICAgaXRlbSA9IGhlYXByZXBsYWNlKGFycmF5LCBpdGVtKVxuICAqL1xuXG5cbiAgaGVhcHJlcGxhY2UgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIHJldHVybml0ZW07XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICByZXR1cm5pdGVtID0gYXJyYXlbMF07XG4gICAgYXJyYXlbMF0gPSBpdGVtO1xuICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgcmV0dXJuIHJldHVybml0ZW07XG4gIH07XG5cbiAgLypcbiAgRmFzdCB2ZXJzaW9uIG9mIGEgaGVhcHB1c2ggZm9sbG93ZWQgYnkgYSBoZWFwcG9wLlxuICAqL1xuXG5cbiAgaGVhcHB1c2hwb3AgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIF9yZWY7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBpZiAoYXJyYXkubGVuZ3RoICYmIGNtcChhcnJheVswXSwgaXRlbSkgPCAwKSB7XG4gICAgICBfcmVmID0gW2FycmF5WzBdLCBpdGVtXSwgaXRlbSA9IF9yZWZbMF0sIGFycmF5WzBdID0gX3JlZlsxXTtcbiAgICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiBpdGVtO1xuICB9O1xuXG4gIC8qXG4gIFRyYW5zZm9ybSBsaXN0IGludG8gYSBoZWFwLCBpbi1wbGFjZSwgaW4gTyhhcnJheS5sZW5ndGgpIHRpbWUuXG4gICovXG5cblxuICBoZWFwaWZ5ID0gZnVuY3Rpb24oYXJyYXksIGNtcCkge1xuICAgIHZhciBpLCBfaSwgX2osIF9sZW4sIF9yZWYsIF9yZWYxLCBfcmVzdWx0cywgX3Jlc3VsdHMxO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgX3JlZjEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICBfcmVzdWx0czEgPSBbXTtcbiAgICAgIGZvciAodmFyIF9qID0gMCwgX3JlZiA9IGZsb29yKGFycmF5Lmxlbmd0aCAvIDIpOyAwIDw9IF9yZWYgPyBfaiA8IF9yZWYgOiBfaiA+IF9yZWY7IDAgPD0gX3JlZiA/IF9qKysgOiBfai0tKXsgX3Jlc3VsdHMxLnB1c2goX2opOyB9XG4gICAgICByZXR1cm4gX3Jlc3VsdHMxO1xuICAgIH0pLmFwcGx5KHRoaXMpLnJldmVyc2UoKTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZjEubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIGkgPSBfcmVmMVtfaV07XG4gICAgICBfcmVzdWx0cy5wdXNoKF9zaWZ0dXAoYXJyYXksIGksIGNtcCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH07XG5cbiAgLypcbiAgVXBkYXRlIHRoZSBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gaXRlbSBpbiB0aGUgaGVhcC5cbiAgVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgY2FsbGVkIGV2ZXJ5IHRpbWUgdGhlIGl0ZW0gaXMgYmVpbmcgbW9kaWZpZWQuXG4gICovXG5cblxuICB1cGRhdGVJdGVtID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGNtcCkge1xuICAgIHZhciBwb3M7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBwb3MgPSBhcnJheS5pbmRleE9mKGl0ZW0pO1xuICAgIGlmIChwb3MgPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zaWZ0ZG93bihhcnJheSwgMCwgcG9zLCBjbXApO1xuICAgIHJldHVybiBfc2lmdHVwKGFycmF5LCBwb3MsIGNtcCk7XG4gIH07XG5cbiAgLypcbiAgRmluZCB0aGUgbiBsYXJnZXN0IGVsZW1lbnRzIGluIGEgZGF0YXNldC5cbiAgKi9cblxuXG4gIG5sYXJnZXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGNtcCkge1xuICAgIHZhciBlbGVtLCByZXN1bHQsIF9pLCBfbGVuLCBfcmVmO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgcmVzdWx0ID0gYXJyYXkuc2xpY2UoMCwgbik7XG4gICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBoZWFwaWZ5KHJlc3VsdCwgY21wKTtcbiAgICBfcmVmID0gYXJyYXkuc2xpY2Uobik7XG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBfcmVmLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBlbGVtID0gX3JlZltfaV07XG4gICAgICBoZWFwcHVzaHBvcChyZXN1bHQsIGVsZW0sIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQuc29ydChjbXApLnJldmVyc2UoKTtcbiAgfTtcblxuICAvKlxuICBGaW5kIHRoZSBuIHNtYWxsZXN0IGVsZW1lbnRzIGluIGEgZGF0YXNldC5cbiAgKi9cblxuXG4gIG5zbWFsbGVzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBjbXApIHtcbiAgICB2YXIgZWxlbSwgaSwgbG9zLCByZXN1bHQsIF9pLCBfaiwgX2xlbiwgX3JlZiwgX3JlZjEsIF9yZXN1bHRzO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKG4gKiAxMCA8PSBhcnJheS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCA9IGFycmF5LnNsaWNlKDAsIG4pLnNvcnQoY21wKTtcbiAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgbG9zID0gcmVzdWx0W3Jlc3VsdC5sZW5ndGggLSAxXTtcbiAgICAgIF9yZWYgPSBhcnJheS5zbGljZShuKTtcbiAgICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZi5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgICBlbGVtID0gX3JlZltfaV07XG4gICAgICAgIGlmIChjbXAoZWxlbSwgbG9zKSA8IDApIHtcbiAgICAgICAgICBpbnNvcnQocmVzdWx0LCBlbGVtLCAwLCBudWxsLCBjbXApO1xuICAgICAgICAgIHJlc3VsdC5wb3AoKTtcbiAgICAgICAgICBsb3MgPSByZXN1bHRbcmVzdWx0Lmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBoZWFwaWZ5KGFycmF5LCBjbXApO1xuICAgIF9yZXN1bHRzID0gW107XG4gICAgZm9yIChpID0gX2ogPSAwLCBfcmVmMSA9IG1pbihuLCBhcnJheS5sZW5ndGgpOyAwIDw9IF9yZWYxID8gX2ogPCBfcmVmMSA6IF9qID4gX3JlZjE7IGkgPSAwIDw9IF9yZWYxID8gKytfaiA6IC0tX2opIHtcbiAgICAgIF9yZXN1bHRzLnB1c2goaGVhcHBvcChhcnJheSwgY21wKSk7XG4gICAgfVxuICAgIHJldHVybiBfcmVzdWx0cztcbiAgfTtcblxuICBfc2lmdGRvd24gPSBmdW5jdGlvbihhcnJheSwgc3RhcnRwb3MsIHBvcywgY21wKSB7XG4gICAgdmFyIG5ld2l0ZW0sIHBhcmVudCwgcGFyZW50cG9zO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgbmV3aXRlbSA9IGFycmF5W3Bvc107XG4gICAgd2hpbGUgKHBvcyA+IHN0YXJ0cG9zKSB7XG4gICAgICBwYXJlbnRwb3MgPSAocG9zIC0gMSkgPj4gMTtcbiAgICAgIHBhcmVudCA9IGFycmF5W3BhcmVudHBvc107XG4gICAgICBpZiAoY21wKG5ld2l0ZW0sIHBhcmVudCkgPCAwKSB7XG4gICAgICAgIGFycmF5W3Bvc10gPSBwYXJlbnQ7XG4gICAgICAgIHBvcyA9IHBhcmVudHBvcztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5W3Bvc10gPSBuZXdpdGVtO1xuICB9O1xuXG4gIF9zaWZ0dXAgPSBmdW5jdGlvbihhcnJheSwgcG9zLCBjbXApIHtcbiAgICB2YXIgY2hpbGRwb3MsIGVuZHBvcywgbmV3aXRlbSwgcmlnaHRwb3MsIHN0YXJ0cG9zO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgZW5kcG9zID0gYXJyYXkubGVuZ3RoO1xuICAgIHN0YXJ0cG9zID0gcG9zO1xuICAgIG5ld2l0ZW0gPSBhcnJheVtwb3NdO1xuICAgIGNoaWxkcG9zID0gMiAqIHBvcyArIDE7XG4gICAgd2hpbGUgKGNoaWxkcG9zIDwgZW5kcG9zKSB7XG4gICAgICByaWdodHBvcyA9IGNoaWxkcG9zICsgMTtcbiAgICAgIGlmIChyaWdodHBvcyA8IGVuZHBvcyAmJiAhKGNtcChhcnJheVtjaGlsZHBvc10sIGFycmF5W3JpZ2h0cG9zXSkgPCAwKSkge1xuICAgICAgICBjaGlsZHBvcyA9IHJpZ2h0cG9zO1xuICAgICAgfVxuICAgICAgYXJyYXlbcG9zXSA9IGFycmF5W2NoaWxkcG9zXTtcbiAgICAgIHBvcyA9IGNoaWxkcG9zO1xuICAgICAgY2hpbGRwb3MgPSAyICogcG9zICsgMTtcbiAgICB9XG4gICAgYXJyYXlbcG9zXSA9IG5ld2l0ZW07XG4gICAgcmV0dXJuIF9zaWZ0ZG93bihhcnJheSwgc3RhcnRwb3MsIHBvcywgY21wKTtcbiAgfTtcblxuICBIZWFwID0gKGZ1bmN0aW9uKCkge1xuICAgIEhlYXAucHVzaCA9IGhlYXBwdXNoO1xuXG4gICAgSGVhcC5wb3AgPSBoZWFwcG9wO1xuXG4gICAgSGVhcC5yZXBsYWNlID0gaGVhcHJlcGxhY2U7XG5cbiAgICBIZWFwLnB1c2hwb3AgPSBoZWFwcHVzaHBvcDtcblxuICAgIEhlYXAuaGVhcGlmeSA9IGhlYXBpZnk7XG5cbiAgICBIZWFwLm5sYXJnZXN0ID0gbmxhcmdlc3Q7XG5cbiAgICBIZWFwLm5zbWFsbGVzdCA9IG5zbWFsbGVzdDtcblxuICAgIGZ1bmN0aW9uIEhlYXAoY21wKSB7XG4gICAgICB0aGlzLmNtcCA9IGNtcCAhPSBudWxsID8gY21wIDogZGVmYXVsdENtcDtcbiAgICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICB9XG5cbiAgICBIZWFwLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGhlYXBwdXNoKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaGVhcHBvcCh0aGlzLm5vZGVzLCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzWzBdO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmluZGV4T2YoeCkgIT09IC0xO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGhlYXByZXBsYWNlKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucHVzaHBvcCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBoZWFwcHVzaHBvcCh0aGlzLm5vZGVzLCB4LCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmhlYXBpZnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoZWFwaWZ5KHRoaXMubm9kZXMsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUudXBkYXRlSXRlbSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB1cGRhdGVJdGVtKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzID0gW107XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5sZW5ndGggPT09IDA7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBoZWFwO1xuICAgICAgaGVhcCA9IG5ldyBIZWFwKCk7XG4gICAgICBoZWFwLm5vZGVzID0gdGhpcy5ub2Rlcy5zbGljZSgwKTtcbiAgICAgIHJldHVybiBoZWFwO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5zbGljZSgwKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuaW5zZXJ0ID0gSGVhcC5wcm90b3R5cGUucHVzaDtcblxuICAgIEhlYXAucHJvdG90eXBlLnJlbW92ZSA9IEhlYXAucHJvdG90eXBlLnBvcDtcblxuICAgIEhlYXAucHJvdG90eXBlLnRvcCA9IEhlYXAucHJvdG90eXBlLnBlZWs7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5mcm9udCA9IEhlYXAucHJvdG90eXBlLnBlZWs7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5oYXMgPSBIZWFwLnByb3RvdHlwZS5jb250YWlucztcblxuICAgIEhlYXAucHJvdG90eXBlLmNvcHkgPSBIZWFwLnByb3RvdHlwZS5jbG9uZTtcblxuICAgIHJldHVybiBIZWFwO1xuXG4gIH0pKCk7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlICE9PSBudWxsID8gbW9kdWxlLmV4cG9ydHMgOiB2b2lkIDApIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhlYXA7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LkhlYXAgPSBIZWFwO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnSGVhcCcgICAgICAgICAgICAgICAgIDogcmVxdWlyZSgnaGVhcCcpLFxuICAgICdOb2RlJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvTm9kZScpLFxuICAgICdHcmlkJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvR3JpZCcpLFxuICAgICdVdGlsJyAgICAgICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvVXRpbCcpLFxuICAgICdIZXVyaXN0aWMnICAgICAgICAgICAgOiByZXF1aXJlKCcuL2NvcmUvSGV1cmlzdGljJyksXG4gICAgJ0FTdGFyRmluZGVyJyAgICAgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9BU3RhckZpbmRlcicpLFxuICAgICdCZXN0Rmlyc3RGaW5kZXInICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmVzdEZpcnN0RmluZGVyJyksXG4gICAgJ0JyZWFkdGhGaXJzdEZpbmRlcicgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CcmVhZHRoRmlyc3RGaW5kZXInKSxcbiAgICAnRGlqa3N0cmFGaW5kZXInICAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0RpamtzdHJhRmluZGVyJyksXG4gICAgJ0JpQVN0YXJGaW5kZXInICAgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CaUFTdGFyRmluZGVyJyksXG4gICAgJ0JpQmVzdEZpcnN0RmluZGVyJyAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CaUJlc3RGaXJzdEZpbmRlcicpLFxuICAgICdCaUJyZWFkdGhGaXJzdEZpbmRlcicgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmlCcmVhZHRoRmlyc3RGaW5kZXInKSxcbiAgICAnQmlEaWprc3RyYUZpbmRlcicgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0JpRGlqa3N0cmFGaW5kZXInKSxcbiAgICAnSnVtcFBvaW50RmluZGVyJyAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0p1bXBQb2ludEZpbmRlcicpLFxuICAgICdJREFTdGFyRmluZGVyJyAgICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvSURBU3RhckZpbmRlcicpXG59O1xuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL05vZGUnKTtcblxuLyoqXG4gKiBUaGUgR3JpZCBjbGFzcywgd2hpY2ggc2VydmVzIGFzIHRoZSBlbmNhcHN1bGF0aW9uIG9mIHRoZSBsYXlvdXQgb2YgdGhlIG5vZGVzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGggTnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IE51bWJlciBvZiByb3dzIG9mIHRoZSBncmlkLlxuICogQHBhcmFtIHtBcnJheS48QXJyYXkuPChudW1iZXJ8Ym9vbGVhbik+Pn0gW21hdHJpeF0gLSBBIDAtMSBtYXRyaXhcbiAqICAgICByZXByZXNlbnRpbmcgdGhlIHdhbGthYmxlIHN0YXR1cyBvZiB0aGUgbm9kZXMoMCBvciBmYWxzZSBmb3Igd2Fsa2FibGUpLlxuICogICAgIElmIHRoZSBtYXRyaXggaXMgbm90IHN1cHBsaWVkLCBhbGwgdGhlIG5vZGVzIHdpbGwgYmUgd2Fsa2FibGUuICAqL1xuZnVuY3Rpb24gR3JpZCh3aWR0aCwgaGVpZ2h0LCBtYXRyaXgpIHtcbiAgICAvKipcbiAgICAgKiBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgIC8qKlxuICAgICAqIFRoZSBudW1iZXIgb2Ygcm93cyBvZiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIEEgMkQgYXJyYXkgb2Ygbm9kZXMuXG4gICAgICovXG4gICAgdGhpcy5ub2RlcyA9IHRoaXMuX2J1aWxkTm9kZXMod2lkdGgsIGhlaWdodCwgbWF0cml4KTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhbmQgcmV0dXJuIHRoZSBub2Rlcy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXJ8Ym9vbGVhbj4+fSBbbWF0cml4XSAtIEEgMC0xIG1hdHJpeCByZXByZXNlbnRpbmdcbiAqICAgICB0aGUgd2Fsa2FibGUgc3RhdHVzIG9mIHRoZSBub2Rlcy5cbiAqIEBzZWUgR3JpZFxuICovXG5HcmlkLnByb3RvdHlwZS5fYnVpbGROb2RlcyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQsIG1hdHJpeCkge1xuICAgIHZhciBpLCBqLFxuICAgICAgICBub2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKG1hdHJpeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBub2RlcztcbiAgICB9XG5cbiAgICBpZiAobWF0cml4Lmxlbmd0aCAhPT0gaGVpZ2h0IHx8IG1hdHJpeFswXS5sZW5ndGggIT09IHdpZHRoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWF0cml4IHNpemUgZG9lcyBub3QgZml0Jyk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGhlaWdodDsgKytpKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB3aWR0aDsgKytqKSB7XG4gICAgICAgICAgICBpZiAobWF0cml4W2ldW2pdKSB7XG4gICAgICAgICAgICAgICAgLy8gMCwgZmFsc2UsIG51bGwgd2lsbCBiZSB3YWxrYWJsZVxuICAgICAgICAgICAgICAgIC8vIHdoaWxlIG90aGVycyB3aWxsIGJlIHVuLXdhbGthYmxlXG4gICAgICAgICAgICAgICAgbm9kZXNbaV1bal0ud2Fsa2FibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlcztcbn07XG5cblxuR3JpZC5wcm90b3R5cGUuZ2V0Tm9kZUF0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzW3ldW3hdO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBub2RlIGF0IHRoZSBnaXZlbiBwb3NpdGlvbiBpcyB3YWxrYWJsZS5cbiAqIChBbHNvIHJldHVybnMgZmFsc2UgaWYgdGhlIHBvc2l0aW9uIGlzIG91dHNpZGUgdGhlIGdyaWQuKVxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gLSBUaGUgd2Fsa2FiaWxpdHkgb2YgdGhlIG5vZGUuXG4gKi9cbkdyaWQucHJvdG90eXBlLmlzV2Fsa2FibGVBdCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5pc0luc2lkZSh4LCB5KSAmJiB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBwb3NpdGlvbiBpcyBpbnNpZGUgdGhlIGdyaWQuXG4gKiBYWFg6IGBncmlkLmlzSW5zaWRlKHgsIHkpYCBpcyB3aWVyZCB0byByZWFkLlxuICogSXQgc2hvdWxkIGJlIGAoeCwgeSkgaXMgaW5zaWRlIGdyaWRgLCBidXQgSSBmYWlsZWQgdG8gZmluZCBhIGJldHRlclxuICogbmFtZSBmb3IgdGhpcyBtZXRob2QuXG4gKiBAcGFyYW0ge251bWJlcn0geFxuICogQHBhcmFtIHtudW1iZXJ9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbkdyaWQucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiAoeCA+PSAwICYmIHggPCB0aGlzLndpZHRoKSAmJiAoeSA+PSAwICYmIHkgPCB0aGlzLmhlaWdodCk7XG59O1xuXG5cbi8qKlxuICogU2V0IHdoZXRoZXIgdGhlIG5vZGUgb24gdGhlIGdpdmVuIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICogTk9URTogdGhyb3dzIGV4Y2VwdGlvbiBpZiB0aGUgY29vcmRpbmF0ZSBpcyBub3QgaW5zaWRlIHRoZSBncmlkLlxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtib29sZWFufSB3YWxrYWJsZSAtIFdoZXRoZXIgdGhlIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICovXG5HcmlkLnByb3RvdHlwZS5zZXRXYWxrYWJsZUF0ID0gZnVuY3Rpb24oeCwgeSwgd2Fsa2FibGUpIHtcbiAgICB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlID0gd2Fsa2FibGU7XG59O1xuXG5cbi8qKlxuICogR2V0IHRoZSBuZWlnaGJvcnMgb2YgdGhlIGdpdmVuIG5vZGUuXG4gKlxuICogICAgIG9mZnNldHMgICAgICBkaWFnb25hbE9mZnNldHM6XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMCB8ICAgfCAgICB8IDAgfCAgIHwgMSB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAzIHwgICB8IDEgfCAgICB8ICAgfCAgIHwgICB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMiB8ICAgfCAgICB8IDMgfCAgIHwgMiB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKlxuICogIFdoZW4gYWxsb3dEaWFnb25hbCBpcyB0cnVlLCBpZiBvZmZzZXRzW2ldIGlzIHZhbGlkLCB0aGVuXG4gKiAgZGlhZ29uYWxPZmZzZXRzW2ldIGFuZFxuICogIGRpYWdvbmFsT2Zmc2V0c1soaSArIDEpICUgNF0gaXMgdmFsaWQuXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWxsb3dEaWFnb25hbFxuICogQHBhcmFtIHtib29sZWFufSBkb250Q3Jvc3NDb3JuZXJzXG4gKi9cbkdyaWQucHJvdG90eXBlLmdldE5laWdoYm9ycyA9IGZ1bmN0aW9uKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpIHtcbiAgICB2YXIgeCA9IG5vZGUueCxcbiAgICAgICAgeSA9IG5vZGUueSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sXG4gICAgICAgIHMwID0gZmFsc2UsIGQwID0gZmFsc2UsXG4gICAgICAgIHMxID0gZmFsc2UsIGQxID0gZmFsc2UsXG4gICAgICAgIHMyID0gZmFsc2UsIGQyID0gZmFsc2UsXG4gICAgICAgIHMzID0gZmFsc2UsIGQzID0gZmFsc2UsXG4gICAgICAgIG5vZGVzID0gdGhpcy5ub2RlcztcblxuICAgIC8vIOKGkVxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4LCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3hdKTtcbiAgICAgICAgczAgPSB0cnVlO1xuICAgIH1cbiAgICAvLyDihpJcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlQXQoeCArIDEsIHkpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3ldW3ggKyAxXSk7XG4gICAgICAgIHMxID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8g4oaTXG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beF0pO1xuICAgICAgICBzMiA9IHRydWU7XG4gICAgfVxuICAgIC8vIOKGkFxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeV1beCAtIDFdKTtcbiAgICAgICAgczMgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYWxsb3dEaWFnb25hbCkge1xuICAgICAgICByZXR1cm4gbmVpZ2hib3JzO1xuICAgIH1cblxuICAgIGlmIChkb250Q3Jvc3NDb3JuZXJzKSB7XG4gICAgICAgIGQwID0gczMgJiYgczA7XG4gICAgICAgIGQxID0gczAgJiYgczE7XG4gICAgICAgIGQyID0gczEgJiYgczI7XG4gICAgICAgIGQzID0gczIgJiYgczM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZDAgPSBzMyB8fCBzMDtcbiAgICAgICAgZDEgPSBzMCB8fCBzMTtcbiAgICAgICAgZDIgPSBzMSB8fCBzMjtcbiAgICAgICAgZDMgPSBzMiB8fCBzMztcbiAgICB9XG5cbiAgICAvLyDihpZcbiAgICBpZiAoZDAgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgLSAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5IC0gMV1beCAtIDFdKTtcbiAgICB9XG4gICAgLy8g4oaXXG4gICAgaWYgKGQxICYmIHRoaXMuaXNXYWxrYWJsZUF0KHggKyAxLCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3ggKyAxXSk7XG4gICAgfVxuICAgIC8vIOKGmFxuICAgIGlmIChkMiAmJiB0aGlzLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSArIDEpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3kgKyAxXVt4ICsgMV0pO1xuICAgIH1cbiAgICAvLyDihplcbiAgICBpZiAoZDMgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beCAtIDFdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxuXG4vKipcbiAqIEdldCBhIGNsb25lIG9mIHRoaXMgZ3JpZC5cbiAqIEByZXR1cm4ge0dyaWR9IENsb25lZCBncmlkLlxuICovXG5HcmlkLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBqLFxuXG4gICAgICAgIHdpZHRoID0gdGhpcy53aWR0aCxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5oZWlnaHQsXG4gICAgICAgIHRoaXNOb2RlcyA9IHRoaXMubm9kZXMsXG5cbiAgICAgICAgbmV3R3JpZCA9IG5ldyBHcmlkKHdpZHRoLCBoZWlnaHQpLFxuICAgICAgICBuZXdOb2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbmV3Tm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbmV3Tm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpLCB0aGlzTm9kZXNbaV1bal0ud2Fsa2FibGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV3R3JpZC5ub2RlcyA9IG5ld05vZGVzO1xuXG4gICAgcmV0dXJuIG5ld0dyaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWQ7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgUEYuSGV1cmlzdGljXG4gKiBAZGVzY3JpcHRpb24gQSBjb2xsZWN0aW9uIG9mIGhldXJpc3RpYyBmdW5jdGlvbnMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBNYW5oYXR0YW4gZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IGR4ICsgZHlcbiAgICovXG4gIG1hbmhhdHRhbjogZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICByZXR1cm4gZHggKyBkeTtcbiAgfSxcblxuICAvKipcbiAgICogRXVjbGlkZWFuIGRpc3RhbmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZHggLSBEaWZmZXJlbmNlIGluIHguXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeSAtIERpZmZlcmVuY2UgaW4geS5cbiAgICogQHJldHVybiB7bnVtYmVyfSBzcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxuICAgKi9cbiAgZXVjbGlkZWFuOiBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVieXNoZXYgZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IG1heChkeCwgZHkpXG4gICAqL1xuICBjaGVieXNoZXY6IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KGR4LCBkeSk7XG4gIH1cblxufTtcbiIsIi8qKlxuICogQSBub2RlIGluIGdyaWQuIFxuICogVGhpcyBjbGFzcyBob2xkcyBzb21lIGJhc2ljIGluZm9ybWF0aW9uIGFib3V0IGEgbm9kZSBhbmQgY3VzdG9tIFxuICogYXR0cmlidXRlcyBtYXkgYmUgYWRkZWQsIGRlcGVuZGluZyBvbiB0aGUgYWxnb3JpdGhtcycgbmVlZHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gVGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3dhbGthYmxlXSAtIFdoZXRoZXIgdGhpcyBub2RlIGlzIHdhbGthYmxlLlxuICovXG5mdW5jdGlvbiBOb2RlKHgsIHksIHdhbGthYmxlKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnggPSB4O1xuICAgIC8qKlxuICAgICAqIFRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGUgb24gdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy55ID0geTtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoaXMgbm9kZSBjYW4gYmUgd2Fsa2VkIHRocm91Z2guXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMud2Fsa2FibGUgPSAod2Fsa2FibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiB3YWxrYWJsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG4iLCIvKipcbiAqIEJhY2t0cmFjZSBhY2NvcmRpbmcgdG8gdGhlIHBhcmVudCByZWNvcmRzIGFuZCByZXR1cm4gdGhlIHBhdGguXG4gKiAoaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kIGVuZCBub2RlcylcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBFbmQgbm9kZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gdGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gYmFja3RyYWNlKG5vZGUpIHtcbiAgICB2YXIgcGF0aCA9IFtbbm9kZS54LCBub2RlLnldXTtcbiAgICB3aGlsZSAobm9kZS5wYXJlbnQpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICBwYXRoLnB1c2goW25vZGUueCwgbm9kZS55XSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJldmVyc2UoKTtcbn1cbmV4cG9ydHMuYmFja3RyYWNlID0gYmFja3RyYWNlO1xuXG4vKipcbiAqIEJhY2t0cmFjZSBmcm9tIHN0YXJ0IGFuZCBlbmQgbm9kZSwgYW5kIHJldHVybiB0aGUgcGF0aC5cbiAqIChpbmNsdWRpbmcgYm90aCBzdGFydCBhbmQgZW5kIG5vZGVzKVxuICogQHBhcmFtIHtOb2RlfVxuICogQHBhcmFtIHtOb2RlfVxuICovXG5mdW5jdGlvbiBiaUJhY2t0cmFjZShub2RlQSwgbm9kZUIpIHtcbiAgICB2YXIgcGF0aEEgPSBiYWNrdHJhY2Uobm9kZUEpLFxuICAgICAgICBwYXRoQiA9IGJhY2t0cmFjZShub2RlQik7XG4gICAgcmV0dXJuIHBhdGhBLmNvbmNhdChwYXRoQi5yZXZlcnNlKCkpO1xufVxuZXhwb3J0cy5iaUJhY2t0cmFjZSA9IGJpQmFja3RyYWNlO1xuXG4vKipcbiAqIENvbXB1dGUgdGhlIGxlbmd0aCBvZiB0aGUgcGF0aC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7bnVtYmVyfSBUaGUgbGVuZ3RoIG9mIHRoZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIHBhdGhMZW5ndGgocGF0aCkge1xuICAgIHZhciBpLCBzdW0gPSAwLCBhLCBiLCBkeCwgZHk7XG4gICAgZm9yIChpID0gMTsgaSA8IHBhdGgubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYSA9IHBhdGhbaSAtIDFdO1xuICAgICAgICBiID0gcGF0aFtpXTtcbiAgICAgICAgZHggPSBhWzBdIC0gYlswXTtcbiAgICAgICAgZHkgPSBhWzFdIC0gYlsxXTtcbiAgICAgICAgc3VtICs9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgfVxuICAgIHJldHVybiBzdW07XG59XG5leHBvcnRzLnBhdGhMZW5ndGggPSBwYXRoTGVuZ3RoO1xuXG5cbi8qKlxuICogR2l2ZW4gdGhlIHN0YXJ0IGFuZCBlbmQgY29vcmRpbmF0ZXMsIHJldHVybiBhbGwgdGhlIGNvb3JkaW5hdGVzIGx5aW5nXG4gKiBvbiB0aGUgbGluZSBmb3JtZWQgYnkgdGhlc2UgY29vcmRpbmF0ZXMsIGJhc2VkIG9uIEJyZXNlbmhhbSdzIGFsZ29yaXRobS5cbiAqIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQnJlc2VuaGFtJ3NfbGluZV9hbGdvcml0aG0jU2ltcGxpZmljYXRpb25cbiAqIEBwYXJhbSB7bnVtYmVyfSB4MCBTdGFydCB4IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB5MCBTdGFydCB5IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB4MSBFbmQgeCBjb29yZGluYXRlXG4gKiBAcGFyYW0ge251bWJlcn0geTEgRW5kIHkgY29vcmRpbmF0ZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gVGhlIGNvb3JkaW5hdGVzIG9uIHRoZSBsaW5lXG4gKi9cbmZ1bmN0aW9uIGludGVycG9sYXRlKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzLFxuICAgICAgICBsaW5lID0gW10sXG4gICAgICAgIHN4LCBzeSwgZHgsIGR5LCBlcnIsIGUyO1xuXG4gICAgZHggPSBhYnMoeDEgLSB4MCk7XG4gICAgZHkgPSBhYnMoeTEgLSB5MCk7XG5cbiAgICBzeCA9ICh4MCA8IHgxKSA/IDEgOiAtMTtcbiAgICBzeSA9ICh5MCA8IHkxKSA/IDEgOiAtMTtcblxuICAgIGVyciA9IGR4IC0gZHk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBsaW5lLnB1c2goW3gwLCB5MF0pO1xuXG4gICAgICAgIGlmICh4MCA9PT0geDEgJiYgeTAgPT09IHkxKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZTIgPSAyICogZXJyO1xuICAgICAgICBpZiAoZTIgPiAtZHkpIHtcbiAgICAgICAgICAgIGVyciA9IGVyciAtIGR5O1xuICAgICAgICAgICAgeDAgPSB4MCArIHN4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChlMiA8IGR4KSB7XG4gICAgICAgICAgICBlcnIgPSBlcnIgKyBkeDtcbiAgICAgICAgICAgIHkwID0geTAgKyBzeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaW5lO1xufVxuZXhwb3J0cy5pbnRlcnBvbGF0ZSA9IGludGVycG9sYXRlO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjb21wcmVzc2VkIHBhdGgsIHJldHVybiBhIG5ldyBwYXRoIHRoYXQgaGFzIGFsbCB0aGUgc2VnbWVudHNcbiAqIGluIGl0IGludGVycG9sYXRlZC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gZXhwYW5kZWQgcGF0aFxuICovXG5mdW5jdGlvbiBleHBhbmRQYXRoKHBhdGgpIHtcbiAgICB2YXIgZXhwYW5kZWQgPSBbXSxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGNvb3JkMCwgY29vcmQxLFxuICAgICAgICBpbnRlcnBvbGF0ZWQsXG4gICAgICAgIGludGVycG9sYXRlZExlbixcbiAgICAgICAgaSwgajtcblxuICAgIGlmIChsZW4gPCAyKSB7XG4gICAgICAgIHJldHVybiBleHBhbmRlZDtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgIGNvb3JkMCA9IHBhdGhbaV07XG4gICAgICAgIGNvb3JkMSA9IHBhdGhbaSArIDFdO1xuXG4gICAgICAgIGludGVycG9sYXRlZCA9IGludGVycG9sYXRlKGNvb3JkMFswXSwgY29vcmQwWzFdLCBjb29yZDFbMF0sIGNvb3JkMVsxXSk7XG4gICAgICAgIGludGVycG9sYXRlZExlbiA9IGludGVycG9sYXRlZC5sZW5ndGg7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBpbnRlcnBvbGF0ZWRMZW4gLSAxOyArK2opIHtcbiAgICAgICAgICAgIGV4cGFuZGVkLnB1c2goaW50ZXJwb2xhdGVkW2pdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBleHBhbmRlZC5wdXNoKHBhdGhbbGVuIC0gMV0pO1xuXG4gICAgcmV0dXJuIGV4cGFuZGVkO1xufVxuZXhwb3J0cy5leHBhbmRQYXRoID0gZXhwYW5kUGF0aDtcblxuXG4vKipcbiAqIFNtb290aGVuIHRoZSBnaXZlIHBhdGguXG4gKiBUaGUgb3JpZ2luYWwgcGF0aCB3aWxsIG5vdCBiZSBtb2RpZmllZDsgYSBuZXcgcGF0aCB3aWxsIGJlIHJldHVybmVkLlxuICogQHBhcmFtIHtQRi5HcmlkfSBncmlkXG4gKiBAcGFyYW0ge0FycmF5LjxBcnJheS48bnVtYmVyPj59IHBhdGggVGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gc21vb3RoZW5QYXRoKGdyaWQsIHBhdGgpIHtcbiAgICB2YXIgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHgwID0gcGF0aFswXVswXSwgICAgICAgIC8vIHBhdGggc3RhcnQgeFxuICAgICAgICB5MCA9IHBhdGhbMF1bMV0sICAgICAgICAvLyBwYXRoIHN0YXJ0IHlcbiAgICAgICAgeDEgPSBwYXRoW2xlbiAtIDFdWzBdLCAgLy8gcGF0aCBlbmQgeFxuICAgICAgICB5MSA9IHBhdGhbbGVuIC0gMV1bMV0sICAvLyBwYXRoIGVuZCB5XG4gICAgICAgIHN4LCBzeSwgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgc3RhcnQgY29vcmRpbmF0ZVxuICAgICAgICBleCwgZXksICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGVuZCBjb29yZGluYXRlXG4gICAgICAgIGx4LCBseSwgICAgICAgICAgICAgICAgIC8vIGxhc3QgdmFsaWQgZW5kIGNvb3JkaW5hdGVcbiAgICAgICAgbmV3UGF0aCxcbiAgICAgICAgaSwgaiwgY29vcmQsIGxpbmUsIHRlc3RDb29yZCwgYmxvY2tlZDtcblxuICAgIHN4ID0geDA7XG4gICAgc3kgPSB5MDtcbiAgICBseCA9IHBhdGhbMV1bMF07XG4gICAgbHkgPSBwYXRoWzFdWzFdO1xuICAgIG5ld1BhdGggPSBbW3N4LCBzeV1dO1xuXG4gICAgZm9yIChpID0gMjsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGNvb3JkID0gcGF0aFtpXTtcbiAgICAgICAgZXggPSBjb29yZFswXTtcbiAgICAgICAgZXkgPSBjb29yZFsxXTtcbiAgICAgICAgbGluZSA9IGludGVycG9sYXRlKHN4LCBzeSwgZXgsIGV5KTtcblxuICAgICAgICBibG9ja2VkID0gZmFsc2U7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBsaW5lLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICB0ZXN0Q29vcmQgPSBsaW5lW2pdO1xuXG4gICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHRlc3RDb29yZFswXSwgdGVzdENvb3JkWzFdKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG5ld1BhdGgucHVzaChbbHgsIGx5XSk7XG4gICAgICAgICAgICAgICAgc3ggPSBseDtcbiAgICAgICAgICAgICAgICBzeSA9IGx5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghYmxvY2tlZCkge1xuICAgICAgICAgICAgbHggPSBleDtcbiAgICAgICAgICAgIGx5ID0gZXk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbmV3UGF0aC5wdXNoKFt4MSwgeTFdKTtcblxuICAgIHJldHVybiBuZXdQYXRoO1xufVxuZXhwb3J0cy5zbW9vdGhlblBhdGggPSBzbW9vdGhlblBhdGg7XG4iLCJ2YXIgSGVhcCAgICAgICA9IHJlcXVpcmUoJ2hlYXAnKTtcbnZhciBVdGlsICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG52YXIgSGV1cmlzdGljICA9IHJlcXVpcmUoJy4uL2NvcmUvSGV1cmlzdGljJyk7XG5cbi8qKlxuICogQSogcGF0aC1maW5kZXIuXG4gKiBiYXNlZCB1cG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9iZ3JpbnMvamF2YXNjcmlwdC1hc3RhclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHQud2VpZ2h0IFdlaWdodCB0byBhcHBseSB0byB0aGUgaGV1cmlzdGljIHRvIGFsbG93IGZvciBzdWJvcHRpbWFsIHBhdGhzLCBcbiAqICAgICBpbiBvcmRlciB0byBzcGVlZCB1cCB0aGUgc2VhcmNoLlxuICovXG5mdW5jdGlvbiBBU3RhckZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy53ZWlnaHQgPSBvcHQud2VpZ2h0IHx8IDE7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkFTdGFyRmluZGVyLnByb3RvdHlwZS5maW5kUGF0aCA9IGZ1bmN0aW9uKHN0YXJ0WCwgc3RhcnRZLCBlbmRYLCBlbmRZLCBncmlkKSB7XG4gICAgdmFyIG9wZW5MaXN0ID0gbmV3IEhlYXAoZnVuY3Rpb24obm9kZUEsIG5vZGVCKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUEuZiAtIG5vZGVCLmY7XG4gICAgICAgIH0pLFxuICAgICAgICBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgaGV1cmlzdGljID0gdGhpcy5oZXVyaXN0aWMsXG4gICAgICAgIGFsbG93RGlhZ29uYWwgPSB0aGlzLmFsbG93RGlhZ29uYWwsXG4gICAgICAgIGRvbnRDcm9zc0Nvcm5lcnMgPSB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMsXG4gICAgICAgIHdlaWdodCA9IHRoaXMud2VpZ2h0LFxuICAgICAgICBhYnMgPSBNYXRoLmFicywgU1FSVDIgPSBNYXRoLlNRUlQyLFxuICAgICAgICBub2RlLCBuZWlnaGJvcnMsIG5laWdoYm9yLCBpLCBsLCB4LCB5LCBuZztcblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIHN0YXJ0IG5vZGUgdG8gYmUgMFxuICAgIHN0YXJ0Tm9kZS5nID0gMDtcbiAgICBzdGFydE5vZGUuZiA9IDA7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBub2RlIGludG8gdGhlIG9wZW4gbGlzdFxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBvcGVuIGxpc3QgaXMgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFvcGVuTGlzdC5lbXB0eSgpKSB7XG4gICAgICAgIC8vIHBvcCB0aGUgcG9zaXRpb24gb2Ygbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gb3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBpZiByZWFjaGVkIHRoZSBlbmQgcG9zaXRpb24sIGNvbnN0cnVjdCB0aGUgcGF0aCBhbmQgcmV0dXJuIGl0XG4gICAgICAgIGlmIChub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbC5iYWNrdHJhY2UoZW5kTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4ID0gbmVpZ2hib3IueDtcbiAgICAgICAgICAgIHkgPSBuZWlnaGJvci55O1xuXG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRpc3RhbmNlIGJldHdlZW4gY3VycmVudCBub2RlIGFuZCB0aGUgbmVpZ2hib3JcbiAgICAgICAgICAgIC8vIGFuZCBjYWxjdWxhdGUgdGhlIG5leHQgZyBzY29yZVxuICAgICAgICAgICAgbmcgPSBub2RlLmcgKyAoKHggLSBub2RlLnggPT09IDAgfHwgeSAtIG5vZGUueSA9PT0gMCkgPyAxIDogU1FSVDIpO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbmVpZ2hib3IgaGFzIG5vdCBiZWVuIGluc3BlY3RlZCB5ZXQsIG9yXG4gICAgICAgICAgICAvLyBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdCBmcm9tIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgICAgIGlmICghbmVpZ2hib3Iub3BlbmVkIHx8IG5nIDwgbmVpZ2hib3IuZykge1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBuZztcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5oID0gbmVpZ2hib3IuaCB8fCB3ZWlnaHQgKiBoZXVyaXN0aWMoYWJzKHggLSBlbmRYKSwgYWJzKHkgLSBlbmRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmVpZ2hib3IgY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGl0cyBmIHZhbHVlIGhhcyBiZWVuIHVwZGF0ZWQsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGl0cyBwb3NpdGlvbiBpbiB0aGUgb3BlbiBsaXN0XG4gICAgICAgICAgICAgICAgICAgIG9wZW5MaXN0LnVwZGF0ZUl0ZW0obmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBlbmQgZm9yIGVhY2ggbmVpZ2hib3JcbiAgICB9IC8vIGVuZCB3aGlsZSBub3Qgb3BlbiBsaXN0IGVtcHR5XG5cbiAgICAvLyBmYWlsIHRvIGZpbmQgdGhlIHBhdGhcbiAgICByZXR1cm4gW107XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFTdGFyRmluZGVyO1xuIiwidmFyIEFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9BU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIEJlc3QtRmlyc3QtU2VhcmNoIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBBU3RhckZpbmRlclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gQmVzdEZpcnN0RmluZGVyKG9wdCkge1xuICAgIEFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcblxuICAgIHZhciBvcmlnID0gdGhpcy5oZXVyaXN0aWM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgcmV0dXJuIG9yaWcoZHgsIGR5KSAqIDEwMDAwMDA7XG4gICAgfTtcbn07XG5cbkJlc3RGaXJzdEZpbmRlci5wcm90b3R5cGUgPSBuZXcgQVN0YXJGaW5kZXIoKTtcbkJlc3RGaXJzdEZpbmRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCZXN0Rmlyc3RGaW5kZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gQmVzdEZpcnN0RmluZGVyO1xuIiwidmFyIEhlYXAgICAgICAgPSByZXF1aXJlKCdoZWFwJyk7XG52YXIgVXRpbCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvVXRpbCcpO1xudmFyIEhldXJpc3RpYyAgPSByZXF1aXJlKCcuLi9jb3JlL0hldXJpc3RpYycpO1xuXG4vKipcbiAqIEEqIHBhdGgtZmluZGVyLlxuICogYmFzZWQgdXBvbiBodHRwczovL2dpdGh1Yi5jb20vYmdyaW5zL2phdmFzY3JpcHQtYXN0YXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0LndlaWdodCBXZWlnaHQgdG8gYXBwbHkgdG8gdGhlIGhldXJpc3RpYyB0byBhbGxvdyBmb3Igc3Vib3B0aW1hbCBwYXRocywgXG4gKiAgICAgaW4gb3JkZXIgdG8gc3BlZWQgdXAgdGhlIHNlYXJjaC5cbiAqL1xuZnVuY3Rpb24gQmlBU3RhckZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy53ZWlnaHQgPSBvcHQud2VpZ2h0IHx8IDE7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkJpQVN0YXJGaW5kZXIucHJvdG90eXBlLmZpbmRQYXRoID0gZnVuY3Rpb24oc3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFksIGdyaWQpIHtcbiAgICB2YXIgY21wID0gZnVuY3Rpb24obm9kZUEsIG5vZGVCKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZUEuZiAtIG5vZGVCLmY7XG4gICAgICAgIH0sXG4gICAgICAgIHN0YXJ0T3Blbkxpc3QgPSBuZXcgSGVhcChjbXApLFxuICAgICAgICBlbmRPcGVuTGlzdCA9IG5ldyBIZWFwKGNtcCksXG4gICAgICAgIHN0YXJ0Tm9kZSA9IGdyaWQuZ2V0Tm9kZUF0KHN0YXJ0WCwgc3RhcnRZKSxcbiAgICAgICAgZW5kTm9kZSA9IGdyaWQuZ2V0Tm9kZUF0KGVuZFgsIGVuZFkpLFxuICAgICAgICBoZXVyaXN0aWMgPSB0aGlzLmhldXJpc3RpYyxcbiAgICAgICAgYWxsb3dEaWFnb25hbCA9IHRoaXMuYWxsb3dEaWFnb25hbCxcbiAgICAgICAgZG9udENyb3NzQ29ybmVycyA9IHRoaXMuZG9udENyb3NzQ29ybmVycyxcbiAgICAgICAgd2VpZ2h0ID0gdGhpcy53ZWlnaHQsXG4gICAgICAgIGFicyA9IE1hdGguYWJzLCBTUVJUMiA9IE1hdGguU1FSVDIsXG4gICAgICAgIG5vZGUsIG5laWdoYm9ycywgbmVpZ2hib3IsIGksIGwsIHgsIHksIG5nLFxuICAgICAgICBCWV9TVEFSVCA9IDEsIEJZX0VORCA9IDI7XG5cbiAgICAvLyBzZXQgdGhlIGBnYCBhbmQgYGZgIHZhbHVlIG9mIHRoZSBzdGFydCBub2RlIHRvIGJlIDBcbiAgICAvLyBhbmQgcHVzaCBpdCBpbnRvIHRoZSBzdGFydCBvcGVuIGxpc3RcbiAgICBzdGFydE5vZGUuZyA9IDA7XG4gICAgc3RhcnROb2RlLmYgPSAwO1xuICAgIHN0YXJ0T3Blbkxpc3QucHVzaChzdGFydE5vZGUpO1xuICAgIHN0YXJ0Tm9kZS5vcGVuZWQgPSBCWV9TVEFSVDtcblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIGVuZCBub2RlIHRvIGJlIDBcbiAgICAvLyBhbmQgcHVzaCBpdCBpbnRvIHRoZSBvcGVuIG9wZW4gbGlzdFxuICAgIGVuZE5vZGUuZyA9IDA7XG4gICAgZW5kTm9kZS5mID0gMDtcbiAgICBlbmRPcGVuTGlzdC5wdXNoKGVuZE5vZGUpO1xuICAgIGVuZE5vZGUub3BlbmVkID0gQllfRU5EO1xuXG4gICAgLy8gd2hpbGUgYm90aCB0aGUgb3BlbiBsaXN0cyBhcmUgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFzdGFydE9wZW5MaXN0LmVtcHR5KCkgJiYgIWVuZE9wZW5MaXN0LmVtcHR5KCkpIHtcblxuICAgICAgICAvLyBwb3AgdGhlIHBvc2l0aW9uIG9mIHN0YXJ0IG5vZGUgd2hpY2ggaGFzIHRoZSBtaW5pbXVtIGBmYCB2YWx1ZS5cbiAgICAgICAgbm9kZSA9IHN0YXJ0T3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCA9PT0gQllfRU5EKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmlCYWNrdHJhY2Uobm9kZSwgbmVpZ2hib3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4ID0gbmVpZ2hib3IueDtcbiAgICAgICAgICAgIHkgPSBuZWlnaGJvci55O1xuXG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRpc3RhbmNlIGJldHdlZW4gY3VycmVudCBub2RlIGFuZCB0aGUgbmVpZ2hib3JcbiAgICAgICAgICAgIC8vIGFuZCBjYWxjdWxhdGUgdGhlIG5leHQgZyBzY29yZVxuICAgICAgICAgICAgbmcgPSBub2RlLmcgKyAoKHggLSBub2RlLnggPT09IDAgfHwgeSAtIG5vZGUueSA9PT0gMCkgPyAxIDogU1FSVDIpO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbmVpZ2hib3IgaGFzIG5vdCBiZWVuIGluc3BlY3RlZCB5ZXQsIG9yXG4gICAgICAgICAgICAvLyBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdCBmcm9tIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgICAgIGlmICghbmVpZ2hib3Iub3BlbmVkIHx8IG5nIDwgbmVpZ2hib3IuZykge1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBuZztcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5oID0gbmVpZ2hib3IuaCB8fCB3ZWlnaHQgKiBoZXVyaXN0aWMoYWJzKHggLSBlbmRYKSwgYWJzKHkgLSBlbmRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydE9wZW5MaXN0LnB1c2gobmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgICAgICBuZWlnaGJvci5vcGVuZWQgPSBCWV9TVEFSVDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmVpZ2hib3IgY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGl0cyBmIHZhbHVlIGhhcyBiZWVuIHVwZGF0ZWQsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGl0cyBwb3NpdGlvbiBpbiB0aGUgb3BlbiBsaXN0XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0T3Blbkxpc3QudXBkYXRlSXRlbShuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IC8vIGVuZCBmb3IgZWFjaCBuZWlnaGJvclxuXG5cbiAgICAgICAgLy8gcG9wIHRoZSBwb3NpdGlvbiBvZiBlbmQgbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gZW5kT3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBnZXQgbmVpZ2JvdXJzIG9mIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCA9PT0gQllfU1RBUlQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShuZWlnaGJvciwgbm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHggPSBuZWlnaGJvci54O1xuICAgICAgICAgICAgeSA9IG5laWdoYm9yLnk7XG5cbiAgICAgICAgICAgIC8vIGdldCB0aGUgZGlzdGFuY2UgYmV0d2VlbiBjdXJyZW50IG5vZGUgYW5kIHRoZSBuZWlnaGJvclxuICAgICAgICAgICAgLy8gYW5kIGNhbGN1bGF0ZSB0aGUgbmV4dCBnIHNjb3JlXG4gICAgICAgICAgICBuZyA9IG5vZGUuZyArICgoeCAtIG5vZGUueCA9PT0gMCB8fCB5IC0gbm9kZS55ID09PSAwKSA/IDEgOiBTUVJUMik7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBuZWlnaGJvciBoYXMgbm90IGJlZW4gaW5zcGVjdGVkIHlldCwgb3JcbiAgICAgICAgICAgIC8vIGNhbiBiZSByZWFjaGVkIHdpdGggc21hbGxlciBjb3N0IGZyb20gdGhlIGN1cnJlbnQgbm9kZVxuICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5vcGVuZWQgfHwgbmcgPCBuZWlnaGJvci5nKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZyA9IG5nO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmggPSBuZWlnaGJvci5oIHx8IHdlaWdodCAqIGhldXJpc3RpYyhhYnMoeCAtIHN0YXJ0WCksIGFicyh5IC0gc3RhcnRZKSk7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuZiA9IG5laWdoYm9yLmcgKyBuZWlnaGJvci5oO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBlbmRPcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gQllfRU5EO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuZWlnaGJvciBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdC5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgaXRzIGYgdmFsdWUgaGFzIGJlZW4gdXBkYXRlZCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaXRzIHBvc2l0aW9uIGluIHRoZSBvcGVuIGxpc3RcbiAgICAgICAgICAgICAgICAgICAgZW5kT3Blbkxpc3QudXBkYXRlSXRlbShuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IC8vIGVuZCBmb3IgZWFjaCBuZWlnaGJvclxuICAgIH0gLy8gZW5kIHdoaWxlIG5vdCBvcGVuIGxpc3QgZW1wdHlcblxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmlBU3RhckZpbmRlcjtcbiIsInZhciBCaUFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9CaUFTdGFyRmluZGVyJyk7XG5cbi8qKlxuICogQmktZGlyZWNpdGlvbmFsIEJlc3QtRmlyc3QtU2VhcmNoIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBCaUFTdGFyRmluZGVyXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICovXG5mdW5jdGlvbiBCaUJlc3RGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBCaUFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcblxuICAgIHZhciBvcmlnID0gdGhpcy5oZXVyaXN0aWM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgcmV0dXJuIG9yaWcoZHgsIGR5KSAqIDEwMDAwMDA7XG4gICAgfTtcbn1cblxuQmlCZXN0Rmlyc3RGaW5kZXIucHJvdG90eXBlID0gbmV3IEJpQVN0YXJGaW5kZXIoKTtcbkJpQmVzdEZpcnN0RmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJpQmVzdEZpcnN0RmluZGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJpQmVzdEZpcnN0RmluZGVyO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcblxuLyoqXG4gKiBCaS1kaXJlY3Rpb25hbCBCcmVhZHRoLUZpcnN0LVNlYXJjaCBwYXRoIGZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIEJpQnJlYWR0aEZpcnN0RmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmFsbG93RGlhZ29uYWwgPSBvcHQuYWxsb3dEaWFnb25hbDtcbiAgICB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMgPSBvcHQuZG9udENyb3NzQ29ybmVycztcbn1cblxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgdGhlIHBhdGguXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBwYXRoLCBpbmNsdWRpbmcgYm90aCBzdGFydCBhbmRcbiAqICAgICBlbmQgcG9zaXRpb25zLlxuICovXG5CaUJyZWFkdGhGaXJzdEZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgc3RhcnRPcGVuTGlzdCA9IFtdLCBlbmRPcGVuTGlzdCA9IFtdLFxuICAgICAgICBuZWlnaGJvcnMsIG5laWdoYm9yLCBub2RlLFxuICAgICAgICBhbGxvd0RpYWdvbmFsID0gdGhpcy5hbGxvd0RpYWdvbmFsLFxuICAgICAgICBkb250Q3Jvc3NDb3JuZXJzID0gdGhpcy5kb250Q3Jvc3NDb3JuZXJzLFxuICAgICAgICBCWV9TVEFSVCA9IDAsIEJZX0VORCA9IDEsXG4gICAgICAgIGksIGw7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBhbmQgZW5kIG5vZGVzIGludG8gdGhlIHF1ZXVlc1xuICAgIHN0YXJ0T3Blbkxpc3QucHVzaChzdGFydE5vZGUpO1xuICAgIHN0YXJ0Tm9kZS5vcGVuZWQgPSB0cnVlO1xuICAgIHN0YXJ0Tm9kZS5ieSA9IEJZX1NUQVJUO1xuXG4gICAgZW5kT3Blbkxpc3QucHVzaChlbmROb2RlKTtcbiAgICBlbmROb2RlLm9wZW5lZCA9IHRydWU7XG4gICAgZW5kTm9kZS5ieSA9IEJZX0VORDtcblxuICAgIC8vIHdoaWxlIGJvdGggdGhlIHF1ZXVlcyBhcmUgbm90IGVtcHR5XG4gICAgd2hpbGUgKHN0YXJ0T3Blbkxpc3QubGVuZ3RoICYmIGVuZE9wZW5MaXN0Lmxlbmd0aCkge1xuXG4gICAgICAgIC8vIGV4cGFuZCBzdGFydCBvcGVuIGxpc3RcblxuICAgICAgICBub2RlID0gc3RhcnRPcGVuTGlzdC5zaGlmdCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgbm9kZSBoYXMgYmVlbiBpbnNwZWN0ZWQgYnkgdGhlIHJldmVyc2VkIHNlYXJjaCxcbiAgICAgICAgICAgICAgICAvLyB0aGVuIGEgcGF0aCBpcyBmb3VuZC5cbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IuYnkgPT09IEJZX0VORCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShub2RlLCBuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnRPcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgIG5laWdoYm9yLnBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgICBuZWlnaGJvci5vcGVuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbmVpZ2hib3IuYnkgPSBCWV9TVEFSVDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGV4cGFuZCBlbmQgb3BlbiBsaXN0XG5cbiAgICAgICAgbm9kZSA9IGVuZE9wZW5MaXN0LnNoaWZ0KCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICBuZWlnaGJvcnMgPSBncmlkLmdldE5laWdoYm9ycyhub2RlLCBhbGxvd0RpYWdvbmFsLCBkb250Q3Jvc3NDb3JuZXJzKTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIG5laWdoYm9yID0gbmVpZ2hib3JzW2ldO1xuXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmVpZ2hib3Iub3BlbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yLmJ5ID09PSBCWV9TVEFSVCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5iaUJhY2t0cmFjZShuZWlnaGJvciwgbm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5kT3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG5laWdoYm9yLmJ5ID0gQllfRU5EO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmFpbCB0byBmaW5kIHRoZSBwYXRoXG4gICAgcmV0dXJuIFtdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCaUJyZWFkdGhGaXJzdEZpbmRlcjtcbiIsInZhciBCaUFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9CaUFTdGFyRmluZGVyJyk7XG5cbi8qKlxuICogQmktZGlyZWN0aW9uYWwgRGlqa3N0cmEgcGF0aC1maW5kZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIEJpQVN0YXJGaW5kZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICovXG5mdW5jdGlvbiBCaURpamtzdHJhRmluZGVyKG9wdCkge1xuICAgIEJpQVN0YXJGaW5kZXIuY2FsbCh0aGlzLCBvcHQpO1xuICAgIHRoaXMuaGV1cmlzdGljID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH07XG59XG5cbkJpRGlqa3N0cmFGaW5kZXIucHJvdG90eXBlID0gbmV3IEJpQVN0YXJGaW5kZXIoKTtcbkJpRGlqa3N0cmFGaW5kZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQmlEaWprc3RyYUZpbmRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBCaURpamtzdHJhRmluZGVyO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcblxuLyoqXG4gKiBCcmVhZHRoLUZpcnN0LVNlYXJjaCBwYXRoIGZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIEJyZWFkdGhGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkJyZWFkdGhGaXJzdEZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBvcGVuTGlzdCA9IFtdLFxuICAgICAgICBhbGxvd0RpYWdvbmFsID0gdGhpcy5hbGxvd0RpYWdvbmFsLFxuICAgICAgICBkb250Q3Jvc3NDb3JuZXJzID0gdGhpcy5kb250Q3Jvc3NDb3JuZXJzLFxuICAgICAgICBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgbmVpZ2hib3JzLCBuZWlnaGJvciwgbm9kZSwgaSwgbDtcblxuICAgIC8vIHB1c2ggdGhlIHN0YXJ0IHBvcyBpbnRvIHRoZSBxdWV1ZVxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBxdWV1ZSBpcyBub3QgZW1wdHlcbiAgICB3aGlsZSAob3Blbkxpc3QubGVuZ3RoKSB7XG4gICAgICAgIC8vIHRha2UgdGhlIGZyb250IG5vZGUgZnJvbSB0aGUgcXVldWVcbiAgICAgICAgbm9kZSA9IG9wZW5MaXN0LnNoaWZ0KCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyByZWFjaGVkIHRoZSBlbmQgcG9zaXRpb25cbiAgICAgICAgaWYgKG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLmJhY2t0cmFjZShlbmROb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIC8vIHNraXAgdGhpcyBuZWlnaGJvciBpZiBpdCBoYXMgYmVlbiBpbnNwZWN0ZWQgYmVmb3JlXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IuY2xvc2VkIHx8IG5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgIG5laWdoYm9yLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnJlYWR0aEZpcnN0RmluZGVyO1xuIiwidmFyIEFTdGFyRmluZGVyID0gcmVxdWlyZSgnLi9BU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIERpamtzdHJhIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBBU3RhckZpbmRlclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKi9cbmZ1bmN0aW9uIERpamtzdHJhRmluZGVyKG9wdCkge1xuICAgIEFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9O1xufVxuXG5EaWprc3RyYUZpbmRlci5wcm90b3R5cGUgPSBuZXcgQVN0YXJGaW5kZXIoKTtcbkRpamtzdHJhRmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERpamtzdHJhRmluZGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpamtzdHJhRmluZGVyO1xuIiwidmFyIFV0aWwgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcbnZhciBOb2RlICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9Ob2RlJyk7XG5cbi8qKlxuICogSXRlcmF0aXZlIERlZXBpbmcgQSBTdGFyIChJREEqKSBwYXRoLWZpbmRlci5cbiAqXG4gKiBSZWN1cnNpb24gYmFzZWQgb246XG4gKiAgIGh0dHA6Ly93d3cuYXBsLmpodS5lZHUvfmhhbGwvQUktUHJvZ3JhbW1pbmcvSURBLVN0YXIuaHRtbFxuICpcbiAqIFBhdGggcmV0cmFjaW5nIGJhc2VkIG9uOlxuICogIFYuIE5hZ2VzaHdhcmEgUmFvLCBWaXBpbiBLdW1hciBhbmQgSy4gUmFtZXNoXG4gKiAgXCJBIFBhcmFsbGVsIEltcGxlbWVudGF0aW9uIG9mIEl0ZXJhdGl2ZS1EZWVwaW5nLUEqXCIsIEphbnVhcnkgMTk4Ny5cbiAqICBmdHA6Ly9mdHAuY3MudXRleGFzLmVkdS8uc25hcHNob3QvaG91cmx5LjEvcHViL0FJLUxhYi90ZWNoLXJlcG9ydHMvVVQtQUktVFItODctNDYucGRmXG4gKlxuICogQGF1dGhvciBHZXJhcmQgTWVpZXIgKHd3dy5nZXJhcmRtZWllci5jb20pXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdC5oZXVyaXN0aWMgSGV1cmlzdGljIGZ1bmN0aW9uIHRvIGVzdGltYXRlIHRoZSBkaXN0YW5jZVxuICogICAgIChkZWZhdWx0cyB0byBtYW5oYXR0YW4pLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHQud2VpZ2h0IFdlaWdodCB0byBhcHBseSB0byB0aGUgaGV1cmlzdGljIHRvIGFsbG93IGZvciBzdWJvcHRpbWFsIHBhdGhzLFxuICogICAgIGluIG9yZGVyIHRvIHNwZWVkIHVwIHRoZSBzZWFyY2guXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0LnRyYWNrUmVjdXJzaW9uIFdoZXRoZXIgdG8gdHJhY2sgcmVjdXJzaW9uIGZvciBzdGF0aXN0aWNhbCBwdXJwb3Nlcy5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHQudGltZUxpbWl0IE1heGltdW0gZXhlY3V0aW9uIHRpbWUuIFVzZSA8PSAwIGZvciBpbmZpbml0ZS5cbiAqL1xuXG5mdW5jdGlvbiBJREFTdGFyRmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmFsbG93RGlhZ29uYWwgPSBvcHQuYWxsb3dEaWFnb25hbDtcbiAgICB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMgPSBvcHQuZG9udENyb3NzQ29ybmVycztcbiAgICB0aGlzLmhldXJpc3RpYyA9IG9wdC5oZXVyaXN0aWMgfHwgSGV1cmlzdGljLm1hbmhhdHRhbjtcbiAgICB0aGlzLndlaWdodCA9IG9wdC53ZWlnaHQgfHwgMTtcbiAgICB0aGlzLnRyYWNrUmVjdXJzaW9uID0gb3B0LnRyYWNrUmVjdXJzaW9uIHx8IGZhbHNlO1xuICAgIHRoaXMudGltZUxpbWl0ID0gb3B0LnRpbWVMaW1pdCB8fCBJbmZpbml0eTsgLy8gRGVmYXVsdDogbm8gdGltZSBsaW1pdC5cbn1cblxuLyoqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhlIHRoZSBwYXRoLiBXaGVuIGFuIGVtcHR5IGFycmF5IGlzIHJldHVybmVkLCBlaXRoZXJcbiAqIG5vIHBhdGggaXMgcG9zc2libGUsIG9yIHRoZSBtYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGlzIHJlYWNoZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgcGF0aCwgaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kXG4gKiAgICAgZW5kIHBvc2l0aW9ucy5cbiAqL1xuSURBU3RhckZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIC8vIFVzZWQgZm9yIHN0YXRpc3RpY3M6XG4gICAgdmFyIG5vZGVzVmlzaXRlZCA9IDA7XG5cbiAgICAvLyBFeGVjdXRpb24gdGltZSBsaW1pdGF0aW9uOlxuICAgIHZhciBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIC8vIEhldXJpc3RpYyBoZWxwZXI6XG4gICAgdmFyIGggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhldXJpc3RpYyhNYXRoLmFicyhiLnggLSBhLngpLCBNYXRoLmFicyhiLnkgLSBhLnkpKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAvLyBTdGVwIGNvc3QgZnJvbSBhIHRvIGI6XG4gICAgdmFyIGNvc3QgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiAoYS54ID09PSBiLnggfHwgYS55ID09PSBiLnkpID8gMSA6IE1hdGguU1FSVDI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIElEQSogc2VhcmNoIGltcGxlbWVudGF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOb2RlfSBUaGUgbm9kZSBjdXJyZW50bHkgZXhwYW5kaW5nIGZyb20uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IENvc3QgdG8gcmVhY2ggdGhlIGdpdmVuIG5vZGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IE1heGltdW0gc2VhcmNoIGRlcHRoIChjdXQtb2ZmIHZhbHVlKS5cbiAgICAgKiBAcGFyYW0ge3tBcnJheS48W251bWJlciwgbnVtYmVyXT59fSBUaGUgZm91bmQgcm91dGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFJlY3Vyc2lvbiBkZXB0aC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZWl0aGVyIGEgbnVtYmVyIHdpdGggdGhlIG5ldyBvcHRpbWFsIGN1dC1vZmYgZGVwdGgsXG4gICAgICogb3IgYSB2YWxpZCBub2RlIGluc3RhbmNlLCBpbiB3aGljaCBjYXNlIGEgcGF0aCB3YXMgZm91bmQuXG4gICAgICovXG4gICAgdmFyIHNlYXJjaCA9IGZ1bmN0aW9uKG5vZGUsIGcsIGN1dG9mZiwgcm91dGUsIGRlcHRoKSB7XG4gICAgICAgIG5vZGVzVmlzaXRlZCsrO1xuXG4gICAgICAgIC8vIEVuZm9yY2UgdGltZWxpbWl0OlxuICAgICAgICBpZih0aGlzLnRpbWVMaW1pdCA+IDAgJiYgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUgPiB0aGlzLnRpbWVMaW1pdCAqIDEwMDApIHtcbiAgICAgICAgICAgIC8vIEVuZm9yY2VkIGFzIFwicGF0aC1ub3QtZm91bmRcIi5cbiAgICAgICAgICAgIHJldHVybiBJbmZpbml0eTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmID0gZyArIGgobm9kZSwgZW5kKSAqIHRoaXMud2VpZ2h0O1xuXG4gICAgICAgIC8vIFdlJ3ZlIHNlYXJjaGVkIHRvbyBkZWVwIGZvciB0aGlzIGl0ZXJhdGlvbi5cbiAgICAgICAgaWYoZiA+IGN1dG9mZikge1xuICAgICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH1cblxuICAgICAgICBpZihub2RlID09IGVuZCkge1xuICAgICAgICAgICAgcm91dGVbZGVwdGhdID0gW25vZGUueCwgbm9kZS55XTtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1pbiwgdCwgaywgbmVpZ2hib3VyO1xuXG4gICAgICAgIHZhciBuZWlnaGJvdXJzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgdGhpcy5hbGxvd0RpYWdvbmFsLCB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMpO1xuXG4gICAgICAgIC8vIFNvcnQgdGhlIG5laWdoYm91cnMsIGdpdmVzIG5pY2VyIHBhdGhzLiBCdXQsIHRoaXMgZGV2aWF0ZXNcbiAgICAgICAgLy8gZnJvbSB0aGUgb3JpZ2luYWwgYWxnb3JpdGhtIC0gc28gSSBsZWZ0IGl0IG91dC5cbiAgICAgICAgLy9uZWlnaGJvdXJzLnNvcnQoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIC8vICAgIHJldHVybiBoKGEsIGVuZCkgLSBoKGIsIGVuZCk7XG4gICAgICAgIC8vfSk7XG5cbiAgICAgICAgZm9yKGsgPSAwLCBtaW4gPSBJbmZpbml0eTsgbmVpZ2hib3VyID0gbmVpZ2hib3Vyc1trXTsgKytrKSB7XG5cbiAgICAgICAgICAgIGlmKHRoaXMudHJhY2tSZWN1cnNpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBSZXRhaW4gYSBjb3B5IGZvciB2aXN1YWxpc2F0aW9uLiBEdWUgdG8gcmVjdXJzaW9uLCB0aGlzXG4gICAgICAgICAgICAgICAgLy8gbm9kZSBtYXkgYmUgcGFydCBvZiBvdGhlciBwYXRocyB0b28uXG4gICAgICAgICAgICAgICAgbmVpZ2hib3VyLnJldGFpbkNvdW50ID0gbmVpZ2hib3VyLnJldGFpbkNvdW50ICsgMSB8fCAxO1xuXG4gICAgICAgICAgICAgICAgaWYobmVpZ2hib3VyLnRlc3RlZCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBuZWlnaGJvdXIudGVzdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHQgPSBzZWFyY2gobmVpZ2hib3VyLCBnICsgY29zdChub2RlLCBuZWlnaGJvdXIpLCBjdXRvZmYsIHJvdXRlLCBkZXB0aCArIDEpO1xuXG4gICAgICAgICAgICBpZih0IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJvdXRlW2RlcHRoXSA9IFtub2RlLngsIG5vZGUueV07XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgYSB0eXBpY2FsIEEqIGxpbmtlZCBsaXN0LCB0aGlzIHdvdWxkIHdvcms6XG4gICAgICAgICAgICAgICAgLy8gbmVpZ2hib3VyLnBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlY3JlbWVudCBjb3VudCwgdGhlbiBkZXRlcm1pbmUgd2hldGhlciBpdCdzIGFjdHVhbGx5IGNsb3NlZC5cbiAgICAgICAgICAgIGlmKHRoaXMudHJhY2tSZWN1cnNpb24gJiYgKC0tbmVpZ2hib3VyLnJldGFpbkNvdW50KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG5laWdoYm91ci50ZXN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodCA8IG1pbikge1xuICAgICAgICAgICAgICAgIG1pbiA9IHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWluO1xuXG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgLy8gTm9kZSBpbnN0YW5jZSBsb29rdXBzOlxuICAgIHZhciBzdGFydCA9IGdyaWQuZ2V0Tm9kZUF0KHN0YXJ0WCwgc3RhcnRZKTtcbiAgICB2YXIgZW5kICAgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKTtcblxuICAgIC8vIEluaXRpYWwgc2VhcmNoIGRlcHRoLCBnaXZlbiB0aGUgdHlwaWNhbCBoZXVyaXN0aWMgY29udHJhaW50cyxcbiAgICAvLyB0aGVyZSBzaG91bGQgYmUgbm8gY2hlYXBlciByb3V0ZSBwb3NzaWJsZS5cbiAgICB2YXIgY3V0T2ZmID0gaChzdGFydCwgZW5kKTtcblxuICAgIHZhciBqLCByb3V0ZSwgdDtcblxuICAgIC8vIFdpdGggYW4gb3ZlcmZsb3cgcHJvdGVjdGlvbi5cbiAgICBmb3IoaiA9IDA7IHRydWU7ICsraikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmF0aW9uOiBcIiArIGogKyBcIiwgc2VhcmNoIGN1dC1vZmYgdmFsdWU6IFwiICsgY3V0T2ZmICsgXCIsIG5vZGVzIHZpc2l0ZWQgdGh1cyBmYXI6IFwiICsgbm9kZXNWaXNpdGVkICsgXCIuXCIpO1xuXG4gICAgICAgIHJvdXRlID0gW107XG5cbiAgICAgICAgLy8gU2VhcmNoIHRpbGwgY3V0LW9mZiBkZXB0aDpcbiAgICAgICAgdCA9IHNlYXJjaChzdGFydCwgMCwgY3V0T2ZmLCByb3V0ZSwgMCk7XG5cbiAgICAgICAgLy8gUm91dGUgbm90IHBvc3NpYmxlLCBvciBub3QgZm91bmQgaW4gdGltZSBsaW1pdC5cbiAgICAgICAgaWYodCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHQgaXMgYSBub2RlLCBpdCdzIGFsc28gdGhlIGVuZCBub2RlLiBSb3V0ZSBpcyBub3dcbiAgICAgICAgLy8gcG9wdWxhdGVkIHdpdGggYSB2YWxpZCBwYXRoIHRvIHRoZSBlbmQgbm9kZS5cbiAgICAgICAgaWYodCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGaW5pc2hlZCBhdCBpdGVyYXRpb246IFwiICsgaiArIFwiLCBzZWFyY2ggY3V0LW9mZiB2YWx1ZTogXCIgKyBjdXRPZmYgKyBcIiwgbm9kZXMgdmlzaXRlZDogXCIgKyBub2Rlc1Zpc2l0ZWQgKyBcIi5cIik7XG4gICAgICAgICAgICByZXR1cm4gcm91dGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcnkgYWdhaW4sIHRoaXMgdGltZSB3aXRoIGEgZGVlcGVyIGN1dC1vZmYuIFRoZSB0IHNjb3JlXG4gICAgICAgIC8vIGlzIHRoZSBjbG9zZXN0IHdlIGdvdCB0byB0aGUgZW5kIG5vZGUuXG4gICAgICAgIGN1dE9mZiA9IHQ7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBfc2hvdWxkXyBuZXZlciB0byBiZSByZWFjaGVkLlxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSURBU3RhckZpbmRlcjtcbiIsIi8qKlxuICogQGF1dGhvciBhbmllcm8gLyBodHRwczovL2dpdGh1Yi5jb20vYW5pZXJvXG4gKi9cbnZhciBIZWFwICAgICAgID0gcmVxdWlyZSgnaGVhcCcpO1xudmFyIFV0aWwgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcblxuLyoqXG4gKiBQYXRoIGZpbmRlciB1c2luZyB0aGUgSnVtcCBQb2ludCBTZWFyY2ggYWxnb3JpdGhtXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gSnVtcFBvaW50RmluZGVyKG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IG9wdC5oZXVyaXN0aWMgfHwgSGV1cmlzdGljLm1hbmhhdHRhbjtcbiAgICB0aGlzLnRyYWNrSnVtcFJlY3Vyc2lvbiA9IG9wdC50cmFja0p1bXBSZWN1cnNpb24gfHwgZmFsc2U7XG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSBwYXRoLlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgcGF0aCwgaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kXG4gKiAgICAgZW5kIHBvc2l0aW9ucy5cbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5maW5kUGF0aCA9IGZ1bmN0aW9uKHN0YXJ0WCwgc3RhcnRZLCBlbmRYLCBlbmRZLCBncmlkKSB7XG4gICAgdmFyIG9wZW5MaXN0ID0gdGhpcy5vcGVuTGlzdCA9IG5ldyBIZWFwKGZ1bmN0aW9uKG5vZGVBLCBub2RlQikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVBLmYgLSBub2RlQi5mO1xuICAgICAgICB9KSxcbiAgICAgICAgc3RhcnROb2RlID0gdGhpcy5zdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSB0aGlzLmVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSwgbm9kZTtcblxuICAgIHRoaXMuZ3JpZCA9IGdyaWQ7XG5cblxuICAgIC8vIHNldCB0aGUgYGdgIGFuZCBgZmAgdmFsdWUgb2YgdGhlIHN0YXJ0IG5vZGUgdG8gYmUgMFxuICAgIHN0YXJ0Tm9kZS5nID0gMDtcbiAgICBzdGFydE5vZGUuZiA9IDA7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBub2RlIGludG8gdGhlIG9wZW4gbGlzdFxuICAgIG9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcblxuICAgIC8vIHdoaWxlIHRoZSBvcGVuIGxpc3QgaXMgbm90IGVtcHR5XG4gICAgd2hpbGUgKCFvcGVuTGlzdC5lbXB0eSgpKSB7XG4gICAgICAgIC8vIHBvcCB0aGUgcG9zaXRpb24gb2Ygbm9kZSB3aGljaCBoYXMgdGhlIG1pbmltdW0gYGZgIHZhbHVlLlxuICAgICAgICBub2RlID0gb3Blbkxpc3QucG9wKCk7XG4gICAgICAgIG5vZGUuY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgICBpZiAobm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIFV0aWwuZXhwYW5kUGF0aChVdGlsLmJhY2t0cmFjZShlbmROb2RlKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pZGVudGlmeVN1Y2Nlc3NvcnMobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gZmFpbCB0byBmaW5kIHRoZSBwYXRoXG4gICAgcmV0dXJuIFtdO1xufTtcblxuLyoqXG4gKiBJZGVudGlmeSBzdWNjZXNzb3JzIGZvciB0aGUgZ2l2ZW4gbm9kZS4gUnVucyBhIGp1bXAgcG9pbnQgc2VhcmNoIGluIHRoZVxuICogZGlyZWN0aW9uIG9mIGVhY2ggYXZhaWxhYmxlIG5laWdoYm9yLCBhZGRpbmcgYW55IHBvaW50cyBmb3VuZCB0byB0aGUgb3BlblxuICogbGlzdC5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5faWRlbnRpZnlTdWNjZXNzb3JzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBncmlkID0gdGhpcy5ncmlkLFxuICAgICAgICBoZXVyaXN0aWMgPSB0aGlzLmhldXJpc3RpYyxcbiAgICAgICAgb3Blbkxpc3QgPSB0aGlzLm9wZW5MaXN0LFxuICAgICAgICBlbmRYID0gdGhpcy5lbmROb2RlLngsXG4gICAgICAgIGVuZFkgPSB0aGlzLmVuZE5vZGUueSxcbiAgICAgICAgbmVpZ2hib3JzLCBuZWlnaGJvcixcbiAgICAgICAganVtcFBvaW50LCBpLCBsLFxuICAgICAgICB4ID0gbm9kZS54LCB5ID0gbm9kZS55LFxuICAgICAgICBqeCwganksIGR4LCBkeSwgZCwgbmcsIGp1bXBOb2RlLFxuICAgICAgICBhYnMgPSBNYXRoLmFicywgbWF4ID0gTWF0aC5tYXg7XG5cbiAgICBuZWlnaGJvcnMgPSB0aGlzLl9maW5kTmVpZ2hib3JzKG5vZGUpO1xuICAgIGZvcihpID0gMCwgbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG4gICAgICAgIGp1bXBQb2ludCA9IHRoaXMuX2p1bXAobmVpZ2hib3JbMF0sIG5laWdoYm9yWzFdLCB4LCB5KTtcbiAgICAgICAgaWYgKGp1bXBQb2ludCkge1xuXG4gICAgICAgICAgICBqeCA9IGp1bXBQb2ludFswXTtcbiAgICAgICAgICAgIGp5ID0ganVtcFBvaW50WzFdO1xuICAgICAgICAgICAganVtcE5vZGUgPSBncmlkLmdldE5vZGVBdChqeCwgankpO1xuXG4gICAgICAgICAgICBpZiAoanVtcE5vZGUuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGluY2x1ZGUgZGlzdGFuY2UsIGFzIHBhcmVudCBtYXkgbm90IGJlIGltbWVkaWF0ZWx5IGFkamFjZW50OlxuICAgICAgICAgICAgZCA9IEhldXJpc3RpYy5ldWNsaWRlYW4oYWJzKGp4IC0geCksIGFicyhqeSAtIHkpKTtcbiAgICAgICAgICAgIG5nID0gbm9kZS5nICsgZDsgLy8gbmV4dCBgZ2AgdmFsdWVcblxuICAgICAgICAgICAgaWYgKCFqdW1wTm9kZS5vcGVuZWQgfHwgbmcgPCBqdW1wTm9kZS5nKSB7XG4gICAgICAgICAgICAgICAganVtcE5vZGUuZyA9IG5nO1xuICAgICAgICAgICAgICAgIGp1bXBOb2RlLmggPSBqdW1wTm9kZS5oIHx8IGhldXJpc3RpYyhhYnMoanggLSBlbmRYKSwgYWJzKGp5IC0gZW5kWSkpO1xuICAgICAgICAgICAgICAgIGp1bXBOb2RlLmYgPSBqdW1wTm9kZS5nICsganVtcE5vZGUuaDtcbiAgICAgICAgICAgICAgICBqdW1wTm9kZS5wYXJlbnQgPSBub2RlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFqdW1wTm9kZS5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blbkxpc3QucHVzaChqdW1wTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGp1bXBOb2RlLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blbkxpc3QudXBkYXRlSXRlbShqdW1wTm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZWFyY2ggcmVjdXJzaXZlbHkgaW4gdGhlIGRpcmVjdGlvbiAocGFyZW50IC0+IGNoaWxkKSwgc3RvcHBpbmcgb25seSB3aGVuIGFcbiAqIGp1bXAgcG9pbnQgaXMgZm91bmQuXG4gKiBAcHJvdGVjdGVkXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSB4LCB5IGNvb3JkaW5hdGUgb2YgdGhlIGp1bXAgcG9pbnRcbiAqICAgICBmb3VuZCwgb3IgbnVsbCBpZiBub3QgZm91bmRcbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5fanVtcCA9IGZ1bmN0aW9uKHgsIHksIHB4LCBweSkge1xuICAgIHZhciBncmlkID0gdGhpcy5ncmlkLFxuICAgICAgICBkeCA9IHggLSBweCwgZHkgPSB5IC0gcHksIGp4LCBqeTtcblxuICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlmKHRoaXMudHJhY2tKdW1wUmVjdXJzaW9uID09PSB0cnVlKSB7XG4gICAgICAgIGdyaWQuZ2V0Tm9kZUF0KHgsIHkpLnRlc3RlZCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChncmlkLmdldE5vZGVBdCh4LCB5KSA9PT0gdGhpcy5lbmROb2RlKSB7XG4gICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGZvcmNlZCBuZWlnaGJvcnNcbiAgICAvLyBhbG9uZyB0aGUgZGlhZ29uYWxcbiAgICBpZiAoZHggIT09IDAgJiYgZHkgIT09IDApIHtcbiAgICAgICAgaWYgKChncmlkLmlzV2Fsa2FibGVBdCh4IC0gZHgsIHkgKyBkeSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggLSBkeCwgeSkpIHx8XG4gICAgICAgICAgICAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5IC0gZHkpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4LCB5IC0gZHkpKSkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBob3Jpem9udGFsbHkvdmVydGljYWxseVxuICAgIGVsc2Uge1xuICAgICAgICBpZiggZHggIT09IDAgKSB7IC8vIG1vdmluZyBhbG9uZyB4XG4gICAgICAgICAgICBpZigoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5ICsgMSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkgfHxcbiAgICAgICAgICAgICAgIChncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkgLSAxKSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIDEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZigoZ3JpZC5pc1dhbGthYmxlQXQoeCArIDEsIHkgKyBkeSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggKyAxLCB5KSkgfHxcbiAgICAgICAgICAgICAgIChncmlkLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSArIGR5KSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3aGVuIG1vdmluZyBkaWFnb25hbGx5LCBtdXN0IGNoZWNrIGZvciB2ZXJ0aWNhbC9ob3Jpem9udGFsIGp1bXAgcG9pbnRzXG4gICAgaWYgKGR4ICE9PSAwICYmIGR5ICE9PSAwKSB7XG4gICAgICAgIGp4ID0gdGhpcy5fanVtcCh4ICsgZHgsIHksIHgsIHkpO1xuICAgICAgICBqeSA9IHRoaXMuX2p1bXAoeCwgeSArIGR5LCB4LCB5KTtcbiAgICAgICAgaWYgKGp4IHx8IGp5KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gbW92aW5nIGRpYWdvbmFsbHksIG11c3QgbWFrZSBzdXJlIG9uZSBvZiB0aGUgdmVydGljYWwvaG9yaXpvbnRhbFxuICAgIC8vIG5laWdoYm9ycyBpcyBvcGVuIHRvIGFsbG93IHRoZSBwYXRoXG4gICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkgfHwgZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fanVtcCh4ICsgZHgsIHkgKyBkeSwgeCwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBuZWlnaGJvcnMgZm9yIHRoZSBnaXZlbiBub2RlLiBJZiB0aGUgbm9kZSBoYXMgYSBwYXJlbnQsXG4gKiBwcnVuZSB0aGUgbmVpZ2hib3JzIGJhc2VkIG9uIHRoZSBqdW1wIHBvaW50IHNlYXJjaCBhbGdvcml0aG0sIG90aGVyd2lzZVxuICogcmV0dXJuIGFsbCBhdmFpbGFibGUgbmVpZ2hib3JzLlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgbmVpZ2hib3JzIGZvdW5kLlxuICovXG5KdW1wUG9pbnRGaW5kZXIucHJvdG90eXBlLl9maW5kTmVpZ2hib3JzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCxcbiAgICAgICAgeCA9IG5vZGUueCwgeSA9IG5vZGUueSxcbiAgICAgICAgZ3JpZCA9IHRoaXMuZ3JpZCxcbiAgICAgICAgcHgsIHB5LCBueCwgbnksIGR4LCBkeSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sIG5laWdoYm9yTm9kZXMsIG5laWdoYm9yTm9kZSwgaSwgbDtcblxuICAgIC8vIGRpcmVjdGVkIHBydW5pbmc6IGNhbiBpZ25vcmUgbW9zdCBuZWlnaGJvcnMsIHVubGVzcyBmb3JjZWQuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBweCA9IHBhcmVudC54O1xuICAgICAgICBweSA9IHBhcmVudC55O1xuICAgICAgICAvLyBnZXQgdGhlIG5vcm1hbGl6ZWQgZGlyZWN0aW9uIG9mIHRyYXZlbFxuICAgICAgICBkeCA9ICh4IC0gcHgpIC8gTWF0aC5tYXgoTWF0aC5hYnMoeCAtIHB4KSwgMSk7XG4gICAgICAgIGR5ID0gKHkgLSBweSkgLyBNYXRoLm1heChNYXRoLmFicyh5IC0gcHkpLCAxKTtcblxuICAgICAgICAvLyBzZWFyY2ggZGlhZ29uYWxseVxuICAgICAgICBpZiAoZHggIT09IDAgJiYgZHkgIT09IDApIHtcbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3gsIHkgKyBkeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSB8fCBncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeSArIGR5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHggLSBkeCwgeSkgJiYgZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4IC0gZHgsIHkgKyBkeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4LCB5IC0gZHkpICYmIGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5IC0gZHldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBzZWFyY2ggaG9yaXpvbnRhbGx5L3ZlcnRpY2FsbHlcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZihkeCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4ICsgMSwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4IC0gMSwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5KSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5ICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIGR4LCB5IC0gMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJldHVybiBhbGwgbmVpZ2hib3JzXG4gICAgZWxzZSB7XG4gICAgICAgIG5laWdoYm9yTm9kZXMgPSBncmlkLmdldE5laWdoYm9ycyhub2RlLCB0cnVlKTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IG5laWdoYm9yTm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvck5vZGUgPSBuZWlnaGJvck5vZGVzW2ldO1xuICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW25laWdoYm9yTm9kZS54LCBuZWlnaGJvck5vZGUueV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBuZWlnaGJvcnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEp1bXBQb2ludEZpbmRlcjtcbiIsIi8vICBJbmNsdWRlIHBhdGhmaW5kaW5nIGxpYnJhcnlcbnZhciBwYXRoRmluZGluZyA9IHJlcXVpcmUoJ3BhdGhmaW5kaW5nJyk7XG5cbi8vICBJbXBvcnQgY2xhc3Nlc1xuaW1wb3J0IHtXb3JsZH0gZnJvbSAnLi93b3JsZCc7XG5cbi8vICBDcmVhdGUgbmV3IFdvcmxkXG52YXIgcG9seXdvcmxkID0gbmV3IFdvcmxkKCk7XG5cbi8vICBHZW5lcmF0ZSB0aGUgYmluYXJ5IG1hcFxucG9seXdvcmxkLnRvQmluYXJ5TWF0cml4KCk7XG5cbi8vICBBZGQgcG9seW1lciBldmVudCBsaXN0ZW5lclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvbHltZXItcmVhZHknLFxuICBldmVudCA9PiB7XG4gICAgLy8gIFNlbGVjdCBnYW1lIHN0YWdlXG4gICAgdmFyIGdhbWVTdGFnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2dhbWUtc3RhZ2UnKTtcbiAgICAvL1xuICAgIGdhbWVTdGFnZS5wYXRoRmluZGluZyA9IHBhdGhGaW5kaW5nO1xuICAgIC8vICBJbml0IHdvcmxkIHByb3BlcnR5XG4gICAgZ2FtZVN0YWdlLndvcmxkID0gcG9seXdvcmxkLm1hcDtcbiAgICAvLyAgSW5pdCBiaW5hcnkgbWFwIHByb3BlcnR5XG4gICAgZ2FtZVN0YWdlLmJpbmFyeU1hcCA9IHBvbHl3b3JsZC5iaW5hcnlNYXA7XG4gIH0pO1xuIiwiZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICBjb25zdHJ1Y3RvcihtYXApIHtcbiAgICAvLyAgVGhlIHdvcmxkIG1hcFxuICAgIHRoaXMubWFwID0gW1xuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDEsIDEsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDAsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDEsIDAsIDEsIDAsIDAsIDAsIDAsIDMsIDAsIDAsIDAsIDMsIDAsIDAsIDMsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDIsIDAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDMsIDAsIDMsIDEsIDEsIDAsIDAsIDAsIDMsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDEsIDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdXG4gICAgXTtcbiAgICAvLyAgRGVmaW5lIHdoaWNoIHNwcml0ZXMgYXJlIGNyb3NzYWJsZVxuICAgIHRoaXMuY3Jvc3NhYmxlU3ByaXRlcyA9IFswLCAzXTtcbiAgfVxuXG4gIC8vICBNZXRob2QgdG8gdGVzdCBpZiBhIHNwcml0ZSBpcyBjcm9zc2FibGVcbiAgaXNDcm9zc2FibGUodHlwZSkge1xuICAgIHJldHVybiB0aGlzLmNyb3NzYWJsZVNwcml0ZXMuaW5kZXhPZih0eXBlKSAhPT0gLTEgPyB0cnVlIDogZmFsc2U7XG4gIH1cblxuICAvLyAgTWV0aG9kIHRvIGdlbmVyYXRlIHRoZSBiaW5hcnkgbWFwIG9mIGNyb3NzYWJsZSBzcHJpdGVzXG4gIHRvQmluYXJ5TWF0cml4KCkge1xuICAgIHRoaXMuYmluYXJ5TWFwID0gW107XG4gICAgdmFyIHRvQmluYXJ5ID0gdmFsdWUgPT4gdGhpcy5pc0Nyb3NzYWJsZSh2YWx1ZSkgPyAwIDogMTtcbiAgICB0aGlzLm1hcC5mb3JFYWNoKHJvdyA9PiB0aGlzLmJpbmFyeU1hcC5wdXNoKHJvdy5tYXAodG9CaW5hcnkpKSk7XG4gIH1cblxufSJdfQ==
