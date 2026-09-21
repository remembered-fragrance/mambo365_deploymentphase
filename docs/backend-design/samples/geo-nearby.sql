-- samples/geo-nearby.sql
-- Nearby published procurement points. Parameterized. CHƯA CHẠY / CHƯA EXPLAIN ANALYZE.
-- lng, lat, radius_m, commodity uuid, lim int, after_distance, after_id (cursor)

select
  l.id,
  l.name,
  st_distance(l.geog, st_setsrid(st_makepoint($1, $2), 4326)::geography) as distance_m
from locations l
join procurement_capabilities c on c.location_id = l.id
where l.deleted_at is null
  and l.publish_status = 'published'
  and l.type = 'procurement_point'
  and c.commodity_id = $4
  and st_dwithin(
    l.geog,
    st_setsrid(st_makepoint($1, $2), 4326)::geography,
    $3
  )
  and (
    $5::numeric is null
    or st_distance(l.geog, st_setsrid(st_makepoint($1, $2), 4326)::geography) > $5
    or (
      st_distance(l.geog, st_setsrid(st_makepoint($1, $2), 4326)::geography) = $5
      and l.id > $6
    )
  )
order by distance_m asc, l.id asc
limit $7;

-- $1 lng, $2 lat — thứ tự longitude, latitude.
