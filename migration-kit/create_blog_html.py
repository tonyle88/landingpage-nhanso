import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of <nav id="navbar">
nav_end_idx = content.find('</nav>') + 6
# Find the start of <footer class="footer">
footer_start_idx = content.find('<footer class="footer">')

header_part = content[:nav_end_idx]
footer_part = content[footer_start_idx:]

# In header part, we should remove the horizontal scroll progress since blog might not need it, or keep it.
# Actually <div class="scroll-progress-container"> is after <nav> but before </nav>? No, it's inside <nav>. Let's keep it.

# Replace <script src="script.js..."></script> with <script src="blog.js..."></script> in footer
footer_part = footer_part.replace('<script src="script.js?v=20260617-sections3" defer></script>', '<script src="blog.js" defer></script>')

# Build new content
blog_content = header_part + """

  <main class="blog-main">
    <div id="blog-container" style="max-width: 1200px; margin: 120px auto 40px; padding: 0 20px;">
      <!-- Blog content goes here -->
    </div>
  </main>

""" + footer_part

# Fix the navbar links to point to /index.html#
blog_content = blog_content.replace('href="#about"', 'href="/index.html#about"')
blog_content = blog_content.replace('href="#benefits"', 'href="/index.html#benefits"')
blog_content = blog_content.replace('href="#testimonials"', 'href="/index.html#testimonials"')
blog_content = blog_content.replace('href="#packages"', 'href="/index.html#packages"')
blog_content = blog_content.replace('href="#process"', 'href="/index.html#process"')
blog_content = blog_content.replace('href="#contact"', 'href="/index.html#contact"')

with open('blog.html', 'w', encoding='utf-8') as f:
    f.write(blog_content)

print("blog.html created successfully.")
