var logger = global.logger;
var config = require('../config');
var http = require('http');
var gs = require('nodegrass');


exports.analyzeMessage = function(htmlData){

    var elementArr = htmlData.split(";");
	if (elementArr.length == 0) {
		logger.warn('elementArr is empty');
		return false;
	}

    var stockInfoArr = [];
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

                var element = {};
                element.stock_name = dataArr[1];
				element.stock_code = dataArr[2];
				element.amount = dataArr[6];
				var date = dataArr[30];
				element.date = date.substr(0, 4)+"-"+date.substr(4, 2)+"-"+date.substr(6, 2);

				var time = dataArr[30];
				element.time = time.substr(8, 2)+":"+time.substr(10, 2)+":"+time.substr(12, 2);
				element.price = dataArr[3];
				element.fluctuate = dataArr[32];
				element.priceearning = dataArr[39];
				element.marketValue = dataArr[45];
				element.pb = dataArr[46];
				element.flowMarketValue = dataArr[44];
				element.volume = dataArr[37];
				element.openPrice = dataArr[5];
				element.high_price = dataArr[33];
				element.low_price = dataArr[34];
                element.market = getMarketDesc(element.stock_code);

				if (element.stock_code === undefined ||
					element.amount === undefined ||
					element.date === undefined ||
					element.time === undefined ||
					element.price === undefined ||
					element.openPrice === undefined||
					element.amount == 0||
					element.price == 0) {
						//logger.warn('stockCode is undefined');
					return;
				}
                stockInfoArr.push(element);
			}
		}
	});

    return stockInfoArr;
};


exports.getStockInfoFromAPI = function(stock_code, callback) {

    var mrkDesc = getMarketDesc(stock_code);
	var stockAPI = config.stockDataInterface.url + mrkDesc + stock_code;
	logger.debug(stockAPI);

	gs.get(stockAPI, function(data, status, headers) {
        if(status == 200){
            callback(true, data);
        }else{
            callback(false, data);
        }

        // console.log(headers);
        // console.log(status);
        // console.log(data);

	}, null, 'gbk').on('error', function(e) {
		logger.error("Got error: " + e.message);
        callback(false, e.message);
	});
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
