/**
 * 为了保证seeds文件小巧，
 * 暂时不加各种浏览器下的调试器
 */
(function(ns){
	ns.util.log = function(str){
		console&&console.log(str);
	};
})(duowan);