var mysql = require('mysql');
var conn = require('../utility.js');

var logger = global.logger;

exports.followUser = function(reqbody, callback){
	var follow_timestamp = Date.now() / 1000;
	var sql = "insert into user_follow_base_info(user_id, followed_user_id, follow_timestamp) " +
	" values(?,?,?)";
	conn.executeSql(sql, [reqbody.user_id, reqbody.followed_user_id, follow_timestamp], callback);

	sql = "update user_base_info set user_follow_count = user_follow_count+1 where user_id = ?";
	conn.executeSql(sql, [reqbody.user_id], null);

	sql = "update user_base_info set user_fans_count = user_fans_count+1 where user_id = ?";
	conn.executeSql(sql, [reqbody.followed_user_id], null);
};

exports.cancelFollowUser = function(reqbody, callback){

	var sql = "delete from user_follow_base_info where user_id = ? and followed_user_id = ?";
	conn.executeSql(sql, [reqbody.user_id, reqbody.followed_user_id], callback);

	sql = "update user_base_info set user_follow_count = user_follow_count-1 where user_id = ?";
	conn.executeSql(sql, [reqbody.user_id], null);

	sql = "update user_base_info set user_fans_count = user_fans_count-1 where user_id = ?";
	conn.executeSql(sql, [reqbody.followed_user_id], null);
};

exports.getfollowInfo = function(reqbody, callback){
	var sql = "select *From user_follow_base_info where user_id = ?";
	conn.executeSql(sql, [reqbody.user_id], callback);
};

exports.getFansUser = function(reqbody, callback){
	var sql = "select a.follow_timestamp, b.* from user_follow_base_info a, user_base_info b " +
	" where a.user_id = b.user_id and a.followed_user_id = ? and a.follow_timestamp< ? " +
	" order by follow_timestamp desc limit 12 ";
	conn.executeSql(sql, [reqbody.followed_user_id, reqbody.follow_timestamp], callback);
};

exports.getfollowUser = function(reqbody, callback){
	var sql = "select a.follow_timestamp, b.* from user_follow_base_info a, user_base_info b " +
	" where a.followed_user_id = b.user_id and a.user_id = ? and a.follow_timestamp< ? " +
	"order by follow_timestamp desc limit 12 ";
	conn.executeSql(sql, [reqbody.user_id, reqbody.follow_timestamp], callback);
};

exports.getUserTokenInfo = function(user_id, callback) {
	var sql = 'select *from user_base_info where user_id = ?';
	conn.executeSql(sql, [user_id], callback);
};
