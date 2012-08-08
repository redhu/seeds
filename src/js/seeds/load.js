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