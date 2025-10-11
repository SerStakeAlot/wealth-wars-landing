This folder hosts the Unity demo build under wealthwars.fun/demo/.

How to update:
1) From your separate GitHub repo (wealth-wars-build), download the latest WebGL export files (index.html, Build/*, TemplateData/* or StreamingAssets as applicable).
2) Copy those files into this folder so paths look like:
   public/demo/index.html
   public/demo/Build/...
   public/demo/TemplateData/...
3) Commit and push. Vite will copy public/ to the output, making it available at https://wealthwars.fun/demo/.

Important:
- Do not nest extra folders; keep the Unity export layout as-is under public/demo/.
- If the Unity HTML references relative paths, it will work from /demo/ directly. If it uses absolute paths, change them to relative.
- Large files may need Git LFS if they exceed GitHub size limits. Consider hosting on S3/CloudFront for better performance.
