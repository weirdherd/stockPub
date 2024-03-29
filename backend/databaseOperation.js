var mysql = require('mysql');
var conn = require('./utility.js');

var logger = global.logger;



exports.endPool = function(callback){
	conn.endPool(callback);
}

exports.getAllStockCode = function(callback){
	var sql = "select stock_code from stock_base_info";
	conn.executeSql(sql, [], callback);
}

exports.updateVolumeProportion = function(stockCode, day2, day3, day4, callback){
	var sql = "update stock_amount_info set day2 = ?, day3 = ?, day4 = ? "
	+" where stock_code = ? and date = "
	+"(select xx.date from "
	+"(select date from stock_amount_info aa where aa.stock_code = ? order by date DESC limit 1) xx)";
	conn.executeSql(sql, [day2, day3, day4, stockCode, stockCode], callback);
}

exports.updateStockBaseInfo = function(stockCode, priceearning, marketValue, flowMarketValue, pb, roe, price, callback){
	var sql = "update stock_base_info set priceearning = ?, marketValue = ?, flowMarketValue = ? , pb = ?, roe = ?, price = ?"
	+" where stock_code = ?";
	conn.executeSql(sql, [priceearning, marketValue, flowMarketValue, pb, roe, price, stockCode], callback);
}

exports.insertStockBaseInfo = function(stockInfo, callback){
	var sql = "insert into stock_base_info(stock_code, stock_name, market) values(?, ?, ?)";
	conn.executeSql(sql, [stockInfo.stock_code, stockInfo.stock_name, stockInfo.market], callback);
};


exports.getStockByCode = function(stock_code, callback){

	var sql = "select a.*, b.stock_name from stock_amount_info a,stock_base_info b where a.stock_code = ? "
	+ "and a.stock_code=b.stock_code and a.amount<>0 and a.price<>0 and a.volume<>0 order by date DESC limit 15";

	conn.executeSql(sql, [stock_code], callback);
}

exports.getStockNowByCode = function(stock_code, callback){
	var sql = "select a.*, b.stock_name from stock_now_info a, stock_base_info b where a.stock_code = ? "
	+"and a.stock_code = b.stock_code order by timestamp DESC limit 1";
	conn.executeSql(sql, [stock_code], callback);
}

exports.insertStockNow = function(stockCode, amount, date, time, price, yesterday_price, fluctuate,
	priceearning, marketValue, flowMarketValue, volume, pb, openPrice, high_price, day4, callback){
	var timestamp = Date.now()/1000;
	var sql = "insert into stock_now_info (stock_code, amount, price, yesterday_price, date, time, timestamp, fluctuate, priceearning, marketValue, flowMarketValue, volume, pb, open_price, high_price, day4) "
	+" values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
	conn.executeSql(sql, [stockCode, amount, price, yesterday_price, date, time, timestamp, fluctuate, priceearning, marketValue, flowMarketValue, volume, pb, openPrice, high_price, day4], callback);

	sql = "update stock_predict_info set last_price = ?, last_date_time = ? where stock_code = ?";
	conn.executeSql(sql, [price, date+" "+time, stockCode], null);
}

exports.insertStockAmount = function(stock_code, amount, date, time, price, fluctuate, priceearning,
	marketValue, flowMarketValue, volume, pb, openPrice, high_price, low_price, callback){
	var timestamp = Date.now()/1000;
	var sql = "insert into stock_amount_info (stock_code, amount, price, date, time, timestamp, fluctuate, priceearning, marketValue, flowMarketValue, volume, pb, open_price, high_price, low_price) "
	+" values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
	conn.executeSql(sql, [stock_code, amount, price, date, time, timestamp, fluctuate, priceearning, marketValue, flowMarketValue, volume, pb, openPrice, high_price, low_price], callback);
}

exports.getLastStockDate = function(callback){
	var sql = "select date from stock_amount_info a order by date DESC limit 1";
	conn.executeSql(sql, [], callback);
}

exports.emptyStockNowInfo = function(callback){
	var sql = "delete from stock_now_info";
	conn.executeSql(sql, [], callback);
}

exports.addMissedStockCode = function(stock_code, callback){
	var myDate = new Date();
	//logger.info(myDate.Date());

	var sql = "insert into missed_stock_info(stock_code, date) values(?, ?)";
	conn.executeSql(sql, [stock_code, myDate.toString()], callback);
}


