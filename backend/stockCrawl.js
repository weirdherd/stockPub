var databaseOperation = require('./databaseOperation');
var logger = global.logger;
var http = require('http');
var redis = require("redis");
var redisClient = redis.createClient({auth_pass:'here_dev'});

var conn = require('./utility');
var stockDay3AmountHash = "stockday3hash";


redisClient.on("error", function (err) {
	logger.error(err, logger.getFileNameAndLineNum(__filename));
});


function isMarketOpenTime() {
	var now = new Date();
	var day = now.getDay();
	if (day == 6 || day == 7) {
		return false;
	}

	var hour = now.getHours();
	var min = now.getMinutes();
	if (hour < 9 || hour > 15 || (hour == 9 && min < 30) || (hour == 15 && min > 0)) {
		return false;
	}
	return true;
}

function getMarketDesc(stock_code) {
	if (stock_code.indexOf("3") == 0 || stock_code.indexOf("0") == 0) {
		return "sz";
	}
	if (stock_code.indexOf("6") == 0) {
		return "sh";
	}
	return "";
}


function getStockInfo(stockCodeArr, isnow) {
	var urlChild = "";
	for (var i = 0; i < stockCodeArr.length; ++i) {
		urlChild = urlChild + "," + getMarketDesc(stockCodeArr[i]) + stockCodeArr[i];
		if (i % 30 == 0 || i + 1 >= stockCodeArr.length) {
			getStockInfoFromAPI(urlChild, isnow);
			urlChild = "";
		}
	}
}


function insertToDatabase(htmlData, isnow) {

	var elementArr = htmlData.split(";");
	if (elementArr.length == 0) {
		logger.warn('elementArr is empty');
		return;
	}

	elementArr.forEach(function(elementStr){
		var beginIndex = elementStr.indexOf("\"");
		var endIndex = elementStr.lastIndexOf("\"");
		if (beginIndex!=-1&&endIndex!=-1) {
			var data = elementStr.substr(beginIndex + 1, endIndex - beginIndex - 1);
			if (data != null) {
				var dataArr = data.split("~");
				if(dataArr.length<48){
					logger.warn('elementArr is empty');

					return;
				}
				var stockCode = dataArr[2];
				var amount = dataArr[6];
				var yesterday_price = dataArr[4];
				var date = dataArr[30];
				date = date.substr(0, 4)+"-"+date.substr(4, 2)+"-"+date.substr(6, 2);

				var time = dataArr[30];
				time = time.substr(8, 2)+":"+time.substr(10, 2)+":"+time.substr(12, 2);
				var price = dataArr[3];

				var fluctuate = dataArr[32];
				var priceearning = dataArr[39];
				var marketValue = dataArr[45];
				var pb = dataArr[46];
				var flowMarketValue = dataArr[44];
				var volume = dataArr[37];
				var openPrice = dataArr[5];
				var high_price = dataArr[33];
				var low_price = dataArr[34];

				if (stockCode === undefined ||
					amount === undefined ||
					date === undefined ||
					time === undefined ||
					price === undefined ||
					openPrice === undefined||
					yesterday_price === undefined||
					amount == 0||
					price == 0) {
						//logger.warn('stockCode is undefined');
					return;
				}

				if (isnow === true) {

					redisClient.get(stockCode+"_3day", function(err, data){
						if (!err) {
							if (data) {
								var day4 = parseInt(data)+volume*conn.getPlusMinus(price - openPrice);
								databaseOperation.insertStockNow(stockCode, amount, date, time,
											price,
											yesterday_price,
											fluctuate,
											priceearning,
											marketValue,
											flowMarketValue,
											volume,
											pb,
											openPrice,
											high_price,
											day4,
											function(flag, result) {
												//logger.debug(stockCode+" now insert");
												if (!flag) {
													logger.error("insertStockNow err code "+result.errno);
												}else{
													//logger.info('insertStockNow ok');
												}
											});
							}else{
								databaseOperation.getDaysPrice(stockCode, 1, function(flag, result){
									if (flag) {
										var day4 = 0;
										if (result.length<=0) {
											redisClient.set(stockCode+"_3day", 0);
											day4 = volume*conn.getPlusMinus(price - openPrice);
										}else{
											if (result[0].day3==null) {
												result[0].day3 = 0;
											}
											if (conn.compareDay(result[0].date, date) >= 0) {
												return;
											}

											redisClient.set(stockCode+"_3day", result[0].day3);
											day4 = result[0].day3+volume*conn.getPlusMinus(price - openPrice);
										}


										databaseOperation.insertStockNow(stockCode, amount, date, time,
											price,
											yesterday_price,
											fluctuate,
											priceearning,
											marketValue,
											flowMarketValue,
											volume,
											pb,
											openPrice,
											high_price,
											day4,
											function(flag, result) {
												//logger.debug(stockCode+" now insert");
												if (!flag) {
													logger.error("insertStockNow err code "+result.errno);

												}else{
													//logger.info('insertStockNow ok');



												}
											});
									}else{
										logger.error(result);
									}
								});
							}
						}else{
							logger.error(err);
						}
					});

				} else {

					databaseOperation.insertStockAmount(stockCode,
						amount,
						date,
						time,
						price,
						fluctuate,
						priceearning,
						marketValue,
						flowMarketValue,
						volume,
						pb,
						openPrice,
						high_price,
						low_price,
						function(flag, result) {
							logger.debug(stockCode +" insertStockAmount pb "+pb);
							if (!flag) {
								if (result.errno != 1062) {
									//不是主键冲突
									logger.error(result);
								}
							}else{
								logger.debug(stockCode+" day info insert");
								updateStockBaseInfo(stockCode, priceearning, marketValue, flowMarketValue, pb, price);
								caculateVolumeProportion(stockCode);
								updateStockAvPrice(stockCode, date);
							}
						}
					);
				}
			}
		}
	});
}




