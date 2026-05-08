Đã cập nhật scrollbar thành ultra-thin Notion/Vercel style:

**Cột trái**:

```
border-r border-white/[0.04]     // đường phân chia gần như invisible
[&::-webkit-scrollbar]:w-[2px]   // 2px thin
[&::-webkit-scrollbar-track]:bg-transparent
[&::-webkit-scrollbar-thumb]:rounded-full
[&::-webkit-scrollbar-thumb]:bg-transparent  // bình thường invisible
hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.08]  // chỉ hiện khi hover
```

**Cột phải**: Cùng style scrollbar (không có border-r).

Kết quả: Scrollbar hoàn toàn invisible, chỉ hiện nhẹ 1 vệt sáng mờ khi hover vùng scroll - giống Notion/Linear/Vercel.
