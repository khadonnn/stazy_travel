import json

# Check real_images_map
with open('real_images_map.json', 'r', encoding='utf-8') as f:
    real_map = json.load(f)
    
print(f'Real images map keys: {list(real_map.keys())}')
print(f'Total locations: {len(real_map)}')
print(f'\nSample (phu-quoc): {len(real_map.get("phu-quoc", []))} images')
print(f'Sample (quy-nhon): {len(real_map.get("quy-nhon", []))} images')
print(f'Sample (con-dao): {len(real_map.get("con-dao", []))} images')

# Check first location
first_loc = list(real_map.keys())[0]
print(f'\nFirst location ({first_loc}): {len(real_map[first_loc])} images')
print(f'   {real_map[first_loc][0][:70]}...')
