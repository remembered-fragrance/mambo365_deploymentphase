-- 0007 — Kho ảnh chứng từ
--
-- Đường lùi:
--   drop policy … on storage.objects;  delete from storage.buckets where id = 'attachments';
--
-- Bucket PRIVATE. Đường dẫn: /{user_id}/{attachment_id}.jpg
-- Giới hạn loại file và dung lượng đặt ở phía Supabase — không chỉ tin
-- accept="image/*" ở client, thuộc tính đó ai cũng bỏ qua được.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Thư mục đầu tiên của đường dẫn phải đúng bằng id người đang đăng nhập.
create policy "doc anh cua minh" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "tai anh cua minh" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "xoa anh cua minh" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
