from PIL import Image
import numpy as np

img = Image.open('d:/clarea/public/products/travel-kit.png')
img = img.convert('RGBA')
data = np.array(img)

r, g, b, a = data.T
# Find white or near-white pixels
white_areas = (r > 240) & (g > 240) & (b > 240)
data[..., :][white_areas.T] = (0, 0, 0, 0)

img2 = Image.fromarray(data)
img2.save('d:/clarea/public/products/travel-kit-trans.png')
print("Image saved to travel-kit-trans.png")
