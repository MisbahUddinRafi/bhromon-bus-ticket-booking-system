-- Insert major bus routes in Bangladesh
-- Uses city_name to safely resolve city_id

INSERT INTO ROUTE (source_city_id, destination_city_id)
VALUES
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Chattogram')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Khulna')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Rajshahi')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Sylhet')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Rangpur')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Chattogram'),
  (SELECT city_id FROM CITY WHERE city_name = 'Coxs Bazar')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Chattogram'),
  (SELECT city_id FROM CITY WHERE city_name = 'Noakhali')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Khulna'),
  (SELECT city_id FROM CITY WHERE city_name = 'Jessore')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Rajshahi'),
  (SELECT city_id FROM CITY WHERE city_name = 'Pabna')
),
(
  (SELECT city_id FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT city_id FROM CITY WHERE city_name = 'Gazipur')
), 
(
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Chattogram'),
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Dhaka')
),   
(
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Pabna')
),   
(
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Noakhali')
), 
(
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Dhaka'),
  (SELECT CITY_ID FROM CITY WHERE city_name = 'Bogra')
);




-- Query to verify the inserted routes with city names
SELECT
  r.route_id,
  s.city_name AS source_city,
  d.city_name AS destination_city
FROM
  route AS r
  JOIN city AS s ON r.source_city_id = s.city_id
  JOIN city AS d ON r.destination_city_id = d.city_id;  
 