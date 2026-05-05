import json
from collections import defaultdict

with open('jsons/__homeStay.json', 'r', encoding='utf-8') as f:
    homestays = json.load(f)

# Extract Cloudinary featured images per location
cloudinary_by_location = defaultdict(list)
location_map = {
    'Sapa': 'sapa', 'Đà Lạt': 'da-lat', 'Tam Đảo': 'tam-dao', 
    'Hà Giang': 'ha-giang', 'Ninh Bình': 'ninh-binh', 'Hạ Long': 'ha-long',
    'Nha Trang': 'nha-trang', 'Phú Quốc': 'phu-quoc', 'Quy Nhơn': 'quy-nhon',
    'Phú Yên': 'phu-yen', 'Côn Đảo': 'con-dao', 'Mũi Né': 'mui-ne',
    'Vũng Tàu': 'vung-tau', 'Hà Nội': 'ha-noi', 'TP.HCM': 'hcm',
    'Đà Nẵng': 'da-nang', 'Cần Thơ': 'can-tho', 'Huế': 'hue', 'Hội An': 'hoi-an'
}

for stay in homestays:
    title = stay.get('title', '')
    featured = stay.get('featuredImage', '')
    
    # Extract location từ title
    for loc, prefix in location_map.items():
        if loc in title:
            cloudinary_by_location[prefix].append(featured)
            break

# Print mapping
print('CLOUDINARY_IMAGES_MAP = {')
for prefix in sorted(cloudinary_by_location.keys()):
    images = cloudinary_by_location[prefix]
    unique_images = list(set(images))  # Get unique images
    print(f'    "{prefix}": {json.dumps(unique_images, ensure_ascii=False)},')
print('}')

# Also print summary
print(f'\n✅ Extracted {len(cloudinary_by_location)} locations')
for prefix, images in sorted(cloudinary_by_location.items()):
    print(f'   {prefix}: {len(set(images))} unique images')
