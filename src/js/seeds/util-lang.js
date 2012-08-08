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

