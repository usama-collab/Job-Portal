import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.crud.job import get_jobs
from app.models.company import Company
from app.models.job import Job
from app.models import application, saved_job, user  # noqa: F401


class JobSearchTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        company = Company(name='Acme')
        self.db.add(company)
        self.db.flush()
        self.db.add_all([
            Job(title=title, description='Build products', location=location,
                company_id=company.id, is_active=active)
            for title, location, active in [
                ('Engineer', 'New York, NY 10001', True),
                ('Designer', 'New York, NY 10001', True),
                ('Engineer', 'London SW1A 1AA', True),
                ('Engineer', 'Karachi 75500', True),
                ('Engineer', 'Remote', True),
                ('Hidden', 'New York, NY 10001', False),
            ]
        ])
        self.db.commit()
        self.cache = {}
        patcher = patch('app.crud.job.redis_client')
        redis = patcher.start()
        self.addCleanup(patcher.stop)
        redis.get.side_effect = self.cache.get
        redis.setex.side_effect = lambda key, ttl, value: self.cache.update({key: value})

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def search(self, **kwargs):
        return get_jobs(self.db, skip=0, limit=10, **kwargs)

    def test_city_zip_and_postal_code_are_case_insensitive(self):
        for location, count in [(' new YORK ', 2), ('10001', 2), ('sw1a 1aa', 1), ('75500', 1), ('remote', 1)]:
            with self.subTest(location=location):
                self.assertEqual(len(self.search(location=location)), count)

    def test_keyword_and_location_both_apply(self):
        jobs = self.search(q='Engineer', location='New York')
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]['title'], 'Engineer')
        self.assertEqual(len(self.search(q='Acme', location='London')), 1)

    def test_blank_location_preserves_search_and_wildcards_are_literal(self):
        self.assertEqual(len(self.search(location='  ')), 5)
        self.assertEqual(self.search(location='%'), [])
        self.assertEqual(self.search(location='_'), [])
        self.assertEqual(self.search(location='Unknown city'), [])

    def test_cache_and_pagination_keep_locations_separate(self):
        first = self.search(location='New York')
        self.assertEqual(len(self.search(location='London')), 1)
        self.assertEqual(self.search(location='New York'), first)
        page = get_jobs(self.db, skip=1, limit=1, location='New York')
        self.assertEqual(len(page), 1)
        self.assertEqual(page[0]['location'], 'New York, NY 10001')
