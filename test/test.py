import unittest
import threading
import requests

API_URL = "http://localhost:5000%s"
USER_COUNT_ENDPOINT = "/users/user%d/count"
USER_COUNTED_ENDPOINT = "/users/user%d/counted"
COUNT_NUM_ENDPOINT = "/count/num"
RESET_ENDPOINT = "/app/reset"

class UserThread(threading.Thread):
    user_id: int
    def __init__(self, user_id):
        super(UserThread, self).__init__()
        self.user_id = user_id

    def run(self):
        response = requests.post(API_URL % USER_COUNT_ENDPOINT % self.user_id)

def isolate(func):
    def wrapper(*args, **kwargs):
        func(*args, **kwargs)
        requests.post(API_URL % RESET_ENDPOINT)
    return wrapper

class TestSuite(unittest.TestCase):
    def setUp(self):  
        pass

    @isolate
    def test_count_500(self):
        """ Test if the count endpoint returns 500 after 500 requests """
        threads = [UserThread(i) for i in range(500)]
        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        response = requests.get(API_URL % COUNT_NUM_ENDPOINT)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("message"), 500)

    @isolate
    def test_all_users_counted(self):
        """ Tests if 500 users report having counted after a count request """
        threads = [UserThread(i) for i in range(500)]
        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        for i in range(500):
            response = requests.get(API_URL % USER_COUNTED_ENDPOINT % i)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json().get("message"), True)
    