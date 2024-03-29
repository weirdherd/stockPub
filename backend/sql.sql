

/* 深圳 4日净流入 排名前十 排序的脚本*/
select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
aa.flowMarketValue, aa.volume, aa.day2, aa.day3, aa.day4, aa.pb,  
FORMAT(aa.pb*100/aa.priceearning,2) as roe, format(aa.day4/(aa.flowMarketValue*100),2) as per 
from stock_amount_info aa, stock_base_info bb
where aa.date = 
(select date from stock_amount_info order by date desc limit 1)
and aa.stock_code = bb.stock_code
and aa.stock_code like '0%'
and bb.stock_name not like '%ST%'
and aa.priceearning<>0
and aa.priceearning<100
and aa.marketValue>50
and aa.flowMarketValue>50
and aa.5day_av_price<>0
and aa.price>aa.5day_av_price
and aa.amount<>0
and aa.5day_fluctuate<0.2
and aa.5day_fluctuate>-0.2
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10

/* 上海 4日净流入 排名前十 排序的脚本*/
select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
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
and aa.flowMarketValue>50
and aa.amount<>0
and aa.5day_av_price<>0
and aa.price>aa.5day_av_price
and aa.5day_fluctuate<0.2
and aa.5day_fluctuate>-0.2
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10

/*创业板 4日净流入 排名前十 排序脚本*/
select aa.stock_code, bb.stock_name, aa.price, aa.date, aa.fluctuate, aa.priceearning, aa.marketValue, 
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
and aa.flowMarketValue>50
and aa.5day_av_price<>0
and aa.price>aa.5day_av_price
and aa.5day_fluctuate<0.2
and aa.5day_fluctuate>-0.2
and aa.amount<>0
and aa.pb*100/aa.priceearning>10
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10






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
and aa.stock_code like '60%'
and bb.stock_name not like '%ST%'
and aa.priceearning<>0
and aa.priceearning<100
and aa.marketValue>50
and aa.flowMarketValue>50
and aa.5day_av_price<>0
and aa.price>aa.5day_av_price
and aa.amount<>0
and aa.price<100
and aa.5day_av_price>=aa.10day_av_price
and aa.5day_fluctuate<0.2
and aa.5day_fluctuate>-0.2
and aa.stock_code not in 
(select stock_code from stock_predict_info where datediff(curdate(), date)<7)
order by aa.day4/(aa.flowMarketValue*10000) desc limit 10) as xxx
)



/*插入新股*/
insert into stock_base_info(stock_code, stock_name, industry) values('600032', '华电能源', '电力');

/*每日推荐列表*/
select a.stock_code, b.stock_name, a.date from stock_predict_info a, stock_base_info b
where a.stock_code = b.stock_code and a.date = (
select date from stock_predict_info order by date desc limit 1)


/*预测股票截止目前盘中涨幅*/
select a.stock_code,
       a.date,
       a.price,
       b.stock_name,
       format((c.price-a.price) /a.price, 2) as per
  from stock_predict_info a,
       stock_base_info b,
       (
select x.* from stock_now_info x,(
select stock_code, max(timestamp) as timestamp
  from stock_now_info
 group by stock_code) y
 where x.stock_code= y.stock_code
   and x.timestamp= y.timestamp) c
 where a.stock_code= b.stock_code
   and a.stock_code= c.stock_code
   and a.date = '2015-04-23'



/*预测股票截止目前盘中最高价涨幅*/
select a.stock_code,
       a.date,
       a.price,
       c.stock_name,
       b.high_price,
       format((b.high_price - a.price) /a.price, 2)
  from stock_predict_info a,
       stock_amount_info b,
       stock_base_info c
 where a.stock_code= b.stock_code
   and b.date=(
select date
  from stock_amount_info
 where stock_code= b.stock_code
   and high_price=(
select max(high_price)
  from stock_amount_info
 where date> '2015-04-20'
   and stock_code= a.stock_code)
 limit 1)
   and a.date<> curdate()
   and a.stock_code= c.stock_code
   and a.date= '2015-04-20'
 order by format((b.high_price - a.price) /a.price, 2) desc