exports.getTopDay = function(day_count, pre_code, callback){

	logger.info(" day_count "+day_count+" pre_code "+pre_code);

	var sql = "select aa.*,aa.day"+day_count+" as day_volume, bb.stock_name from stock_amount_info aa, stock_base_info bb "
			+"where aa.date = "
			+"(select date from stock_amount_info order by date desc limit 1) "
			+" and aa.stock_code = bb.stock_code "
			+" and aa.stock_code like '"+pre_code+"%' "
			+" and bb.stock_name not like '%ST%' "
			+" order by aa.day"+day_count+"/(aa.flowMarketValue*10000) desc limit 10";

	logger.debug(sql);

	conn.executeSql(sql, [], callback);
}


exports.getBotDay = function(day_count, pre_code, callback){

	logger.info(" day_count "+day_count+" pre_code "+pre_code);

	var sql = "select aa.*,aa.day"+day_count+" as day_volume, bb.stock_name from stock_amount_info aa, stock_base_info bb "
			+"where aa.date = "
			+"(select date from stock_amount_info order by date desc limit 1) "
			+" and aa.stock_code = bb.stock_code "
			+" and aa.stock_code like '"+pre_code+"%' "
			+" and bb.stock_name not like '%ST%' "
			+" order by aa.day"+day_count+"/(aa.flowMarketValue*10000) asc limit 10";

	logger.debug(sql);
	conn.executeSql(sql, [], callback);
}

exports.insertFeedback = function(msgStr, callback){
	var sql = "insert into feedback_info(feedback, date) values(?, ?)";
	var myDate = new Date();
	conn.executeSql(sql, [msgStr, myDate.toString()], callback);
}


exports.insertRecommandStock = function(stock_code_pre, callback){

	var sql = " insert into stock_predict_info(stock_code, date, price) "
			+" select xxx.stock_code, xxx.date, xxx.price from ( "
			+" (select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, "
			+" aa.flowMarketValue, aa.volume, aa.day2, aa.day3, aa.day4, aa.pb,  "
			+" FORMAT(aa.pb*100/aa.priceearning,2) as roe, format(aa.day4/(aa.flowMarketValue*100),2) as per "
			+" from stock_amount_info aa, stock_base_info bb "
			+" where aa.date = "
			+" (select date from stock_amount_info order by date desc limit 1) "
			+" and aa.stock_code = bb.stock_code "
			+" and aa.stock_code like '"+stock_code_pre+"%' "
			+" and aa.marketValue>100 "
			+" and aa.flowMarketValue>100 "
			+" and aa.5day_av_price<>0 "
			+" and aa.price>aa.5day_av_price"
			+" and aa.5day_av_price>=aa.10day_av_price"
			+" and aa.5day_fluctuate<0.10 " /*五日波动幅度大于10%，剔除*/
			+" and aa.5day_fluctuate>-0.10" /*五日波动幅度小于-10%，剔除*/
			+" and aa.5day_fluctuate<>0"
			+" and aa.amount<>0 "
			+" and aa.price<100" /*股价高于100剔除*/
			+" and aa.high_price/aa.price<1.03" /*上影线大于3%剔除*/
			+" and !(aa.high_price=aa.open_price and aa.open_price>aa.price)" /*光头阴线，剔除*/
			+" and aa.day2<>0" /*两日成交量为流出，剔除*/
			+" and aa.fluctuate>-4" /*当日跌幅超4%剔除*/
			+" and aa.day4>0"
			+" and aa.pb*100/aa.priceearning>5" /*净资产低于5%的剔除*/
			+" and aa.day4/(aa.flowMarketValue*10000)>0.1" /*资金五日净流入占比大于10%*/
			+" and aa.stock_code not in "
			+" (select yy.stock_code from stock_predict_info yy where datediff(curdate(), yy.date)<7)"
			+" order by aa.day4/(aa.flowMarketValue*10000) desc limit 5) as xxx "
			+")";
	conn.executeSql(sql, [], callback);
}

