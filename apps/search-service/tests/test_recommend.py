import unittest
import time
from src import recommend

# Helper factories
def make_hotel(hid, dest, title=None):
    return {
        'id': hid,
        'destination': dest,
        'title': title or f'Hotel {hid}',
        'reviewStar': 4.5,
        'reviewCount': 10,
        'price': 100,
        'category': '',
        'amenities': []
    }

class RecommendTests(unittest.TestCase):
    def setUp(self):
        # Create a small hotel catalog
        self.hotels = [
            make_hotel(1, 'Hà Nội', 'HN A'),
            make_hotel(2, 'Hà Nội', 'HN B'),
            make_hotel(3, 'Nha Trang', 'NT A'),
            make_hotel(4, 'Nha Trang', 'NT B'),
            make_hotel(5, 'Sapa', 'Sapa A'),
            make_hotel(6, 'Vũng Tàu', 'VT A'),
            make_hotel(7, 'Vũng Tàu', 'VT B'),
        ]
        recommend._hotels_cache = self.hotels

    def tearDown(self):
        recommend._hotels_cache = None
        # Clear cache
        recommend._recommendation_cache.clear()

    def set_interactions(self, interactions):
        # interactions: list of dicts with userId, hotelId, type, timestamp
        recommend.get_realtime_interactions = lambda user_id=None: interactions

    def test_A_three_clicks_ha_noi(self):
        now = time.time()
        inters = [
            {'userId': 'u1', 'hotelId': 1, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-10))},
            {'userId': 'u1', 'hotelId': 2, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-8))},
            {'userId': 'u1', 'hotelId': 1, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-5))},
        ]
        self.set_interactions(inters)
        intent = recommend.detect_intent('u1')
        self.assertIsNotNone(intent)
        self.assertEqual(recommend.normalize_dest(intent['destination']), recommend.normalize_dest('Hà Nội'))

    def test_B_three_clicks_nha_trang(self):
        now = time.time()
        inters = [
            {'userId': 'u2', 'hotelId': 3, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-20))},
            {'userId': 'u2', 'hotelId': 4, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-10))},
            {'userId': 'u2', 'hotelId': 3, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-5))},
        ]
        self.set_interactions(inters)
        intent = recommend.detect_intent('u2')
        self.assertIsNotNone(intent)
        self.assertEqual(recommend.normalize_dest(intent['destination']), recommend.normalize_dest('Nha Trang'))

    def test_C_mixed_no_dominant(self):
        now = time.time()
        inters = [
            {'userId': 'u3', 'hotelId': 1, 'type': 'VIEW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-30))},
            {'userId': 'u3', 'hotelId': 3, 'type': 'VIEW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-20))},
            {'userId': 'u3', 'hotelId': 5, 'type': 'VIEW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-10))},
        ]
        self.set_interactions(inters)
        intent = recommend.detect_intent('u3')
        self.assertIsNone(intent)

    def test_D_cache_invalidation(self):
        # First generate a result and cache it
        now = time.time()
        inters1 = [
            {'userId': 'u4', 'hotelId': 1, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-10))},
            {'userId': 'u4', 'hotelId': 1, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-8))},
            {'userId': 'u4', 'hotelId': 2, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-5))},
        ]
        self.set_interactions(inters1)
        res1 = recommend.get_recommendations_for_user('u4', None, self.hotels, top_k=3, strategy='svd')
        # cache should be set
        fp1 = recommend._get_interaction_fingerprint_hash('u4')
        bucket1 = recommend._get_latest_interaction_bucket('u4')
        intent1 = recommend.detect_intent('u4')
        snapshot1 = recommend._get_intent_snapshot(intent1, bucket1)
        cached = recommend._get_cached('u4', intent1['destination'], fp1, snapshot1, bucket1)
        self.assertIsNotNone(cached)
        # Now change interactions (new latest timestamp) -> fingerprint changes
        inters2 = inters1 + [{'userId': 'u4', 'hotelId': 3, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now+5))}]
        self.set_interactions(inters2)
        fp2 = recommend._get_interaction_fingerprint_hash('u4')
        bucket2 = recommend._get_latest_interaction_bucket('u4')
        intent2 = recommend.detect_intent('u4')
        snapshot2 = recommend._get_intent_snapshot(intent2, bucket2)
        self.assertNotEqual(fp1, fp2)
        cached2 = recommend._get_cached('u4', intent2['destination'], fp2, snapshot2, bucket2)
        self.assertIsNone(cached2)

    def test_F_empty_candidates_fallback(self):
        # Simulate no hotels
        recommend._hotels_cache = []
        inters = []
        self.set_interactions(inters)
        res = recommend.get_recommendations_for_user('uX', None, [], top_k=3, strategy='svd')
        # Should return something (fallback) and not crash
        self.assertIsInstance(res, list)

    def test_G_vung_tau_intent_survives_rerank(self):
        now = time.time()
        inters = [
            {'userId': 'u5', 'hotelId': 6, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-12))},
            {'userId': 'u5', 'hotelId': 7, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-9))},
            {'userId': 'u5', 'hotelId': 6, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-5))},
        ]
        self.set_interactions(inters)
        res = recommend.get_recommendations_for_user('u5', None, self.hotels, top_k=4, strategy='svd')
        vung_tau_count = sum(1 for h in res if recommend.normalize_dest(h.get('destination', '')) == recommend.normalize_dest('Vũng Tàu'))
        self.assertGreaterEqual(vung_tau_count, 2)
        self.assertTrue(any(recommend.normalize_dest(h.get('destination', '')) == recommend.normalize_dest('Vũng Tàu') for h in res[:4]))

    def test_H_cache_stale_on_intent_shift(self):
        now = time.time()
        inters_vt = [
            {'userId': 'u6', 'hotelId': 6, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-12))},
            {'userId': 'u6', 'hotelId': 7, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-9))},
            {'userId': 'u6', 'hotelId': 6, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now-5))},
        ]
        self.set_interactions(inters_vt)
        recommend.get_recommendations_for_user('u6', None, self.hotels, top_k=4, strategy='svd')

        inters_nt = [
            {'userId': 'u6', 'hotelId': 3, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now+10))},
            {'userId': 'u6', 'hotelId': 4, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now+12))},
            {'userId': 'u6', 'hotelId': 3, 'type': 'CLICK_BOOK_NOW', 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(now+14))},
        ]
        self.set_interactions(inters_nt)
        fp = recommend._get_interaction_fingerprint_hash('u6')
        bucket = recommend._get_latest_interaction_bucket('u6')
        intent = recommend.detect_intent('u6')
        snapshot = recommend._get_intent_snapshot(intent, bucket)
        cached = recommend._get_cached('u6', 'Nha Trang', fp, snapshot, bucket)
        self.assertIsNone(cached)

if __name__ == '__main__':
    unittest.main()