exports.removeKeys = function(){
	logger.info('enter removeKeys');
	databaseOperation.getAllStockCode(function(flag, result){
		if (flag) {
			result.forEach(function(element){
				redisClient.del(element.stock_code+"_3day");
			});
		}else{
			logger.error('getAllStockCode error code '+result.errno);
		}
	});
}

function getMaxPrice(result){
	var max = result[0].high_price;
	for (var i = result.length - 1; i >= 0; i--) {
		if (max<result[i].high_price) {
			max = result[i].high_price;
		}
	}

	return max;
}


function getMinPrice(result){
	var min = result[0].low_price;
	for (var i = result.length - 1; i >= 0; i--) {
		if (min>result[i].low_price) {
			min = result[i].low_price;
		}
	}

	return min;
}


function updateStockAvPrice(stockCode, date){
	logger.info(stockCode+" updateStockAvPrice");
	databaseOperation.getDaysPrice(stockCode, 5, function(flag, result){
		if(flag){
			if(result.length == 5){
				var av_price = 0;
				result.forEach(function(element){
					av_price+=element.price;
				});
				av_price/=5;

				var day_fluctuate = 0;
				if (result[0].price!=0&&result[4].open_price!=0) {
					var min = getMinPrice(result);
					var max = getMaxPrice(result);

					day_fluctuate = ((max - min)/min).toFixed(2);
				}
				databaseOperation.update5AvPrice(stockCode, av_price, date, day_fluctuate, function(flag, result){
					if(flag){

					}else{
						logger.error(result);
					}
				});
			}else{
				logger.info("not has 5 days price");
			}

		}else{
			logger.error(result);
		}

	});

	databaseOperation.getDaysPrice(stockCode, 10, function(flag, result){
		if(flag){
			if(result.length == 10){
				var av_price = 0;
				result.forEach(function(element){
					av_price+=element.price;
				});
				av_price/=10;

				var day_fluctuate = 0;
				if (result[0].price!=0&&result[9].open_price!=0) {
					day_fluctuate = ((result[0].price - result[9].open_price)/result[9].open_price).toFixed(2);
				}
				databaseOperation.update10AvPrice(stockCode, av_price, date, day_fluctuate, function(flag, result){
					if(flag){

					}else{
						logger.error(result);
					}
				});
			}else{
				logger.info("not has 10 days price");
			}

		}else{
			logger.error(result);
		}

	});


}


function getPlusMinus(num){
	if (num>0) {
		return 1;
	}else if (num == 0) {
		return 0
	}else{
		return -1
	}
}

