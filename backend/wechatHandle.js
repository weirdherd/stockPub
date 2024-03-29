var express = require('express');
var router = express.Router();
var logger = global.logger;
var config = require('./config');
var conn = require('./utility');
var xml2js = require('xml2js');
var databaseOperation = require('./databaseOperation');
var gs = require('nodegrass');
var constant = require('./utility/constant');
var http = require('http');
var wechatFeedbackStr =
	"回复股票代码，查看基本行情;";


var crawl = require('./stockCrawl.js');

router.get('/stockTest', function(req, res) {
	res.send(__filename);
});


router.get('/test', function(req, res) {
	logger.debug('get test');
	res.send('test');
});

//wechat connect test
router.get('/checkwechat', function(req, res) {
	logger.debug("enter wechat to check signature");

	if (req.query.echostr != undefined) {
		checkToken(req, res);
	} else {
		logger.debug("undefined signature");
	}
});



router.get('/removekeys', function(req, res) {
	logger.debug('enter removekeys');
	crawl.removeKeys();
	res.send('remove keys');
});



router.get('/insertRecommandStock', function(req, res) {
	logger.info('insertRecommandStock enter');

	databaseOperation.checkExistRecommandStock(function(flag, result) {
		if (flag) {
			if (result.length == 0) {
				databaseOperation.insertRecommandStock("60", function(flag, result) {
					if (!flag) {
						logger.error(result);
					}
				});
				databaseOperation.insertRecommandStock("00", function(flag, result) {
					if (!flag) {
						logger.error(result);
					}
				});
				databaseOperation.insertRecommandStock("30", function(flag, result) {
					if (!flag) {
						logger.error(result);
					}
				});
			} else {
				logger.info("already today insertRecommandStock");
			}
		} else {
			logger.error(result);
		}
	});


	res.send('insertRecommandStock start');
});


router.get('/validatePredict', function(req, res) {
	logger.info('validatePredict enter');
	databaseOperation.getPredict(function(flag, result) {
		if (flag) {
			result.forEach(function(element) {
				if (element.actual_high_price == null) {
					databaseOperation.getStockInfo(element.stock_code, element.date,
						function(flag, result) {
							if (flag) {
								if (result.length == 5) {
									var high_price = 0;
									result.forEach(function(stockElement) {
										if (stockElement.high_price > high_price) {
											high_price = stockElement.high_price;
										}
									});
									if (high_price != 0) {
										var fluctuate = ((high_price - element.price) / element.price)
											.toFixed(2);
										databaseOperation.updatePredict(element.stock_code, element.date,
											high_price, fluctuate,
											function(flag, result) {
												if (!flag) {
													logger.error(result);
												}
											});
									}
								}
							} else {
								logger.error(result);
							}
						});
				}
			});
		} else {
			logger.error(result);
		}
	});
	res.send('validatePredict start');
});


router.post('/checkwechat', function(req, res) {
	var formData = "";
	req.on("data", function(data) {
		formData += data;
	});

	req.on("end", function() {
		var parseString = xml2js.parseString;
		parseString(formData, function(err, json) {
			if (err) {
				err.status = 400;
			} else {
				req.body = json;
				analyzeMessage(req.body.xml.Content, req, res);
			}
		});
	});
});


function checkDigit(str) {
	var letters = "0123456789";
	for (var i = 0; i < str.length; i++) {
		if (letters.indexOf(str[i]) == -1) {
			return false;
		}

	}
	return true;
}



function getStockInfoFromAPI(stockCode, callback) {

	var data = {
		stock_code: stockCode
	};
	data = require('querystring').stringify(data);
	var opt = {
		method: "POST",
		host: config.stockServerInfo.url,
		port: config.stockServerInfo.port,
		path: "/stock/now",
		headers: {
			"Content-Type": 'application/x-www-form-urlencoded',
			"Content-Length": data.length
		}
	};

	var req = http.request(opt, function(res) {
		console.log("Got response: " + res.statusCode);
		var body = '';
		if(res.statusCode!=200){
			logger.error(data, logger.getFileNameAndLineNum(__filename));
			callback(false, data);
		}
		res.on('data', function(d) {
			body += d;
		}).on('end', function() {
			console.log(body);
			callback(true, JSON.parse(body));
		});
	}).on('error', function(e) {
		logger.error(e, logger.getFileNameAndLineNum(__filename));
		callback(false, e);
	});

	req.write(data);
	req.end();
}

