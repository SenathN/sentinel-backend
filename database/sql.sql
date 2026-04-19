delete from gps_data where gps_timestamp < '2026-04-17 00:00:00';
delete from observer_files where id not in (select observer_file_id from gps_data);
delete from observer_data_requests where id not in (select observer_data_request_id from observer_files);