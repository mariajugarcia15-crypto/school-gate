import io
import unittest
from unittest.mock import patch

import cv2
import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app import MAX_BYTES, create_app, create_engine, decode_image
from plates import select_plate


def png_bytes():
    output = io.BytesIO()
    Image.new('RGB', (320, 100), 'white').save(output, format='PNG')
    return output.getvalue()


class PlateTests(unittest.TestCase):
    def test_car_and_motorcycle_formats(self):
        for text, expected in [('ABC 123', 'ABC123'), ('abc-12d', 'ABC12D'), ('OIA010', 'OIA010')]:
            with self.subTest(text=text):
                self.assertEqual(select_plate([(text, 0.96)])['plate'], expected)

    def test_noise_never_becomes_plate(self):
        for text in ['COLOMBIA', 'BOGOTA', 'XABC123Y', 'ABC!123', 'ＡBC123', '', 'ABC', '123']:
            self.assertIsNone(select_plate([(text, 0.99)])['plate'])
        self.assertEqual(select_plate([('ABC', 0.99), ('123', 0.99)])['status'], 'no_plate')

    def test_corrections_require_review(self):
        result = select_plate([('A8C1O3', 0.99)])
        self.assertIsNone(result['plate'])
        self.assertEqual(result['status'], 'review_required')
        self.assertEqual(result['candidates'][0]['plate'], 'ABC103')
        self.assertTrue(result['candidates'][0]['corrected'])

    def test_low_confidence_and_multiple_plates(self):
        self.assertIsNone(select_plate([('ABC123', 0.89)])['plate'])
        result = select_plate([('ABC123', 0.99), ('XYZ789', 0.95)])
        self.assertEqual(result['status'], 'ambiguous')
        self.assertIsNone(result['plate'])

    def test_repeated_plate_is_not_ambiguous(self):
        self.assertEqual(select_plate([('ABC123', 0.92), ('ABC123', 0.99)])['plate'], 'ABC123')

    def test_invalid_scores_are_ignored(self):
        for score in [float('nan'), float('inf'), -1, 2]:
            self.assertEqual(select_plate([('ABC123', score)])['status'], 'no_plate')


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.calls = 0
        def engine(image):
            self.calls += 1
            return [[[], 'ABC123', 0.97]], None
        self.client = TestClient(create_app(lambda: engine))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_health_and_image_contract(self):
        self.assertTrue(self.client.get('/health').json()['offline'])
        response = self.client.post('/recognize', content=png_bytes())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['plate'], 'ABC123')
        self.assertEqual(self.calls, 1)

    def test_invalid_images_never_reach_engine(self):
        for content, status in [(b'', 400), (b'not an image', 400), (b'x' * (MAX_BYTES + 1), 413)]:
            self.assertEqual(self.client.post('/recognize', content=content).status_code, status)
        self.assertEqual(self.calls, 0)

    def test_failed_request_does_not_block_next(self):
        self.client.post('/recognize', content=b'bad')
        self.assertEqual(self.client.post('/recognize', content=png_bytes()).status_code, 200)

    def test_exif_orientation(self):
        photo = Image.new('RGB', (200, 100), 'white')
        exif = Image.Exif()
        exif[274] = 6
        output = io.BytesIO()
        photo.save(output, format='JPEG', exif=exif)
        self.assertEqual(decode_image(output.getvalue()).shape[:2], (200, 100))


class OfflineEngineTests(unittest.TestCase):
    def test_bundled_models_without_network(self):
        # Synthetic smoke test, not a measurement of accuracy on vehicle photos.
        with patch('socket.socket.connect', side_effect=AssertionError('Network forbidden')):
            engine = create_engine()
            image = np.full((180, 640, 3), (0, 220, 255), dtype=np.uint8)
            cv2.putText(image, 'ABC123', (35, 125), cv2.FONT_HERSHEY_SIMPLEX, 3.8, (0, 0, 0), 8)
            rows, _ = engine(image)
            self.assertEqual(select_plate([(r[1], float(r[2])) for r in rows])['plate'], 'ABC123')
            rows, _ = engine(np.full((180, 640, 3), 255, dtype=np.uint8))
            self.assertEqual(select_plate([(r[1], float(r[2])) for r in (rows or [])])['status'], 'no_plate')


if __name__ == '__main__':
    unittest.main()
