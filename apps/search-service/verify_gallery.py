import json

with open('jsons/__homeStay.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('🔍 VERIFICATION: Gallery Structure (First 3 homestays)\n' + '='*70)
for i, stay in enumerate(data[:3], 1):
    print(f'\n[{i}] {stay["title"]}')
    print(f'    Featured: {stay["featuredImage"][:60]}...')
    print(f'    Gallery Length: {len(stay["galleryImgs"])} images')
    for j, img in enumerate(stay['galleryImgs']):
        if 'cloudinary' in img:
            source = '☁️  Cloudinary'
        elif 'tripadvisor' in img:
            source = '🏖️  TripAdvisor'
        else:
            source = '❓ Other'
        print(f'      [{j}] {source} - {img[:55]}...')