exports.getTodayRecommandNow = function(stock_code_pre, callback){

	var sql = "select xxx.*, bb.stock_name, bb.industry from stock_now_info xxx, "
			+"(select max(timestamp) as timestamp, stock_code from stock_now_info xxx group by stock_code) as yyy,"
			+"(select mm.* from stock_amount_info mm, "
			+"(select max(date) as date,stock_code from stock_amount_info group by stock_code) as tt "
			+" where mm.stock_code = tt.stock_code "
			+" and mm.date = tt.date) as zzz, "
			+" stock_base_info bb "
			+" where xxx.stock_code = yyy.stock_code "
			+" and xxx.stock_code = bb.stock_code "
			+" and xxx.timestamp = yyy.timestamp"
			+" and xxx.stock_code = zzz.stock_code"
			+" and xxx.stock_code like'"+stock_code_pre+"%'"
			+" and xxx.marketValue>100 "
			+" and xxx.flowMarketValue>100"
			+" and zzz.5day_av_price<>0"
			+" and xxx.price>zzz.5day_av_price"
			+" and zzz.5day_av_price>=zzz.10day_av_price "
			+" and zzz.5day_fluctuate<0.04  "/*五日涨幅累计10%，剔除*/
			+" and zzz.5day_fluctuate>-0.04 "/*五日跌幅累计10%，剔除*/
			+" and zzz.5day_fluctuate<>0 "
			+" and xxx.amount<>0"
 			+" and xxx.price<100" /*股价高于100剔除*/
 			+" and xxx.high_price/xxx.price<1.03" /*上影线大于3%剔除*/
			+" and !(xxx.high_price=xxx.open_price and xxx.open_price>xxx.price)" /*光头阴线，剔除*/
			+" and xxx.fluctuate>-4" /*当日跌幅超4%剔除*/
			+" and xxx.fluctuate<5"
			+" and xxx.day4/(xxx.flowMarketValue*10000)>0.1"
			+" and xxx.day4>0"
			+" order by xxx.day4/(xxx.flowMarketValue*10000) desc limit 5";
	conn.executeSql(sql, [], callback);
}



exports.checkExistRecommandStock = function(callback){
	var sql = "select *from stock_predict_info a where a.date = ( "
			+" select date from stock_amount_info order by date desc limit 1)";
	conn.executeSql(sql, [], callback);
}

exports.getPredictResult = function(callback){
	var sql = "select a.*, b.stock_name from stock_predict_info a, stock_base_info b where a.date = "
			+"(select date from stock_predict_info where actual_high_price is not null order by date desc limit 1) "
			+" and a.stock_code = b.stock_code"
			+" order by actual_fluctuate desc";
	conn.executeSql(sql, [], callback);
}

exports.getPredictResultTwoWeeks = function(callback){
	var sql = "select a.*, b.stock_name from stock_predict_info a, stock_base_info b where a.date in"
			+" (select t.date from (select date from stock_predict_info group by date order by date desc limit 2) as t)"
			+" and a.stock_code = b.stock_code"
			+" order by actual_fluctuate desc";
	conn.executeSql(sql, [], callback);
}




exports.getTodayRecommand = function(callback){
	var sql = "select a.*, b.stock_name, b.industry from stock_predict_info a, stock_base_info b "
			+" where a.stock_code = b.stock_code and a.date = ("
			+" select date from stock_predict_info order by date desc limit 1) order by (a.last_price - a.price) desc";
	conn.executeSql(sql, [], callback);
}

exports.getDaysPrice = function(stockCode, days, callback){
	var sql = "select *from stock_amount_info a where a.stock_code = ? and a.price<>0 order by date desc limit ?";
	conn.executeSql(sql, [stockCode, days], callback);
}

exports.update5AvPrice = function(stockCode, av_price, date, day_fluctuate, callback){
	var sql = "update stock_amount_info set 5day_av_price = ?, 5day_fluctuate = ? where stock_code = ? and date = ?";
	conn.executeSql(sql, [av_price, day_fluctuate, stockCode, date], callback);
}

exports.update10AvPrice = function(stockCode, av_price, date, day_fluctuate, callback){
	var sql = "update stock_amount_info set 10day_av_price = ?, 10day_fluctuate = ? where stock_code = ? and date = ?";
	conn.executeSql(sql, [av_price, day_fluctuate, stockCode, date], callback);
}

exports.getPredict = function(callback){
	var sql = "select *from stock_predict_info a where a.actual_high_price is null";
	conn.executeSql(sql, [], callback);
}


exports.getStockInfo = function(stockCode, date, callback){
	var sql = "select *from stock_amount_info a where a.stock_code = ? and a.date>? and a.price<>0 order by a.date asc limit 5";
	conn.executeSql(sql, [stockCode, date], callback);
}

exports.updatePredict = function(stockCode, date, high_price, fluctuate, callback){
	var sql = "update stock_predict_info set actual_high_price = ?, actual_fluctuate = ? "
	+" where stock_code = ? and date = ?";
	conn.executeSql(sql, [high_price, fluctuate, stockCode, date], callback);

}