function updateStockBaseInfo(stockCode, priceearning, marketValue, flowMarketValue, pb, price){

	var roe = 0;
	if (priceearning!=0&&pb!=0
		&&priceearning!=null&&pb!=null) {
		roe = (pb*100/priceearning).toFixed(2);
	}

	databaseOperation.updateStockBaseInfo(stockCode, priceearning, marketValue, flowMarketValue, pb, roe, price, function(flag, result){
		if (!flag) {
			logger.error(result);
		}
	});
}

function caculateVolumeProportion(stockCode){
	databaseOperation.getStockByCode(stockCode, function(flag, result){
		if (flag) {
			if (result.length>=5) {
				var element0 = result[0];
				var element1 = result[1];
				var element2 = result[2];
				var element3 = result[3];
				var element4 = result[4];

				if(element1.open_price == null
					||element2.open_price == null
					||element3.open_price == null
					||element4.open_price == null){
					return;
				}

				var day2 = element0.volume*getPlusMinus(element0.price - element0.open_price)+element1.volume*getPlusMinus(element1.price - element1.open_price);

				var day3 = element0.volume*getPlusMinus(element0.price - element0.open_price)+element1.volume*getPlusMinus(element1.price - element1.open_price)
				+element2.volume*getPlusMinus(element2.price - element2.open_price)
				+element3.volume*getPlusMinus(element3.price - element3.open_price);

				var day4 = element0.volume*getPlusMinus(element0.price - element0.open_price)+element1.volume*getPlusMinus(element1.price - element1.open_price)
				+element2.volume*getPlusMinus(element2.price - element2.open_price)+element3.volume*getPlusMinus(element3.price - element3.open_price)
				+element4.volume*getPlusMinus(element4.price - element4.open_price);

				databaseOperation.updateVolumeProportion(stockCode, day2, day3, day4, function(flag, result){
					if (!flag) {
						logger.error(result);
					}
				});
			}else{
				logger.info("not enough record to caculateVolumeProportion");
			}
		}else{
			logger.error(result);
		}
	});
}


function getStockInfoFromAPI(urlChild, isnow) {
	var stockAPI = "http://qt.gtimg.cn/q=" + urlChild;
	//logger.debug(stockAPI);

	http.get(stockAPI, function(res) {
		if (res.statusCode == 200) {
			var htmlData = "";
			res.on('data', function(data) {
				htmlData += data;
			});

			res.on('end', function() {
				insertToDatabase(htmlData, isnow);
			});
		}
	}).on('error', function(e) {
		logger.error("Got error: " + e.message);
	});
}


function exitProgram(){
	databaseOperation.endPool(function(err){
		if (err) {
			logger.error(err);
		}else{
			logger.info('exitProgram');
		}
	});
}

exports.startGetAllStockInfo = function(){

	// var now = new Date();
	// var day = now.getDay();
	// if(day == 6||day == 7){
	// 	return;
	// }

	// var hour = now.getHours();
	// if(hour<15){
	// 	return;
	// }

	//setTimeout(exitProgram, 1000*60*2);

	//delete the stock_now_info
	databaseOperation.emptyStockNowInfo(function(flag, result){
		if (!flag) {
			logger.error(result);
		}
	});


	databaseOperation.getAllStockCode(function(flag, result) {
		if (flag) {
			var stockCodeArr = [];
			result.forEach(function(item) {
				stockCodeArr.push(item.stock_code);

			});
			if (stockCodeArr.length > 0) {
				logger.debug("enter getAllStockInfo");
				getStockInfo(stockCodeArr, false);
			}
		} else {
			logger.error(result);
		}
	});
}


function formatDate(now){
	var year = now.getFullYear();
	var month = now.getMonth()+1;
	if(month<10){
		month = "0"+month;
	}
	var date = now.getDate();
	if(date<10){
		date = "0"+date;
	}
	return year+"-"+month+"-"+date;
}




exports.startCrawlStockNow = function(){
	// if (!isMarketOpenTime()) {
	// 	logger.debug("not market time");
	// 	return;
	// }

	//setTimeout(exitProgram, 1000*60*2);


	logger.info("enter getAllStockInfoNow");
	databaseOperation.getAllStockCode(function(flag, result) {
		if (flag) {
			var stockCodeArr = [];
			result.forEach(function(item) {
				stockCodeArr.push(item.stock_code);
			});
			if (stockCodeArr.length > 0) {
				logger.debug("enter getAllStockInfoNow");
				getStockInfo(stockCodeArr, true);
			}
		} else {
			logger.error(result);
		}
	});
}
