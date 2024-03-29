

use stockdb;
/*插入深圳最新预测*/

insert into stock_predict_info
select xxx.stock_code, xxx.date, xxx.price from (
(select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
aa.flowMarketValue, aa.volume, aa.day2, aa.day3, aa.day4, aa.pb,  
FORMAT(aa.pb*100/aa.priceearning,2) as roe, format(aa.day4/(aa.flowMarketValue*100),2) as per 
from stock_amount_info aa, stock_base_info bb
where aa.date = 
(select date from stock_amount_info order by date desc limit 1)
and aa.stock_code = bb.stock_code
and aa.stock_code like '30%'
and bb.stock_name not like '%ST%'
and aa.priceearning<>0
and aa.priceearning<100
and aa.marketValue>50
and aa.amount<>0
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10) as xxx
);

/*插入上海最新预测*/
insert into stock_predict_info
select xxx.stock_code, xxx.date, xxx.price from (
(select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
aa.flowMarketValue, aa.volume, aa.day2, aa.day3, aa.day4, aa.pb,  
FORMAT(aa.pb*100/aa.priceearning,2) as roe, format(aa.day4/(aa.flowMarketValue*100),2) as per 
from stock_amount_info aa, stock_base_info bb
where aa.date = 
(select date from stock_amount_info order by date desc limit 1)
and aa.stock_code = bb.stock_code
and aa.stock_code like '60%'
and bb.stock_name not like '%ST%'
and aa.priceearning<>0
and aa.priceearning<100
and aa.marketValue>50
and aa.amount<>0
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10) as xxx
);

/*插入创业板最新预测*/
insert into stock_predict_info
select xxx.stock_code, xxx.date, xxx.price from (
(select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
aa.flowMarketValue, aa.volume, aa.day2, aa.day3, aa.day4, aa.pb,  
FORMAT(aa.pb*100/aa.priceearning,2) as roe, format(aa.day4/(aa.flowMarketValue*100),2) as per 
from stock_amount_info aa, stock_base_info bb
where aa.date = 
(select date from stock_amount_info order by date desc limit 1)
and aa.stock_code = bb.stock_code
and aa.stock_code like '30%'
and bb.stock_name not like '%ST%'
and aa.priceearning<>0
and aa.priceearning<100
and aa.marketValue>50
and aa.amount<>0
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10) as xxx
);