function handleStock(stockCode, req, res) {
	var feedbackStr = "";
	getStockInfoFromAPI(stockCode, function(flag, result) {
		if (flag) {
			if (result.code == constant.returnCode.SUCCESS) {
				var nowElement = result.data;
				feedbackStr = "实时数据\n";
				feedbackStr += nowElement.date + " " + nowElement.time + "\n";
				feedbackStr += (nowElement.stock_name + "(" + nowElement.stock_code +
					")\n" + nowElement.price + "(" + nowElement.fluctuate + "%)\n" +
					"成交量 " + (nowElement.amount / 10000.0).toFixed(2) + "万手\n" + "市盈率 " +
					nowElement.priceearning + "\n" + "总市值 " + nowElement.marketValue +
					"亿\n" + "流通市值 " + nowElement.flowMarketValue + "亿\n" + "成交金额 " + (
						nowElement.volume / 10000.0).toFixed(2) + "亿\n");
				feedbackToWechat(req, res, feedbackStr);

			} else if (result.code == constant.returnCode.STOCK_NOT_EXIST) {
				feedbackToWechat(req, res, "无此股票代码");
			} else {
				feedbackToWechat(req, res, "异常错误");
			}

		} else {
			logger.error(result, logger.getFileNameAndLineNum(__filename));
			feedbackToWechat(req, res, "异常错误");
		}
	});
}

function getWord(volume) {
	if (volume >= 0) {
		return "净流入" + Math.abs(volume) + "亿";
	} else {
		return "净流出" + Math.abs(volume) + "亿";
	}
}

