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