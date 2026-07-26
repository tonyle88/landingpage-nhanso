-- Synthetic development data only. No production/user data belongs here.
insert into public.site_settings (key, value, description, is_public)
values
  ('site.contact', '{"email":"hello@example.test"}', 'Synthetic contact', true),
  ('payment.display', '{"enabled":false}', 'Payment disabled in local seed', true)
on conflict (key) do nothing;

insert into public.landing_sections
  (section_key, section_type, display_name, title, eyebrow, content_html, sort_order)
values
  ('synthetic-hero', 'builtin', 'Synthetic hero', 'Trang demo', 'Local seed',
   '<p>Nội dung giả dùng để kiểm thử migration.</p>', 10)
on conflict (section_key) do nothing;

insert into public.packages
  (code, name, online_price, offline_price, currency, unit, features, button_text, sort_order)
values
  ('DEMO-01', 'Gói tư vấn demo', 100000, 120000, 'VND', 'buổi',
   '["Quyền lợi giả lập","Không phải dữ liệu thật"]'::jsonb, 'Đặt lịch demo', 10)
on conflict (code) do nothing;

insert into public.blog_categories (slug, name, description, sort_order)
values ('demo-category', 'Chủ đề demo', 'Dữ liệu synthetic phục vụ local test.', 10)
on conflict (slug) do nothing;

insert into public.blog_posts
  (category_id, slug, title, summary, content_html, status, published_at)
select id, 'demo-post', 'Bài viết demo', 'Không chứa nội dung sản xuất.',
       '<p>Đây là dữ liệu synthetic.</p>', 'published', now()
from public.blog_categories
where slug = 'demo-category'
on conflict (slug) do nothing;
