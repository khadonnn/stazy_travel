Tailwind 4 chỉ hỗ trợ @media thuần CSS, không còn @screen.
@screen lg { ❌
thành:
@media (width >= 1024px) { ✅

| Cũ (Tailwind 3)     | Mới (Tailwind 4)                                  |
| ------------------- | ------------------------------------------------- |
| `border-opacity-70` | `border/70`                                       |
| `text-opacity-50`   | `text/50`                                         |
| `bg-opacity-40`     | `bg/40`                                           |
| `@screen lg`        | media query hoặc utilities responsive bình thường |

# @import > @reference

You may not want to @import the main stylesheet again, as that will duplicate the Tailwind-generated CSS in the other file. You would use @reference instead.

## Hugging face
[https://huggingface.co/blog/tonyassi/image-search-with-text](https://huggingface.co/blog/tonyassi/image-search-with-text)