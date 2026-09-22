-- HTML files are stored as the original, read-only process maps.
-- Keep all existing evidence types and explicitly allow text/html.
update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(
    coalesce(allowed_mime_types, array[]::text[]) || array['text/html']::text[]
  ) as mime_type
)
where id = 'evidence';