function analyzeMessage(msg, req, res) {
	logger.info(msg);

	if (msg == null) {
		feedbackToWechat(req, res, wechatFeedbackStr);
		return;
	}

	var msgStr = msg.toString();
	if (msgStr == "help") {
		feedbackToWechat(req, res, wechatFeedbackStr);
		return;
	} else if (checkDigit(msgStr)) {
		logger.info('is stock code');
		handleStock(msgStr, req, res);
		return;
	} else if (msgStr.indexOf('+') != -1) {
		var missedStockCode = msgStr.substr(1, msgStr.length - 1);
		logger.info('add missed stockCode ' + missedStockCode);

		databaseOperation.addMissedStockCode(missedStockCode, function(flag, result) {
			if (flag) {

			} else {
				logger.error(result);
			}
		});

		feedbackToWechat(req, res, "已经通知后台添加股票代码:" + missedStockCode +
			"\n 感谢您参与股票数据完善计划");
	} else if (msgStr == 'tj') {
		databaseOperation.getTodayRecommand(function(flag, result) {
			if (flag) {
				if (result.length > 0) {
					var feedbackStr = result[0].date + "\n";
					feedbackStr += ("本周关注" + "\n");
					result.forEach(function(elementStr) {
						if (elementStr.last_price == null) {
							feedbackStr += (elementStr.stock_name + "(" + elementStr.stock_code +
								")" + "0%" + "\n" + elementStr.industry + "\n");
						} else {
							feedbackStr += (elementStr.stock_name + "(" + elementStr.stock_code +
								")" + (100 * (elementStr.last_price - elementStr.price) /
									elementStr.price).toFixed(2) + "%" + "\n" + elementStr.industry +
								"\n");
						}

					});
					feedbackToWechat(req, res, feedbackStr);
				} else {
					feedbackToWechat(req, res, '本周无推荐');
				}

			} else {
				feedbackToWechat(req, res, '数据库错误，无法获取');
			}
		});

	} else if (msgStr == 'tjnow1') {
		if (conn.isMarketOpenTime()) {
			logger.info('enter tjnow');
			databaseOperation.getTodayRecommandNow('60', function(flag, result) {
				if (flag) {
					if (result.length > 0) {
						var feedbackStr = result[0].date + "沪盘实时推荐结果\n";
						result.forEach(function(element) {
							feedbackStr += (element.stock_name + "(" + element.stock_code + ")" +
								element.industry + " " + element.fluctuate + "%\n");
						});
						feedbackToWechat(req, res, feedbackStr);
					} else {
						feedbackToWechat(req, res, "最近无推荐结果");
					}

				} else {
					logger.error(result);
					feedbackToWechat(req, res, "数据库异常");
				}
			})


		} else {
			feedbackToWechat(req, res, '当前未开市');
		}

	} else if (msgStr == 'tjnow2') {
		if (conn.isMarketOpenTime()) {
			logger.info('enter tjnow');
			databaseOperation.getTodayRecommandNow('00', function(flag, result) {
				if (flag) {
					if (result.length > 0) {
						var feedbackStr = result[0].date + "深盘实时推荐结果\n";
						result.forEach(function(element) {
							feedbackStr += (element.stock_name + "(" + element.stock_code + ")" +
								element.industry + " " + element.fluctuate + "%\n");
						});
						feedbackToWechat(req, res, feedbackStr);
					} else {
						feedbackToWechat(req, res, "最近无推荐结果");
					}

				} else {
					logger.error(result);
					feedbackToWechat(req, res, "数据库异常");
				}
			})


		} else {
			feedbackToWechat(req, res, '当前未开市');
		}
	} else if (msgStr == 'tjnow3') {
		if (conn.isMarketOpenTime()) {
			logger.info('enter tjnow');
			databaseOperation.getTodayRecommandNow('30', function(flag, result) {
				if (flag) {
					if (result.length > 0) {
						var feedbackStr = result[0].date + "深盘实时推荐结果\n";
						result.forEach(function(element) {
							feedbackStr += (element.stock_name + "(" + element.stock_code + ")" +
								element.industry + " " + element.fluctuate + "%\n");
						});
						feedbackToWechat(req, res, feedbackStr);
					} else {
						feedbackToWechat(req, res, "最近无推荐结果");
					}

				} else {
					logger.error(result);
					feedbackToWechat(req, res, "数据库异常");
				}
			})


		} else {
			feedbackToWechat(req, res, '当前未开市');
		}
	} else if (msgStr == 'jg') {
		logger.info('enter getPredictResult');
		databaseOperation.getPredictResult(function(flag, result) {
			if (flag) {
				if (result.length > 0) {
					var feedbackStr = result[0].date + "推荐结果\n";
					feedbackStr += "之后五个交易日盘中最高涨幅\n";
					result.forEach(function(element) {
						feedbackStr += element.stock_name + "(" + element.stock_code + ")\n" +
							element.price + "(" + (element.actual_fluctuate * 100).toFixed(1) +
							"%)\n";
					});

					feedbackToWechat(req, res, feedbackStr);
				} else {
					feedbackToWechat(req, res, "最近无推荐结果");
				}

			} else {
				logger.error(result);
				feedbackToWechat(req, res, "数据库异常");

			}
		});
	} else if (msgStr == 'jg2') {
		logger.info('enter getPredictResultTwoWeeks');
		databaseOperation.getPredictResultTwoWeeks(function(flag, result) {
			if (flag) {
				if (result.length > 0) {
					var feedbackStr = result[0].date + "最近两周推荐结果\n";
					result.forEach(function(element) {
						feedbackStr += element.stock_name + "(" + element.stock_code + ")\n" +
							element.last_price + "(" + (100 * (element.last_price - element.price) /
								element.price).toFixed(2) + "%)\n";
					});

					feedbackToWechat(req, res, feedbackStr);
				} else {
					feedbackToWechat(req, res, "最近无推荐结果");
				}

			} else {
				logger.error(result);
				feedbackToWechat(req, res, "数据库异常");
			}
		});
	} else {
		feedbackToWechat(req, res, wechatFeedbackStr);
		return;
	}
}


function feedbackToWechat(req, res, content) {
	var timestamp = parseInt(Date.now() / 1000);
	var msgType = "text";
	//logger.info("Longitude:"+ req.body.xml.Longitude);
	var textTpl = "<xml>" + "<ToUserName><![CDATA[" + req.body.xml.FromUserName +
		"]]></ToUserName>" + "<FromUserName><![CDATA[" + req.body.xml.ToUserName +
		"]]></FromUserName>" + "<CreateTime>" + timestamp + "</CreateTime>" +
		"<MsgType><![CDATA[" + msgType + "]]></MsgType>" + "<Content><![CDATA[" +
		content +
		"]]></Content>" + "<FuncFlag>0</FuncFlag>" + "</xml>";
	res.send(textTpl);
}


function checkToken(req, res) {
	var signature = req.query.signature;
	var timestamp = req.query.timestamp;
	var nonce = req.query.nonce;
	var token = config.wechat.TOKEN;
	var echoStr = req.query.echostr;

	var arr = [token, timestamp, nonce];
	arr = arr.sort();
	var arrStr = arr.join('');
	console.log(arrStr);
	arrStr = conn.sha1Cryp(arrStr);
	console.log(arrStr);
	console.log(signature);
	if (arrStr == signature) {
		res.send(echoStr);
		logger.info('check ok');
	} else {
		res.send('error check');
		logger.info('check not ok');
	}
}


module.exports = router;
