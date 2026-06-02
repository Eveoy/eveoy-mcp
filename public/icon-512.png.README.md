# icon-512.png is required

Most MCP registries (mcp.so, Glama, official MCP Registry) display the
PNG icon in card grids and search results. SVG icons render unevenly
across registries — ship a real 512×512 PNG.

Drop the file at `public/icon-512.png`. Suggested workflow:

```bash
# Convert the SVG using rsvg-convert or imagemagick:
rsvg-convert -w 512 -h 512 public/icon.svg -o public/icon-512.png
# or
magick -background none -density 1024 public/icon.svg \
  -resize 512x512 public/icon-512.png
```

Then delete this README and commit the PNG.
