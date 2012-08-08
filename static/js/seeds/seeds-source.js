/**
 * @file load.js
 * @author humingjian
 * @data 2012-8-1
 * 用于加载模块的种子文件
 */
/**
 * @example
 * 标准：主要用于多个模块合并处理
 * ns.add([],function(){}).alias('/static/xxx');
 */
/**
 * @example
 * 简洁：
 * ns.add([],function(){})
 */
if(typeof(duowan)=='undefined'){
	var duowan = {};
}

/**
 * config
 * 配置根路径，别名，调试/非调试模式
 */
(function(ns){
	var config = ns.config = {};
	
	//配置是否为调试模式
	config.debug = false;
	
	/**
	 * 配置字符编码
	 */
	config.charset = 'utf-8';
	
	/**
	 * 配置文件的根路径
	 * path = ns.config.base + '/' + id
	 */
	config.base = '';
	
	/*
	 * 配置路径别名
	 * config.alias.jquery = 'http://www.baidu.com/js/jquery'
	 * ns.use('jquery',function($){
	 * 	$(...);
	 * })
	 */
	config.alias = {
			jquery : ''
	};
})(duowan);
/**
 * 一些常用的工具方法
 */
(function(ns){
	var toString = Object.prototype.toString;
	var AP = Array.prototype;
	/**
	 * 应用工具
	 * @singleton
	 */
	ns.util = (function(){
		return {
			
			/**
			 * 是否为数字
			 * @param val
			 * @returns
			 */
			isNumber : function(val){
				return typeof(val) === 'number';
			},
			
			/**
			 * 是否为字符串
			 * @param val
			 * @returns
			 */
			isString : function(val) {
			    return toString.call(val) === '[object String]';
			},
			
			 /**
			  * 是否function
			  * @param val
			  * @returns
			  */
			isFunction : function(val) {
			    return toString.call(val) === '[object Function]';
			},
			
			/**
			 * 是否为正则对象
			 * @param val
			 * @returns
			 */
			isRegExp : function(val) {
			    return toString.call(val) === '[object RegExp]';
			},
			
			/**
			 * 是否为object对象
			 * @param val
			 * @returns
			 */
			isObject : function(val) {
			    return val === Object(val);
			},
			
			/**
			 * 是否为数组
			 */
			isArray : Array.isArray || function(val) {
			    return toString.call(val) === '[object Array]';
			},
			
			/**
			 * 主要针对有length属性的对象，例如arguments
			 * @param o
			 * @returns
			 */
			makeArray:function (o) {
                if (o == null) {
                    return [];
                }
                if (ns.util.isArray(o)) {
                    return o;
                }

                // The strings and functions also have 'length'
                if (typeof o.length !== 'number'
                    // form.elements in ie78 has nodeName "form"
                    // then caution select
                    // || o.nodeName
                    // window
                    || o.alert
                    || ns.util.isString(o)
                    || ns.util.isFunction(o)) {
                    return [o];
                }
                var ret = [];
                for (var i = 0, l = o.length; i < l; i++) {
                    ret[i] = o[i];
                }
                return ret;
            },
            
            
            indexOf : AP.indexOf ?
	    	      function(arr, item) {
	    	        return arr.indexOf(item)
	    	      } :
	    	      function(arr, item) {
	    	        for (var i = 0; i < arr.length; i++) {
	    	          if (arr[i] === item) {
	    	            return i;
	    	          }
	    	        }
	    	      return -1;
            },
	        forEach : AP.forEach ?
    	      function(arr, fn) {
    	        arr.forEach(fn)
    	      } :
    	      function(arr, fn) {
    	        for (var i = 0; i < arr.length; i++) {
    	          fn(arr[i], i, arr);
    	        }
    	      },
        	map : AP.map ?
    	      function(arr, fn) {
    	        return arr.map(fn)
    	      }:
    	      function(arr, fn) {
    	        var ret = []
    	        ns.util.forEach(arr, function(item, i, arr) {
    	          ret.push(fn(item, i, arr))
    	        });
    	        return ret;
    	      }
		};
	})();
})(duowan);


