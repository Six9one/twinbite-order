-- check_pg_net_status.sql
select * from net.http_request_queue order by created desc limit 5;
select * from net._http_response order by created desc limit 5;