(function(ns) {
	  var util = ns.util;
	  var config = ns.config;
	  var DIRNAME_RE = /.*(?=\/.*$)/
	  var MULTIPLE_SLASH_RE = /([^:\/])\/\/+/g
	  var FILE_EXT_RE = /\.(?:css|js)$/
	  var ROOT_RE = /^(.*?\w)(?:\/|$)/


	  /**
	   * Extracts the directory portion of a path.
	   * dirname('a/b/c.js') ==> 'a/b/'
	   * dirname('d.js') ==> './'
	   * @see http://jsperf.com/regex-vs-split/2
	   */
	  function dirname(path) {
	    var s = path.match(DIRNAME_RE)
	    return (s ? s[0] : '.') + '/'
	  }


	  /**
	   * Canonicalizes a path.
	   * realpath('./a//b/../c') ==> 'a/c'
	   */
	  function realpath(path) {
	    MULTIPLE_SLASH_RE.lastIndex = 0

	    // 'file:///a//b/c' ==> 'file:///a/b/c'
	    // 'http://a//b/c' ==> 'http://a/b/c'
	    if (MULTIPLE_SLASH_RE.test(path)) {
	      path = path.replace(MULTIPLE_SLASH_RE, '$1\/')
	    }

	    // 'a/b/c', just return.
	    if (path.indexOf('.') === -1) {
	      return path
	    }

	    var original = path.split('/')
	    var ret = [], part

	    for (var i = 0; i < original.length; i++) {
	      part = original[i]

	      if (part === '..') {
	        if (ret.length === 0) {
	          throw new Error('The path is invalid: ' + path)
	        }
	        ret.pop()
	      }
	      else if (part !== '.') {
	        ret.push(part)
	      }
	    }

	    return ret.join('/')
	  }


	  /**
	   * Normalizes an uri.
	   */
	  function normalize(uri) {
	    uri = realpath(uri)
	    var lastChar = uri.charAt(uri.length - 1)

	    if (lastChar === '/') {
	      return uri
	    }

	    // Adds the default '.js' extension except that the uri ends with #.
	    // ref: http://jsperf.com/get-the-last-character
	    if (lastChar === '#') {
	      uri = uri.slice(0, -1)
	    }
	    else if (uri.indexOf('?') === -1 && !FILE_EXT_RE.test(uri)) {
	      uri += '.js'
	    }

	    // Remove ':80/' for bug in IE
	    if (uri.indexOf(':80/') > 0) {
	      uri = uri.replace(':80/', '/')
	    }

	    return uri
	  }


	  /**
	   * Parses alias in the module id. Only parse the first part.
	   */
	  function parseAlias(id) {
	    // #xxx means xxx is already alias-parsed.
	    if (id.charAt(0) === '#') {
	      return id.substring(1)
	    }

	    var alias = config.alias

	    // Only top-level id needs to parse alias.
	    if (alias && isTopLevel(id)) {
	      var parts = id.split('/')
	      var first = parts[0]

	      if (alias.hasOwnProperty(first)) {
	        parts[0] = alias[first]
	        id = parts.join('/')
	      }
	    }

	    return id
	  }


	  var mapCache = {}

	  /**
	   * Converts the uri according to the map rules.
	   */
	  function parseMap(uri) {
	    // map: [[match, replace], ...]
	    var map = config.map || []
	    if (!map.length) return uri

	    var ret = uri

	    // Apply all matched rules in sequence.
	    for (var i = 0; i < map.length; i++) {
	      var rule = map[i]

	      if (util.isArray(rule) && rule.length === 2) {
	        var m = rule[0]

	        if (util.isString(m) && ret.indexOf(m) > -1 ||
	            util.isRegExp(m) && m.test(ret)) {
	          ret = ret.replace(m, rule[1])
	        }
	      }
	      else if (util.isFunction(rule)) {
	        ret = rule(ret)
	      }
	    }

	    if (ret !== uri) {
	      mapCache[ret] = uri
	    }

	    return ret
	  }


	  /**
	   * Gets the original uri.
	   */
	  function unParseMap(uri) {
	    return mapCache[uri] || uri
	  }


	  /**
	   * Converts id to uri.
	   */
	  function id2Uri(id, refUri) {
	    if (!id) return ''

	    id = parseAlias(id)
	    refUri || (refUri = pageUri)

	    var ret

	    // absolute id
	    if (isAbsolute(id)) {
	      ret = id
	    }
	    // relative id
	    else if (isRelative(id)) {
	      // Converts './a' to 'a', to avoid unnecessary loop in realpath.
	      if (id.indexOf('./') === 0) {
	        id = id.substring(2)
	      }
	      ret = dirname(refUri) + id
	    }
	    // root id
	    else if (isRoot(id)) {
	      ret = refUri.match(ROOT_RE)[1] + id
	    }
	    // top-level id
	    else {
	      ret = config.base + '/' + id
	    }

	    return normalize(ret)
	  }


	  function isAbsolute(id) {
	    return id.indexOf('://') > 0 || id.indexOf('//') === 0
	  }


	  function isRelative(id) {
	    return id.indexOf('./') === 0 || id.indexOf('../') === 0
	  }


	  function isRoot(id) {
	    return id.charAt(0) === '/' && id.charAt(1) !== '/'
	  }


	  function isTopLevel(id) {
	    var c = id.charAt(0)
	    return id.indexOf('://') === -1 && c !== '.' && c !== '/'
	  }


	  /**
	   * Normalizes pathname to start with '/'
	   * Ref: https://groups.google.com/forum/#!topic/seajs/9R29Inqk1UU
	   */
	  function normalizePathname(pathname) {
	    if (pathname.charAt(0) !== '/') {
	      pathname = '/' + pathname
	    }
	    return pathname
	  }


	  var loc = window.location;
	  var pageUri = loc.protocol + '//' + loc.host +
	      normalizePathname(loc.pathname)

	  // local file in IE: C:\path\to\xx.js
	  if (pageUri.indexOf('\\') > 0) {
	    pageUri = pageUri.replace(/\\/g, '/')
	  }


	  util.dirname = dirname
	  util.realpath = realpath
	  util.normalize = normalize

	  util.parseAlias = parseAlias
	  util.parseMap = parseMap
	  util.unParseMap = unParseMap

	  util.resolve = id2Uri
	  util.isAbsolute = isAbsolute
	  util.isRoot = isRoot
	  util.isTopLevel = isTopLevel

	  util.pageUri = pageUri

	})(duowan);
/**
 * 为了保证seeds文件小巧，
 * 暂时不加各种浏览器下的调试器
 */
(function(ns){
	ns.util.log = function(str){
		console&&console.log(str);
	};
})(duowan);
(function(ns){
	
	/*
	 * ==================================================================================
	 * 沙箱全局变量
	 * ==================================================================================
	 */
	var util = ns.util,
		config = ns.config;
	
	var STATUS = {
	    'LOADING': 1,  // 开始加载
	    'LOADED': 2,   // 加载完毕
	    'SAVED': 3,     // 写入cacheModule
	    'COMPILED': 4   // 模块已经编译
	},
	
	//存放已经加载的模块元
	cachedModules = {},
	
	//存放回调函数
	callbackList = {},
	
	//存放匿名模块单元
	anonymousModuleMeta = null,
	
	//无操作函数
	noop = function(){};
	
	
	
	/**
	 * ==================================================================================
	 * 模块类，用于记录模块数据,和一些定义功能。
	 * 本身没有加载功能。
	 * @param uri string
	 * ==================================================================================
	 */
	var Module = function(uri,deps,factory,status){
		this.id = uri;
		this.deps = deps||[],
		this.factory = factory||noop;
		this.status = status||STATUS.LOADING;
	};
	Module.prototype = {
		/**
		 * 编译模块
		 * @returns 模块工厂生产的东西
		 */	
		compile : function(){
			var t = this,
				fac = t.factory,
				ret = t.ecports,
				deps = t.deps||[];
			
			if(t.status == STATUS.COMPILED){
				return t.exports;
			}
			
			deps = util.map(deps,function(id){
		    	return util.resolve(id);
		    });
			
			if(ret){
				return ret;
			}else{
				var args = util.map(deps, function(uri) {
					return uri ? cachedModules[uri].compile() : null;
				});
				ret = fac.apply(null,args);
			}
			t.exports = ret;
			t.status = STATUS.COMPILED;
			return ret;
		}
	};
	
	/**
	 * ==================================================================================
	 * 加载器
	 * @fun 加载资源
	 * @fun 模块对象处理
	 * 对外只暴露：add,load、saveModule三个方法。
	 * 主要用于驱动模块动作
	 * ==================================================================================
	 */
	var L = (function(){
		var doc = document;
		var head = doc.head ||
	      	doc.getElementsByTagName('head')[0] ||
	      	doc.documentElement;
		
		var IS_CSS_RE = /\.css(?:\?|$)/i;
		var READY_STATE_RE = /loaded|complete|undefined/;
		
		var UA = navigator.userAgent;
		
		var currentlyAddingScript = null;
		var interactiveScript = null;

		return {
			/**
			 * 把模块加载到cachedModule中，其实暂时存到anonymousModuleMeta中，会在紧跟的回调中加进去
			 * @param deps
			 * @param factory
			 */
			add : function(deps,factory){
				var args = arguments;
				if(args.length==0){
					return;
				}
				
				if(args.length==1||!factory){
					factory = deps;
					deps = [];
				}
								
				var meta = {deps: deps, factory: factory};
				var uri = '';

			    // Try to derive uri in IE6-9 for anonymous modules.
			    if (document.attachEvent) {
			      // Try to get the current script.
			      var script = this._getCurrentScript();
			      if (script) {
			    	  uri = util.unParseMap(this._getScriptAbsoluteSrc(script));
			      }
			      if (uri) {
				      var module = new Module(uri,deps,factory);
				      this.saveModule(module);
			      }
			    }else{
			    	/**
					 * 这里比较绕弯，这个是沙箱全局变量，主要用于在js onload事件存储东西,
					 * 考虑到js是个单线程语言，因此不会造成多个js同时加载完赋值造成的混淆
					 * 只针对非ie,执行完js文件马上执行onload事件的情况。
					 */
					anonymousModuleMeta = meta;
			    }
			    return meta;
			},
			/**
			 * 加载资源文件
			 * @param uri String 地址
			 * @param callback	Function 加载完资源文件和所有的依赖完毕回调函数
			 * @returns
			 */
			load : function(uri,callback){
				var t = this;
				if(util.isString(uri)){
					t._load(uri, function(){
						var module = cachedModules[uri];
						deps = module.deps||[];
						if(deps&&deps.len>0){
							t.load(deps, callback);
						}else{
							callback();
						}
					});
				}else if(util.isArray(uri)){
					var len=uri.length,
						remain = len;
					var commonCallback = function(){
						remain--;
						if(remain==0){
							callback();
						}
					};
					for(var i=0;i<len;i++){
						(function(uri){
							t.load(uri,commonCallback);
						})(uri[i]);
					}
				}
				
			},
			/**
			 * 存储模块到cachedModules
			 * @param m Module 模块对象
			 * @returns
			 */
			saveModule : function(m){
				var uri = m.id || '';
				cachedModules[uri] = m;
			},
			/**
			 * 给模块取一个别名
			 * @param id
			 * @returns
			 */
			alias : function(id){
				var meta = ns.aliasModuleMeta;
					deps = meta.deps,
					factory = meta.factory,
					uri = util.resolve(id),
					module = cachedModules[uri]||new Module(uri,deps,factory,2);
				this.saveModule(module);
				ns.aliasModuleMeta = null;
			},
			_getModule : function(uri){
				return cachedModules[uri] || null;
			},
			/**
			 * load实现方法
			 * @param uri
			 * @param callback
			 * @returns
			 */
			_load : function(uri,callback){
				var t = this,m,cs=config.charset;
				uri = util.resolve(uri);
				m = cachedModules[uri]||new Module(uri);
				t.saveModule(m);
				
				if(m.status>=STATUS.LOADED){
					callback();
					return;
				}else{
					t._saveCallback(uri,callback);
				}
				
				if(IS_CSS_RE.test(uri)){
					this._loadStyle(uri,function(){
						runCallback();
					},cs);
				}else{
					this._loadScript(uri,function(){
						runCallback();
					},cs);
				}
				
				function runCallback(){
					var callbacks = t._getCallback(uri),
						i=0,
						len=callbacks.length;
					
					//非ie对模块操作
					if(anonymousModuleMeta){
						m.deps = anonymousModuleMeta.deps;
						m.factory = anonymousModuleMeta.factory;
						anonymousModuleMeta = null;
					}
					
					m.status==STATUS.LOADED;
					
					for(;i<len;i++){
						callbacks[i].call(null);
					}
				};
			},
			/**
			 * 把callback存放到callbackList对象中
			 * @param uri
			 * @returns
			 */
			_saveCallback : function(uri,callback){
				if(callbackList[uri]){
					callbackList[uri].push(callback);
				}else{
					callbackList[uri] = [callback];
				}
			},
			_getCallback : function(uri){
				var ret;
				ret = callbackList[uri];
				if(!ret){
					ret = [];
				}
				return ret;
			},
			/**
			 * 加载script并声明load事件
			 * @param uri String 
			 * @param callback Function
			 * @returns
			 */
			_loadScript : function(uri,callback,cs){
				var node = document.createElement("script");
				node.charset = cs;
				
				node.onload = node.onerror = node.onreadystatechange = function() {
			      if (READY_STATE_RE.test(node.readyState)) {

			        // Ensure only run once and handle memory leak in IE
			        node.onload = node.onerror = node.onreadystatechange = null;

			        // Remove the script to reduce memory leak
			        if (node.parentNode && !config.debug) {
			          head.removeChild(node);
			        }

			        // Dereference the node
			        node = undefined;

			        callback();
			      }
				};
				
				node.src = uri;
			    currentlyAddingScript = node;
				head.appendChild(node);
			    currentlyAddingScript = null;
			},
			/**
			 * 加载style并声明load事件
			 * @param uri String
			 * @param callback Function
			 * @returns
			 */
			_loadStyle : function(uri,callback,cs){
				var node = document.createElement("link");
					node.rel = "stylesheet";
					node.charset = cs;
				var t = this;
				
				// `onload` event is supported in WebKit since 535.23
				// Ref:
				//  - https://bugs.webkit.org/show_activity.cgi?id=38995
				var isOldWebKit = Number(UA.replace(/.*AppleWebKit\/(\d+)\..*/, '$1')) < 536;

				// `onload/onerror` event is supported since Firefox 9.0
				// Ref:
				//  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
				//  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
				var isOldFirefox = UA.indexOf('Firefox') > 0 &&!('onload' in document.createElement('link'));
				
				// for Old WebKit and Old Firefox
			    if (isOldWebKit || isOldFirefox) {
			      util.log('Start poll to fetch css');

			      setTimeout(function() {
			        t._poll(node, callback);
			      }, 1); // Begin after node insertion
			    }else {
			      node.onload = node.onerror = function() {
			        node.onload = node.onerror = null;
			        // Remove the script to reduce memory leak
			        if (node.parentNode && !config.debug) {
			          head.removeChild(node);
			        }
			        node = undefined;
			        callback();
			      };
			    }
			    node.href = uri;
			    currentlyAddingScript = node;
				head.appendChild(node);
			    currentlyAddingScript = null;
			},
			/**
			 * 循环检测是否加载css资源是否加载完毕
			 * @param node
			 * @param callback
			 * @returns
			 */
			_poll : function(node, callback) {
			    var isLoaded,t=this;
			    
			    // for WebKit < 536
			    if (isOldWebKit) {
			      if (node['sheet']) {
			        isLoaded = true;
			      }
			    }
			    // for Firefox < 9.0
			    else if (node['sheet']) {
			      try {
			        if (node['sheet'].cssRules) {
			          isLoaded = true;
			        }
			      } catch (ex) {
			        // The value of `ex.name` is changed from
			        // 'NS_ERROR_DOM_SECURITY_ERR' to 'SecurityError' since Firefox 13.0
			        // But Firefox is less than 9.0 in here, So it is ok to just rely on
			        // 'NS_ERROR_DOM_SECURITY_ERR'
			        if (ex.name === 'NS_ERROR_DOM_SECURITY_ERR') {
			          isLoaded = true;
			        }
			      }
			    }

			    setTimeout(function() {
			      if (isLoaded) {
			        // Place callback in here due to giving time for style rendering.
			        callback();
			      } else {
			        t._poll(node, callback);
			      }
			    }, 1);
			},
			/**
			 * 获取当前执行js的路径
			 * 来自于kris zyp的方法，根据script的readyState==‘interactive’来判断
			 */
			_getCurrentScript : function() {
			    if (currentlyAddingScript) {
			        return currentlyAddingScript;
			      }

			      // For IE6-9 browsers, the script onload event may not fire right
			      // after the the script is evaluated. Kris Zyp found that it
			      // could query the script nodes and the one that is in "interactive"
			      // mode indicates the current script.
			      // Ref: http://goo.gl/JHfFW
			      if (interactiveScript &&
			          interactiveScript.readyState === 'interactive') {
			        return interactiveScript;
			      }

			      var scripts = head.getElementsByTagName('script');

			      for (var i = 0; i < scripts.length; i++) {
			        var script = scripts[i]
			        if (script.readyState === 'interactive') {
			          interactiveScript = script;
			          return script;
			        }
			      }
			    },
			    /**
			     * 获取当前script的绝对地址
			     * @param node
			     * @returns
			     */
			    _getScriptAbsoluteSrc : function(node) {
			      return node.hasAttribute ? // non-IE6/7
			          node.src :
			          // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
			          node.getAttribute('src', 4);
			    }
		};
	})();
	
	/**
	 * ==================================================================================
	 * 暴露到全局命名空间,共三个接口
	 * ns.use
	 * ns.add
	 * ns.alias
	 * ==================================================================================
	 */
	/**
	 * “用”某资源，来执行callback任务。
	 * @param deps String or Array 
	 * @param callback Function
	 */
	ns.use = function(ids,callback){
		var args = arguments,
			argsL = args.length;
		
		if(argsL==0){
			return;
		}
		if(argsL==1){
			callback = noop;
		}
		
		util.isString(ids) && (ids = [ids]);
		
	    var uris = util.map(ids,function(id){
	    	return util.resolve(id);
	    });

	    //加载完毕后，会把每个模块生产的对象传到callback的参数中
	    L.load(uris, function() {
	      var args = util.map(uris, function(uri) {
	        return uri ? cachedModules[uri].compile() : null;
	      });

	      if (callback) {
	        callback.apply(null, args);
	      }
	    });
		
		
	};
	
	/**
	 * 把模块信息加入cacheModuels
	 * @param deps Array 
	 * @param factory function/object
	 */
	ns.add = function(deps,factory){
		ns.aliasModuleMeta = L.add(deps,factory);
		return ns;
	};
	
	/**
	 * 显示声明某些模块不用再加载，即使没加载。即取一个别名
	 * @param ids String or Array
	 */
	ns.alias = function(id){
		L.alias(id);
	};
	
	ns.cache = cachedModules;
})(duowan);
